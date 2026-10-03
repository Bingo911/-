/* 服装商店 + 试衣间。买下的服装永久拥有，可以随时换回默认造型。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  /* 买一件或穿一件都会整页重绘，筛选条件存在这里，不然每买一次就退回「全部」
     并且滚回顶部——孩子刚在「幻想冒险」里挑到第 6 个，点一下就全没了。 */
  var mem = { theme: '全部', afford: false };

  KZ.Scenes.add('shop', {
    enter: function (host, arg) {
      if (!KZ.Save.data.charId) { KZ.Scenes.go('cover'); return; }
      var save = KZ.Save;
      var charId = arg.charId || save.data.charId;
      var ch = KZ.Costumes.char(charId);
      var equipped = save.equippedOf(charId);

      var wrap = U.el('div', 'wrap');
      U.add(wrap, U.el('h2', 'page-title', '服装商店'),
        U.el('p', 'page-sub', '用闯关攒下的积分换服装。默认造型永远免费，买了的不会丢。'));

      var shop = U.el('div', 'shop');

      /* ---- 左：试衣间 ---- */
      var dress = U.el('div', 'dressup');
      var fig = U.el('div', 'dressup__fig');
      var nm = U.el('div', 'dressup__name', ch.name);
      var cur = U.el('div', 'muted', '现在穿着：—');
      var pts = U.el('div', 'fit__price', '积分 ' + save.data.points);
      U.add(dress, fig, nm, cur, pts);

      var switchRow = U.el('div', 'row');
      switchRow.style.marginTop = '12px';
      switchRow.style.flexWrap = 'wrap';
      var i, c, b;
      for (i = 0; i < KZ.Costumes.chars.length; i++) {
        c = KZ.Costumes.chars[i];
        b = U.el('button', 'btn btn--sm ' + (c.id === charId ? '' : 'btn--plain'), c.name);
        b.type = 'button';
        (function (id) { U.on(b, 'click', function () { KZ.Sfx.click(); KZ.Scenes.go('shop', { charId: id }); }); })(c.id);
        U.add(switchRow, b);
      }
      U.add(dress, switchRow);

      var back = U.el('button', 'btn btn--plain btn--sm', '回到地图');
      back.type = 'button';
      U.on(back, 'click', function () { KZ.Scenes.go('map'); });
      U.add(dress, back);
      U.add(shop, dress);

      /* ---- 右：服装格子 ---- */
      var right = U.el('div', 'col');
      var filters = U.el('div', 'row');
      var themes = ['全部', '职业体验', '幻想冒险', '节日搞怪'];
      var state = { theme: arg.keep ? mem.theme : '全部', afford: arg.keep ? mem.afford : false };
      var grid = U.el('div', 'grid');

      function paint() {
        U.clear(grid);
        var list = KZ.Costumes.ofChar(charId), i2, of, cell, cellFig, owned, isOn, price, btnBuy, shown = 0;
        for (i2 = 0; i2 < list.length; i2++) {
          of = list[i2];
          if (state.theme !== '全部' && of.theme !== state.theme) continue;
          /* 「只买得起的」= 还没买、立绘已就位、且积分够。已买下的和免费默认造型都不在
             这一栏里（它们不是「能买的东西」），所以成交后必须退回全量视图，见下面的 mem.afford。 */
          if (state.afford && (of.default || save.owned(of.id) || !KZ.Costumes.artReady(of.id) || of.price > save.data.points)) continue;
          owned = of.default || save.owned(of.id);
          isOn = of.o === equipped;
          cell = U.el('div', 'fit r-' + (of.rarity || 1) + (owned ? ' is-owned' : '') + (isOn ? ' is-on' : ''));
          cellFig = U.el('div', 'fit__fig');
          U.add(cell, cellFig, U.el('div', 'fit__name', of.name), U.el('span', 'fit__r', of.rarityName));
          /* 默认造型的主题就叫「默认」，跟稀有度牌子重复，省掉一行 */
          if (!of.default) U.add(cell, U.el('div', 'muted', of.theme));
          price = U.el('div', 'fit__price', of.default ? '免费' : of.price + ' 积分');
          U.add(cell, price);

          if (!owned && of.price > save.data.points) {
            cell.classList.add('is-poor');
            btnBuy = U.el('button', 'btn btn--sm', '还差 ' + (of.price - save.data.points));
            btnBuy.disabled = true;
          } else if (owned) {
            btnBuy = U.el('button', 'btn btn--sm ' + (isOn ? 'btn--plain' : ''), isOn ? '穿着中' : '穿上');
          } else {
            btnBuy = U.el('button', 'btn btn--sm', '买下');
          }
          btnBuy.type = 'button';
          /* 立绘还没画好的衣服不卖：攒一周积分换一件看不见的衣服，是这一版最容易
             发生的亏。画完一个形象就在 28-data-costumes.js 的 PAINTED 里加它的 id，
             这一条自己就放开了，不用回来改这里。 */
          if (!owned && !KZ.Costumes.artReady(of.id)) {
            cell.classList.add('is-poor');
            btnBuy.disabled = true;
            btnBuy.textContent = '画好才卖';
          }
          if (!btnBuy.disabled) {
            (function (outfit, had) {
              U.on(btnBuy, 'click', function () {
                KZ.Sfx.unlock();
                if (!had) {
                  if (!save.buy(outfit.id, outfit.price)) { KZ.Sfx.wrong(); return; }
                  KZ.Sfx.coin();
                  save.equip(charId, outfit.o);
                  if (charId === save.data.charId) { KZ.Shell.bumpPoints(); }
                } else {
                  save.equip(charId, outfit.o);
                  KZ.Sfx.click();
                }
                /* 「只买得起的」会把已拥有的筛掉，刚买下那一刻这件衣服会凭空消失。
                   所以成交后退回全量视图，让新衣服留在格子里马上能穿。 */
                mem.afford = false;
                KZ.Scenes.go('shop', { charId: charId, keep: true });
              });
            })(of, owned);
          }
          U.add(cell, btnBuy);
          /* 卖不卖已经由 PAINTED 当场决定了，没必要再去请求一张注定不存在的图：
             没画好的 7 件一次逛店就是 7 条 ERR_FILE_NOT_FOUND，真出问题的时候反而看不见。 */
          if (KZ.Costumes.artReady(of.id)) {
            (function (host, box, outfitId) {
              KZ.Sprites.mount(host, outfitId, function (res) {
                if (res) return;
                /* 表里说画好了、文件却不在（被人改名或删掉）：同样要说清楚 */
                U.add(box, U.el('div', 'fit__note', '立绘文件不在'));
              });
            })(cellFig, cell, of.id);
          } else {
            U.add(cellFig, U.el('div', 'fit__ph fit__ph--miss', '缺图'));
            U.add(cell, U.el('div', 'fit__note', '立绘还没画好'));
          }
          U.add(grid, cell);
          shown++;
        }
        /* 筛选凑空了要给一句人话，否则孩子以为商店坏了 */
        if (!shown) U.add(grid, U.el('p', 'muted center', state.afford ? '这一类里没有你现在买得起的，先去闯两关。' : '这一类还没有服装。'));
      }

      function paintFilters() {
        U.clear(filters);
        var j, tb;
        for (j = 0; j < themes.length; j++) {
          (function (t) {
            tb = U.el('button', 'world-tab' + (state.theme === t && !state.afford ? ' is-on' : ''), t);
            tb.type = 'button';
            tb.style.minHeight = '44px';
            tb.style.fontSize = '17px';
            U.on(tb, 'click', function () { state.theme = t; state.afford = false; mem.theme = t; mem.afford = false; KZ.Sfx.click(); paintFilters(); paint(); });
            U.add(filters, tb);
          })(themes[j]);
        }
        var free = U.el('button', 'world-tab' + (state.afford ? ' is-on' : ''), '只买得起的');
        free.type = 'button';
        free.style.minHeight = '44px';
        free.style.fontSize = '17px';
        U.on(free, 'click', function () { state.afford = !state.afford; mem.afford = state.afford; KZ.Sfx.click(); paintFilters(); paint(); });
        U.add(filters, free);
      }

      U.add(right, filters, grid);
      U.add(shop, right);
      U.add(wrap, shop);
      U.add(host, wrap);

      paintFilters();
      paint();
      KZ.Sprites.mount(fig, charId + '-' + equipped, function (res, meta) {
        var of = KZ.Costumes.byId(charId + '-' + equipped);
        cur.textContent = '现在穿着：' + (of ? of.name : equipped);
        if (meta && meta.error) cur.textContent = '现在穿着：—（立绘缺图）';
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
