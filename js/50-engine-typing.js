/* 打字引擎。核心口径：只对 e.code 打分，绝不比对显示文本。
   错键阻挡（世界 A/B 要练的是动作正确性），但同一格连错 3 次自动放行并封顶 2 星，
   避免 8 岁孩子砸键盘弃玩。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var WINDOW = 7;
  /* 窗口按「一共多少个字符」收，不是只按条数：C9-C15 一条就是两三句，
     七条叠起来比屏幕还高，键盘被顶到折叠线以下，孩子看不见指位提示。 */
  var WINDOW_CHARS = 110;

  /* 目标有两种：字符串（A/B/C）和 {t, h, line, ...}（D：要打的拼音 + 题干的汉字）。
     题干的汉字也一并挂到返回对象上，画窗口、朗读、释义都从这一处读。 */
  function buildTarget(item) {
    var str = KZ.Levels.targetStr(item), chars = [], i, want;
    var hz = KZ.Levels.targetHanzi(item);
    for (i = 0; i < str.length; i++) {
      want = KZ.Keys.lookup(str.charAt(i));
      if (!want) continue;
      chars.push({ ch: str.charAt(i), code: want.code, strict: want.strict });
    }
    var t = { text: str, chars: chars, codes: (function () {
      var a = [], j; for (j = 0; j < chars.length; j++) a.push(chars[j].code); return a;
    })() };
    if (hz && typeof item === 'object') {
      t.hz = hz; t.line = item.line || null; t.li = item.li || 0; t.ln = item.ln || 1;
      t.poem = item.poem || ''; t.author = item.author || '';
    }
    return t;
  }

  /* 目标条里的字符节点：诗词阁把拼音包在 .poem__py 里（前面还挂着题干汉字），
     其余世界字符直接是节点的子元素。进度、命中高亮都从这里取。 */
  function charNodes(t) {
    if (!t || !t.node) return null;
    return (t.py || t.node).children;
  }

  function accepts(cell, info, caseInsensitive) {
    if (info.code !== cell.code) return false;
    if (!cell.strict) return true;
    /* 大写和 ! ? 这类符号必须真的按出那个字符 */
    if (caseInsensitive && /[A-Z]/.test(cell.ch)) return true;
    return info.ev === cell.ch;
  }

  var E = {
    session: null,

    open: function (opt) {
      var level = opt.level, mode = opt.mode || 'challenge';
      var list = level.targetsList(mode);
      var targets = [], i;
      for (i = 0; i < list.length; i++) targets.push(buildTarget(list[i]));

      var s = {
        level: level, mode: mode, targets: targets, pos: 0, cur: 0,
        /* 诗词阁的挑战模式不给拼音，也不给下一键脉冲（那等于把答案首字母念出来）。
           练习模式照样全露：练习就是给孩子看着学的。 */
        blind: !!level.blind && mode !== 'practice',
        correct: 0, wrong: 0, skipped: 0, combo: 0, maxCombo: 0,
        done: 0, errStreak: 0, started: U.now(), ended: false,
        limit: mode === 'challenge' ? level.duration : 0,
        host: opt.host, done_: opt.onFinish, off: null, timer: null,
        els: {}
      };
      E.session = s;
      render(s);
      s.off = KZ.Keys.on(function (info) { onKey(s, info); });
      /* 练习模式也要跑这个轮询：计时器走字、HUD 刷新，还有护眼用的游玩时长统计 */
      s.timer = root.setInterval(function () { tick(s); }, 250);
      tick(s);
      return s;
    },

    /* 离开关卡场景时用：悄悄拆掉这一局，不结算、不计分、不弹结算页。
       走 finish 会把中途放弃也记成一次 tries，白白扣掉重玩的 35% 折扣。 */
    discard: function () {
      var s = E.session;
      if (s && !s.ended) teardown(s);
      E.session = null;
    },

    /* 掉落小游戏复用同一套判定 */
    accepts: accepts,
    buildTarget: buildTarget
  };

  function elapsed(s) { return (U.now() - s.started) / 1000; }

  function speedOf(s) {
    var min = Math.max(1 / 60, elapsed(s) / 60);
    if (s.level.unit === 'key') return s.correct / min;
    if (s.level.unit === 'syll') return s.done / min;
    return (s.correct / 5) / min;
  }

  function accOf(s) {
    var t = s.correct + s.wrong;
    return t ? (s.correct / t) * 100 : 100;
  }

  function render(s) {
    var host = s.host;
    U.clear(host);

    var hud = U.el('div', 'play__hud');
    var stSpeed = U.el('div', 'play__stat'); U.add(stSpeed, U.el('b', null, '0'), U.el('span', null, U.SPEED_UNIT[s.level.unit]));
    var stAcc = U.el('div', 'play__stat'); U.add(stAcc, U.el('b', null, '100%'), U.el('span', null, '准确率'));
    var stLeft = U.el('div', 'play__stat'); U.add(stLeft, U.el('b', null, '0'), U.el('span', null, s.mode === 'challenge' ? '剩余秒' : '已用秒'));
    /* 进度条画的是时间（练习模式画条数），光看条说不出「还剩几条」，所以旁边再给一个数。 */
    var stProg = U.el('div', 'play__stat'); U.add(stProg, U.el('b', null, '0/' + s.targets.length), U.el('span', null, '打完条数'));
    var combo = U.el('div', 'combo', '连击 ×1');
    var bar = U.el('div', 'meter'); var fill = U.el('div', 'meter__fill'); U.add(bar, fill);
    bar.style.flex = '1 1 160px';
    U.add(hud, stSpeed, stAcc, stLeft, stProg, bar, combo, U.el('div', 'spacer'),
      btn('喇叭', function () { speakCurrent(s); }),
      btn(s.mode === 'challenge' ? '暂停' : '结束', function () {
        if (s.mode === 'challenge') pause(s); else finish(s);
      }));

    var stage = U.el('div', 'stage');
    var label = U.el('div', 'stage__label');
    U.add(label, U.el('b', null, KZ.Levels.WORLDS[s.level.world].name + ' 第 ' + s.level.idx + ' / ' + s.level.count + ' 关'),
      U.el('span', null, '　' + s.level.name + ' · ' + s.level.goal));
    var strip = U.el('div', 'targets');
    /* 练习模式（以及所有非 blind 关卡）把诗词阁的拼音整条露出来；
       挑战模式靠 CSS 盖住，打对一个字母露一个。 */
    if (!s.blind) strip.classList.add('is-open');
    var gloss = U.el('div', 'gloss');
    var hint = U.el('div', 'hintline');
    U.add(stage, label, strip, gloss, hint);

    var kbHost = U.el('div', 'play__kb');
    U.add(host, hud, stage, kbHost);

    KZ.Keyboard.build(kbHost, { compact: true, umlaut: !!KZ.Levels.WORLDS[s.level.world].umlaut });
    s.els = { stSpeed: stSpeed.firstChild, stAcc: stAcc.firstChild, stLeft: stLeft.firstChild,
      stProg: stProg.firstChild, combo: combo, fill: fill, strip: strip, gloss: gloss, hint: hint, hud: hud };
    s.kbHost = kbHost;
    drawWindow(s);
    sync(s);
  }

  function btn(text, fn) {
    var b = U.el('button', 'btn btn--ghost btn--sm', text);
    b.type = 'button';
    U.on(b, 'click', function () { KZ.Sfx.click(); fn(); });
    return b;
  }

  function drawWindow(s) {
    var strip = s.els.strip;
    U.clear(strip);
    var end = Math.min(s.targets.length, s.pos + WINDOW);
    var acc = 0, k;
    for (k = s.pos; k < end; k++) {
      acc += s.targets[k].text.length;
      /* 至少留一条：整句关当前这条本身就可能超过预算 */
      if (acc > WINDOW_CHARS && k > s.pos) { end = k; break; }
    }
    var i, t, n, box, py, j, span, cls;
    for (i = s.pos; i < end; i++) {
      t = s.targets[i];
      cls = 'target';
      if (t.hz) {
        /* 诗词阁的卡片：上面是题干的汉字，下面是答案的拼音（挑战模式盖着，逐字母露） */
        cls += ' target--poem';
      } else {
        if (s.level.world === 'B') cls += ' target--pinyin';
        else if (s.level.world === 'C') cls += ' target--latin';
        if (t.text.length > 12) cls += ' target--line';
        else if (t.text.length > 3) cls += ' target--word';
      }
      n = U.el('span', cls);
      if (i === s.pos) n.classList.add('is-cur');
      if (t.hz) {
        U.add(n, U.el('span', 'poem__hz', t.hz));
        py = U.el('span', 'poem__py');
        n.appendChild(py);
        t.py = py;
      } else {
        t.py = null;
      }
      box = t.py || n;
      for (j = 0; j < t.chars.length; j++) {
        span = U.el('span', 'ch', t.chars[j].ch);
        box.appendChild(span);
      }
      t.node = n;
      strip.appendChild(n);
    }
    if (s.pos < s.targets.length) paintChars(s, s.targets[s.pos]);
  }

  function paintChars(s, t) {
    var spans = charNodes(t);
    if (!spans) return;
    var i;
    for (i = 0; i < spans.length; i++) {
      if (i < s.cur) spans[i].classList.add('is-done');
      else spans[i].classList.remove('is-done');
    }
  }

  function speakCurrent(s) {
    var t = s.targets[s.pos];
    if (!t) return;
    /* 诗词阁的喇叭念整句，不念答案：孩子可能还没认得这个字，拼音一念出来这关就变成抄写。
       也不单念那个汉字 —— 多音字单念会念错（「风吹草低见牛羊」的见读 xiàn，
       单字只读得出 jiàn），放在句子里才和屏幕上敲的拼音对得上。 */
    if (t.hz) {
      if (t.ln > 1) KZ.Tts.speak(t.line);
      else KZ.Tts.speak(t.text, 'pinyin');
      return;
    }
    KZ.Tts.speak(t.text, s.level.world === 'B' ? 'pinyin' : (s.level.world === 'C' ? 'en' : null));
  }

  function sync(s) {
    var total = s.targets.length;
    /* 打完最后一条时 s.pos 已经越界，但顶上这几个数字仍要跟着收尾：
       不然结算页背后挂着的永远是 11/12，孩子以为还有一条没打。 */
    s.els.stSpeed.textContent = Math.round(speedOf(s));
    s.els.stAcc.textContent = Math.round(accOf(s)) + '%';
    var left = s.mode === 'challenge' ? Math.max(0, s.limit - elapsed(s)) : elapsed(s);
    s.els.stLeft.textContent = Math.round(left);
    s.els.stProg.textContent = s.done + '/' + total;
    var pct = s.mode === 'challenge' ? (1 - left / s.limit) : (s.pos / total);
    s.els.fill.style.width = Math.round(U.clamp(pct, 0, 1) * 100) + '%';
    s.els.fill.className = 'meter__fill' + (pct > 0.8 ? ' warn' : '');
    s.els.combo.textContent = '连击 ×' + comboMul(s.combo) + (s.combo >= 5 ? ' (' + s.combo + ')' : '');

    var t = s.targets[s.pos];
    if (!t) return;
    var rest = [];
    /* blind 关卡不给下一键脉冲：亮起来的那个键就是答案的第一个字母 */
    if (!s.blind && s.cur < t.chars.length) rest.push(t.chars[s.cur].code);
    KZ.Keyboard.setNext(rest);
    var g = t.text;
    var zh = s.level.glosses ? s.level.glosses[g] : null;
    U.clear(s.els.gloss);
    if (t.line) {
      /* 诗词阁这一行给的是整句诗和出处：题干汉字本来就要看的，孩子要的是「这句往下怎么念」 */
      U.add(s.els.gloss, U.el('span', 'gloss__line', t.line),
        U.el('small', null, '《' + t.poem + '》' + t.author));
    } else if (zh) { U.add(s.els.gloss, U.el('span', null, zh)); }
    else if (s.level.world === 'B' && KZ.Pinyin.tts[g.replace(/ü/g, 'v').toLowerCase()]) {
      U.add(s.els.gloss, U.el('small', null, '这个音可以读作「' + KZ.Pinyin.tts[g.replace(/ü/g, 'v').toLowerCase()] + '」'));
    }
    /* showSkip 借这一行喊 3 秒话，不能被 sync 每 250ms 刷掉；到期就自然交还 */
    var hold = s.hintUntil && U.now() < s.hintUntil;
    if (s.hintUntil && !hold) {
      s.hintUntil = 0;
      s.els.hint.classList.remove('hintline--alert');
    }
    if (!hold) {
      /* 指法这一行：练习模式哪个世界都给；指尖岛考的就是「哪根手指按哪个键」，
         下一个键本来就摊在屏幕上，报指法不泄露任何东西，所以挑战模式也给。
         拼音谷/单词城/诗词阁的挑战模式这一行留空 —— 高度是留给「跳过了…」弹出来时
         不推动下面的键盘的，诗词阁更是必须把要拼的音盖住。 */
      var tip = '';
      if (t.chars[s.cur] && (s.mode === 'practice' || s.level.unit === 'key')) {
        var cell = t.chars[s.cur], who = KZ.Keyboard.fingerTip(cell.code);
        /* 大写和 ! ? 这一档要压着 Shift 才出得来（lookup 里它们 strict:true）。
           但「要不要压」必须和计分同一个口径：A12 那种 caseStrict:false 的关小写也算对，
           再喊「按住 Shift」就是让孩子多按一个不需要的键；符号没这个豁免，感叹号只有压 Shift 敲得出。 */
        tip = (who ? (needsShift(s, cell) ? shiftTip(cell.code) : '') + '用' + who + '指按 ' + KZ.Keys.name(cell.code) : '');
      }
      s.els.hint.textContent = tip;
    }
  }

  function comboMul(c) { return c >= 30 ? 5 : c >= 20 ? 4 : c >= 12 ? 3 : c >= 5 ? 2 : 1; }

  /* Shift 用另一只手的小指：左手够的键就右手压 Shift，反过来也一样。
     手指槽位 0-4 是左手、5-9 是右手（和键盘的 FINGER_TIP 同一个编号）。 */
  function shiftTip(code) {
    return (KZ.Keyboard.fingerOf(code) < 5 ? '右手' : '左手') + '小指按住 Shift，再';
  }

  /* 「这一关不考大小写」有两个开关：关卡自己写 caseStrict:false，或者设置里把总开关关掉 */
  function caseLoose(s) {
    return s.level.caseStrict === false || !KZ.Save.data.settings.strictCase;
  }

  /* 提示行喊不喊 Shift，和 onKey 的判定同一个口径：不然要么白让孩子多按一个键，
     要么孩子照着提示按了小写却不给分。符号没有大小写这回事，永远要压 Shift。 */
  function needsShift(s, cell) {
    return cell.strict && !(caseLoose(s) && /[A-Z]/.test(cell.ch));
  }

  /* 自动放行必须看得见：advance() 里的 drawWindow 会重建整条 strip，打完的那一条
     当场就没了，孩子只觉得画面自己跳了一格。所以把提示行占用 3 秒。
     提示行本来就被 sync 每 250ms 重写，两边不要互相踩。 */
  function showSkip(s, t) {
    if (!s.els || !s.els.hint) return;
    /* 诗词阁要报的是题干那个字：屏幕上一排七个汉字，报「跳过了 jiang」
       孩子不知道哪一张被跳了，而且那正是他想不起来的答案。 */
    s.els.hint.textContent = '跳过了「' + (t.hz || t.text) + '」　这一局最多两颗星';
    s.els.hint.classList.add('hintline--alert');
    s.hintUntil = U.now() + 3000;
  }

  function onKey(s, info) {
    if (s.ended || s.paused || KZ.Scenes.isOpen()) return;
    var t = s.targets[s.pos];
    if (!t) return;
    var cell = t.chars[s.cur];
    if (!cell) return;

    /* 关卡自己可以不考大小写；设置里的总开关再放松一档，先练熟再收紧 */
    var ok = accepts(cell, info, caseLoose(s));
    if (ok) {
      s.correct++;
      s.combo++;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.errStreak = 0;
      var spans = charNodes(t);
      if (spans && spans[s.cur]) {
        var sp = spans[s.cur];
        sp.classList.add('is-done', 'is-hit');
        root.setTimeout(function () { sp.classList.remove('is-hit'); }, 190);
      }
      KZ.Keyboard.flash(cell.code, true);
      KZ.Sfx.key();
      if (s.combo > 0 && s.combo % 10 === 0) KZ.Sfx.combo(s.combo);
      s.cur++;
      if (s.cur >= t.chars.length) advance(s);
      sync(s);
      info.handled = true;
    } else {
      s.wrong++;
      s.combo = 0;
      s.errStreak++;
      KZ.Keyboard.flash(info.code, false);
      KZ.Sfx.wrong();
      if (t.node) {
        t.node.classList.add('is-bad');
        root.setTimeout(function () { if (t.node) t.node.classList.remove('is-bad'); }, 200);
      }
      if (s.errStreak >= 3) {
        /* 连错三次：放行本条、断连击、这局封顶 2 星 */
        s.skipped++;
        s.errStreak = 0;
        KZ.Sfx.skip();
        showSkip(s, t);
        advance(s);
      }
      /* 错键也要刷 HUD，否则准确率和连击会一直停在打对之前的数字；
         整局刚结束时不用刷，那时关卡的 DOM 已经拆了。 */
      if (!s.ended) sync(s);
      info.handled = true;
    }
  }

  function advance(s) {
    var t = s.targets[s.pos];
    s.done++;
    s.cur = 0;
    s.pos++;
    if (t) {
      /* 诗词阁念一句而不是念一个字：单字会把多音字念错，句子念出来才对得上孩子敲的拼音，
         而且这一句已经全部打完了，念它不泄露答案 —— 一关下来正好把诗念完一遍。
         世界 B 只有音节，用代表字念。 */
      if (t.hz && t.li === t.ln - 1) {
        /* 一句至少两个字才念句子；《咏鹅》的「鹅，」就一个字，念句子等于念单字，
           这种短句改念刚敲上去那个音节的代表字。 */
        if (t.ln > 1) KZ.Tts.speak(t.line);
        else KZ.Tts.speak(t.text, 'pinyin');
      }
      else if (s.level.world === 'B') KZ.Tts.speak(t.text, 'pinyin');
      else if (s.level.world === 'C' && s.level.voice !== false && t.text.length <= 22) KZ.Tts.speak(t.text, 'en');
      KZ.Sfx.target();
    }
    if (s.pos >= s.targets.length) { finish(s); return; }
    /* 每完成一条只重画一次窗口，逐字符不重画，避免动画被打断 */
    drawWindow(s);
  }

  function tick(s) {
    if (s.ended) return;
    var now = U.now();
    var gap = now - (s.lastTick || now);
    s.lastTick = now;
    KZ.Save.tickPlay();
    /* 弹层（设置、休息）和手动暂停盖住关卡时把时钟一起冻住：孩子在读说明，不该掉计时。
       onKey 里也同步忽略，否则会在看不见的关卡里偷偷打分。
       必须按真实间隔补：标签页切到后台时浏览器把定时器降到约 1 秒一次，
       固定补 250ms 等于每暂停一秒就偷走孩子 0.75 秒。 */
    if (KZ.Scenes.isOpen() || s.paused) { s.started += gap; return; }
    if (s.mode === 'challenge') {
      if (elapsed(s) >= s.limit) { finish(s); return; }
    }
    sync(s);
  }

  function pause(s) {
    s.paused = true;
    KZ.Scenes.overlay({
      title: '休息一下',
      body: [U.el('p', 'overlay__sub', '随时回来，进度不会丢。')],
      acts: [{
        text: '继续打', primary: true, on: function () {
          s.paused = false;
        }
      }]
    });
  }

  /* 门槛的算法在 KZ.Levels.gateCount 里，和 tools/validate-levels.js 共用一份，
     否则自检放行、真机打不过这种偏差会一直留着。 */
  function gate(s) {
    var lens = [], i;
    for (i = 0; i < s.targets.length; i++) lens.push(s.targets[i].chars.length);
    return KZ.Levels.gateCount(lens, s.level.unit, s.level.par[0], s.limit);
  }

  function starsOf(s) {
    var sp = speedOf(s), ac = accOf(s), lv = s.level, i, got = 0;
    if (s.done < gate(s)) return 0;
    for (i = 0; i < 3; i++) {
      if (sp >= lv.par[i] && ac >= lv.accGate[i]) got = i + 1;
    }
    if (s.skipped > 0) got = Math.min(got, 2);
    return got;
  }

  function teardown(s) {
    s.ended = true;
    if (s.off) s.off();
    if (s.timer) root.clearInterval(s.timer);
    KZ.Tts.stop();
    if (E.session === s) E.session = null;
  }

  function finish(s) {
    if (s.ended) return null;
    teardown(s);
    var res = {
      levelId: s.level.id, mode: s.mode,
      stars: s.mode === 'practice' ? 0 : starsOf(s),
      speed: Math.round(speedOf(s)), acc: Math.round(accOf(s) * 10) / 10,
      done: s.done, total: s.targets.length, skipped: s.skipped,
      correct: s.correct, wrong: s.wrong, maxCombo: s.maxCombo,
      ms: elapsed(s) * 1000
    };
    res.score = res.speed * res.acc + res.maxCombo;
    if (s.done_) s.done_(res);
    return res;
  }

  KZ.Typing = E;
})(typeof window !== 'undefined' ? window : globalThis);
