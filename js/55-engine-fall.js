/* 掉落小游戏。一套引擎 + 四份配置（气球 / 荷叶 / 陨石 / 卷轴），不是四份代码。
   掉落物携带 codes，命中判定就是 e.code === obj.codes[obj.idx]，
   所以画布完全不接收文本输入，输入法问题与打字引擎同源。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var W = 960, H = 540;

  var SKINS = {
    A: {
      key: 'A', title: '气球消字母', shape: 'balloon', world: 'A',
      sky: ['#0d1b3d', '#1b3a6b'], speed: [46, 74], spawn: 1.25, duration: 90,
      colors: ['#ff6b6b', '#ffd166', '#7ee081', '#6ec6ff', '#c792ea'],
      tip: '气球上是什么字母，就敲那个字母'
    },
    B: {
      key: 'B', title: '荷叶跳拼音', shape: 'leaf', world: 'B',
      sky: ['#0d2b2f', '#1c5a52'], speed: [34, 58], spawn: 1.7, duration: 100,
      colors: ['#8fd694', '#6ec6ff', '#ffd166', '#f7a8c4'],
      tip: '荷叶上的拼音，把字母一个接一个敲完'
    },
    C: {
      key: 'C', title: '单词陨石', shape: 'meteor', world: 'C',
      sky: ['#1a1030', '#3a1d5a'], speed: [30, 52], spawn: 2.0, duration: 110,
      colors: ['#ff9f68', '#ffd166', '#a5f3d0', '#c4b5fd'],
      tip: '陨石上的单词要整个敲完才会碎'
    },
    D: {
      key: 'D', title: '古诗飞花', shape: 'scroll', world: 'D',
      /* 掉落速度比拼音谷还慢一档：这里要多一道「这个字念什么」的记忆，
         手上快不过脑子的时候，孩子需要的不是快，是想起来的那几秒。 */
      sky: ['#2b1a06', '#6b4a1c'], speed: [28, 46], spawn: 1.9, duration: 110,
      colors: ['#ffe6b0', '#f7d488', '#f0c07a', '#ffe9c9'],
      tip: '卷轴上是一个汉字，敲出它的拼音（不用打音调）'
    }
  };

  var g = null;

  function Obj(item, skin, r) {
    var t = KZ.Typing.buildTarget(item);
    this.text = t.text;
    /* 诗词阁的掉落物和关卡同源：眼睛看的是汉字，手指打的是拼音。
       chars/codes 全部来自拼音，画布永远收不到文本输入，判定和引擎一个口径。 */
    this.hz = t.hz || null;
    this.chars = t.chars;
    this.codes = t.codes;
    this.idx = 0;
    /* 边距要容得下最宽的那档文字块，否则长单词会贴到画布外被切掉 */
    this.x = 112 + r() * (W - 224);
    this.y = -40;
    this.vy = skin.speed[0] + r() * (skin.speed[1] - skin.speed[0]);
    this.color = U.pick(skin.colors);
    /* 掉落物是这一局的主视觉，不是装饰。画布 960×540 会被 CSS 缩到约 0.65 倍
       （768 高的窗口上 46vh），所以这里 52px 实际显示约 34px；原来只有 17px，
       屏幕上 11 个像素，八岁孩子来不及看清气球上到底是哪个字母。
       长单词收窄一档，否则八个字母的陨石会宽到互相压住。
       汉字只有一个字，不受「长单词收窄」那一档影响，固定给最大号。 */
    this.fs = this.hz ? 46 : this.text.length <= 2 ? 52 : this.text.length <= 4 ? 44 : this.text.length <= 6 ? 38 : 32;
    this.r = Math.round(this.fs * 1.7);
    this.dead = false;
    this.pop = 0;
    this.zh = null;
  }

  function start(host, skinKey) {
    var skin = SKINS[skinKey] || SKINS.A;
    var pool = KZ.Levels.arcadePool(skin.world);
    var glosses = skin.world === 'C' ? {} : null;
    if (glosses) {
      var pw = KZ.Words.arcade || [], i2;
      for (i2 = 0; i2 < pw.length; i2++) glosses[pw[i2].t] = pw[i2].zh;
    }

    var wrap = U.el('div', 'play');
    var hud = U.el('div', 'play__hud');
    function stat(v, label) {
      var d = U.el('div', 'play__stat');
      var b = U.el('b', null, String(v));
      U.add(d, b, U.el('span', null, label));
      d.num = b;
      return d;
    }
    var sScore = stat(0, '击碎');
    var sMiss = stat(0, '漏掉');
    var sTime = stat(skin.duration, '剩余秒');
    var combo = U.el('div', 'combo', '连击 ×1');
    var quit = U.el('button', 'btn btn--ghost btn--sm', '结束练习');
    quit.type = 'button';
    U.add(hud, sScore, sMiss, sTime, combo, U.el('div', 'spacer'), quit);

    var box = U.el('div', 'arcade');
    var cv = U.el('canvas');
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    U.add(box, cv);
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    var tip = U.el('p', 'hintline', skin.tip + '　·　打不完也没关系，掉到地上只是漏掉');
    var kbHost = U.el('div', 'play__kb');
    U.add(wrap, hud, box, tip, kbHost);
    U.add(host, wrap);
    KZ.Keyboard.build(kbHost, { compact: true, umlaut: skin.world === 'B' || skin.world === 'D' });

    g = {
      skin: skin, ctx: ctx, objs: [], pool: pool, glosses: glosses,
      t0: U.now(), last: U.now(), spawnAcc: 0, score: 0, miss: 0,
      combo: 0, maxCombo: 0, wrong: 0, correct: 0, raf: 0, off: null,
      ended: false, flashBad: 0, r: rngOf(+new Date()),
      scoreEl: sScore.num, missEl: sMiss.num, timeEl: sTime.num, comboEl: combo
    };

    U.on(quit, 'click', function () { end(g); });

    g.off = KZ.Keys.on(function (info) { hit(g, info); });
    g.raf = root.requestAnimationFrame(function () { loop(g); });
    return g;
  }

  function rngOf(seed) {
    /* 关卡数据用固定种子（自检可复现），自由练习不能：固定种子意味着每一局
       掉下来的东西、顺序、速度完全一样，孩子第二局就开始背答案而不是练打字。 */
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }

  function hit(s, info) {
    if (s.ended || KZ.Scenes.isOpen()) return;
    var best = null, i, o;
    for (i = 0; i < s.objs.length; i++) {
      o = s.objs[i];
      if (o.dead) continue;
      if (o.codes[o.idx] !== info.code) continue;
      var cell = o.chars[o.idx];
      if (!KZ.Typing.accepts(cell, info, false)) continue;
      if (!best || o.y > best.y) best = o;
    }
    if (best) {
      best.idx++;
      s.correct++;
      s.combo++;
      KZ.Keyboard.flash(info.code, true);
      KZ.Sfx.key();
      if (best.idx >= best.chars.length) {
        best.dead = true;
        best.pop = U.now();
        s.score++;
        s.combo += 2;
        KZ.Sfx.target();
        /* 飞花掉的是单个字，句子不在眼前，念汉字会把多音字念错（见 → jiàn，
           可孩子刚敲的是 xian）。这里要的是「你刚打的那个音」，用代表字念音节。 */
        if (s.skin.world === 'D') KZ.Tts.speak(best.text, 'pinyin');
        else if (s.glosses && s.glosses[best.text]) KZ.Tts.speak(best.text, 'en');
        else if (s.skin.world === 'B') KZ.Tts.speak(best.text, 'pinyin');
      }
      info.handled = true;
    } else {
      s.combo = 0;
      s.wrong++;
      s.flashBad = U.now();
      KZ.Keyboard.flash(info.code, false);
      KZ.Sfx.wrong();
      info.handled = true;
    }
    /* 打通一整个东西额外 +2 连击，所以最高连击要在奖励之后才采样，
       否则结算页和按连计分的奖励每破一个都少算 2。 */
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    combo(s);
  }

  function combo(s) {
    var m = s.combo >= 30 ? 5 : s.combo >= 20 ? 4 : s.combo >= 12 ? 3 : s.combo >= 5 ? 2 : 1;
    s.comboEl && (s.comboEl.textContent = '连击 ×' + m + (s.combo >= 5 ? ' (' + s.combo + ')' : ''));
  }

  function spawn(s) {
    if (!s.pool.length) return;
    var text = s.pool[Math.floor(s.r() * s.pool.length)];
    var o = new Obj(text, s.skin, s.r);
    /* 一个字符都没拆出来的空壳（词库里混进打不出的符号）只能在这里认掉：
       构造函数里 return 是拦不住 new 的。 */
    if (!o.chars.length) return;
    if (s.glosses) o.zh = s.glosses[text] || null;
    s.objs.push(o);
    if (s.objs.length > 9) {
      var k = s.objs.shift();
      if (!k.dead) s.miss++;
    }
  }

  function loop(s) {
    if (s.ended) return;
    var now = U.now();
    /* 顶栏的「设置」和「现在休息一次」什么时候都能点，弹层盖下来就必须把这一局一起冻住：
       否则孩子在读说明，东西还在掉、倒计时还在走、按键还在给看不见的局打分。 */
    if (KZ.Scenes.isOpen()) {
      if (!s.pausedAt) s.pausedAt = now;
      s.raf = root.requestAnimationFrame(function () { loop(s); });
      return;
    }
    if (s.pausedAt) { s.t0 += now - s.pausedAt; s.last = now; s.pausedAt = 0; }
    var dt = Math.min(0.05, (now - s.last) / 1000);
    s.last = now;
    var el = (now - s.t0) / 1000;
    var left = s.skin.duration - el;
    if (left <= 0) { end(s); return; }

    s.spawnAcc += dt;
    var interval = s.skin.spawn * Math.max(0.55, 1 - el / s.skin.duration * 0.45);
    while (s.spawnAcc >= interval) { s.spawnAcc -= interval; spawn(s); }

    var i;
    for (i = 0; i < s.objs.length; i++) {
      if (!s.objs[i].dead) s.objs[i].y += s.objs[i].vy * dt;
    }
    s.objs = s.objs.filter(function (o) {
      if (o.dead && now - o.pop > 320) return false;
      if (!o.dead && o.y > H + 30) { s.miss++; s.combo = 0; return false; }
      return true;
    });

    /* 自由练习也是盯着屏幕用眼，不计进连续时长的话，只玩街机半小时永远不会触发护眼提醒 */
    if (now - (s.lastPlay || 0) >= 250) { s.lastPlay = now; KZ.Save.tickPlay(); }

    draw(s, left);
    s.raf = root.requestAnimationFrame(function () { loop(s); });
  }

  function draw(s, left) {
    var c = s.ctx, sk = s.skin, i, o;
    var grd = c.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, sk.sky[0]);
    grd.addColorStop(1, sk.sky[1]);
    c.fillStyle = grd;
    c.fillRect(0, 0, W, H);

    /* 危险线 */
    c.strokeStyle = 'rgba(255,255,255,.18)';
    c.setLineDash([10, 10]);
    c.beginPath(); c.moveTo(0, H - 26); c.lineTo(W, H - 26); c.stroke();
    c.setLineDash([]);

    for (i = 0; i < s.objs.length; i++) {
      o = s.objs[i];
      drawObj(c, o, sk);
    }

    if (U.now() - s.flashBad < 160) {
      c.fillStyle = 'rgba(224,74,74,.16)';
      c.fillRect(0, 0, W, H);
    }

    s.timeEl && (s.timeEl.textContent = String(Math.ceil(left)));
    s.scoreEl && (s.scoreEl.textContent = String(s.score));
    s.missEl && (s.missEl.textContent = String(s.miss));
    var next = null;
    for (i = 0; i < s.objs.length; i++) {
      if (!s.objs[i].dead && (!next || s.objs[i].y > next.y)) next = s.objs[i];
    }
    /* 逐帧 setNext 会把五十多个键帽的 classList 全部过一遍，下一键其实很少变 */
    var nc = next ? next.codes[next.idx] : '';
    if (nc !== s.nextShown) {
      s.nextShown = nc;
      KZ.Keyboard.setNext(next ? [next.codes[next.idx]] : []);
    }
  }

  function drawObj(c, o, sk) {
    var alpha = 1, scale = 1;
    if (o.dead) {
      var k = (U.now() - o.pop) / 320;
      alpha = 1 - k;
      scale = 1 + k * 0.6;
    }
    c.save();
    c.globalAlpha = Math.max(0, alpha);
    c.translate(o.x, o.y);
    c.scale(scale, scale);

    /* 诗词阁的卷轴要画两行（汉字 + 拼音进度），和下面三种单行形状不是一个画法 */
    if (o.hz) { drawPoemObj(c, o); c.restore(); return; }

    var txt = o.text.slice(0, Math.min(o.text.length, o.idx + 6));
    c.font = 'bold ' + o.fs + 'px ' + (sk.world === 'B' ? 'KaiTi, "Microsoft YaHei", sans-serif' : '"Segoe UI", Verdana, sans-serif');
    var tw = Math.max(o.fs * 1.9, c.measureText(txt).width + 30);
    var th = o.r;

    if (sk.shape === 'balloon') {
      c.fillStyle = o.color;
      c.beginPath();
      c.ellipse(0, 0, tw / 2, th / 2 + 6, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)';
      c.lineWidth = 3;
      c.stroke();
      c.beginPath();
      c.moveTo(0, th / 2 + 6); c.lineTo(0, th / 2 + 26);
      c.stroke();
    } else if (sk.shape === 'leaf') {
      c.fillStyle = o.color;
      c.beginPath();
      c.ellipse(0, 0, tw / 2 + 8, th / 2 + 4, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,.3)';
      c.lineWidth = 3;
      c.stroke();
    } else {
      c.fillStyle = o.color;
      roundRect(c, -tw / 2, -th / 2, tw, th, 14);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.5)';
      c.lineWidth = 2;
      c.stroke();
    }

    /* 已敲对的部分高亮，让孩子看见自己打到第几个字母 */
    var done = o.text.slice(0, o.idx);
    var rest = o.text.slice(o.idx, Math.min(o.text.length, o.idx + 8));
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#12203f';
    var x0 = -tw / 2 + 13;
    c.fillText(done, x0, 0);
    c.fillStyle = '#0b1226';
    c.fillText(rest, x0 + c.measureText(done).width, 0);
    /* 下一个键的描红 */
    if (rest.length) {
      var nw = c.measureText(rest.charAt(0)).width;
      c.strokeStyle = '#e2661a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x0 + c.measureText(done).width, th / 2 - 4);
      c.lineTo(x0 + c.measureText(done).width + nw, th / 2 - 4);
      c.stroke();
    }
    if (o.zh) {
      /* 中文释义也是正文字级，16px 缩到屏幕上只有 10 个像素 */
      c.font = '28px "Microsoft YaHei", sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#fff6da';
      c.fillText(o.zh, 0, th / 2 + 26);
    }
    c.restore();
  }

  /* 诗词阁的卷轴：上面一个字是题干，下面一行是拼音进度。
     没打出来的字母画成点 —— 长度是提示（这个字要拼几个字母），
     内容不是提示，所以打拼音这件事仍然要靠孩子自己想起来。 */
  function drawPoemObj(c, o) {
    var fs = o.fs, py = Math.round(fs * 0.52), dots = '', line, tw, th, i;
    for (i = o.idx; i < o.chars.length; i++) dots += '·';
    line = o.text.slice(0, o.idx) + dots;

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold ' + fs + 'px KaiTi, "Microsoft YaHei", sans-serif';
    tw = c.measureText(o.hz).width;
    c.font = 'bold ' + py + 'px "Segoe UI", Verdana, sans-serif';
    tw = Math.max(tw, c.measureText(line).width) + 30;
    th = fs + py + 20;

    c.fillStyle = o.color;
    roundRect(c, -tw / 2, -th / 2, tw, th, 10);
    c.fill();
    /* 两端的轴杆：和其他三种形状一眼分得开 */
    c.fillStyle = '#8a5a2b';
    roundRect(c, -tw / 2 - 5, -th / 2 - 4, 8, th + 8, 4); c.fill();
    roundRect(c, tw / 2 - 3, -th / 2 - 4, 8, th + 8, 4); c.fill();

    c.font = 'bold ' + fs + 'px KaiTi, "Microsoft YaHei", sans-serif';
    c.fillStyle = '#22304d';
    c.fillText(o.hz, 0, -th / 2 + 8 + fs / 2);
    /* 拼音进度：已敲对的字母是绿的，还没敲的只有点 */
    c.font = 'bold ' + py + 'px "Segoe UI", Verdana, sans-serif';
    var lw = c.measureText(line).width;
    var doneW = c.measureText(o.text.slice(0, o.idx)).width;
    c.textAlign = 'left';
    c.fillStyle = '#1f7a3d';
    c.fillText(o.text.slice(0, o.idx), -lw / 2, th / 2 - 7 - py / 2);
    c.fillStyle = '#7a6335';
    c.fillText(dots, -lw / 2 + doneW, th / 2 - 7 - py / 2);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function end(s) {
    if (s.ended) return;
    s.ended = true;
    root.cancelAnimationFrame(s.raf);
    if (s.off) s.off();
    KZ.Tts.stop();
    KZ.Keyboard.setNext([]);
    var raw = s.score * 6 + Math.min(60, Math.floor(s.maxCombo / 2));
    var save = KZ.Save;
    save.rollDaily();
    var cap = 200;
    var room = Math.max(0, cap - (save.data.daily.arcade || 0));
    var gained = Math.min(raw, room);
    save.data.daily.arcade = (save.data.daily.arcade || 0) + gained;
    save.addPoints(gained);
    save.save();
    KZ.Sfx.clear();
    /* 一上来就按「结束练习」的孩子 correct+wrong 都是 0，U.pct 给 0% 看起来像
       考砸了。这里要说的是「还没开始」，不是「全错」。 */
    var accTxt = (s.correct + s.wrong) ? U.pct(s.correct, s.correct + s.wrong) + '%' : '还没开始敲';
    var body = [
      U.el('p', 'center', '击碎 ' + s.score + ' 个　漏掉 ' + s.miss + ' 个　最高连击 ' + s.maxCombo),
      U.el('p', 'center muted', '准确率 ' + accTxt),
      U.el('div', 'coins', '+' + gained + ' 积分'),
      U.el('p', 'center muted', room <= 0 ? '今天的练习积分已经拿满了，明天再来。' : '自由练习每天最多 ' + cap + ' 积分，防止只玩小游戏不闯关。')
    ];
    KZ.Scenes.overlay({ title: s.skin.title + ' 结束', body: body, acts: [
      { text: '再来一局', primary: true, keepOpen: true, on: function () { KZ.Scenes.closeOverlay(); KZ.Scenes.go('arcade', { world: s.skin.key }); } },
      { text: '换个玩法', keepOpen: true, on: function () {
        var wl = KZ.Levels.WORLD_LIST, n = wl.indexOf(s.skin.key);
        KZ.Scenes.closeOverlay();
        KZ.Scenes.go('arcade', { world: wl[(n + 1) % wl.length] });
      } },
      { text: '回地图', on: function () { KZ.Scenes.go('map'); } }
    ] });
  }

  KZ.Scenes.add('arcade', {
    enter: function (host, arg) {
      if (!KZ.Save.data.charId) { KZ.Scenes.go('cover'); return; }
      var key = SKINS[arg.world] ? arg.world : 'A';
      var bar = U.el('div', 'worlds');
      /* 页签跟着 WORLD_LIST：新世界的玩法不用改这个文件就能选到 */
      KZ.Levels.WORLD_LIST.forEach(function (w) {
        var b = U.el('button', 'world-tab' + (w === key ? ' is-on' : ''), SKINS[w].title);
        b.type = 'button';
        U.on(b, 'click', function () { KZ.Sfx.click(); KZ.Scenes.go('arcade', { world: w }); });
        U.add(bar, b);
      });
      var head = U.el('div', 'wrap');
      U.add(head, U.el('h2', 'page-title', '自由练习'), bar);
      U.add(host, head);
      var inner = U.el('div', 'wrap');
      inner.style.paddingTop = '0';
      U.add(host, inner);
      /* 走 KZ.Fall.start 而不是模块里的 start：一局的状态只活在这个闭包里，
         从外面（质检页、以后的家长报告）想看掉落物就只能包住这个入口。 */
      g = KZ.Fall.start(inner, key);
    },
    leave: function () {
      /* 一局正常到点结束时 ended 已经是 true 了，不能再靠它决定是否解绑，
         否则每玩一局就往键盘总线上留一个永远不退订的监听器。 */
      if (g) {
        g.ended = true;
        root.cancelAnimationFrame(g.raf);
        if (g.off) g.off();
        KZ.Keyboard.setNext([]);
      }
      g = null;
    }
  });

  KZ.Fall = { start: start, SKINS: SKINS };
})(typeof window !== 'undefined' ? window : globalThis);
