# 小雷 → 皮卡丘：替换与回归记录

日期：2026-10-02。

角色 c8 改名皮卡丘，描述更新为黄色身体、红脸颊、黑耳尖和闪电尾巴。八张造型图片都替换为现成皮卡丘素材，名称按实际动作、帽子和道具调整。图片原封不动接入，保留签名及透明通道。沿用已有 sourceAlpha 渲染分支，本次没有修改渲染器。

角色/服装编号、价格、稀有度、主题、路径保持原值。其他角色配置不变。部分造型是不同姿态，侦探造型来自电影角色，电光冲锋为三维游戏角色，礼帽茶会是插画，具体风格在截图中可见。来源与原图 URL 见 `../../assets/sprites/SOURCES.md`。

| 验证 | 结果 | 证据 |
|---|---|---|
| qa-pikachu.cjs | 144 件服装元数据一致；其他角色配置不变；八张素材与下载原图逐字节一致；八种小雷旧档穿戴状态的积分、已购造型、装备编号保留 | compatibility-results.json |
| qa-regression.cjs（输出到本目录） | 14 PASS / 0 FAIL，包含 46 关、144 件服装、161 类坏档校验 | regression/node-results.json、regression/validator-output.txt |
| qa-elsa.cjs | 爱莎八张图片和八种旧档穿戴状态通过；服装基础元数据不变；明确允许本次 c8 替换 | qa-elsa.json |
| qa-character-swaps.cjs | 熊二、阿奇 16 种旧档穿戴状态通过；c8 当前名称期望更新为皮卡丘 | qa-character-swaps.json |
| 浏览器实际渲染器 | 八张图均完成，需复核 0、失败 0、缺图 0；目视耳尖、尾巴完整，未出现烧入的棋盘格背景 | ui-results.json、qa-screenshot.png |
| 角色选择 → 开始 → 商店 | 顶栏显示皮卡丘；经典皮卡丘免费穿着中；八个名称和原价格正确；控制台 error/warn 为空 | shop-screenshot.png、console.json |
| localhost HTTP 图片请求 | 八张全部 200、image/png，响应与本地原图逐字节一致 | http-results.json |

UI 测试使用 127.0.0.1 的测试存档，积分 133、星数 3 保留，没有操作 localhost 的玩家存档。旧图及配置备份保存在本目录 originals/ 和 costumes-before.js。本轮复核未发现本次替换引入的功能问题。
