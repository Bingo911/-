/* 音效：全部用 Web Audio 现场合成，不打包任何音频文件，也不依赖网络。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var ctx = null;
  var master = null;
  var broken = false;

  function ensure() {
    if (broken) return null;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) { broken = true; return null; }
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.32;
        master.connect(ctx.destination);
      } catch (e) { broken = true; return null; }
    }
    /* 浏览器要求用户手势后才允许出声 */
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol === undefined ? 0.5 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function on() { return KZ.Save && KZ.Save.data.settings.sfx; }

  var Sfx = {
    unlock: function () { ensure(); },

    key: function () { if (on()) tone(880, 0.05, 'triangle', 0.22); },

    wrong: function () {
      if (!on()) return;
      tone(190, 0.14, 'square', 0.2);
      tone(150, 0.16, 'square', 0.16, 0.05);
    },

    skip: function () { if (on()) tone(320, 0.16, 'sine', 0.2, 0, 200); },

    target: function () {
      if (!on()) return;
      tone(660, 0.07, 'sine', 0.24);
      tone(990, 0.09, 'sine', 0.2, 0.05);
    },

    combo: function (n) {
      if (!on()) return;
      var base = 660 + Math.min(8, Math.floor(n / 5)) * 60;
      tone(base, 0.07, 'triangle', 0.26);
      tone(base * 1.5, 0.09, 'triangle', 0.2, 0.05);
    },

    star: function (i) { if (on()) tone(520 + i * 180, 0.2, 'sine', 0.34, i * 0.22); },

    clear: function () {
      if (!on()) return;
      var n = [523, 659, 784, 1046], i;
      for (i = 0; i < n.length; i++) tone(n[i], 0.24, 'triangle', 0.3, i * 0.1);
    },

    fail: function () {
      if (!on()) return;
      tone(400, 0.2, 'sine', 0.24, 0, 240);
      tone(300, 0.3, 'sine', 0.2, 0.16, 180);
    },

    coin: function () {
      if (!on()) return;
      tone(1180, 0.06, 'square', 0.22);
      tone(1560, 0.14, 'square', 0.2, 0.05);
    },

    click: function () { if (on()) tone(520, 0.04, 'sine', 0.16); },

    rest: function () {
      if (!on()) return;
      var n = [880, 660, 880], i;
      for (i = 0; i < n.length; i++) tone(n[i], 0.3, 'sine', 0.26, i * 0.26);
    }
  };

  KZ.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
