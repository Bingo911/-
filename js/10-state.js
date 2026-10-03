/* 存档：单一默认档案。file:// 下 Chrome/Edge 把所有本地页面塞进同一个 localStorage 桶，
   所以键名必须带 kzdt.v1. 前缀，否则会和家庭里其他本地 HTML 互相覆盖。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var KEY = 'kzdt.v1.save';
  var U = KZ.U;

  var mode = 'memory';
  var lastFlush = 0;

  function defaults() {
    return {
      v: 1,
      created: +new Date(),
      charId: null,
      equipped: {},
      points: 0,
      levels: {},
      /* 指法教学关的指法图看过没有：练习模式永远不给星，只用星级判断的话
         推荐孩子走的那条路反而会每次进门都弹一次课。 */
      taught: {},
      owned: [],
      daily: { date: '', firstBonus: false, arcade: 0 },
      play: { activeMs: 0, lastTick: +new Date(), restAck: +new Date() },
      settings: { sfx: true, voice: true, restMin: 30, dys: false, strictCase: true }
    };
  }

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function isRecord(obj) { return !!obj && typeof obj === 'object' && !Array.isArray(obj); }
  function typedFields(obj, keys, type) {
    var i, value;
    for (i = 0; i < keys.length; i++) if (own(obj, keys[i])) {
      value = obj[keys[i]];
      if (typeof value !== type || (type === 'number' && !isFinite(value))) return false;
    }
    return true;
  }

  /* 手动导入不能把结构错误悄悄修成空进度。缺省字段允许由 hydrate 补齐，
     但已提供的容器必须符合形状；本机旧档加载仍由 hydrate 容错修补。 */
  function importable(obj) {
    if (!isRecord(obj) || !own(obj, 'points') || typeof obj.points !== 'number' ||
        !isFinite(obj.points) || obj.points < 0) return false;
    var fields = ['levels', 'equipped', 'taught', 'settings', 'daily', 'play'];
    var i, lid, rec, key;
    for (i = 0; i < fields.length; i++) {
      if (own(obj, fields[i]) && !isRecord(obj[fields[i]])) return false;
    }
    if (own(obj, 'owned')) {
      if (!Array.isArray(obj.owned)) return false;
      for (i = 0; i < obj.owned.length; i++) if (typeof obj.owned[i] !== 'string') return false;
    }
    if (obj.equipped) for (key in obj.equipped) if (own(obj.equipped, key) && typeof obj.equipped[key] !== 'string') return false;
    if (obj.taught) for (key in obj.taught) if (own(obj.taught, key) && typeof obj.taught[key] !== 'boolean') return false;
    if (obj.settings && (!typedFields(obj.settings, ['sfx', 'voice', 'dys', 'strictCase'], 'boolean') ||
        !typedFields(obj.settings, ['restMin'], 'number'))) return false;
    if (obj.daily && (!typedFields(obj.daily, ['date'], 'string') ||
        !typedFields(obj.daily, ['firstBonus'], 'boolean') || !typedFields(obj.daily, ['arcade'], 'number'))) return false;
    if (obj.play && !typedFields(obj.play, ['activeMs', 'lastTick', 'restAck'], 'number')) return false;
    if (own(obj, 'levels')) {
      for (lid in obj.levels) if (own(obj.levels, lid)) {
        rec = obj.levels[lid];
        if (!isRecord(rec)) return false;
        if (!typedFields(rec, ['stars', 'tries'], 'number') || !typedFields(rec, ['cleared'], 'boolean')) return false;
        if (own(rec, 'best') && rec.best !== null && !isRecord(rec.best)) return false;
        if (rec.best && !typedFields(rec.best, ['score', 'speed', 'acc', 'stars'], 'number')) return false;
      }
    }
    return true;
  }

  /* 结构已验证的导入档、本机旧档共用缺省补齐与值修复，再接为当前数据。 */
  function clampStar(v) { return Math.max(0, Math.min(3, +v || 0)); }

  function hydrate(obj) {
    if (!isRecord(obj)) return false;
    var d = defaults();
    for (var k in d) if (own(d, k)) if (!own(obj, k)) obj[k] = d[k];
    if (!isRecord(obj.settings)) obj.settings = {};
    for (var sk in d.settings) if (own(d.settings, sk)) if (!own(obj.settings, sk)) obj.settings[sk] = d.settings[sk];
    /* 本机旧档形状不可信：owned 少个中括号会让 grantDefault 抛异常。
       数组也不能当字典使用，否则新增的具名属性会在 JSON 落盘时消失。 */
    if (!Array.isArray(obj.owned)) obj.owned = [];
    if (!isRecord(obj.levels)) obj.levels = {};
    /* 星级封顶 3：手改过（或别的版本写出来）的存档否则会让世界页显示
       「99 / 36 ★」这种不可能的数字，解锁检查也会一路全开。 */
    var lid, rec;
    for (lid in obj.levels) if (own(obj.levels, lid)) {
      rec = obj.levels[lid];
      if (!isRecord(rec)) { obj.levels[lid] = { stars: 0, tries: 0, best: null }; continue; }
      rec.stars = clampStar(rec.stars);
      rec.tries = Math.max(0, +rec.tries || 0);
      /* 「最好成绩」那一行也写的是星数，不一起夹就会显示 99 星 */
      if (isRecord(rec.best)) rec.best.stars = clampStar(rec.best.stars);
      else rec.best = null;
    }
    if (!isRecord(obj.equipped)) obj.equipped = {};
    if (!isRecord(obj.taught)) obj.taught = {};
    if (typeof obj.points !== 'number' || !isFinite(obj.points) || obj.points < 0) obj.points = 0;
    if (!isRecord(obj.play)) obj.play = d.play;
    obj.play.activeMs = +obj.play.activeMs || 0;
    /* daily 是 null 时 rollDaily 一碰就抛，游玩计时和护眼提醒会静默停摆 */
    if (!isRecord(obj.daily)) obj.daily = d.daily;
    for (var dk in d.daily) if (own(d.daily, dk)) if (!own(obj.daily, dk)) obj.daily[dk] = d.daily[dk];
    /* 形象 id 被改错时不能留着：顶栏拿它去查立绘，一路渲染成问号。
       退回「还没选形象」，让孩子重新选一次。 */
    if (obj.charId != null && KZ.Costumes && !KZ.Costumes.ofChar(obj.charId).length) obj.charId = null;
    obj.v = 1;
    /* 隔了一夜再打开算「新的一次玩」，不是「连续玩了八小时别停」：
       上次休息的时间和连续时长都要归零重记，否则一进门 5 秒内就弹护眼提醒，
       写的还是「已经连着玩了 1 分钟」这种没人信的话。导入别人给的档同理。 */
    if (obj.play) {
      var now = +new Date();
      if (!obj.play.lastTick || now - obj.play.lastTick > 90000) obj.play.lastTick = now;
      if (!obj.play.restAck || now - obj.play.restAck > 8 * 3600000) {
        obj.play.restAck = now;
        obj.play.activeMs = 0;
      }
    }
    S.data = obj;
    return true;
  }

  var S = {
    data: defaults(),
    available: false,

    init: function () {
      try {
        root.localStorage.setItem('kzdt.v1.probe', '1');
        root.localStorage.removeItem('kzdt.v1.probe');
        mode = 'local';
        this.available = true;
      } catch (e) {
        mode = 'memory';
        this.available = false;
      }
      this.load();
      return this;
    },

    mode: function () { return mode; },

    load: function () {
      if (mode !== 'local') return;
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return;
      try { hydrate(JSON.parse(raw)); } catch (e) { /* 存档损坏时静默重开，不打扰孩子 */ }
    },

    save: function () {
      if (mode !== 'local') return;
      try { root.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { mode = 'memory'; this.available = false; }
    },

    /* ---------- 查询 ---------- */

    /* 导入的存档可能被手改坏、留下 null 条目，这里兜一下，
       否则顶栏一渲染就整页崩掉。 */
    totalStars: function () {
      var n = 0, id, r = this.data.levels;
      for (id in r) if (own(r, id) && r[id]) n += r[id].stars || 0;
      return n;
    },

    stars: function (levelId) {
      var r = this.data.levels[levelId];
      return r ? (r.stars || 0) : 0;
    },

    seenTeach: function (levelId) { return !!this.data.taught[levelId]; },

    markTaught: function (levelId) {
      this.data.taught[levelId] = true;
      this.save();
    },

    owned: function (outfitId) {
      return this.data.owned.indexOf(outfitId) >= 0;
    },

    equippedOf: function (charId) { return this.data.equipped[charId] || 'o1'; },

    /* ---------- 变更 ---------- */

    setChar: function (charId) {
      this.data.charId = charId;
      this.grantDefault(charId);
      this.save();
    },

    grantDefault: function (charId) {
      var id = charId + '-o1';
      if (this.data.owned.indexOf(id) < 0) this.data.owned.push(id);
      if (!this.data.equipped[charId]) this.data.equipped[charId] = 'o1';
    },

    addPoints: function (n) {
      this.data.points = Math.max(0, this.data.points + n);
      if (n > 0 && KZ.Shell) KZ.Shell.bumpPoints();
      this.save();
    },

    buy: function (outfitId, price) {
      if (this.data.points < price || this.owned(outfitId)) return false;
      this.data.points -= price;
      this.data.owned.push(outfitId);
      this.save();
      return true;
    },

    equip: function (charId, outfitId) {
      this.data.equipped[charId] = outfitId;
      this.save();
    },

    /* 记录一次通关并返回本次收益。星级只升不降；重玩只给 35% 积分。 */
    recordRun: function (levelId, res) {
      var d = this.data, prev = d.levels[levelId];
      var hadClear = !!(prev && prev.cleared);
      var first = !hadClear;
      if (!prev) prev = d.levels[levelId] = { stars: 0, tries: 0, best: null };
      prev.tries++;
      var up = res.stars > (prev.stars || 0);
      if (up) prev.stars = res.stars;
      if (!prev.best || res.score > prev.best.score) prev.best = { score: res.score, speed: res.speed, acc: res.acc, stars: res.stars };

      var gained = 0;
      if (res.stars > 0) {
        /* pointsFor 要的是 Save 模块本身（它会 rollDaily 并回写 firstBonus），不是 data */
        gained = KZ.Levels.pointsFor(res, hadClear, this);
        prev.cleared = true;
        if (first && gained < 40) gained = 40;
      } else {
        /* 没摘到星也给「参与分」，但必须真敲了字：原来一进关、一下没敲就结束也有 10 分，
           连点十次就比认真打一关拿得多，和街机那边特意设的每日上限自相矛盾。 */
        gained = (res.done > 0 && res.correct >= 15) ? 10 : 0;
      }
      d.points += gained;
      this.save();
      /* 结算浮层留在 play 场景，不会触发换页的顶栏重绘。
         每次记账后同步积分与星数，0 分但提升星级的局也要刷新。 */
      if (KZ.Shell) KZ.Shell.bumpPoints();
      return { gained: gained, first: first, up: up, total: d.points };
    },

    /* ---------- 时长与护眼 ---------- */

    tickPlay: function () {
      var p = this.data.play;
      var now = +new Date();
      var gap = now - p.lastTick;
      p.lastTick = now;
      /* 切到别的窗口再回来时不把挂机时间算进去 */
      if (gap > 0 && gap < 90000 && !root.document.hidden) p.activeMs += gap;
      this.rollDaily();
      /* 按时间节流落盘。原来写的是 activeMs % 5000 < 1000，命中那一格时
         会连着四次把同样的数据序列化一遍；标签页在后台不增长时长时更是一直命中。 */
      if (now - lastFlush > 5000) { lastFlush = now; this.save(); }
    },

    rollDaily: function () {
      var t = U.today();
      if (this.data.daily.date !== t) {
        this.data.daily = { date: t, firstBonus: false, arcade: 0 };
        this.save();
      }
    },

    sinceRest: function () { return (+new Date()) - this.data.play.restAck; },

    ackRest: function () {
      this.data.play.restAck = +new Date();
      this.data.play.activeMs = 0;
      this.save();
    },

    /* ---------- 导出 / 导入（换电脑继续玩，也是隐私模式下的保险） ---------- */

    toJSON: function () { return JSON.stringify(this.data, null, 2); },

    download: function () {
      var blob = new Blob([this.toJSON()], { type: 'application/json' });
      var a = U.el('a');
      a.href = root.URL.createObjectURL(blob);
      a.download = '打字小勇士-存档-' + U.today() + '.json';
      U.add(root.document.body, a);
      a.click();
      root.setTimeout(function () { root.URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
    },

    importText: function (text) {
      try {
        var obj = JSON.parse(text);
        if (!importable(obj)) return false;
        /* 先接进内存，再尽力落盘：隐私模式下 localStorage 是写不进去的，
           但这一局至少能接着玩，也不会谎报成「本机已保存」。 */
        if (!hydrate(obj)) return false;
        this.save();
        return true;
      } catch (e) { return false; }
    },

    reset: function () {
      this.data = defaults();
      this.save();
    }
  };

  KZ.Save = S;
})(typeof window !== 'undefined' ? window : globalThis);
