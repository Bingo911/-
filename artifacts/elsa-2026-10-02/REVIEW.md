# 艾雪 → 爱莎公主：替换与回归记录

日期：2026-10-02。

替换 `c7` 名称、描述和八张造型图片，使用下载的现成原图。默认造型为经典冰蓝礼服；各套服装的编号、价格、稀有度、主题、素材路径保持原值。其他角色配置保持原值。图片来源和原图 URL 见 `../../assets/sprites/SOURCES.md`。

渲染器新增显式 `sourceAlpha` 路径：保留 PNG 原有 RGBA，跳过绿幕颜色处理与碎块清理；绿幕素材继续使用原逻辑。未把素材网站的预览棋盘格当成透明通道。冬日庆典使用半身源图；加冕礼服和皇家礼服为二维插画，其他为三维角色图，这些构图和风格差异在实际截图中可见。

| 验证 | 实际结果 | 证据 |
|---|---|---|
| `node tools/validate-levels.js` | 通过；46 关、144 件服装、161 类坏档边界通过；c14–c18 未开卖是原有提示 | `regression/validator-output.txt` |
| `node tools/qa-regression.cjs`（输出到本目录 regression） | 14 PASS / 0 FAIL | `regression/node-results.json` |
| `node tools/qa-elsa.cjs` | 144 件服装元数据保持一致，其他角色配置不变；八张图与下载原图逐字节一致；艾雪八种旧档穿戴组合导入通过，积分、已购服装及装备编号保留 | `compatibility-results.json` |
| `node tools/qa-sprite-alpha.cjs` | 绿色、黑色、透明像素及 alpha 1/20/40/128/200 保留；空白图拒绝；原绿幕分支与修改前逐字节一致 | `alpha-results.json` |
| 浏览器实际渲染器显示八个造型 | 8 / 8 完成，需复核 0、失败 0、缺图 0；目视无棋盘格背景烧入、绿色衣服误删、黑袖缺损 | `ui-results.json`、`qa-screenshot.png` |
| 游戏内选择爱莎 → 开始 → 商店 | 顶栏显示爱莎公主，冰雪礼服免费穿着中，八个造型和原价格正确；控制台 error/warn 为空 | `game-screenshot.png`、`shop-screenshot.png` |
| localhost HTTP 加载八张图片 | 全部 200，image/png，响应与本地原图逐字节一致 | `http-results.json` |

UI 使用 `http://127.0.0.1:8080/` 的测试存档，积分 133 和星数 3 保持不变；没有操作 `localhost` 的玩家存档。复核未发现本次替换导致的功能问题。
