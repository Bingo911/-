import asyncio
import json
import sys
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(Path.cwd()))
sys.stdout.reconfigure(encoding="utf-8")
import httpx2
import yaml
from backend.app.config import Settings
from mcp.client.client import Client
from mcp.client.streamable_http import streamable_http_client

SETTINGS = Settings()
BASE = "http://127.0.0.1:8000"
TRANSCRIPT = []

def save(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")

@asynccontextmanager
async def transport():
    async with httpx2.AsyncClient(trust_env=False, timeout=30,
            headers={"Authorization": "Bearer " + SETTINGS.dev_admin_token}) as http:
        async with streamable_http_client(BASE + "/mcp", http_client=http) as streams:
            yield streams

async def call(client, name, arguments):
    for attempt in range(8):
        result = await client.call_tool(name, arguments)
        envelope = result.structured_content
        TRANSCRIPT.append({"at": time.time(), "tool": name, "arguments": arguments, "result": envelope})
        save("mcp-transcript.json", TRANSCRIPT)
        if envelope and envelope.get("ok"):
            return envelope["data"]
        error = (envelope or {}).get("error") or {}
        if error.get("code") in ("RATE_LIMITED", "BUSY"):
            await asyncio.sleep(max(1, (error.get("retry_after_ms") or 2000) / 1000))
            continue
        raise RuntimeError(json.dumps(envelope, ensure_ascii=False))
    raise RuntimeError("MCP admission did not recover within retry budget")

async def setup():
    async with Client(transport(), mode="auto", read_timeout_seconds=30) as client:
        context = await call(client, "aita_get_context", {})
        tenant = context["items"][0]["tenant_id"]
        tools = await client.list_tools()
        save("tool-catalog.json", [t.model_dump(mode="json") for t in tools.tools])
        async with httpx2.AsyncClient(trust_env=False, timeout=20, base_url=BASE + "/api/v1",
                headers={"Authorization": "Bearer " + SETTINGS.dev_admin_token, "X-Tenant-Id": tenant}) as rest:
            async def request(method, path, **kwargs):
                response = await rest.request(method, path, **kwargs)
                if response.status_code >= 400:
                    raise RuntimeError(str(response.status_code) + " " + response.text)
                return response
            projects = (await request("GET", "/projects")).json()["items"]
            name = "typing-game-mcp-20261003"
            project = next((x for x in projects if x["name"] == name), None)
            if project is None:
                project = (await request("POST", "/projects", json={"name": name,
                    "display_name": "打字小勇士 MCP 回归", "description": "按 2026-10-03 测试用例执行，使用隔离浏览器存档"},
                    headers={"Idempotency-Key": "typing-game-project-20261003"})).json()
            project_id = project["id"]
            # A creator gets a project-local lead role; local admin needs its admin role for env setup.
            members = (await request("GET", "/projects/" + project_id + "/members")).json()["members"]
            own = next((x for x in members if x["user_id"] == context["actor_id"]), None)
            if own and own["role"] != "admin":
                await request("PATCH", "/projects/" + project_id + "/members/" + context["actor_id"], json={"role": "admin"})
            response = await request("GET", "/projects/" + project_id)
            policy = (await request("PATCH", "/projects/" + project_id + "/mcp-policy",
                headers={"If-Match": response.headers["ETag"]}, json={"enabled": True,
                "allow_case_content": True, "allow_report_details": True, "allow_server_ai": False})).json()
            environments = (await request("GET", "/projects/" + project_id + "/environments")).json()["items"]
            env = next((x for x in environments if x["name"] == "localhost-8080"), None)
            if env is None:
                env = (await request("POST", "/projects/" + project_id + "/environments", json={"name": "localhost-8080"})).json()
            if not env.get("current_revision") or env["current_revision"]["config"].get("browsers") != ["chrome"]:
                response = await request("GET", "/projects/" + project_id + "/environments/localhost-8080")
                env = (await request("POST", "/environments/" + env["environment_id"] + "/revisions",
                    headers={"If-Match": response.headers["ETag"]}, json={"config": {
                        "base_url": "http://localhost:8080", "allowed_domains": ["localhost", "127.0.0.1"],
                        "allowed_protocols": ["http"], "browsers": ["chrome"],
                        "viewport": {"width": 1440, "height": 1000},
                        "evidence": {"mode": "NORMAL", "trace": "on", "video": "off"}}})).json()
            state = {"tenant_id": tenant, "project_id": project_id,
                "environment_revision_id": env["current_revision"]["environment_revision_id"],
                "policy": policy, "environment": env}
            save("platform-state.json", state)
            print(json.dumps(state, ensure_ascii=False))
        for t in tools.tools:
            if t.name in ("aita_get_compilation", "aita_get_execution", "aita_get_execution_steps", "aita_get_report"):
                print(t.name, json.dumps(t.input_schema, ensure_ascii=False))

def markdown(title, steps):
    text = '---\ndsl_version: "1.0"\ntags: [typing-game, mcp-regression]\ndefaults:\n  timeout_ms: 8000\n---\n# ' + title + '\n'
    for i, step in enumerate(steps, 1):
        text += f'\n## Step {i}\n```yaml\n' + yaml.safe_dump(step, allow_unicode=True, sort_keys=False) + '```\n'
    return text

async def probe():
    state = json.loads((ROOT / "platform-state.json").read_text(encoding="utf-8"))
    doc = markdown("C1 封面形象加载", [{"action": "open", "url": "${env.base_url}/"},
        {"action": "assert", "condition": {"kind": "element_visible", "target": {"description": "第 18 张形象卡", "css": ".pick__item:nth-child(18)"}}},
        {"action": "screenshot"}])
    (ROOT / "mcp-cover-probe.md").write_text(doc, encoding="utf-8")
    async with Client(transport(), mode="auto", read_timeout_seconds=30) as client:
        created = await call(client, "aita_create_case", {"tenant_id": state["tenant_id"], "project_id": state["project_id"],
            "name": "C1 封面形象加载", "markdown": doc, "idempotency_key": "typing-game-cover-probe-20261003"})
        save("mcp-cover-receipt.json", created)
        print("case_created", json.dumps(created, ensure_ascii=False))
        await asyncio.sleep(3)
        compilation = await call(client, "aita_get_compilation", {"tenant_id": state["tenant_id"], "revision_id": created["revision_id"], "include_ir": True})
        save("mcp-cover-compilation.json", compilation)
        print("compilation", json.dumps(compilation, ensure_ascii=False))

def click(name=None, css=None):
    return {"action": "click", "target": ({"description": name or css, "css": css} if css else
        {"description": name, "role": "button", "name": name, "exact": True})}

def contains(text):
    return {"action": "assert", "condition": {"kind": "page_contains", "expected": text}}

def visible(css):
    return {"action": "assert", "condition": {"kind": "element_visible", "target": {"description": css, "css": css}}}

def text_is(css, text):
    return {"action": "assert", "condition": {"kind": "text_equals", "expected": text,
        "target": {"description": css, "css": css}}}

def enter(char=3):
    return [{"action": "open", "url": "${env.base_url}/"}, click("形象卡", f".pick__item:nth-child({char})"), click("就它了，开始！")]

def scenarios():
    return [
        ("cover-map", "C1-C4 M1-M7 封面与解锁地图", enter(1) + [contains("关于 擎天柱"), click("我知道了"),
            contains("全部 0 / 121 关"), contains("需要先通过 A4"), contains("需要先通过 B4"), contains("需要先通过 B18"),
            click("未解锁的 A2", ".node:nth-child(3)"), contains("这一关还没解锁"), contains("先去把 A1 打出一颗星"), click("好"),
            click("A1", ".node:nth-child(2)"), contains("这一关共 30 条"), contains("挑战限时 60 秒"), click("取消"),
            click("换形象", ".topbar__avatar"), visible(".pick__item.is-sel"), {"action": "screenshot"}]),
        ("tutorial-practice", "T1-T4 M9 K1-K4 K11 指法教学与完整练习", enter() + [
            click("A0", ".node:nth-child(1)"), click("先练一练（不限时）"), contains("先认清每根手指管哪些键"),
            click("先不练，回地图"), contains("全部 0 / 121 关"),
            click("A1", ".node:nth-child(2)"), click("先练一练（不限时）"), contains("先认清每根手指管哪些键"),
            click("先不练，回地图"), contains("全部 0 / 121 关"), click("A0", ".node:nth-child(1)"),
            click("先练一练（不限时）"), click("我准备好了，开始练"), visible(".hintline"),
            text_is(".play__stat:nth-child(4) b", "0/12")]
            + [click("下一提示键", ".kb-key.is-next") for _ in range(16)]
            + [text_is(".play__stat:nth-child(4) b", "12/12"), contains("练习完成，这一局不计星、不解锁"), contains("+20 积分"),
                {"action": "screenshot"}, click("回到地图"), contains("0/363"), contains("全部 1 / 121 关"),
                click("A1", ".node:nth-child(2)"), click("先练一练（不限时）"), visible(".play__hud"), click("结束"), contains("+0 积分")]),
        ("challenge-pause", "K2 K9 K10 K12 K13 H7 A1 挑战暂停与三星通关", enter() + [
            click("A1", ".node:nth-child(2)"), click("开始挑战"), contains("先认清每根手指管哪些键"), click("我准备好了，开始练"), click("暂停"), contains("休息一下"),
            {"action": "wait", "duration_ms": 1000}, click("继续打")]
            + [click("下一提示键", ".kb-key.is-next") for _ in range(46)]
            + [text_is(".play__stat:nth-child(4) b", "30/30"), contains("过关啦！"),
                {"action": "screenshot"}, click("回到地图"), contains("3/363"),
                visible(".node:nth-child(3):not(.node--locked)"), {"action": "screenshot"}]),
        ("settings-reset", "G3 G5 G9 D1 D7 D7a S3 设置与确认重置", enter() + [
            click("设置"), contains("模式：本机保存"), click("容易看的字母开关", "#overlay .row:has-text('容易看的字母') button"),
            visible("body.dyslexic"), click("护眼提醒档位", "#overlay .row:has-text('护眼提醒') button"), contains("45 分钟"),
            click("清空进度"), contains("先导出备份"), click("不要清空"), contains("模式：本机保存"),
            click("清空进度"), click("确定清空"), visible(".pick__item:nth-child(18)"),
            {"action": "open", "url": "${env.base_url}/"}, visible(".pick__item:nth-child(18)"), {"action": "screenshot"}]),
        ("shop-placeholder", "H1-H4 C6 缺图禁售及角色商店", enter() + [
            click("服装商店", "#topbar button:has-text('服装商店')"), visible(".fit:nth-child(8)"), contains("120 积分"),
            visible(".fit:nth-child(2).is-poor"), click("焰焰"), contains("立绘还没画好"),
            visible(".fit:nth-child(2)"), contains("画好才卖"),
            click("爱莎公主"), visible(".fit:nth-child(8) canvas"), click("皮卡丘"), visible(".fit:nth-child(8) canvas"),
            {"action": "screenshot"}, click("回到地图")]),
        ("arcade-switch", "A1 A5 A6 自由练习四种皮肤与退出", enter() + [
            click("自由练习"), visible("#scene canvas"), click("荷叶跳拼音"), contains("荷叶"),
            click("单词陨石"), contains("陨石"), click("古诗飞花"), contains("古诗"),
            {"action": "screenshot"}, click("结束练习"), contains("古诗飞花 结束"), {"action": "screenshot"}]),
    ]

async def run_suite():
    state = json.loads((ROOT / "platform-state.json").read_text(encoding="utf-8"))
    selected = sys.argv[2] if len(sys.argv) > 2 else None
    results = json.loads((ROOT / "mcp-suite-results.json").read_text(encoding="utf-8")) if selected else []
    async with Client(transport(), mode="auto", read_timeout_seconds=30) as client:
        for slug, title, steps in scenarios():
            if selected and selected != slug:
                continue
            record = {"slug": slug, "name": title, "step_count": len(steps)}
            try:
                doc = markdown(title, steps)
                (ROOT / (slug + ".md")).write_text(doc, encoding="utf-8")
                created = await call(client, "aita_create_case", {"tenant_id": state["tenant_id"], "project_id": state["project_id"],
                    "name": title, "markdown": doc, "idempotency_key": "typing-game-" + slug + "-" + uuid.uuid4().hex})
                record.update(created)
                for _ in range(40):
                    await asyncio.sleep(2)
                    compilation = await call(client, "aita_get_compilation", {"tenant_id": state["tenant_id"],
                        "revision_id": created["revision_id"], "include_ir": True})
                    if compilation.get("compile_status") in ("SUCCEEDED", "FAILED", "NEEDS_REVIEW"):
                        break
                save(slug + "-compilation.json", compilation)
                if not compilation.get("executable"):
                    raise RuntimeError("Case cannot execute: " + json.dumps(compilation, ensure_ascii=False))
                receipt = await call(client, "aita_run_test", {"tenant_id": state["tenant_id"],
                    "compile_artifact_id": compilation["compile_artifact_id"], "expected_ir_digest": compilation["ir_digest"],
                    "environment_revision_id": state["environment_revision_id"], "idempotency_key": "typing-run-" + uuid.uuid4().hex,
                    "variables": {}, "browser": "chrome", "use_server_ai": False})
                record.update(receipt)
                print("RUN", slug, json.dumps(receipt, ensure_ascii=False), flush=True)
                deadline = time.monotonic() + 180
                while time.monotonic() < deadline:
                    await asyncio.sleep(3)
                    execution = await call(client, "aita_get_execution", {"tenant_id": state["tenant_id"], "execution_id": receipt["execution_id"]})
                    save(slug + "-execution.json", execution)
                    status = execution.get("status") or execution.get("execution_status")
                    if status not in ("CREATED", "QUEUED", "RUNNING", "PREPARING", "FINALIZING", "ARCHIVING"):
                        break
                report = await call(client, "aita_get_report", {"tenant_id": state["tenant_id"], "execution_id": receipt["execution_id"]})
                execution_steps = await call(client, "aita_get_execution_steps", {"tenant_id": state["tenant_id"], "execution_id": receipt["execution_id"], "limit": 100})
                save(slug + "-report.json", report)
                save(slug + "-steps.json", execution_steps)
                record["status"] = status
                record["outcome"] = execution.get("outcome")
                record["error_code"] = execution.get("error_code")
                print("RESULT", slug, status, execution.get("outcome"), flush=True)
            except Exception as exc:
                record.update(status="HARNESS_ERROR", error=str(exc))
                print("ERROR", slug, str(exc), flush=True)
            results = [r for r in results if r["slug"] != slug] + [record]
            save("mcp-suite-results.json", results)

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "setup"
    asyncio.run({"probe": probe, "run": run_suite, "setup": setup}[command]())

if __name__ == "__main__" and command == "run":
    result = json.loads((ROOT / "mcp-suite-results.json").read_text(encoding="utf-8"))
    sys.exit(0 if result and all(x.get("outcome") == "PASSED" for x in result) else 1)
