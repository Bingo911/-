/* 键盘总线。中国孩子的电脑常年停在微软拼音/搜狗的中文模式：此时 keydown 的
   e.key 是 "Process"、keyCode 是 229，但 e.code（物理键位）依然正确。所以本页
   永不出现输入框，全部按 e.code 判定；输入法把 Space/Enter 拿去选词时，
   屏幕键盘的鼠标点击是等价兜底输入。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var LETTERS = 'QWERTYUIOPASDFGHJKLZXCVBNM';

  var PLAIN = {
    Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
    Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`'
  };

  var SHIFTED = {
    Digit1: '!', Digit2: '@', Digit3: '#', Digit4: '$', Digit5: '%',
    Digit6: '^', Digit7: '&', Digit8: '*', Digit9: '(', Digit0: ')',
    Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|',
    Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?', Backquote: '~'
  };

  /* 目标字符 -> 需要的物理键。strict 表示这一格必须区分大小写/上下档，
     因为大写和 ! ? 这类符号要靠 Shift 打出来。
     只返回真正参与打分的键：换行符对应 Enter，而 Enter 被 IGNORED 放行（孩子按它是
     想提交，不是想打字），一旦当成目标格就永远敲不上。所以这里不给 '\n' 建档，
     关卡数据里混进换行会让自检直接报「打不出的字符」，而不是悄悄做一格打不了的题。 */
  function lookup(ch) {
    if (ch === ' ') return { code: 'Space', strict: false };
    if (ch === 'ü' || ch === 'Ü') return { code: 'KeyV', strict: false };
    var up = ch.toUpperCase();
    /* 大写目标才算严格（必须真按出那个大写）；小写目标放宽，
       否则 CapsLock 一直开着的孩子在字母关里会一路被挡。 */
    if (LETTERS.indexOf(up) >= 0) return { code: 'Key' + up, strict: up === ch };
    var code, i;
    for (code in PLAIN) if (PLAIN.hasOwnProperty(code) && PLAIN[code] === ch) return { code: code, strict: false };
    for (code in SHIFTED) if (SHIFTED.hasOwnProperty(code) && SHIFTED[code] === ch) return { code: code, strict: true };
    if (ch === '’') return { code: 'Quote', strict: false };
    return null;
  }

  /* 由物理键 + 修饰状态推出实际字符。CapsLock 用 getModifierState 读，
     不能只看 e.shiftKey —— 开着大写锁时 shiftKey 一直是 false。 */
  function effectiveChar(code, shift, caps) {
    if (code.indexOf('Key') === 0) {
      var L = code.slice(3);
      if (LETTERS.indexOf(L) < 0) return null;
      return (shift !== caps) ? L : L.toLowerCase();
    }
    if (code.indexOf('Digit') === 0) return shift ? SHIFTED[code] : PLAIN[code];
    if (PLAIN.hasOwnProperty(code)) return shift ? SHIFTED[code] : PLAIN[code];
    if (code === 'Space') return ' ';
    return null;
  }

  var NAMES = {
    Space: '空格', Enter: '回车', Backspace: '退格', Tab: 'Tab',
    ShiftLeft: '左 Shift', ShiftRight: '右 Shift', CapsLock: '大写锁定',
    ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl', AltLeft: 'Alt', AltRight: 'Alt',
    Comma: '逗号', Period: '句号', Slash: '斜杠', Semicolon: '分号', Quote: '引号',
    Minus: '减号', Equal: '等号', BracketLeft: '左括号', BracketRight: '右括号',
    Backslash: '反斜杠', Backquote: '波浪号', Escape: 'Esc', Delete: 'Delete'
  };

  function name(code) {
    if (NAMES[code]) return NAMES[code];
    if (code.indexOf('Key') === 0) return code.slice(3).toLowerCase();
    if (code.indexOf('Digit') === 0) return code.slice(5);
    return code;
  }

  var handlers = [];
  var lastAt = {};
  var ime = { shown: 0 };
  var badgeTimer = null;

  function showBadge() {
    var b = root.document.getElementById('ime-badge');
    if (!b) return;
    var now = +new Date();
    if (now - ime.shown < 20000) return;
    ime.shown = now;
    b.hidden = false;
    U.clear(b);
    U.add(b, U.el('b', null, '检测到中文输入法'), U.el('br'),
      U.el('span', null, '按一次 Shift 切成英文最好；不切也能玩，或用鼠标点屏幕键盘。'));
    if (badgeTimer) root.clearTimeout(badgeTimer);
    badgeTimer = root.setTimeout(function () { b.hidden = true; }, 14000);
  }

  function dispatch(info) {
    /* 真键盘和鼠标点屏幕键盘都在此汇合，所以「哪些键不参与游戏」只判一次 */
    if (IGNORED[info.code]) return false;
    var i;
    for (i = 0; i < handlers.length; i++) handlers[i](info);
    return info.handled === true;
  }

  function accept(code, e) {
    var t = +new Date();
    var gap = code === 'Backspace' ? 25 : 12;
    if (lastAt[code] && t - lastAt[code] < gap) return false;
    /* 按住不放时操作系统会以约 30ms 的间隔自动重复，比抖动窗口还宽，
       于是长按一个键能自己把整关打完。自动重复一律不算输入。 */
    if (e && e.repeat) return false;
    lastAt[code] = t;
    return true;
  }

  /* 全部关卡里没有任何目标用到这些键（只有字母、数字、空格和右手标点）。
     按住 Shift 打大写、按退格想改错，都是孩子的正常动作，一旦判成「打错」，
     A7「小指按住 Shift 再敲字母」的准确率就永远卡在 50%，低于 1★ 的 85% 门槛
     ——那一关怎么打都拿不到星。所以它们静默通过，不进打分通路。 */
  var IGNORED = {};
  (function () {
    var l = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
      'AltGraph', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'ContextMenu', 'CapsLock',
      'Backspace', 'Delete', 'Insert', 'Enter', 'NumpadEnter',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'End', 'NumLock', 'ScrollLock',
      'MediaTrackNext', 'MediaTrackPrevious', 'VolumeMute', 'VolumeUp', 'VolumeDown'];
    var i;
    for (i = 0; i < l.length; i++) IGNORED[l[i]] = true;
  })();

  function build(code, e, virtual) {
    var shift = e ? e.getModifierState('Shift') : !!virtual.shift;
    var caps = e ? e.getModifierState('CapsLock') : false;
    return {
      code: code,
      shift: shift,
      caps: caps,
      ev: effectiveChar(code, shift, caps),
      repeat: !!(e && e.repeat),
      virtual: !!virtual,
      ch: null,
      handled: false
    };
  }

  var Keys = {
    lookup: lookup,
    effectiveChar: effectiveChar,
    name: name,

    on: function (fn) { handlers.push(fn); return function () { Keys.off(fn); }; },

    off: function (fn) {
      var i = handlers.indexOf(fn);
      if (i >= 0) handlers.splice(i, 1);
    },

    active: function () { return handlers.length > 0; },

    /* 屏幕键盘点击走同一条通路，保证真键盘和鼠标输入判定完全一致。
       不过 accept()：抖动过滤是为了挡真键盘的连击，鼠标点两下是想打两个键。 */
    virtual: function (code, shift) {
      dispatch(build(code, null, { shift: shift }));
    },

    init: function () {
      root.addEventListener('compositionstart', showBadge, true);

      root.addEventListener('keydown', function (e) {
        /* 229 是 IME 组合中的通用 keyCode。仍然照常处理，只额外提示。 */
        if (e.keyCode === 229 || e.isComposing) showBadge();

        var code = e.code;
        if (!code) return;

        if (e.ctrlKey || e.metaKey || e.altKey) return;   /* 绝不拦 Ctrl+R / F5 / F12 */
        if (code.indexOf('F') === 0 && code.length > 1) {
          if (code === 'F9') { e.preventDefault(); Keys.toggleLog(); }
          return;
        }
        if (code === 'Escape' || code === 'Tab') return;
        if (IGNORED[code]) return;   /* Shift/CapsLock/退格不参与打分，也不拦它的默认行为 */

        if (!Keys.active()) return;
        if (!accept(code, e)) return;

        e.preventDefault();
        dispatch(build(code, e, null));
      }, false);

      /* 页面失焦时清掉重复计时，避免回来第一键被当成抖动丢掉 */
      root.addEventListener('blur', function () { lastAt = {}; }, true);

      return Keys;
    },

    toggleLog: function () {
      var el = root.document.getElementById('keylog');
      if (!el) return;
      el.hidden = !el.hidden;
      if (!el.hidden) {
        el.textContent = 'F9 键位日志（按 e.code 判定）\n';
        var log = function (msg) {
          el.textContent += msg + '\n';
          el.scrollTop = el.scrollHeight;
          if (el.textContent.length > 6000) el.textContent = el.textContent.slice(-4000);
        };
        Keys._logOff && Keys._logOff();
        Keys._logOff = Keys.on(function (i) {
          log((i.virtual ? '[鼠标] ' : '') + i.code + '  shift=' + (i.shift ? 1 : 0) +
            ' caps=' + (i.caps ? 1 : 0) + '  实际=' + (i.ev || '-'));
        });
      } else if (Keys._logOff) { Keys._logOff(); Keys._logOff = null; }
    }
  };

  KZ.Keys = Keys;
})(typeof window !== 'undefined' ? window : globalThis);
