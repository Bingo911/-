/* 屏幕键盘：指位配色 + 下一键脉冲 + 对错闪烁，并且每个键都能用鼠标点。
   点击与真键盘走同一条 KZ.Keys 通路，判定完全一致。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  /* f = 手指槽位：0-4 左手小指到拇指，5-9 右手拇指到小指 */
  var ROWS = [
    [
      { c: 'Backquote', l: '`', a: '~', f: 0 }, { c: 'Digit1', l: '1', a: '!', f: 0 },
      { c: 'Digit2', l: '2', a: '@', f: 1 }, { c: 'Digit3', l: '3', a: '#', f: 2 },
      { c: 'Digit4', l: '4', a: '$', f: 3 }, { c: 'Digit5', l: '5', a: '%', f: 3 },
      { c: 'Digit6', l: '6', a: '^', f: 6 }, { c: 'Digit7', l: '7', a: '&', f: 6 },
      { c: 'Digit8', l: '8', a: '*', f: 7 }, { c: 'Digit9', l: '9', a: '(', f: 8 },
      { c: 'Digit0', l: '0', a: ')', f: 9 }, { c: 'Minus', l: '-', a: '_', f: 9 },
      { c: 'Equal', l: '=', a: '+', f: 9 }, { c: 'Backspace', l: '退格', f: 9, w: 2 }
    ],
    [
      { c: 'KeyQ', l: 'q', f: 0 }, { c: 'KeyW', l: 'w', f: 1 }, { c: 'KeyE', l: 'e', f: 2 },
      { c: 'KeyR', l: 'r', f: 3 }, { c: 'KeyT', l: 't', f: 3 }, { c: 'KeyY', l: 'y', f: 6 },
      { c: 'KeyU', l: 'u', f: 6 }, { c: 'KeyI', l: 'i', f: 7 }, { c: 'KeyO', l: 'o', f: 8 },
      { c: 'KeyP', l: 'p', f: 9 }, { c: 'BracketLeft', l: '[', a: '{', f: 9 },
      { c: 'BracketRight', l: ']', a: '}', f: 9 }, { c: 'Backslash', l: '\\', a: '|', f: 9, w: 1.4 }
    ],
    [
      { c: 'CapsLock', l: 'Caps', f: 0, w: 1.5 },
      { c: 'KeyA', l: 'a', f: 0, h: 1 }, { c: 'KeyS', l: 's', f: 1, h: 1 },
      { c: 'KeyD', l: 'd', f: 2, h: 1 }, { c: 'KeyF', l: 'f', f: 3, h: 1 },
      { c: 'KeyG', l: 'g', f: 3 }, { c: 'KeyH', l: 'h', f: 6 }, { c: 'KeyJ', l: 'j', f: 6, h: 1 },
      { c: 'KeyK', l: 'k', f: 7, h: 1 }, { c: 'KeyL', l: 'l', f: 8, h: 1 },
      { c: 'Semicolon', l: ';', a: ':', f: 9, h: 1 }, { c: 'Quote', l: "'", a: '"', f: 9 },
      { c: 'Enter', l: '回车', f: 9, w: 1.6 }
    ],
    [
      { c: 'ShiftLeft', l: 'Shift', f: 0, w: 2 },
      { c: 'KeyZ', l: 'z', f: 0 }, { c: 'KeyX', l: 'x', f: 1 }, { c: 'KeyC', l: 'c', f: 2 },
      { c: 'KeyV', l: 'v', f: 3 }, { c: 'KeyB', l: 'b', f: 3 }, { c: 'KeyN', l: 'n', f: 6 },
      { c: 'KeyM', l: 'm', f: 6 }, { c: 'Comma', l: ',', a: '<', f: 7 },
      { c: 'Period', l: '.', a: '>', f: 7 }, { c: 'Slash', l: '/', a: '?', f: 8 },
      { c: 'ShiftRight', l: 'Shift', f: 9, w: 2 }
    ],
    [
      { c: 'Space', l: '空格', f: 4, w: 9 }
    ]
  ];

  var FINGER_TIP = ['左小', '左无名', '左中', '左食', '左拇', '右拇', '右食', '右中', '右无名', '右小'];
  var FINGER_COLOR = ['#e0484d', '#ec8b2c', '#f2c531', '#4fae58', '#35a7a0',
    '#3d7fd1', '#7a5cd0', '#c0559e', '#8d6b45', '#6b7280'];

  var nodes = {};
  var built = false;
  var stickyShift = false;
  var nextCodes = [];

  function makeKey(k) {
    var n = U.el('button', 'kb-key');
    n.type = 'button';
    n.setAttribute('data-code', k.c);
    n.setAttribute('data-f', k.f);
    n.style.flex = (k.w || 1) + ' 1 0';
    if (k.w && k.w > 1) n.classList.add(k.c === 'Space' ? 'kb-key--space' : 'kb-key--wide');
    var lab = U.el('span', 'kb-key__label', k.l);
    U.add(n, lab);
    if (k.a) U.add(n, U.el('span', 'kb-key__alt', k.a));
    if (k.h) U.add(n, U.el('i', 'kb-key__home'));
    n.title = FINGER_TIP[k.f] + '指';
    if (k.c === 'KeyV') U.add(n, U.el('span', 'kb-key__extra', ''));
    U.on(n, 'click', function (e) {
      e.preventDefault();
      if (k.c === 'ShiftLeft' || k.c === 'ShiftRight') {
        stickyShift = !stickyShift;
        paintShift();
        return;
      }
      KZ.Keys.virtual(k.c, stickyShift || (k.l ? k.l.toUpperCase() === k.l : false));
      if (stickyShift) { stickyShift = false; paintShift(); }
    });
    return n;
  }

  function paintShift() {
    var l = nodes.ShiftLeft, r = nodes.ShiftRight;
    if (l) l.style.background = stickyShift ? '#ffd45e' : '';
    if (r) r.style.background = stickyShift ? '#ffd45e' : '';
  }

  function paintNext() {
    var code, n;
    for (code in nodes) if (nodes.hasOwnProperty(code)) {
      n = nodes[code];
      if (nextCodes.indexOf(code) >= 0) n.classList.add('is-next');
      else n.classList.remove('is-next');
    }
  }

  var KB = {
    build: function (host, o) {
      o = o || {};
      /* stickyShift 是模块级的：不重置的话，上一关点亮的 Shift 会带着溜进下一关，
         键帽看起来没按下去，敲出来的却是大写。 */
      stickyShift = false;
      U.clear(host);
      var box = U.el('div', 'kb' + (o.compact ? ' kb--compact' : ''));
      nodes = {};
      var r, i, j, row, key, n;
      for (r = 0; r < ROWS.length; r++) {
        row = U.el('div', 'kb-row');
        for (j = 0; j < ROWS[r].length; j++) {
          key = ROWS[r][j];
          n = makeKey(key);
          nodes[key.c] = n;
          U.add(row, n);
        }
        U.add(box, row);
      }
      var legend = U.el('div', 'kb-legend');
      for (i = 0; i < 10; i++) {
        var s = U.el('span');
        U.add(s, U.el('i'), U.el('em', null, FINGER_TIP[i]));
        s.firstChild.style.background = FINGER_COLOR[i];
        s.lastChild.style.fontStyle = 'normal';
        U.add(legend, s);
      }
      U.add(box, legend);
      U.add(host, box);
      built = true;
      paintShift();
      KB.setUmlaut(!!o.umlaut);
      return box;
    },

    /* 拼音世界里 V 键额外标一个 ü，并给一次性说明；其他世界绝不出现 ü */
    setUmlaut: function (on) {
      var n = nodes.KeyV;
      if (!n) return;
      var ex = n.querySelector('.kb-key__extra');
      if (ex) ex.textContent = on ? 'ü' : '';
    },

    /* 传入当前目标剩余的键位数组；引擎每敲对一格就更新一次 */
    setNext: function (codes) {
      if (!built) return;
      nextCodes = codes || [];
      paintNext();
    },

    flash: function (code, ok) {
      var n = nodes[code];
      if (!n) return;
      var cls = ok ? 'is-ok' : 'is-bad';
      n.classList.remove('is-ok', 'is-bad');
      /* 强制重排，让同一键连续两次闪烁能重新触发动画 */
      void n.offsetWidth;
      n.classList.add(cls);
      root.setTimeout(function () { n.classList.remove(cls); }, ok ? 130 : 220);
    },

    fingerOf: function (code) {
      var r, j;
      for (r = 0; r < ROWS.length; r++) for (j = 0; j < ROWS[r].length; j++) {
        if (ROWS[r][j].c === code) return ROWS[r][j].f;
      }
      return -1;
    },

    fingerTip: function (code) {
      var f = KB.fingerOf(code);
      return f < 0 ? '' : FINGER_TIP[f];
    },

    /* 按手指把键位列出来，给指法教学关用。这张表只能从 ROWS 现推：
       另抄一份的话，哪天键盘布局改了，教的和按的就不是同一套了。
       l 的长度不是 1 的是退格/回车/Shift/Caps/空格这类功能键，
       它们讲的是「哪个手」而不是「哪根手指管哪个字符」，列进去只会干扰孩子。 */
    fingerMap: function () {
      var out = [], i, r, j, k;
      for (i = 0; i < 10; i++) out.push({ name: FINGER_TIP[i], color: FINGER_COLOR[i], keys: [] });
      for (r = 0; r < ROWS.length; r++) {
        for (j = 0; j < ROWS[r].length; j++) {
          k = ROWS[r][j];
          /* 空格两根拇指都碰得到，但 ROWS 里只挂在左拇（f:4）上：
             教学面板两边都写，孩子才知道哪边方便按哪边。 */
          if (k.c === 'Space') { out[4].keys.push(k.l); out[5].keys.push(k.l); continue; }
          if (k.l.length !== 1) continue;
          out[k.f].keys.push(k.l);
        }
      }
      return out;
    },

    /* 左手一列、右手一列，每根手指后面挂它负责的键。
       颜色取自 FINGER_COLOR，和键帽下边框那条色是同一个来源。 */
    teachBox: function () {
      var m = KB.fingerMap();
      var side = [m.slice(0, 5), m.slice(5)];
      var box = U.el('div', 'teach');
      var s, i, col, row, f;
      for (s = 0; s < 2; s++) {
        col = U.el('div', 'teach__side');
        U.add(col, U.el('h3', 'teach__head', s === 0 ? '左手' : '右手'));
        for (i = 0; i < side[s].length; i++) {
          f = side[s][i];
          row = U.el('div', 'teach__row');
          row.style.setProperty('--c', f.color);
          U.add(row, U.el('span', 'teach__who', f.name + '指'),
            U.el('span', 'teach__keys', f.keys.join(' ')));
          U.add(col, row);
        }
        U.add(box, col);
      }
      return box;
    }
  };

  KZ.Keyboard = KB;
})(typeof window !== 'undefined' ? window : globalThis);
