/* Evidence audit and report assembly. This script does not run or manufacture tests. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const OUT = __dirname;
const json = file => JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const link = (label, file) => `[${label}](E:/workspace/打字游戏/artifacts/mcp-review-2026-10-03/${file})`;
const original = fs.readFileSync(path.join(OUT, 'original-report.md'), 'utf8');
const mcp = json('mcp-suite-results.json');
assert.equal(mcp.length, 6);
let steps = 0;
for (const run of mcp) {
  assert.equal(run.status, 'FINISHED'); assert.equal(run.outcome, 'PASSED');
  assert.equal(run.effective_server_ai, false); assert.equal(run.error_code, null);
  const compile = json(run.slug + '-compilation.json');
  assert.equal(compile.compile_status, 'SUCCEEDED'); assert.equal(compile.executable, true);
  const result = json(run.slug + '-steps.json');
  assert.equal(result.execution_id, run.execution_id); assert.equal(result.terminal, true);
  assert.equal(result.items.length, run.step_count);
  assert.ok(result.items.every(x => x.status === 'PASSED' && !x.error_code));
  steps += result.items.length;
}
assert.equal(steps, 181);
const browserRaw = json('browser/checks.json'), supplemental = json('qa-poems-round2/checks.json');
const key = x => JSON.stringify([x.ids, x.name]);
const merged = browserRaw.map(x => supplemental.find(y => key(y) === key(x)) || x);
assert.deepEqual(json('browser-final-checks.json'), merged);
const checks = {};
for (const [name, file, expected] of [
  ['browser', 'browser-final-checks.json', 74], ['navigation', 'navigation/checks.json', 10],
  ['boundaries', 'boundaries/checks.json', 25], ['poemsSupplement', 'qa-poems-round2/checks.json', 3]
]) {
  const items = json(file); assert.equal(items.length, expected);
  assert.ok(items.every(x => x.status === 'PASS'));
  checks[name] = { file, passed:items.length, failed:0 };
}
const node = json('node-results.json'), suites = json('suite-results.json');
assert.equal(node.passed, 16); assert.equal(node.failed, 0);
assert.equal(suites.results.length, 6); assert.ok(suites.results.every(x => x.status === 'PASS'));
const negative = json('negative-control/node-results.json');
assert.equal(negative.failed, 1);
assert.deepEqual(negative.results.filter(x => x.status === 'FAIL').map(x => x.id), ['N16']);
for (const [file, digest] of Object.entries(suites.sha256)) {
  if (file !== '测试用例.md') assert.equal(sha(path.join(ROOT, file)), digest, 'Source changed after run: ' + file);
}
const poemCheck = supplemental.find(x => x.ids.includes('V7'));
assert.equal(poemCheck.detail.passed, 47); assert.equal(poemCheck.detail.failed, 0);
assert.equal(supplemental.find(x => x.ids.includes('R4')).detail.ready, 109);
const events = json('browser/browser-events.json');
assert.equal(events.filter(x => !['memory-offline', 'poems-sprites'].includes(x.phase)).length, 0);
const http = json('final-http-check.json');
assert.equal(http.items.length, 4);
assert.ok(http.items.every(x => x.status === 200));

let cases = fs.readFileSync(path.join(ROOT, '测试用例.md'), 'utf8');
const statuses = {
  K9a:'✅ 2026-10-03 boundaries/checks.json；A1 总条数 30、门槛 4，少 1 条与恰好达标；受控指标/真实浏览器结算',
  K9b:'✅ 2026-10-03 boundaries/checks.json；三档速度/准确率边界及跳过两星封顶；受控指标，非真人限速输入',
  K13c:'✅ 2026-10-03 boundaries/checks.json；仅其他角色可买与当前角色可买/最便宜推荐两分支',
  H3:'✅ 2026-10-03 browser-final-checks.json、boundaries/checks.json；新购买禁售与旧档已拥有选择/占位均通过',
  R4:'✅ 2026-10-03 qa-poems-round2/checks.json；109 张实际已就绪素材页面回调/数值检查，另 V9 合成回归通过',
  G4:'✅ 2026-10-03 browser-final-checks.json、诗词 P 用例；A7 严格大小写及非严格关/符号边界通过',
  G7:'✅ 2026-10-03 browser-final-checks.json；真实等待第 19/20 秒及提前换页取消均通过',
  D2:'✅ 2026-10-03 browser-final-checks.json；实际下载文件已取得并校验完整进度，旧下载阻塞已解除',
  D3:'✅ 2026-10-03 browser-final-checks.json；本轮新下载文件经文件选择器导入、刷新恢复并可继续游玩',
  D5:'✅ 2026-10-03 browser-final-checks.json；实际导入两处封顶 3，顶栏 3/363',
  D7:'✅ 2026-10-03 browser-final-checks.json、MCP settings-reset；备份后实际确认清空并刷新验证完整空档'
};
cases = cases.split('\n').map(line => {
  const match = line.match(/^\| (\w+) \|/);
  if (!match || !statuses[match[1]]) return line;
  const cells = line.split('|'); cells[cells.length - 2] = ' ' + statuses[match[1]] + ' ';
  return cells.join('|');
}).join('\n');
cases = cases.replace('2026-10-03 结果集中保存在 `artifacts/review-testcases-2026-10-03/`。本轮隔离结果写入目录，原脚本的历史输入夹具及报告保持原样；重跑方法和实际命令见本日复查报告。',
  '2026-10-03 早先用例复查保存在 `artifacts/review-testcases-2026-10-03/`，后续 MCP 报告修复与回归保存在 `artifacts/mcp-review-2026-10-03/`。上表最新同日状态采用后者证据；原始历史输入和报告保持原样，重跑方法见《测试报告-2026-10-03-MCP.md》。');
cases = cases.replace('本轮仅修正测试文档和执行逻辑回归，未改远端权限、发布素材或 Git 历史。',
  '本轮修复本地图标与教学推荐并完成自动化回归，未改远端权限、发布素材或 Git 历史。');
const caseIds = [...cases.matchAll(/^\| ([A-Z]+\d+[a-z]?) \|/gm)].map(x => x[1]);
assert.equal(caseIds.length, 130); assert.equal(new Set(caseIds).size, 130);
fs.writeFileSync(path.join(ROOT, '测试用例.md'), cases);

let matrix = original.slice(original.indexOf('| 编号 | 项目 | 状态 |'), original.indexOf('## 复跑与证据')).trim();
const fixedRows = {
  S2:'| S2 | 普通业务 Console、页面异常和失败资源 | PASS | 修复后完整业务流程零 warning/error、页面异常和失败资源；QA autoplay 另分阶段记录。新证据：`browser-final-checks.json；browser/browser-events.json` |',
  V4:'| V4 | 控制台与资源请求 | PASS | 修复后实际导出、文件选择器导入、确认清空与刷新均执行，普通 UI 零错误。新证据：`browser-final-checks.json；final-http-check.json` |',
  T3:'| T3 | 取消 A0 后进入 A1 推荐教学 | PASS | 取消 A0/A1 不记教学，确认前无引擎计时；确认记录 A0 并保持所选模式。新证据：`navigation/checks.json；node-results.json N16；tutorial-practice-steps.json；challenge-pause-steps.json` |'
};
matrix = matrix.split('\n').map(line => fixedRows[(line.match(/^\| (\w+) \|/) || [])[1]] || line).join('\n');
const matrixCounts = { PASS:0, PARTIAL:0, FAIL:0, NOT_RUN:0 };
for (const match of matrix.matchAll(/^\| ([A-Z]+\d+[a-z]?) \|.*?\| (PASS|PARTIAL|FAIL|NOT_RUN) \|/gm)) matrixCounts[match[2]]++;
assert.deepEqual(matrixCounts, { PASS:95, PARTIAL:31, FAIL:0, NOT_RUN:4 });
const mcpRows = mcp.map(x => `| ${x.name} | ${x.step_count} | ${x.outcome} | [执行报告](${x.links.report}) |`).join('\n');
const report = `# 打字小勇士 MCP 报告复查、修复与回归

复查日期：2026-10-03（Asia/Shanghai）；被测地址：[http://localhost:8080/](http://localhost:8080/)。依据当前代码与[测试用例.md](E:/workspace/打字游戏/测试用例.md)。

## 最终结果

原报告登记的两项实际问题属实：图标 404 造成 S2/V4 失败，以及取消 A0 后 A1 不推荐教学造成 T3 失败。均已修复并回归通过；本轮已确认问题无未解决项。另修正受新教学流程影响的诗词 QA P53，再次执行通过。

| 验证范围 | 修复后结果 | 证据 |
|---|---|---|
| 平台真实 MCP 创建、编译、派发、浏览器执行 | 6 组 PASSED，181/181 步骤 PASSED | ${link('执行汇总', 'mcp-suite-results.json')} |
| 浏览器业务与补测合并结果 | 74 PASS / 0 FAIL | ${link('最终断言', 'browser-final-checks.json')} |
| 教学/导航与 Edge 冒烟 | 10 PASS / 0 FAIL | ${link('导航断言', 'navigation/checks.json')} |
| 评分、存档、护眼等补充边界 | 25 PASS / 0 FAIL | ${link('边界断言', 'boundaries/checks.json')} |
| Node 六个脚本 | 全部 PASS；逻辑回归 16 项、161 种坏档、透明处理/角色兼容/普通话选择 | ${link('Node 套件', 'suite-results.json')}、${link('逻辑回归', 'node-results.json')} |
| 诗词浏览器 QA | 47 PASS / 0 FAIL | ${link('诗词输出', 'qa-poems-round2/poems-output.txt')} |
| 真实已就绪立绘页面数值检查 | 109 张通过 | ${link('立绘检查', 'qa-poems-round2/sprite-quality.json')} |

这些统计粒度不同，且存在重叠，不能相加当作用例总数。初测 130 个编号为 PASS 92 / PARTIAL 31 / FAIL 3 / NOT_RUN 4。初测证据加三项失败的修复复验后为 PASS 95 / PARTIAL 31 / FAIL 0 / NOT_RUN 4；没有宣称全部 130 项均重新完整执行，也没有把人工待验项标绿。

## 代码判断与修复

**BUG-001：图标 404（S2/V4），已修复。** 原代码没有图标声明或根图标，Chrome 请求 /favicon.ico 产生 404，与零错误预期冲突。现在 [index.html](E:/workspace/打字游戏/index.html) 显式声明 [assets/favicon.svg](E:/workspace/打字游戏/assets/favicon.svg)，同时提供真实 [favicon.ico](E:/workspace/打字游戏/favicon.ico) 支持默认请求。首页、SVG、ICO HTTP 均为 200；普通业务页面的 Console warning/error、页面异常、失败资源记录为零。${link('业务事件', 'browser/browser-events.json')} 中保留 QA 阶段的 autoplay 警告，未用该警告冒充业务错误或听感验收。

**CASE-MISMATCH-002：取消教学后的 A1 推荐（T3），已修复。** 原 [js/60-scenes.js](E:/workspace/打字游戏/js/60-scenes.js:96) 只按 lv.teach 展示指法课，A1 非教学关，因此取消 A0 后直接启动 A1。按现有用例预期增加 A1 的 A0 课程推荐：取消不记录；确认前不启动引擎；确认后记 taught.A0 并使用原所选练习/挑战模式；已学过或已通过 A0/A1 的旧档不重复拦截。N16 覆盖上述边界，真实浏览器与 MCP 也执行取消和确认。${link('教学截图', 'navigation/T3-a1-with-teaching.png')}、${link('N16 负向对照', 'negative-control/node-results.json')}：仅在隔离 VM 使用旧条件，N16 确实失败，其他 15 项通过，证明新增断言能够检出原问题。

**QA 脚本跟随流程修正。** 新教学让 [qa-poems.html](E:/workspace/打字游戏/qa-poems.html:406) 的 P53 开局断言先遇到推荐浮层。保留真实教学流程，脚本点击「我准备好了，开始练」后检查实际会话与目标；不是取消产品提示或放宽目标断言。

## 回归轮次与证据保留

1. 复核初测报告及外部平台原始 JSON，统计吻合：六组 MCP 174 步通过；主浏览器 73 PASS / 1 FAIL；导航 7 PASS / 1 FAIL；S2/V4/T3 三项编号失败。${link('原报告快照', 'original-report.md')} 原样保留，原外部证据仍在 E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/。
2. 修复图标及教学后，Node 16 项、导航 10 项和边界 25 项通过。主浏览器普通业务已无错误，但诗词 P53 受新教学影响，原始 ${link('第一轮浏览器断言', 'browser/checks.json')} 为 73 PASS / 1 FAIL（QA 46 PASS / 1 FAIL），失败未删除。
3. 修正 P53 后重跑受影响的 poems-sprites 阶段，${link('补测断言', 'qa-poems-round2/checks.json')} 三项通过，其中诗词 47 项、立绘 109 张通过。browser-final-checks.json 按相同 ids/name 以补测三项替换第一轮同名结果，其余沿用第一轮真实结果；该文件是合并视图，并非单次未修改的完整运行。当前完整浏览器脚本同样可从头重跑。
4. 执行更新后的六组真实 MCP（含教学取消链路和新档挑战确认），编译全部 SUCCEEDED，执行 FINISHED/PASSED；逐条 steps 核验 181 项均 PASSED、无跳过或 error_code。最后复核测试证据、源文件指纹及文档编号。

## 本地环境与测试范围

游戏运行于 [localhost:8080](http://localhost:8080/)，平台前端 [localhost:5173](http://localhost:5173/)，平台后端 REST/MCP 共用 127.0.0.1:8000。游戏静态服务、平台前后端均已启动。本轮使用原 SQLite、独立测试 BrowserContext/专用 profile；实际下载、文件选择器导入、备份后清空、刷新验证仅操作测试档，未读取或清空玩家档。没有提交、推送、修改远端权限或发布素材。

初测的 Redis PONG 记录仅代表初测时刻。本轮开始服务已停止，Docker 启动受 stale IPC rename 错误阻塞；自动审批拒绝清理临时通信文件，仅返回 blocked by policy，未提供具体原因，清理未执行。改用平台代码明确支持的开发配置 Settings(redis_url='', mcp_limiter_redis_url='') 启动后端，进程内 admission/执行队列完成真实 MCP 回归，未修改平台配置文件、认证或策略。这不是 Redis 集成回归，Redis/Docker 恢复仍未验证，不能记为通过；不适用于生产分布式限流结论。

MCP 使用专用项目 typing-game-mcp-20261003（ID fdddaf69-5628-42b1-a1cd-f2c79591362d），allow_server_ai=false，各执行 effective_server_ai=false，凭据未写入报告。Chrome 使用系统浏览器通道；Edge 仅冒烟。原生 Playwright 键盘事件不等于人工物理键盘/输入法。评分边界使用受控整数时钟与计数，通过真实浏览器轮询结算；另真实等待 60 秒验证 A1 空局超时，真实等待 19/20 秒验证护眼倒计时。假定的隔夜/长游玩时长由夹具构造，不声称真实等待 15 分钟。

## 本轮 MCP 报告

先在平台前端选择“打字小勇士 MCP 回归”项目，再打开报告。每组 source、compile、execution、steps、report 与 transcript 均在本轮证据目录。

| 用例组 | 步骤 | 最终结果 | 报告 |
|---|---:|---|---|
${mcpRows}

## 用例覆盖矩阵（初测与三项修复复验联合记录）

下表保留初测的完整编号矩阵，仅 S2/V4/T3 改用本次复验结果。因此其余行中的“本轮”与相对证据路径均指原报告初测，根目录 E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/；标注“新证据”的行指当前 artifacts/mcp-review-2026-10-03/。最新自动化范围以本文最终结果及当前测试用例状态为准。PASS 为所述范围通过；PARTIAL 与 NOT_RUN 不是通过。

${matrix}

## 尚需人工或其他环境验收

微软拼音中文模式完整打一关，真实法/德等物理布局、长按/抖动、原生 F5/F12/Ctrl+R、完整无痕关闭重开、系统音效及普通话听感、儿童独立操作仍须人工验证。Windows 物理断网、macOS、Edge 全套未执行。全部立绘源图逐张对照与素材授权/公开发布门禁未因数值检查而自动通过。35 张尚未绘制服装属于已知占位禁售限制，本次未生成素材。这些项目不能凭自动化绿灯判定有缺陷，也不能宣称已完全验收。

## 复跑方式与证据索引

服务需先已启动；从游戏目录执行 Node，从平台目录执行 Python 以加载平台模块。以下当前脚本若断言失败会返回非零退出码，不依赖仅看进程 exit 0 判断结果。

\`\`\`powershell
# E:\\workspace\\打字游戏
node artifacts/mcp-review-2026-10-03/run-regression.cjs
# E:\\workspace\\ai-test-agent
.venv\\Scripts\\python.exe -u E:/workspace/打字游戏/artifacts/mcp-review-2026-10-03/run_browser.py
.venv\\Scripts\\python.exe -u E:/workspace/打字游戏/artifacts/mcp-review-2026-10-03/run_navigation.py
.venv\\Scripts\\python.exe -u E:/workspace/打字游戏/artifacts/mcp-review-2026-10-03/run_boundaries.py
.venv\\Scripts\\python.exe -u E:/workspace/打字游戏/artifacts/mcp-review-2026-10-03/run_mcp.py run
\`\`\`

Node 套件的 suite-results.json 保存运行当时源码指纹；之后仅更新测试文档和修正已补测的 QA 页面。${link('最终审计', 'review-audit.json')} 另保存最终指纹，并逐一验证已测试的 JS/CSS/首页/Node 脚本未再变化；运行时的文档 hash 保留原值，不篡改历史证据。
`;
fs.writeFileSync(path.join(ROOT, '测试报告-2026-10-03-MCP.md'), report);
for (const match of report.matchAll(/\]\((E:\/[^)]+)\)/g)) {
  assert.ok(fs.existsSync(match[1].replace(/:\d+$/, '')), 'Missing report link: ' + match[1]);
}
const currentFiles = [...Object.keys(suites.sha256), 'qa-poems.html', 'assets/favicon.svg', 'favicon.ico', '测试报告-2026-10-03-MCP.md'];
const audit = { timestamp:new Date().toISOString(), mcp:{ groups:6, passedSteps:steps, failedSteps:0, executions:mcp.map(x => ({slug:x.slug, id:x.execution_id, steps:x.step_count})) }, checks,
  node:{ scripts:6, passed:16, failed:0 }, poems:{ passed:47, failed:0 }, sprites:{ ready:109, failed:0 },
  caseMatrix:{ scope:'Original coverage plus S2/V4/T3 targeted repair verification; not a full rerun of 130 cases', ...matrixCounts },
  negativeControl:{ scope:'VM with original teaching condition only', failed:['N16'] },
  environment:{ redisIntegration:'NOT_RUN', admission:'supported development in-process configuration', serverAI:false },
  http:{ file:'final-http-check.json', passed:4, failed:0 },
  sourceVerifiedAgainstRun:true, sha256:Object.fromEntries(currentFiles.map(file => [file, sha(path.join(ROOT, file))])) };
fs.writeFileSync(path.join(OUT, 'review-audit.json'), JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ mcpSteps:steps, checks, matrixCounts, docs:'updated', sourceFingerprints:'verified' }, null, 2));
