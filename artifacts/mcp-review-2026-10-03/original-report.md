# 打字小勇士本地搭建与 MCP 测试报告

执行日期：2026-10-03（Asia/Shanghai）。目标：用户指定的 http://localhost:8080/。依据：[测试用例.md](E:/workspace/打字游戏/测试用例.md)，SHA-256 `5a60608a2aa97a9bd2a2ae3cbd029e944684a1aa6f7ffcae8d35c698b6fcebaa`。

## 结果

环境已搭建并启动，六组 MCP 端到端用例全部通过，共 174 个步骤。浏览器主回归 73 项断言通过、1 项失败；补充导航/Edge 7 项通过、1 项失败；补充边界 25 项断言通过。六个 Node 脚本全部通过，其中完整校验器覆盖 161 种坏档，逻辑回归 15 项；诗词阁浏览器 QA 47 项全部通过；109 张已就绪立绘的页面数值检查通过。

原文档共 130 个编号：PASS 92、PARTIAL 31、FAIL 3、NOT_RUN 4。编号与断言是不同统计粒度，不能相加。PARTIAL 不算完整通过，历史文档的绿色记录没有直接沿用。

确认一个非阻断缺陷：`favicon.ico` 404，使 S2/V4 的零控制台错误要求失败；另有 T3 教学推荐的用例/实现不一致，按用例判失败。普通业务流程没有应用 JS 异常。没有修改游戏业务代码。

## 已启动服务

| 服务 | 地址/容器 | 当前状态 |
|---|---|---|
| 测试平台前端 | http://localhost:5173/ | HTTP 200 |
| 平台 REST 与 MCP，共用一个后端进程 | http://127.0.0.1:8000/mcp | MCP 初始化、14 tools、3 resources 通过 |
| MCP readiness | http://127.0.0.1:8000/api/v1/mcp/readiness | HTTP 200 |
| Redis | ai-test-agent-mcp-redis，127.0.0.1:6379 | redis:7-alpine，PING=PONG |
| 被测游戏 | http://localhost:8080/ | HTTP 200 |

使用现有 SQLite 和进程内执行队列；本次无需额外 PostgreSQL、Celery 或独立 MCP 服务。Redis 仅监听本机，未使用或修改其他容器。MCP 地址需要本地开发 bearer token，报告没有写入凭据。最终状态：[final-health.json](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/final-health.json)。这是本地开发运行状态，没有配置开机自动启动或公网发布。

收尾另通过一次 3 步 MCP 活性冒烟（[final-live-smoke.json](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/final-live-smoke.json)，执行 ID `ad80b9cf-2acd-44f4-8f98-66fc8ba802cd`），确认当前提交/派发/浏览器执行链路可用，不计入六组的 174 步。readiness 的 `execution_available/background_available` 需要最近 300 秒的派发证据，长时间空闲时会显示 `no_evidence`，不能把它等同于停服。

已有内部模型配置为 `agnes-2.5-flash`，基础地址 `https://apihub.agnes-ai.com/v1`（适配器追加 `/chat/completions`）。本轮采用确定性 DSL，专用项目 `allow_server_ai=false`，执行 `effective_server_ai=false`，不依赖模型回答判定结果。密钥只在本地忽略的配置中，不写进报告。

## 测试隔离与方式

用户指定 8080，优先使用该地址；存储隔离改用全新 Playwright BrowserContext，关窗重开采用本报告目录下专用 Chrome profile。导入/清空只操作本轮测试档，未读取或清空玩家浏览器档。页面内存模式和隔夜档均由人工夹具构造。

Windows Chrome 154.0.8037.59，1440×1000，主流程使用实际 DOM 点击和 Playwright 原生键盘事件；不是人工物理键盘或 OS 输入法测试。平台 Playwright 自带完整 Chromium 在本机报 `spawn UNKNOWN`；专用环境改用已验证可启动的系统 `chrome`，六组随后通过。

