/* 封面 / 选形象 / 世界地图 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var picked = null;
  var worldTab = 'A';

  KZ.Scenes.add('cover', {
    enter: function (host) {
      picked = KZ.Save.data.charId;
      var wrap = U.el('div', 'cover');

      var logo = U.el('h1', 'cover__logo');
      U.add(logo, U.el('span', null, '打字小勇'), U.el('em', null, '士'));
      U.add(wrap, logo);
      U.add(wrap, U.el('p', 'cover__tip',
        '从指法到拼音、古诗、英文单词，一关一关往上打。攒下的积分可以给自己的形象换服装。'));

      var grid = U.el('div', 'pick');
      var i, ch, item, fig, name, desc;
      for (i = 0; i < KZ.Costumes.chars.length; i++) {
        ch = KZ.Costumes.chars[i];
        item = U.el('button', 'pick__item');
        item.type = 'button';
        fig = U.el('div', 'pick__fig');
        KZ.Sprites.mount(fig, KZ.Costumes.defaultId(ch.id));
        name = U.el('div', 'pick__name', ch.name);
        desc = U.el('div', 'pick__desc', ch.desc);
        U.add(item, fig, name, desc);
        if (picked === ch.id) item.classList.add('is-sel');
        (function (id) {
          U.on(item, 'click', function () {
            picked = id;
            var kids = grid.children, j;
            for (j = 0; j < kids.length; j++) kids[j].classList.toggle('is-sel', j === indexOfChar(id));
            KZ.Sfx.click();
          });
        })(ch.id);
        U.add(grid, item);
      }
      U.add(wrap, grid);

      U.add(wrap, U.el('p', 'cover__tip', '需要一台带真实键盘的电脑。用鼠标只能点屏幕键盘，练不到手指。'));

      /* 18 个形象把封面拉到六千多像素高，开始按钮要是跟着排在最后，
         孩子翻十几屏才找得到它 —— 所以整条 CTA 钉在滚动区底部。 */
      var cta = U.el('div', 'cover__cta');
      var go = U.el('button', 'btn', KZ.Save.data.charId ? '开始闯关' : '就它了，开始！');
      go.type = 'button';
      go.style.fontSize = '26px';
      go.style.padding = '14px 44px';
      U.on(go, 'click', function () {
        if (!picked) { KZ.Scenes.overlay({ title: '先选一个形象', acts: [{ text: '好', primary: true, on: function () { KZ.Scenes.closeOverlay(); } }] }); return; }
        KZ.Save.setChar(picked);
        KZ.Sfx.unlock();
        KZ.Sfx.clear();
        var ch2 = KZ.Costumes.char(picked);
        if (ch2.hint) {
          KZ.Scenes.overlay({ title: '关于 ' + ch2.name, body: [U.el('p', null, ch2.hint)], acts: [{ text: '我知道了', primary: true, on: function () { KZ.Scenes.go('map', { world: 'A' }); } }] });
        } else {
          KZ.Scenes.go('map', { world: 'A' });
        }
      });
      U.add(cta, go);

      if (KZ.Save.data.charId) {
        var back = U.el('button', 'btn btn--ghost', '继续上次的进度');
        back.type = 'button';
        U.on(back, 'click', function () { KZ.Scenes.go('map'); });
        U.add(cta, back);
      }
      U.add(wrap, cta);
      U.add(host, wrap);
    }
  });

  function indexOfChar(id) {
    var i;
    for (i = 0; i < KZ.Costumes.chars.length; i++) if (KZ.Costumes.chars[i].id === id) return i;
    return 0;
  }

  KZ.Scenes.add('map', {
    enter: function (host, arg) {
      if (!KZ.Save.data.charId) { KZ.Scenes.go('cover'); return; }
      if (arg.world) worldTab = arg.world;
      var wrap = U.el('div', 'wrap');
      U.add(wrap, U.el('h2', 'page-title', '闯关地图'),
        U.el('p', 'page-sub', '每关最多 3 星，拿到 1 星就能解锁下一关。'));

      var tabs = U.el('div', 'worlds');
      /* 页签跟着 WORLD_LIST 走：新增一个世界时这里不跟着改，
         地图就永远看不见它，孩子根本不知道还有这么一排关。 */
      KZ.Levels.WORLD_LIST.forEach(function (w) {
        var meta = KZ.Levels.WORLDS[w];
        var lv = KZ.Levels.byWorld(w);
        var got = 0, i, unlocked = true;
        for (i = 0; i < lv.length; i++) got += KZ.Save.stars(lv[i].id);
        if (!KZ.Levels.isUnlocked(lv[0].id, KZ.Save)) unlocked = false;
        var b = U.el('button', 'world-tab' + (worldTab === w ? ' is-on' : ''));
        b.type = 'button';
        U.add(b, U.el('span', null, meta.name),
          U.el('small', null, unlocked ? (got + ' / ' + lv.length * 3 + ' ★') : '需要先通过 ' + KZ.Levels.lockedBy(lv[0].id)));
        U.on(b, 'click', function () { KZ.Sfx.click(); KZ.Scenes.go('map', { world: w }); });
        U.add(tabs, b);
      });
      U.add(wrap, tabs);

      /* 一进地图就要看得见自己走到哪儿了：不写这一行，孩子只能一格一格数星星。
         教学关永远不给星（练习不计分），用「看过指法图」算走过，否则这一行会一直少一关。 */
      var allLv = KZ.Levels.all(), hereLv = KZ.Levels.byWorld(worldTab);
      var passed = function (l) { return KZ.Save.stars(l.id) >= 1 || (l.teach && KZ.Save.seenTeach(l.id)); };
      var doneAll = 0, doneHere = 0, q;
      for (q = 0; q < allLv.length; q++) if (passed(allLv[q])) doneAll++;
      for (q = 0; q < hereLv.length; q++) if (passed(hereLv[q])) doneHere++;
      U.add(wrap, U.el('p', 'page-sub progress',
        KZ.Levels.WORLDS[worldTab].name + ' 已过 ' + doneHere + ' / ' + hereLv.length + ' 关' +
        '　全部 ' + doneAll + ' / ' + allLv.length + ' 关'));

      /* 整个世界还锁着的时候必须说清楚为什么：不说的话孩子看到的是一排 18 把锁，
         只会以为游戏坏了。 */
      var firstLv = KZ.Levels.byWorld(worldTab)[0];
      if (firstLv && !KZ.Levels.isUnlocked(firstLv.id, KZ.Save)) {
        U.add(wrap, U.el('p', 'page-sub', KZ.Levels.WORLDS[worldTab].name + ' 还没开启：先去把 ' +
          KZ.Levels.lockedBy(firstLv.id) + ' 打出一颗星，这里就会打开。'));
      }

      var map = U.el('div', 'map');
      var path = U.el('div', 'map__path');
      var levels = KZ.Levels.byWorld(worldTab);
      var i, lv, node, starTxt, j;
      for (i = 0; i < levels.length; i++) {
        lv = levels[i];
        node = U.el('button', 'node' + (lv.boss ? ' node--boss' : ''));
        node.type = 'button';
        var open = KZ.Levels.isUnlocked(lv.id, KZ.Save);
        if (!open) node.classList.add('node--locked');
        else if (KZ.Save.stars(lv.id) >= 3) node.classList.add('node--done');
        U.add(node, U.el('div', 'node__no', lv.id + (lv.boss ? ' 关主' : lv.teach ? ' 教学' : '')),
          U.el('div', 'node__name', lv.name));
        starTxt = U.el('div', 'node__stars');
        for (j = 0; j < 3; j++) {
          var st = U.el('span', KZ.Save.stars(lv.id) > j ? 'on' : '', '★');
          starTxt.appendChild(st);
        }
        node.appendChild(starTxt);
        if (!open) node.appendChild(U.el('div', 'node__lock', '🔒'));
        (function (level, isOpen) {
          U.on(node, 'click', function () {
            if (!isOpen) {
              KZ.Sfx.wrong();
              KZ.Scenes.overlay({
                title: '这一关还没解锁',
                sub: '先去把 ' + KZ.Levels.lockedBy(level.id) + ' 打出一颗星',
                acts: [{ text: '好', primary: true, on: function () { KZ.Scenes.closeOverlay(); } }]
              });
              return;
            }
            KZ.Sfx.click();
            levelMenu(level);
          });
        })(lv, open);
        U.add(path, node);
      }
      U.add(map, path);
      U.add(map, U.el('div', 'map__note',
        /* 速度单位跟着这一世界的关卡单位走，别再按世界名猜：诗词阁和拼音谷一样是音节/分，
           写死成「A→键、B→音节、其余→词」的话，诗词阁脚下就标成了词/分钟。 */
        '速度单位：' + U.SPEED_UNIT[levels[0].unit] +
        '　准确率低于 ' + Math.min.apply(null, levels.map(function (l) { return l.accGate[0]; })) + '% 就一颗星都拿不到（越往后的关要得越高）'));
      U.add(wrap, map);

      var acts = U.el('div', 'row');
      acts.style.marginTop = '16px';
      var arc = U.el('button', 'btn btn--plain', '自由练习小游戏');
      arc.type = 'button';
      U.on(arc, 'click', function () { KZ.Scenes.go('arcade', { world: worldTab }); });
      var shop = U.el('button', 'btn btn--plain', '服装商店');
      shop.type = 'button';
      U.on(shop, 'click', function () { KZ.Scenes.go('shop'); });
      var change = U.el('button', 'btn btn--plain', '换形象');
      change.type = 'button';
      U.on(change, 'click', function () { KZ.Scenes.go('cover'); });
      U.add(acts, arc, shop, change);
      U.add(wrap, acts);

      U.add(host, wrap);
    }
  });

  function levelMenu(lv) {
    var best = KZ.Save.data.levels[lv.id] && KZ.Save.data.levels[lv.id].best;
    var body = [
      U.el('p', 'overlay__sub', lv.goal),
      /* 一共几条也写在开打之前：孩子想知道的是「这一关有多长」，而不只是限时多久 */
      U.el('p', 'center muted', '这一关共 ' + lv.raw.length + ' 条　挑战限时 ' + lv.duration + ' 秒　3 星需要 ' +
        lv.par[2] + ' ' + U.SPEED_UNIT[lv.unit] + ' 且准确率 ≥ ' + lv.accGate[2] + '%')
    ];
    /* 星数取这一条最佳成绩自己的，不能拿当前星级：两者可能来自不同的两局 */
    if (best) body.push(U.el('p', 'center', '最好成绩：' + best.speed + ' ' + U.SPEED_UNIT[lv.unit] + '　' + best.acc + '%　' + best.stars + ' 星'));
    /* 教学关把「先练一练」摆成主按钮：只有练习模式会一路提示用哪根手指，
       指法没学会就去打挑战，等于让孩子凭手感瞎蒙。 */
    var chal = { text: '开始挑战', primary: !lv.teach, on: function () { KZ.Scenes.playLevel(lv.id, 'challenge'); } };
    var prac = { text: '先练一练（不限时）', primary: !!lv.teach, on: function () { KZ.Scenes.playLevel(lv.id, 'practice'); } };
    if (lv.teach) body.push(U.el('p', 'center muted', '练习模式会一路提示「用哪根手指按哪个键」，这一关先用它练熟。'));
    KZ.Scenes.overlay({
      title: lv.id + '　' + lv.name,
      body: body,
      acts: lv.teach ? [prac, chal, { text: '取消', on: function () { } }]
        : [chal, prac, { text: '取消', on: function () { } }]
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
