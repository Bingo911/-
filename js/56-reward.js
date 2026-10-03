/* 结算页：星星 → 金币 → 解锁提示，三段错开动画。所有关卡共用这一个组件。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  function starRow(n) {
    var box = U.el('div', 'stars'), i, s;
    for (i = 0; i < 3; i++) {
      s = U.el('i', i < n ? 'on' : '', '★');
      box.appendChild(s);
    }
    return box;
  }

  function line(label, value) {
    var d = U.el('div', 'row');
    d.style.justifyContent = 'center';
    d.style.gap = '8px';
    U.add(d, U.el('span', 'muted', label), U.el('b', null, value));
    return d;
  }

  var R = {
    show: function (res, lv, outcome, onClose) {
      var body = [];
      var passed = res.stars >= 1;

      /* 练习模式不计星也不解锁，把三颗亮星画出来会让孩子以为过关了 */
      if (res.mode === 'practice') {
        var pr = U.el('div', 'stars');
        for (var pi = 0; pi < 3; pi++) pr.appendChild(U.el('i', '', '☆'));
        body.push(pr);
      } else {
        body.push(starRow(res.stars));
      }
      body.push(U.el('p', 'overlay__sub',
        res.mode === 'practice' ? '练习完成，这一局不计星、不解锁' :
        passed ? '过关啦！' : (res.done === 0 ? '还没打出完整的字，再来一次' : '差一点点，再试一次就好')));

      var stats = U.el('div', 'col');
      stats.style.marginTop = '14px';
      U.add(stats,
        line('速度', res.speed + ' ' + U.SPEED_UNIT[lv.unit]),
        line('准确率', res.acc + '%'),
        line('完成', res.done + ' / ' + res.total + (res.skipped ? '（跳过 ' + res.skipped + '）' : '')),
        line('最高连击', '×' + res.maxCombo));
      body.push(stats);

      if (res.skipped > 0) {
        body.push(U.el('p', 'notice', '这一局有跳过，所以最多只能拿 2 星。下次慢一点、看准再打。'));
      }

      var coins = U.el('div', 'coins', '+' + outcome.gained + ' 积分');
      coins.style.marginTop = '16px';
      body.push(coins);
      /* first 是「以前没有真正通关过」，时间到 0 星的那一局也是 first，
         不加 passed 就会在孩子面前写一句「第一次通关这关」——明明没通关。 */
      if (passed && outcome.first) body.push(U.el('p', 'center muted', '第一次通关这关'));
      if (passed && outcome.up) body.push(U.el('p', 'center', '⭐ 星级提升啦！'));

      var affordable = cheapestAffordable();
      if (affordable) {
        body.push(U.el('p', 'notice', '商店里有你能买的服装了：' + affordable.charName + ' 的「' + affordable.name + '」，' + affordable.price + ' 积分。'));
      }

      var acts = [];
      if (passed) {
        var next = nextLevel(lv);
        if (next && KZ.Levels.isUnlocked(next.id, KZ.Save)) {
          acts.push({ text: '下一关 ' + next.name, primary: true, on: function () { KZ.Scenes.playLevel(next.id, 'challenge'); } });
        }
        acts.push({ text: '服装商店', on: function () { KZ.Scenes.go('shop'); } });
        acts.push({ text: '回到地图', on: function () { onClose(); } });
      } else {
        acts.push({ text: '再来一次', primary: true, on: function () { KZ.Scenes.playLevel(lv.id, 'challenge'); } });
        acts.push({ text: '先练一练', on: function () { KZ.Scenes.playLevel(lv.id, 'practice'); } });
        acts.push({ text: '回到地图', on: function () { onClose(); } });
      }

      var inner = KZ.Scenes.overlay({ title: lv.name, sub: lv.goal, body: body, acts: acts });
      var i;
      var on = inner.querySelectorAll('.stars i.on');
      for (i = 0; i < on.length; i++) KZ.Sfx.star(i);
      if (outcome.gained > 0) root.setTimeout(function () { KZ.Sfx.coin(); }, 500);
    }
  };

  function nextLevel(lv) {
    var all = KZ.Levels.all(), i;
    for (i = 0; i < all.length; i++) if (all[i].id === lv.id) return all[i + 1] || null;
    return null;
  }

  function cheapestAffordable() {
    var save = KZ.Save, best = null, i, f;
    if (!save.data.charId) return null;
    for (i = 0; i < KZ.Costumes.flat.length; i++) {
      f = KZ.Costumes.flat[i];
      if (f.charId !== save.data.charId || f.default) continue;
      /* 商店不卖没画好的衣服，这里就不能喊「你有能买的了」把它引过去 */
      if (!KZ.Costumes.artReady(f.id)) continue;
      if (save.owned(f.id) || f.price > save.data.points) continue;
      if (!best || f.price < best.price) best = f;
    }
    return best;
  }

  KZ.Reward = R;
})(typeof window !== 'undefined' ? window : globalThis);
