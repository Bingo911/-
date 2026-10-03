# 角色替换结果

已完成熊壮（c9）→熊二、阿警（c13）→汪汪队阿奇，每个角色默认及付费服装共 8 张 PNG，使用内置 image_gen 生成并保存到项目 assets/sprites。角色编号、服装编号、价格、主题、素材路径不变。

小雷→皮卡丘与竹豆→火箭浣熊的生成被工具拦截（moderation_blocked），未改名称和原图。“竹宝”暂按项目中的竹豆理解，火箭暂按《银河护卫队》的火箭浣熊理解，尚未获得用户确认。

验证结果：

- 游戏选择形象页面已显示熊二、阿奇，浏览器没有 error/warn 日志。
- 两个角色全部 16 张立绘在真实抠图流程中通过，无警告、失败、缺图；详见 browser-results.json、all-outfits.png。
- 16 种旧档穿戴组合导入通过，积分、已购服装和当前装备均保留；全部 144 件服装编号、价格、主题和路径与替换前一致。运行 node tools/qa-character-swaps.cjs；详见 compatibility-results.json。
- 现有 14 项逻辑回归全部通过，输出单独保存于 regression/，保留此前测试报告证据。
- node tools/validate-levels.js 与 7 项语音回归通过。

generation-manifest.json 包含内置工具的完整提示词、生成源路径、每张素材的项目保存路径及被拦截的请求。originals/ 保留替换前原图，costumes-before.js 保留原角色数据。
