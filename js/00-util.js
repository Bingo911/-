/* 打字小勇士 · 通用工具（ES5，无模块，file:// 直跑） */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = {};

  U.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) {
      /* 允许把节点当第三个参数传进来，避免调用点写成一长串 add */
      if (text.nodeType) n.appendChild(text);
      else n.textContent = text;
    }
    return n;
  };

  U.add = function (parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  };

  U.on = function (node, type, fn) {
    node.addEventListener(type, fn, false);
    return function () { node.removeEventListener(type, fn, false); };
  };

  U.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); };

  U.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  U.rand = function (n) { return Math.floor(Math.random() * n); };

  U.pick = function (arr) { return arr[U.rand(arr.length)]; };

  U.shuffle = function (arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = U.rand(i + 1);
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  U.uniq = function (arr) {
    var seen = {}, out = [], i, k;
    for (i = 0; i < arr.length; i++) {
      k = '\u0000' + arr[i];
      if (!seen.hasOwnProperty(k)) { seen[k] = 1; out.push(arr[i]); }
    }
    return out;
  };

  U.sum = function (arr) { var s = 0, i; for (i = 0; i < arr.length; i++) s += arr[i]; return s; };

  U.now = function () { return (root.performance && root.performance.now) ? root.performance.now() : +new Date(); };

  U.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };

  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };

  U.pct = function (a, b) { return b > 0 ? Math.round(a / b * 100) : 0; };

  /* 关卡速度单位：世界 A 数键、世界 B 数音节、世界 C 数词 */
  U.SPEED_UNIT = { key: '键/分', syll: '音节/分', word: '词/分' };

  U.fonts = {
    /* 楷体更适合 8-10 岁认读拼音；缺失时回退雅黑，不报错 */
    hasKai: function () {
      if (!root.document || !root.document.fonts || !root.document.fonts.check) return false;
      try { return root.document.fonts.check('16px KaiTi') || root.document.fonts.check('16px 楷体'); }
      catch (e) { return false; }
    }
  };

  KZ.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