MCP DSL 当前动作集不支持真实文件下载和完整物理键盘控制，所以 D2/D3 的下载、文件选择器及原生键盘由补充 Playwright 链路完成。K9a/K9b 的评分边界、K3 的 80% 警示色采用受控时钟与计数器夹具触发真实浏览器轮询/结算；这些计数不是 60 秒真人输入。A1 真正等待 60 秒的超时链路另有独立断言。

## MCP 平台内结果

项目：`typing-game-mcp-20261003`（显示名“打字小勇士 MCP 回归”），ID `fdddaf69-5628-42b1-a1cd-f2c79591362d`。先在前端选择此项目，再打开以下报告。

| 用例组 | 步骤 | 最终结果 | 报告 |
|---|---:|---|---|
| T1-T4 M9 K1-K4 K11 指法教学与完整练习 | 41 | PASSED | [执行报告](http://localhost:5173/#/report/9ccaf457-f8c5-4cc5-8a1e-a23b67b6e702) |
| K2 K9 K10 K12 K13 H7 A1 挑战暂停与三星通关 | 62 | PASSED | [执行报告](http://localhost:5173/#/report/2d413448-eca0-492e-b40f-3f5a9cd7bca9) |
| G3 G5 G9 D1 D7 D7a S3 设置与确认重置 | 19 | PASSED | [执行报告](http://localhost:5173/#/report/5161d451-5eee-459f-b8fb-438b916f6e5e) |
| H1-H4 C6 缺图禁售及角色商店 | 17 | PASSED | [执行报告](http://localhost:5173/#/report/4b60695d-e31d-4e9d-83f5-f30e96c42f85) |
| A1 A5 A6 自由练习四种皮肤与退出 | 15 | PASSED | [执行报告](http://localhost:5173/#/report/1b654421-8365-4869-821f-f4599d26f3c7) |
| C1-C4 M1-M7 封面与解锁地图 | 20 | PASSED | [执行报告](http://localhost:5173/#/report/9f4781fd-6c35-498e-8f01-5869aec9c4af) |

证据包含每组 source、compile artifact、IR digest、execution、steps、report 和平台执行 trace。平台执行 ID 均记录在 [mcp-suite-results.json](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/mcp-suite-results.json)。

## 缺陷与待人工验收

**BUG-001（P2，S2/V4）**：新浏览器打开 `http://localhost:8080/`，Chrome 自动请求 `/favicon.ico`，服务返回 404，Console 报 `Failed to load resource`。可复现于完整场景流程、存档边界和设置流程。建议添加 favicon 并在 index.html 显式声明，之后重跑零错误检查。本轮仅登记，不改游戏。

**CASE-MISMATCH-002（T3）**：空档选择形象→A0→练习→「先不练，回地图」→A1→练习。实际 `taught={}`、A1 会话已启动、无教学浮层；用例预期仍推荐指法图。代码 `js/60-scenes.js:118` 仅判断 `lv.teach`，而 A1 不是教学关。取消不记教学的前半步骤正确。需要后续统一需求：若保留 T3 预期，应为未完成 A0 的 A1 增加提示；若确认只在 A0 教学，应修订用例。报告仅记录，不擅自改代码或测试预期。截图：[T3-a1-without-teaching.png](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/navigation/T3-a1-without-teaching.png)。

`qa-poems.html` 通过虚拟键位驱动时出现 AudioContext autoplay 警告：单独保存在 browser-events.json 的 `poems-sprites` phase。该现象是无头 QA 缺少用户激活的执行限制，不计为普通 UI 的业务缺陷；也不能用 QA PASS 推断系统声音已听感通过。

微软拼音打一整关、真人美式/欧式/法德布局、真实长按/抖动、原生 F5/F12/Ctrl+R、无痕窗口会话关闭重开、音效/普通话听感仍待实机验收。Windows 物理断网、macOS 和 Edge 全套未执行。护眼自动触发使用时间戳夹具，没有真实等 15 分钟；19/20 秒倒计时已真实等待。

四张棋盘格图已目视，未发现明显整块缺失/拉伸；爱莎绿色裙装/披风、皮卡丘黑耳尖/尾巴可见，c7-o7 既有半身构图不判失败。R1/R3/R5 的全部原图逐张对照仍保留 PARTIAL。35 张尚未绘制服装按已知限制禁售，未进行素材生成。发布、凭据吊销和 Git 历史门禁不属于本轮已通过项。

## 全部用例编号覆盖矩阵

PASS 表示在注明方式和用例允许的自动化范围内通过；PARTIAL 表示仅覆盖部分步骤/自动化逻辑；NOT_RUN 表示未执行对应最终验收。评分、语音选择等受控测试不等于真人输入或实际听感。

| 编号 | 项目 | 状态 | 本轮证据/范围 |
|---|---|---|---|
| P1 | 部署形态 | PASS | HTTP 与 file:// 均能启动；Node 校验确认本地静态资源结构。 证据：`browser/checks.json；node/validator-output.txt` |
| P2 | 浏览器 | PARTIAL | 按用户指定 localhost:8080 测试，使用独立浏览器上下文和专用 profile 隔离存档；Windows Chrome 全套，Edge 启动/键盘/刷新冒烟通过，未跑 macOS/Edge 全套。 证据：`browser/environment.json；navigation/edge-environment.json` |
| P3 | 键盘 | PARTIAL | 自动化原生键盘事件和实际鼠标点击通过；没有真人美式/欧式物理键盘输入。 证据：`browser/checks.json；MCP 六组` |
| P4 | 数据 | PASS | 每个新上下文空档启动；导入夹具的测试明确注明前置。 证据：`browser/checks.json` |
| P5 | 存储与测试数据 | PARTIAL | 只使用本轮隔离测试档及人工夹具；未使用玩家私人档。发布/历史来源扫描不在本轮范围。 证据：`browser/；node/suite-results.json` |
| S1 | 清空专用测试来源的存档，断网后双击 `index.html` | PARTIAL | file:// 浏览器模拟离线冷启动约 0.329 秒；没有断开 Windows 物理网络。 证据：`browser/checks.json` |
| S2 | 打开开发者工具，遍历指定场景并收集 Console、页面异常和失败资源请求 | FAIL | 全链路已执行；favicon.ico 返回 404，违反零控制台错误断言；普通 UI 无应用 JS 异常。 证据：`browser/browser-events.json；favicon-http-check.json` |
| S3 | 刷新页面（F5） | PASS | HTTP/file 存储可写、刷新两分支、写入受阻提示/仅内存游玩/实际下载均验证。 证据：`browser/checks.json` |
| S4 | 在 localStorage 可写的专用来源打开，包括存储可写的无痕窗口 | PASS | HTTP/file 存储可写、刷新两分支、写入受阻提示/仅内存游玩/实际下载均验证。 证据：`browser/checks.json` |
| S4a | 在专用测试环境阻止 localStorage 写入，再启动并游玩 | PASS | HTTP/file 存储可写、刷新两分支、写入受阻提示/仅内存游玩/实际下载均验证。 证据：`browser/checks.json` |
| S4b | 无痕窗口完成测试进度，关闭该浏览器全部无痕窗口，再新开无痕窗口访问同一来源 | NOT_RUN | 未操作原生浏览器无痕窗口的完整关闭/重开生命周期；自动化上下文隔离不替代该用例。 证据：`—` |
| C1 | 首次进入 | PASS | 封面、角色提醒、换形象、购衣及独立穿戴记忆通过。 证据：`browser/checks.json；MCP 六组` |
| C2 | 点任意形象 →「就它了，开始！」 | PASS | 封面、角色提醒、换形象、购衣及独立穿戴记忆通过。 证据：`browser/checks.json；MCP 六组` |
| C3 | 选 `c1`（擎天柱）并确认 | PASS | 封面、角色提醒、换形象、购衣及独立穿戴记忆通过。 证据：`browser/checks.json；MCP 六组` |
| C4 | 地图页点「换形象」 | PASS | 封面、角色提醒、换形象、购衣及独立穿戴记忆通过。 证据：`browser/checks.json；MCP 六组` |
| C5 | 已买过服装后换形象再换回来 | PASS | 封面、角色提醒、换形象、购衣及独立穿戴记忆通过。 证据：`browser/checks.json；MCP 六组` |
| C6 | 检查替换角色并分别查看 8 件服装 | PARTIAL | 替换角色的 32 种旧档逻辑及数据/素材一致性通过；contact sheet 已目视，未逐个用文件选择器导入 32 个档再检查商店。 证据：`node/*compatibility-results.json；browser/sprites-6-10.png；browser/sprites-11-15.png` |
| C7 | 分别导入替换前 c7/c8/c9/c13 的 o1–o8 穿戴存档 | PARTIAL | 替换角色的 32 种旧档逻辑及数据/素材一致性通过；contact sheet 已目视，未逐个用文件选择器导入 32 个档再检查商店。 证据：`node/*compatibility-results.json；browser/sprites-6-10.png；browser/sprites-11-15.png` |
| M1 | 看地图顶部 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M2 | 看页签下方黄字 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M3 | 新档首个可玩关 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M4 | 跨世界门槛 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M5 | 点未解锁关 | PARTIAL | 锁关提示与不进入游戏通过；错误音未听感验收。 证据：`MCP cover-map；browser/checks.json` |
| M6 | 整个世界的页签还锁着 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M7 | 点已解锁关 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M8 | 菜单里选「练习」/「挑战」 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| M9 | 教学关 `A0` 的进度判定 | PASS | 地图与教学实际交互通过；全关卡数量/排序/解锁逻辑由 Node 回归交叉检查。 证据：`MCP cover-map/tutorial-practice；node/node-results.json；browser/poems-output.txt` |
| T1 | 新档进 `A0` | PARTIAL | 指法图与确认/取消交互通过；规则朗读未实际听感验收。 证据：`MCP tutorial-practice` |
| T2 | 点「我准备好了，开始练」 | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| T3 | 点「先不练，回地图」 | FAIL | 取消 A0 不记 taught 正常，但 A1 直接进入练习，未按用例推荐指法图；实现仅对 lv.teach（A0）弹图。属于用例/实现不一致。 证据：`navigation/checks.json；navigation/T3-a1-without-teaching.png；游戏 js/60-scenes.js:118` |
| T4 | 看过指法图后退出再进 `A1` | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| T5 | 练习中每敲一个键 | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| T6 | 指尖岛 `A0`–`A12`（13 关）走**挑战模式** | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| T6b | 拼音谷/单词城/诗词阁的挑战模式 | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| T6c | 挑战模式最长的那句指法（A10 的「左手小指按住 Shift，再用右无名指按 斜杠」） | PASS | 教学顺序/取消/不重复提示及诗词 QA 的指法行回归通过。 证据：`MCP tutorial-practice；browser/poems-output.txt P59–P64` |
| K1 | 看 HUD | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K2 | 打完最后一条 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K3 | 分别在练习处理条目/挑战消耗时间超过 80% 时查看进度条 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K4 | 敲对 | PARTIAL | 正确高亮、错误闪红、准确率及连击通过；声音未听感验收。 证据：`browser/checks.json；MCP tutorial-practice` |
| K5 | 敲错 | PARTIAL | 正确高亮、错误闪红、准确率及连击通过；声音未听感验收。 证据：`browser/checks.json；MCP tutorial-practice` |
| K6 | 同一条连错 3 次 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K7 | 在 A7、A12 的大写目标上分别开启/关闭「大写必须按 Shift」 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K8 | 数字/标点关（`A8`–`A11`）及 A12 混打符号 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K9 | 挑战模式限时到 0 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K9a | 专用挑战局分别做到完成门槛少 1 条和恰好达到门槛，保持其他条件达标 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K9b | 达完成门槛后，将速度/准确率分别设为每档门槛略低和恰好达标，再比较有无跳过 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K10 | 挑战模式点「暂停」 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K11 | 练习模式点「结束」 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K12 | 结算页 | PARTIAL | 星/积分/完成/提示及按钮通过；未按时序量测三段动画的先后。 证据：`browser/checks.json；browser/a1-challenge.png` |
| K13 | 结算页按钮（过关） | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K13b | 结算页按钮（没过） | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K13c | 结算页导购提示，分别构造只有其他角色/当前角色有买得起服装的测试档 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K14 | 中途切走场景 | PASS | 实际 UI、原生自动化键盘及受控边界通过；评分/80%边界采用状态与时钟夹具，真实 60 秒超时另测。 证据：`browser/checks.json；boundaries/final-checks.json；MCP 六组` |
| K15 | 点「喇叭」 | PARTIAL | 朗读参数/整句/停止逻辑通过；实际系统发声与听感未验证。 证据：`browser/poems-output.txt；node/tts-results.json` |
| K16 | 关闭「朗读发音」后点喇叭 | PARTIAL | 朗读参数/整句/停止逻辑通过；实际系统发声与听感未验证。 证据：`browser/poems-output.txt；node/tts-results.json` |
| W1 | 指尖岛 `A1`–`A12` | PASS | 完整关卡目标、键位、拼音、英文释义和诗词对齐校验通过。 证据：`node/validator-output.txt；node/node-results.json` |
| W2 | 拼音谷 `B1`–`B18` | PASS | 完整关卡目标、键位、拼音、英文释义和诗词对齐校验通过。 证据：`node/validator-output.txt；node/node-results.json` |
| W3 | 单词城 `C1`–`C15` | PASS | 完整关卡目标、键位、拼音、英文释义和诗词对齐校验通过。 证据：`node/validator-output.txt；node/node-results.json` |
| W4 | 内容自检 | PASS | 完整关卡目标、键位、拼音、英文释义和诗词对齐校验通过。 证据：`node/validator-output.txt；node/node-results.json` |
| W5 | 诗词阁 `D1`–`D75` | PARTIAL | 诗词盲打/顺序/ü/完成与朗读参数已通过；仍缺真实系统听感。 证据：`browser/poems-output.txt P10–P32、P51、P54、P58` |
| A1 | 顶栏「自由练习」/地图页「自由练习小游戏」 | PASS | 四皮肤切换、旧循环 teardown、单画布及结束结算通过。 证据：`browser/checks.json；MCP arcade-switch` |
| A2 | 看掉落物字号 | PARTIAL | 实际气球 52px 和诗词 QA 汉字 46px 通过；未逐一取证 44/38/32px 掉落物。 证据：`browser/checks.json；browser/poems-output.txt` |
| A3 | 逐字母敲中掉落物 | PARTIAL | 实际原生键盘击碎与计分通过；本轮未完整等到落地漏掉分支。 证据：`browser/checks.json；browser/poems-output.txt P42–P44` |
| A4 | 一局结束，并测试当天街机累计 199 / 200 分的边界 | PASS | 199/200 上限实际击碎结算通过；昨日夹具进入街机后自动重置额度。 证据：`browser/checks.json；boundaries/final-checks.json` |
| A5 | 页顶四个页签 | PASS | 四皮肤切换、旧循环 teardown、单画布及结束结算通过。 证据：`browser/checks.json；MCP arcade-switch` |
| A6 | 点「结束练习」 | PASS | 四皮肤切换、旧循环 teardown、单画布及结束结算通过。 证据：`browser/checks.json；MCP arcade-switch` |
| H1 | 进商店 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H2 | 立绘已画好的形象（现为 `c1`–`c13`） | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H3 | 新档或未拥有缺图服装的档，查看 `c14`–`c18` | PASS | 未拥有缺图禁售、不请求缺图；已拥有缺图可穿戴且显示占位。favicon 全局问题归 S2/V4。 证据：`browser/checks.json；boundaries/final-checks.json` |
| H4 | 积分不足 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H5 | 买成功 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H6 | 「只买得起的」筛选 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H7 | 挑战积分规则 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H8 | 已通关关卡再次挑战，分别摘星和 0 星 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| H9 | 全 3 星理论收益 | PASS | 购衣与筛选实际 UI、经济/重玩/参与分边界逻辑均通过。 证据：`browser/checks.json；node/validator-output.txt；node/node-results.json` |
| R1 | 按素材类型验规格 | PARTIAL | 109 张页面数值检查、四张棋盘格目视通过；未完成全部原图逐张叠图/像素对照及规格验收。 证据：`browser/sprite-quality.json；browser/sprites-*.png；boundaries/sprites-16-18.png；node/alpha-results.json` |
| R2 | 仅绿幕素材验背景 | PARTIAL | 109 张页面数值检查、四张棋盘格目视通过；未完成全部原图逐张叠图/像素对照及规格验收。 证据：`browser/sprite-quality.json；browser/sprites-*.png；boundaries/sprites-16-18.png；node/alpha-results.json` |
| R3 | 按素材类型检查颜色 | PARTIAL | 109 张页面数值检查、四张棋盘格目视通过；未完成全部原图逐张叠图/像素对照及规格验收。 证据：`browser/sprite-quality.json；browser/sprites-*.png；boundaries/sprites-16-18.png；node/alpha-results.json` |
| R4 | 已就绪服装的数值验收 | PASS | 109 张真实就绪素材页面回调 quality=null；3 组原生 alpha/绿幕逐字节回归通过。 证据：`browser/sprite-quality.json；node/alpha-results.json` |
| R5 | 目视验收 | PARTIAL | 109 张页面数值检查、四张棋盘格目视通过；未完成全部原图逐张叠图/像素对照及规格验收。 证据：`browser/sprite-quality.json；browser/sprites-*.png；boundaries/sprites-16-18.png；node/alpha-results.json` |
| R6 | 低饱和毛色陷阱 | PARTIAL | 当前 c12-o6 已纳入数值/目视检查；未重演历史第一版毛色与替换过程。 证据：`browser/sprite-quality.json；browser/sprites-11-15.png` |
| R7 | 换图后重测 | NOT_RUN | 本轮未替换任何素材 PNG，未执行换图缓存更新链路。 证据：`—` |
| R8 | 剩余形象 | NOT_RUN | 35 张尚未生成，按既有产品限制占位禁售；本轮不生成新素材。 证据：`browser/sprite-quality.json；browser/checks.json` |
| R9 | 原生透明处理及绿幕兼容回归 | PASS | 109 张真实就绪素材页面回调 quality=null；3 组原生 alpha/绿幕逐字节回归通过。 证据：`browser/sprite-quality.json；node/alpha-results.json` |
| G1 | 音效开关 | PARTIAL | UI 状态或模拟 TTS 参数/停止调用通过；未实际听感验收。 证据：`browser/checks.json；node/tts-results.json` |
| G2 | 朗读发音开关 | PARTIAL | UI 状态或模拟 TTS 参数/停止调用通过；未实际听感验收。 证据：`browser/checks.json；node/tts-results.json` |
| G2a | 同时提供大陆普通话、粤语、台湾中文和英语音色 | PARTIAL | UI 状态或模拟 TTS 参数/停止调用通过；未实际听感验收。 证据：`browser/checks.json；node/tts-results.json` |
| G2b | 分别提供 `zh_CN`、`ZH-cn`、`zh-Hans-CN`、`cmn-CN`、`cmn-Hans-CN` 音色 | PASS | 对应语音选择/语言标签/异步加载/缺少音色的模拟回归通过。 证据：`node/tts-results.json` |
| G2c | 仅提供粤语、台湾中文、无地区中文标签及英语 | PASS | 对应语音选择/语言标签/异步加载/缺少音色的模拟回归通过。 证据：`node/tts-results.json` |
| G2d | 初始音色列表为空，随后加载英语，再加载大陆普通话 | PASS | 对应语音选择/语言标签/异步加载/缺少音色的模拟回归通过。 证据：`node/tts-results.json` |
| G2e | 仅有大陆普通话，连续朗读并关闭朗读开关 | PARTIAL | UI 状态或模拟 TTS 参数/停止调用通过；未实际听感验收。 证据：`browser/checks.json；node/tts-results.json` |
| G3 | 容易看的字母 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| G4 | 在 A7 和 A12 分别切换大写设置 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| G5 | 护眼提醒档位 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| G6 | 护眼触发条件 | PARTIAL | 受控时长夹具验证 play 不弹、地图弹；未真实等待 15 分钟，未穷举 arcade/关闭提醒分支。 证据：`browser/checks.json` |
| G7 | 护眼浮层，分别检查第 19 秒、第 20 秒以及未完成倒计时就换页 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| G8 | 隔夜再打开 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| G9 | 设置页返回 | PASS | 设置联动/档位、真实 19/20 秒、换页取消及隔夜时间戳夹具通过。 证据：`browser/checks.json；boundaries/final-checks.json` |
| D1 | 设置页看存档区 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D2 | 在专用测试来源点击「导出存档」，取得实际下载文件 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D3 | 先执行 D2 取得当前版本新文件，改变测试进度，再经文件选择器导入该文件并刷新 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D4 | 导入非 JSON、缺少/非法 `points` 或结构错误的坏档（见下方规则） | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D5 | 在专用夹具中将 A1 的 stars 和 best.stars 改为 99 后导入 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D6 | 导入 `charId` 被改坏的档 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D7 | 仅在已备份的专用测试来源，点「清空进度」→「确定清空」，再刷新 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D7a | 点「清空进度」→「不要清空」；另检查「先导出备份」入口 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D8 | 在普通窗口且本机存储可写时关闭并重新打开同一来源 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D9 | 导入缺少可选字段的旧档（如 `{"points":9,"charId":"c3"}`） | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| D10 | 本机旧档的 `owned` 非数组，或对象字段/关卡记录被写成数组、null 等 | PASS | 实际下载、文件选择器往返、备份/取消/最终重置刷新、坏档/封顶/旧档以及隔离普通 profile 关闭重开均通过。 证据：`browser/checks.json；browser/*存档*.json；node/validator-output.txt` |
| I1 | 英文输入法直接敲，并分别记录实际键盘布局 | PARTIAL | 物理位置映射/repeat/防抖/不拦 Ctrl+R 的程序验证通过；微软拼音、真实法德键盘/长按抖动、原生快捷键行为须实机确认。 证据：`browser/checks.json；boundaries/final-checks.json；node/node-results.json` |
| I2 | 微软拼音中文模式下敲字母 | PARTIAL | 物理位置映射/repeat/防抖/不拦 Ctrl+R 的程序验证通过；微软拼音、真实法德键盘/长按抖动、原生快捷键行为须实机确认。 证据：`browser/checks.json；boundaries/final-checks.json；node/node-results.json` |
| I3 | 按 F9 | PASS | F9 日志、忽略功能键、实际屏幕点击及共用 dispatch 通过。 证据：`browser/checks.json；MCP tutorial-practice；boundaries/final-checks.json` |
| I4 | 长按一个键 | PARTIAL | 物理位置映射/repeat/防抖/不拦 Ctrl+R 的程序验证通过；微软拼音、真实法德键盘/长按抖动、原生快捷键行为须实机确认。 证据：`browser/checks.json；boundaries/final-checks.json；node/node-results.json` |
| I5 | 快速同键抖动 | PARTIAL | 物理位置映射/repeat/防抖/不拦 Ctrl+R 的程序验证通过；微软拼音、真实法德键盘/长按抖动、原生快捷键行为须实机确认。 证据：`browser/checks.json；boundaries/final-checks.json；node/node-results.json` |
| I6 | 按 Shift / Ctrl / 退格 / 回车 / 方向键 | PASS | F9 日志、忽略功能键、实际屏幕点击及共用 dispatch 通过。 证据：`browser/checks.json；MCP tutorial-practice；boundaries/final-checks.json` |
| I7 | 点屏幕键盘 | PASS | F9 日志、忽略功能键、实际屏幕点击及共用 dispatch 通过。 证据：`browser/checks.json；MCP tutorial-practice；boundaries/final-checks.json` |
| I8 | `Ctrl+R` / `F5` / `F12` | PARTIAL | 物理位置映射/repeat/防抖/不拦 Ctrl+R 的程序验证通过；微软拼音、真实法德键盘/长按抖动、原生快捷键行为须实机确认。 证据：`browser/checks.json；boundaries/final-checks.json；node/node-results.json` |
| V1 | `node tools/validate-levels.js` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V2 | 文件清单 | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V3 | 经济自检 | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V4 | 控制台与资源请求 | FAIL | 全链路已执行；favicon.ico 返回 404，违反零控制台错误断言；普通 UI 无应用 JS 异常。 证据：`browser/browser-events.json；favicon-http-check.json` |
| V5 | `node tools/validate-levels.js` 存档边界回归 | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V6 | `node tools/qa-regression.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V7 | 诗词阁浏览器回归 `qa-poems.html` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V8 | 仓库内容与测试存档来源门禁 | NOT_RUN | 本轮是本地搭建和功能回归，未提交/发布；未重做 Git 全历史、素材发布与远端权限门禁。 证据：`—` |
| V9 | `node tools/qa-sprite-alpha.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V10 | `node tools/qa-elsa.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V11 | `node tools/qa-pikachu.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V12 | `node tools/qa-character-swaps.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |
| V13 | `node tools/qa-tts.cjs` | PASS | 本轮全部自动化脚本已实际执行，通过；V7 单独 47 项，无 JS 异常。 证据：`node/suite-results.json；browser/poems-output.txt` |

## 复跑与证据

在 `E:\workspace\ai-test-agent` 下执行（服务需已启动）：

```powershell
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/run_mcp.py run
node data/test-runs/typing-game-20261003-mcp/node/run-regression.cjs
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/run_browser.py
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/run_boundaries.py
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/run_navigation.py
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/final_smoke.py
.venv\Scripts\python.exe -u data/test-runs/typing-game-20261003-mcp/finalize.py
```

`run_mcp.py setup` 仅用于专用测试项目的初次创建/配置，不必在每轮重复。下载文件、坏档夹具、截图和 JSON 均在本目录。`browser/isolated-persistent-profile` 是测试专用目录，不是玩家默认 profile。

取证索引：[summary.json](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/summary.json)、[coverage-matrix.json](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/coverage-matrix.json)、[浏览器断言](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/browser/checks.json)、[补充导航/Edge](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/navigation/checks.json)、[补充边界断言](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/boundaries/final-checks.json)、[控制台和请求记录](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/browser/browser-events.json)、[Node 套件](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/node/suite-results.json)、[诗词阁 47 项](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/browser/poems-output.txt)、[109 张立绘数值](E:/workspace/ai-test-agent/data/test-runs/typing-game-20261003-mcp/browser/sprite-quality.json)。

早期浏览器选择、选择器/文案和观察钩子的测试脚本问题保留在 `mcp-initial-chromium`、`mcp-chrome-authoring-v1`、`browser/harness-v1`、`browser/harness-v2`。`boundaries/clock-fixture-v1.json` 的“22 恰好达标”失败来自夹具时钟浮点相减的精度误差，已改用整数毫秒/整数计数重测通过；“启动即重置额度”是错误期望，实际按进入游玩后的 tickPlay 重置，本轮真实进入街机验证通过。上述均不登记为产品缺陷。

报告生成前重算 Node 保存的源文件 SHA-256，游戏测试文件/代码/素材配置未发生改变。没有提交 Git、推送、发布、吊销凭据或改远端权限。
