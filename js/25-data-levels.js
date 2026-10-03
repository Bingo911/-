/* 46 + 75 关声明式数据。世界 A 的键位表在这里生成；世界 B/C/D 的目标来自
   26-data-pinyin.js、27-data-words.js 与 29-data-poems.js，这里只挂教学元数据。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  /* 一关至少打完几条才算「真练过」，否则时间耗尽前碰巧敲完一条就出成绩。 */
  var MIN_DONE = 4;

  /* 过关门槛必须按 1★ 速度算，不能只按条数：
     一关的条数和句子长短差异很大，只按条数卡门槛会算歪：某关 7 条平均
     120 秒打完 251 个字母 = 25 词/分，比它自己 3★ 的 18 词/分还高——
     这一关于是只有 0 星和 3 星两种结局，孩子永远毕不了业。
     引擎和 tools/validate-levels.js 共用这一个函数，免得两处算歪。 */
  function gateCount(lens, unit, par0, limitSec) {
    var n = lens.length, sum = 0, i, mean, tpm, can, want;
    if (!n) return 1;
    for (i = 0; i < n; i++) sum += lens[i];
    mean = Math.max(1, sum / n);
    want = Math.min(MIN_DONE, Math.ceil(n * 0.4));
    /* 各世界速度单位不同：A 键/分（1 键 = 1 字符），B/D 音节/分（1 条 = 1 音节），C 词/分（1 词 = 5 字符） */
    tpm = unit === 'syll' ? par0 : par0 * (unit === 'word' ? 5 : 1) / mean;
    can = Math.floor(tpm * (limitSec / 60) * 0.9);
    return Math.max(1, Math.min(want, can));
  }

  /* 固定种子的线性同余：同一份数据每次刷新生成同样的序列，
     否则自检脚本和玩家成绩无法复现。 */
  function rng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }

  function gen(pool, len, n, seed) {
    var r = rng(seed), out = [], i, j, str;
    for (i = 0; i < n; i++) {
      str = '';
      for (j = 0; j < len; j++) str += pool[Math.floor(r() * pool.length)];
      out.push(str);
    }
    return out;
  }

  /* 交替两个池子，专门用来练易混键位（b/d、z/zh 这类） */
  function alternate(a, b, n, seed) {
    var r = rng(seed), out = [], i, pick;
    for (i = 0; i < n; i++) {
      pick = (i % 2 === 0) ? a : b;
      out.push(pick[Math.floor(r() * pick.length)]);
    }
    return out;
  }

  var HOME = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
  var TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  var BOTTOM = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
  var ALL = HOME.concat(TOP, BOTTOM);
  var NUM15 = ['1', '2', '3', '4', '5'];
  var NUM60 = ['6', '7', '8', '9', '0'];
  var NUMALL = NUM15.concat(NUM60);

  var A_RAW = [
    /* A0 是教学关：进关先弹指法图，再按十根手指的顺序逐键练。
       ordered 让它不被打乱 —— 教学序列是按手指顺序排的，洗乱就没了「先学 a 再学 s」这层意思。 */
    { id: 'A0', name: '指法之家', goal: '认清十根手指各管哪些键，手指放在基准键上', teach: true, ordered: true,
      fixed: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', 'as', 'df', 'jk', 'l;', 'asdf', 'jkl;', 'as df', 'jk l;', 'sad', 'dad', 'fall', 'ask'],
      duration: 90, par: [10, 16, 24], acc: [70, 80, 90] },
    { id: 'A1', name: '回家：基准键', goal: '八个手指放在 ASDF JKL; 上', pool: HOME, len: 1, n: 14, seed: 11, extra: gen(HOME, 2, 16, 12), duration: 60, par: [15, 22, 30], acc: [80, 86, 92] },
    { id: 'A2', name: '基准键组合', goal: '不看键盘，凭手感找键', pool: HOME, len: 2, n: 30, seed: 21, duration: 70, par: [18, 26, 36], acc: [82, 88, 94] },
    { id: 'A3', name: '上排伸手', goal: '手指向上伸，打完立刻回基准位', pool: TOP, len: 2, n: 30, seed: 31, duration: 75, par: [16, 24, 33], acc: [82, 88, 94] },
    { id: 'A4', name: '下排伸手', goal: '向下缩手指，手腕不要动', pool: BOTTOM, len: 2, n: 30, seed: 41, duration: 75, par: [16, 24, 33], acc: [82, 88, 94] },
    { id: 'A5', name: '三排混打', goal: '上下中三排自由切换', pool: ALL, len: 3, n: 28, seed: 51, duration: 80, par: [20, 29, 40], acc: [84, 89, 94] },
    { id: 'A6', name: '空格与词组', goal: '大拇指负责空格', fixed: ['as df', 'jk l;', 'a b c', 'q w e', 'z x c', 'the cat', 'hi all', 'sad dad', 'fall flask', 'a s d f', 'j k l', 'we are', 'ab cd ef', 'fl ask', 'all fall'], duration: 75, par: [20, 28, 38], acc: [84, 89, 95] },
    { id: 'A7', name: '大写字母', goal: '小指按住 Shift 再敲字母', fixed: ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'Q', 'W', 'E', 'R', 'Z', 'X', 'C', 'aB', 'cD', 'eF', 'Gh', 'Ij', 'Kl', 'Mn', 'Op', 'Qr', 'sT'], caseStrict: true, duration: 80, par: [14, 21, 29], acc: [85, 90, 95] },
    { id: 'A8', name: '数字 1 到 5', goal: '左手管 12345，手指上伸', pool: NUM15, len: 2, n: 28, seed: 81, duration: 70, par: [18, 27, 38], acc: [85, 90, 95] },
    { id: 'A9', name: '数字 6 到 0', goal: '右手管 67890', pool: NUM60, len: 2, n: 28, seed: 91, duration: 70, par: [18, 27, 38], acc: [85, 90, 95] },
    { id: 'A10', name: '标点与句号', goal: '句号逗号问叹，右手小指区', fixed: ['a. b,', 'c? d!', 'hi.', 'ok!', 'a, b.', 'yes.', 'no!', 'go?', 'sad.', 'fly!', 'a b.', 'c d,', 'e? f!', 'end.', 'run!'], duration: 80, par: [20, 30, 42], acc: [86, 91, 96] },
    { id: 'A11', name: '引号与分号', goal: '分号、单引号、减号', fixed: ['a;', "it's", 'a-b', "he's", "';", "don't", 'x-y', "o'clock", 'a; b;', "i'm", 'p-q', "she's", ';a', "'k'", 'a-b-c'], caseStrict: false, duration: 85, par: [18, 27, 38], acc: [86, 91, 96] },
    { id: 'A12', name: '指法毕业考', goal: '全键盘混打，把手指练熟', boss: true, pool: ALL, len: 3, n: 34, seed: 121, extra: ['the end', 'A B C', '1 2 3', 'go!'], duration: 100, par: [26, 38, 52], acc: [88, 92, 96] }
  ];

  function aTargets(c) {
    var list = [];
    if (c.fixed) return c.fixed.slice();
    if (c.pool) list = gen(c.pool, c.len, c.n, c.seed);
    if (c.extra) list = list.concat(c.extra);
    return list;
  }

  /* 世界 B：18 关，目标串取自拼音数据 */
  var B_META = [
    { id: 'B1', name: '单韵母', goal: 'a o e i u ü 六个音', duration: 60, par: [6, 10, 14], acc: [82, 88, 94] },
    { id: 'B2', name: '声母 b p m f', goal: '四个唇音，注意 b 和 p', duration: 70, par: [6, 10, 14], acc: [82, 88, 94] },
    { id: 'B3', name: '声母 d t n l', goal: '舌尖音，n 和 l 别搞混', duration: 70, par: [7, 11, 15], acc: [83, 89, 94] },
    { id: 'B4', name: '声母 g k h', goal: '舌根音，都在左手区', duration: 70, par: [7, 11, 15], acc: [83, 89, 95] },
    { id: 'B5', name: '声母 j q x', goal: 'j q x 后面不跟 u', duration: 75, par: [7, 12, 16], acc: [84, 90, 95] },
    { id: 'B6', name: '平舌与翘舌', goal: 'z c s 对 zh ch sh r', duration: 80, par: [7, 11, 16], acc: [85, 90, 95] },
    { id: 'B7', name: '零声母 y w', goal: 'yi wu yu 这些整体认读', duration: 70, par: [8, 12, 17], acc: [85, 90, 95] },
    { id: 'B8', name: '两拼音节', goal: '声母加单韵母，一口气打完', duration: 80, par: [8, 12, 17], acc: [85, 91, 96] },
    { id: 'B9', name: '复韵母', goal: 'ai ei ui ao ou iu', duration: 85, par: [8, 13, 18], acc: [86, 91, 96] },
    { id: 'B10', name: 'ie üe er', goal: 'ü 在键盘上是 V 键', duration: 85, par: [8, 13, 18], acc: [86, 91, 96] },
    { id: 'B11', name: '前鼻韵母', goal: 'an en in un ün', duration: 85, par: [8, 12, 17], acc: [86, 92, 96] },
    { id: 'B12', name: '后鼻韵母', goal: 'ang eng ing ong', duration: 85, par: [8, 12, 17], acc: [86, 92, 96] },
    { id: 'B13', name: '前后鼻对决', goal: 'an/ang、en/eng、in/ing', duration: 90, par: [9, 14, 20], acc: [87, 92, 96] },
    { id: 'B14', name: '三拼音节', goal: '介母在中间，眼睛看准', duration: 90, par: [8, 12, 17], acc: [87, 92, 97] },
    { id: 'B15', name: '整体认读（上）', goal: 'zhi chi shi ri zi ci si yi', duration: 85, par: [9, 14, 19], acc: [87, 92, 96] },
    { id: 'B16', name: '整体认读（下）', goal: 'wu yu ye yue yuan yin yun ying', duration: 90, par: [9, 14, 20], acc: [88, 93, 97] },
    { id: 'B17', name: '易混大乱斗', goal: 'b/d p/q z/zh n/l f/h', duration: 90, par: [10, 15, 21], acc: [88, 93, 97] },
    { id: 'B18', name: '儿歌结业', goal: '《咏鹅》《静夜思》全篇', boss: true, ordered: true, duration: 110, par: [12, 18, 25], acc: [90, 94, 97] }
  ];

  /* 世界 C：15 关 */
  var C_META = [
    { id: 'C1', name: '最短的词', goal: 'I a he it is my', duration: 60, par: [3, 5, 8], acc: [82, 88, 94] },
    { id: 'C2', name: '三个字母', goal: 'cat bat hat 押韵词族', duration: 70, par: [4, 6, 9], acc: [83, 89, 94] },
    { id: 'C3', name: '动物与颜色', goal: 'dog cat red blue', duration: 75, par: [4, 7, 10], acc: [84, 90, 95] },
    { id: 'C4', name: '家庭与身体', goal: 'dad mum hand eye', duration: 75, par: [4, 7, 11], acc: [84, 90, 95] },
    { id: 'C5', name: '学校与食物', goal: 'pen book rice egg', duration: 80, par: [5, 8, 12], acc: [85, 90, 95] },
    { id: 'C6', name: '双字母组合', goal: 'sh ch ee oo ou', duration: 80, par: [5, 8, 12], acc: [85, 91, 96] },
    { id: 'C7', name: '高频不规则词', goal: 'the they said what', duration: 80, par: [5, 9, 13], acc: [86, 91, 96] },
    { id: 'C8', name: '长长的词', goal: '6-7 个字母的单词', duration: 85, par: [5, 9, 13], acc: [86, 92, 96] },
    { id: 'C9', name: '第一句完整话', goal: '大写 I 和句号', duration: 90, par: [6, 10, 14], acc: [87, 92, 96] },
    { id: 'C10', name: 'This is 与缩写', goal: "撇号 ' 用右手小指", duration: 90, par: [6, 10, 14], acc: [87, 92, 97] },
    { id: 'C11', name: '问句', goal: '句尾是问号', duration: 95, par: [7, 11, 15], acc: [88, 93, 97] },
    { id: 'C12', name: '否定句', goal: "not 和 don't", duration: 95, par: [7, 11, 16], acc: [88, 93, 97] },
    { id: 'C13', name: '正在发生', goal: '现在进行时短句', duration: 100, par: [7, 12, 16], acc: [88, 93, 97] },
    { id: 'C14', name: '小段落', goal: '两三句连着打', duration: 110, par: [8, 12, 17], acc: [89, 93, 97] },
    { id: 'C15', name: '英文结业考', goal: '长短句混打', boss: true, duration: 120, par: [8, 13, 18], acc: [90, 94, 97] }
  ];

  /* 世界 D「诗词阁」：75 首必背古诗，一首一关。
     一个目标 = 诗中一个汉字的那条无调音节，题干是汉字、要打的答案是拼音。
     顺序绝不 shuffle：打乱了就不是背诗，是猜字。 */
  var HZ = /[\u3400-\u9fff]/g;

  function poemTargets(p) {
    var out = [], i, j, clause, syl, hz;
    for (i = 0; i < p.lines.length; i++) {
      clause = p.lines[i][0];
      syl = p.lines[i][1].split(' ');
      hz = clause.match(HZ) || [];
      for (j = 0; j < hz.length; j++) {
        out.push({ t: syl[j], h: hz[j], line: clause, li: j, ln: hz.length,
          poem: p.title, author: p.author, no: p.no });
      }
    }
    return out;
  }

  /* 一关就是一首诗，长度天差地别（《江雪》20 字，《长歌行》50 字），
     所以限时按字数算：让 3★ 速度打得完这一首，孩子才有「我背完了一首」的交代。
     par 从 D1 的 8/12/17 缓升到 D75 的 11/17/22 音节/分 —— 和世界 B 同一档物理要求，
     只是这里多出「想起这个字怎么拼」的时间。 */
  /* 《凉州词》课本里有两首（王之涣、王翰），地图上是两个一模一样的名字。
     同名就把作者跟在标题后面，孩子才知道自己打的是哪一首。 */
  function dName(poems, p) {
    var i, dup = 0;
    for (i = 0; i < poems.length; i++) if (poems[i].title === p.title) dup++;
    return dup < 2 ? '《' + p.title + '》'
      : '《' + p.title + '·' + String(p.author).replace(/^【[^】]*】/, '') + '》';
  }

  function dMeta(p, i, total, poems) {
    var n = poemTargets(p).length;
    var easy = total > 1 ? i / (total - 1) : 0;
    var par = [Math.round(8 + 3 * easy), Math.round(12 + 4.5 * easy), Math.round(17 + 5 * easy)];
    return {
      id: 'D' + p.no, name: dName(poems, p), goal: p.author + '　' + n + ' 个字，看汉字拼出拼音',
      duration: Math.max(90, Math.min(200, Math.ceil(n * 60 / par[2] * 1.25 / 5) * 5)),
      par: par, acc: [Math.round(82 + 6 * easy), Math.round(88 + 5 * easy), Math.round(94 + 3 * easy)],
      ordered: true, blind: true
    };
  }

  var WORLDS = {
    A: { id: 'A', name: '指尖岛', sub: '认识键位，练好指法', unit: 'key', mult: 1.0, color: '#4fae58' },
    B: { id: 'B', name: '拼音谷', sub: '把拼音音节打出来', unit: 'syll', mult: 1.15, color: '#3d7fd1', umlaut: true },
    C: { id: 'C', name: '单词城', sub: '英文单词和句子', unit: 'word', mult: 1.3, color: '#c0559e' },
    D: { id: 'D', name: '诗词阁', sub: '看汉字，拼出每个字的拼音', unit: 'syll', mult: 1.4, color: '#c9822b', umlaut: true }
  };

  /* 地图页和自由练习都按这个顺序摆页签；加新世界只改这一行 */
  var WORLD_LIST = ['A', 'B', 'C', 'D'];

  /* 世界之间的门槛：先会指法，再打拼音，最后打英文。
     诗词阁排在拼音结业之后 —— 看字拼音要求每个音节都打熟，不必先读完英文城。 */
  var GATE = { B1: { prev: 'A4', stars: 1 }, C1: { prev: 'B4', stars: 1 }, D1: { prev: 'B18', stars: 1 } };

  /* A0 是插在最前面的教学关，不该反过来把本来就能玩的 A1 锁住：
     已经打到 A5 的老档一进来看到一排锁，只会以为游戏坏了。 */
  var FREE = { A1: true };

  var list = [];
  var byId = {};

  function push(meta, world, targets, extra) {
    var lv = {
      id: meta.id, world: world, name: meta.name, goal: meta.goal,
      unit: WORLDS[world].unit, duration: meta.duration,
      par: meta.par, accGate: meta.acc, boss: !!meta.boss, teach: !!meta.teach,
      caseStrict: meta.caseStrict !== false && world !== 'A' ? true : meta.caseStrict === true,
      shuffle: !meta.ordered,
      /* blind：挑战模式不给答案（诗词阁的题干是汉字，拼音要孩子自己想出来） */
      blind: !!meta.blind,
      raw: targets,
      glosses: (extra && extra.glosses) || null,
      targetsList: null
    };
    lv.targetsList = function (mode) {
      var a = lv.shuffle ? U.shuffle(lv.raw) : lv.raw.slice();
      if (mode === 'practice') return a.slice(0, 12);
      return a;
    };
    list.push(lv);
    byId[lv.id] = lv;
    return lv;
  }

  function build() {
    if (list.length) return list;
    var i, c, m, targets, glosses, entries;

    for (i = 0; i < A_RAW.length; i++) {
      c = A_RAW[i];
      push({
        id: c.id, name: c.name, goal: c.goal, duration: c.duration,
        par: c.par, acc: c.acc, boss: c.boss, caseStrict: c.caseStrict,
        ordered: c.ordered, teach: c.teach
      }, 'A', aTargets(c));
    }

    for (i = 0; i < B_META.length; i++) {
      m = B_META[i];
      targets = (KZ.Pinyin.levelTargets && KZ.Pinyin.levelTargets[m.id]) || [];
      push(m, 'B', targets);
    }

    for (i = 0; i < C_META.length; i++) {
      m = C_META[i];
      entries = (KZ.Words.levelTargets && KZ.Words.levelTargets[m.id]) || [];
      targets = [];
      glosses = {};
      for (var j = 0; j < entries.length; j++) {
        targets.push(entries[j].t);
        glosses[entries[j].t] = entries[j].zh;
      }
      push(m, 'C', targets, { glosses: glosses });
    }

    /* 世界 D：75 首诗按课本顺序一首一关。poemTargets 里汉字数和音节数不等会
       直接产出 undefined 音节，29-data-poems.js 的硬约束由自检守住。 */
    var poems = (KZ.Poems && KZ.Poems.list) || [];
    for (i = 0; i < poems.length; i++) {
      m = dMeta(poems[i], i, poems.length, poems);
      push(m, 'D', poemTargets(poems[i]));
    }

    /* 序号与解锁链 */
    var idx = { A: 0, B: 0, C: 0, D: 0 };
    for (i = 0; i < list.length; i++) {
      var lv = list[i];
      idx[lv.world]++;
      lv.idx = idx[lv.world];
      lv.count = 0;
    }
    for (i = 0; i < list.length; i++) list[i].count = idx[list[i].world];
    for (i = 1; i < list.length; i++) {
      var cur = list[i], prev = list[i - 1];
      if (FREE[cur.id]) cur.unlock = null;
      else if (GATE[cur.id]) cur.unlock = GATE[cur.id];
      else cur.unlock = { prev: prev.id, stars: 1 };
    }
    list[0].unlock = null;
    return list;
  }

  var Levels = {
    WORLDS: WORLDS,
    WORLD_LIST: WORLD_LIST,
    /* 目标有两种写法：世界 A/B/C 是字符串，世界 D 是 {t, h, line, ...}（拼音 + 汉字题干）。
       凡是只想要「打什么」的地方都走这两个函数，别在调用方各写一遍 typeof。 */
    targetStr: function (t) { return typeof t === 'string' ? t : t.t; },
    targetHanzi: function (t) { return typeof t === 'string' ? null : (t.h || null); },
    all: function () { return build(); },
    get: function (id) { build(); return byId[id]; },
    byWorld: function (w) {
      build();
      var out = [], i;
      for (i = 0; i < list.length; i++) if (list[i].world === w) out.push(list[i]);
      return out;
    },

    isUnlocked: function (id, save) {
      var lv = Levels.get(id);
      if (!lv) return false;
      if (!lv.unlock) return true;
      return (save.stars(lv.unlock.prev) || 0) >= (lv.unlock.stars || 1);
    },

    lockedBy: function (id) {
      var lv = Levels.get(id);
      return lv && lv.unlock ? lv.unlock.prev : null;
    },

    totalStarsPossible: function () { return build().length * 3; },

    gateCount: gateCount,
    MIN_DONE: MIN_DONE,

    /* 积分公式：第一次真正通关拿全额，之后重玩 35%；每日第一关额外 +50。
       hadClear 必须由调用方在提高星级之前算好。 */
    pointsFor: function (res, hadClear, save) {
      var lv = Levels.get(res.levelId);
      if (!lv || res.stars <= 0) return 0;
      var w = WORLDS[lv.world];
      var tier = 1 + 0.35 * ((lv.idx - 1) / Math.max(1, lv.count - 1));
      var base = Math.floor((60 + 40 * (res.stars - 1)) * w.mult * tier);
      var accBonus = res.acc >= 98 ? 24 : res.acc >= 95 ? 16 : res.acc >= 90 ? 8 : 0;
      var comboBonus = Math.min(24, Math.floor(res.maxCombo / 3));
      var total = base + accBonus + comboBonus;
      var replay = !!hadClear;
      if (replay) total = Math.floor(total * 0.35);
      save.rollDaily();
      if (!replay && !save.data.daily.firstBonus) {
        total += 50;
        save.data.daily.firstBonus = true;
      }
      return total;
    },

    /* 掉落小游戏的词源 */
    arcadePool: function (world) {
      if (world === 'B') {
        return U.uniq([].concat(
          Levels.byWorld('B')[7].raw, Levels.byWorld('B')[8].raw, Levels.byWorld('B')[11].raw));
      }
      if (world === 'C') {
        /* 词库存的是 {t, zh}，引擎要的是字符串；直接把对象丢进池子，
           掉落物会是一个没有 text 的空壳，drawObj 立刻崩。 */
        var ws = KZ.Words.arcade || [], out = [], i;
        for (i = 0; i < ws.length; i++) out.push(ws[i].t);
        return out;
      }
      if (world === 'D') {
        /* 每五首播一首，池子里约十五首的字：掉落练习要的是「什么字都敢来」，
           不是把一首诗连着背完 —— 连着背是关卡的事。 */
        var dp = (KZ.Poems && KZ.Poems.list) || [], out2 = [], k;
        for (k = 0; k < dp.length; k += 5) out2 = out2.concat(poemTargets(dp[k]));
        return out2;
      }
      return gen(ALL, 1, 26, 77);
    }
  };

  KZ.Levels = Levels;
})(typeof window !== 'undefined' ? window : globalThis);
