/* 关卡与内容自检：node tools/validate-levels.js
   在浏览器之外把全部关卡的键位映射、拼音合法性、解锁链、服装定价全查一遍。 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
/* 29-data-poems.js 必须在 25-data-levels.js 之前：世界 D 的关卡是 build() 时
   从 KZ.Poems 现推的，顺序倒了不会报错，只会安静地少 75 关。 */
var FILES = ['js/00-util.js', 'js/20-ime.js', 'js/26-data-pinyin.js',
  'js/27-data-words.js', 'js/28-data-costumes.js', 'js/29-data-poems.js', 'js/25-data-levels.js'];

function readJs(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }

/* 只用 ES5：老 Chrome/360 兼容模式仍可能跑 file:// 页面。
   先剥掉字符串字面量，否则 '`' 这种反引号字符会被误判成模板字符串。 */
function es6In(code) {
  var stripped = code.replace(/'(\\.|[^'\\])*'/g, "''").replace(/"(\\.|[^"\\])*"/g, '""');
  return stripped.match(/=>|`|\bconst\s|\blet\s|\bclass\s|\bimport\s|\bexport\s/);
}

FILES.forEach(function (f) {
  var code = readJs(f);
  var es6 = es6In(code);
  if (es6) console.log('WARN  ' + f + ' 含 ES6 语法：' + es6[0]);
  eval(code);
});

var KZ = globalThis.KZ;
var errs = [];
var warn = [];
var ok = [];

function need(cond, msg) { if (!cond) errs.push(msg); }

/* 拒绝导入必须是原子操作：对象身份、全部进度、存储内容及写入次数都不变。 */
function rejectedUnchanged(save, texts, storageState) {
  texts.forEach(function (text) {
    var before = save.toJSON(), data = save.data;
    var disk = storageState ? storageState() : null;
    need(save.importText(text) === false, '结构错误的存档被接受：' + text);
    need(save.data === data && save.toJSON() === before, '拒绝坏档时修改了内存进度：' + text);
    if (storageState) need(storageState() === disk, '拒绝坏档时写入了本机存档：' + text);
  });
}

var badSaves = ['乱七八糟', 'null', '[]', '7', 'true', '"存档"', '{}',
  '{"points":"5"}', '{"points":null}', '{"points":-1}', '{"points":1e400}'];
['levels', 'equipped', 'taught', 'settings', 'daily', 'play'].forEach(function (field) {
  [null, [], 'x', 7, true].forEach(function (value) {
    var obj = { points: 5 };
    obj[field] = value;
    badSaves.push(JSON.stringify(obj));
  });
});
[null, {}, 'x', 7, true, [null], [7], [{}], [[]]].forEach(function (value) {
  badSaves.push(JSON.stringify({ points: 5, owned: value }));
});
[null, [], 'x', 7, true].forEach(function (value) {
  badSaves.push(JSON.stringify({ points: 5, levels: { A1: value } }));
});
[[], 'x', 7, true].forEach(function (value) {
  badSaves.push(JSON.stringify({ points: 5, levels: { A1: { best: value } } }));
});
badSaves.push('{"points":5,"owned":null,"levels":7,"equipped":"x","taught":"x","settings":null,"daily":null,"charId":"zz9","play":{"activeMs":"abc"}}');
/* 正确容器内也不能塞错类型的值，否则「[] 当对象」只会藏到下一层。 */
var saveValueTypes = {
  'equipped.c3': 'string', 'taught.A0': 'boolean',
  'settings.sfx': 'boolean', 'settings.voice': 'boolean', 'settings.dys': 'boolean',
  'settings.strictCase': 'boolean', 'settings.restMin': 'number',
  'daily.date': 'string', 'daily.firstBonus': 'boolean', 'daily.arcade': 'number',
  'play.activeMs': 'number', 'play.lastTick': 'number', 'play.restAck': 'number',
  'levels.A1.stars': 'number', 'levels.A1.tries': 'number', 'levels.A1.cleared': 'boolean',
  'levels.A1.best.score': 'number', 'levels.A1.best.speed': 'number',
  'levels.A1.best.acc': 'number', 'levels.A1.best.stars': 'number'
};
Object.keys(saveValueTypes).forEach(function (field) {
  [null, [], {}, 'x', true, 7].forEach(function (value) {
    if (typeof value === saveValueTypes[field]) return;
    var obj = { points: 5 }, parts = field.split('.'), at = obj, i;
    for (i = 0; i < parts.length - 1; i++) { at[parts[i]] = {}; at = at[parts[i]]; }
    at[parts[parts.length - 1]] = value;
    badSaves.push(JSON.stringify(obj));
  });
});
badSaves.push('{"points":5,"play":{"activeMs":1e400}}');

/* ---------- 0. js/ 目录与 index.html、和 ES5 约束 ----------
   这两条都要跟着目录现算：新增一个 js 文件时，忘了挂进 index.html 就是
   「代码写了但永远不加载」，Node 这边全绿、浏览器里啥也没有；
   界面脚本里混进一个箭头函数，Node 跑得欢，老 Chrome 一打开直接白屏。 */
(function () {
  var names = fs.readdirSync(path.join(ROOT, 'js')).filter(function (n) { return /\.js$/.test(n); });
  var css = fs.readdirSync(path.join(ROOT, 'css')).filter(function (n) { return /\.css$/.test(n); });
  var html = readJs('index.html');
  var missing = [], es6 = [], cssMissing = [], i, e;
  for (i = 0; i < names.length; i++) {
    if (html.indexOf('js/' + names[i]) < 0) missing.push(names[i]);
    e = es6In(readJs('js/' + names[i]));
    if (e) es6.push(names[i] + '（' + e[0].trim() + '）');
  }
  for (i = 0; i < css.length; i++) {
    if (html.indexOf('css/' + css[i]) < 0) cssMissing.push(css[i]);
  }
  need(!missing.length, '这些文件没挂进 index.html，写了也不会加载：' + missing.join('、'));
  need(!cssMissing.length, '这些样式没挂进 index.html，界面会散：' + cssMissing.join('、'));
  need(!es6.length, '这些文件里有 ES6 语法，file:// 上的老浏览器会整页抛错：' + es6.join('、'));
  ok.push('js/ 下 ' + names.length + ' 个文件、css/ 下 ' + css.length + ' 个全部挂在 index.html，且脚本都是 ES5');
})();

/* ---------- 1. 键位映射往返 ---------- */
function roundTrip(str) {
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    var want = KZ.Keys.lookup(ch);
    if (!want) return '打不出的字符 ' + JSON.stringify(ch);
    var shift = /[A-Z]/.test(ch) || ch === ch.toUpperCase() && /[!?@#$%^&*()_+{}|:"<>~]/.test(ch);
    var ev = KZ.Keys.effectiveChar(want.code, shift, false);
    /* strict 的极性不能反：小写字母要宽松（CapsLock 一直开着的孩子也算对），
       大写字母要严格，否则「大写字母」这类关卡不考 Shift，等于没有内容。 */
    if (/[a-z]/.test(ch) && want.strict) return '小写目标 ' + ch + ' 不该 strict';
    if (/[A-Z]/.test(ch) && !want.strict) return '大写目标 ' + ch + ' 应该 strict';
    if (want.strict && ev !== ch) return 'shift 态下 ' + want.code + ' 得到 ' + JSON.stringify(ev) + ' 而不是 ' + JSON.stringify(ch);
    if (!want.strict && /[a-z0-9]/.test(ch) && ev !== ch) return want.code + ' 得到 ' + JSON.stringify(ev) + ' 而不是 ' + JSON.stringify(ch);
  }
  return null;
}

/* ---------- 2. 关卡结构 ---------- */
var levels = KZ.Levels.all();
var byWorld = {};
levels.forEach(function (lv, li) {
  byWorld[lv.world] = (byWorld[lv.world] || 0) + 1;
  /* 目标有两种写法：A/B/C 是字符串，D（诗词阁）是 {t, h, ...}（要打的拼音 + 题干的汉字）。
     这里一律先过 targetStr，否则 D 的每一条都是 undefined.length，
     门槛、键位、重复检查会全部静默放行。
     诗句和拼音一旦错位，poemTargets 会产出 t 为 undefined 的目标：自检要把它报出来，
     不能在这儿抛异常，把后面古诗、服装、存档那几段检查一起带走。 */
  var strs = lv.raw.map(function (t, ti) {
    var s = KZ.Levels.targetStr(t);
    if (typeof s !== 'string' || !s) {
      errs.push(lv.id + ' 第' + (ti + 1) + '条没有可打的文本（这一句的汉字比拼音多，位置串了）');
      return '';
    }
    return s;
  });

  need(lv.raw.length > 0, lv.id + ' 没有目标');
  need(lv.par.length === 3 && lv.par[0] < lv.par[1] && lv.par[1] < lv.par[2], lv.id + ' par 必须三档递增：' + lv.par.join('/'));
  need(lv.accGate.length === 3 && lv.accGate[0] <= lv.accGate[1] && lv.accGate[1] <= lv.accGate[2], lv.id + ' accGate 必须递增：' + lv.accGate.join('/'));
  need(lv.duration >= 40 && lv.duration <= 200, lv.id + ' duration 异常 ' + lv.duration);
  need(['key', 'syll', 'word'].indexOf(lv.unit) >= 0, lv.id + ' 未知速度单位 ' + lv.unit);

  /* 门槛必须按 1★ 速度真的打得完。原来只按条数卡：C15 三条平均 86 字母，
     隐含要求 25 词/分，比它自己 3★ 的 18 词/分还高，于是只剩「0 星或 3 星」，
     孩子永远毕不了业。gateCount 与引擎共用，所以查的就是真机生效的那个数。 */
  var glens = strs.map(function (t) { return t.length; });
  var g = KZ.Levels.gateCount(glens, lv.unit, lv.par[0], lv.duration);
  var gmean = KZ.U.sum(glens) / glens.length;
  var need1 = lv.unit === 'syll' ? g / (lv.duration / 60)
    : g * gmean * (lv.unit === 'word' ? 0.2 : 1) / (lv.duration / 60);
  need(need1 <= lv.par[0] * 1.001, lv.id + ' 要打完 ' + g + ' 条隐含 ' + (Math.round(need1 * 10) / 10) + '，已超 1★ 门槛 ' + lv.par[0]);
  if (lv.boss && li > 0) {
    need(lv.par[0] >= levels[li - 1].par[0], lv.id + ' 是 Boss 关，1★ 门槛 ' + lv.par[0] + ' 不该低于上一关 ' + levels[li - 1].par[0]);
  }

  /* 重复本身不是错：B1-B5 是单韵母/单声母逐键练习、B15-B16 的 16 个整体认读音节
     本来只有 8 个，靠重复记牢。真正要防的是录入时把一关写成了同一个词来回刷。 */
  var cnt = {};
  strs.forEach(function (t, j) {
    var bad = roundTrip(t);
    if (bad) errs.push(lv.id + ' 第' + (j + 1) + '条 "' + t + '"：' + bad);
    cnt[t] = (cnt[t] || 0) + 1;
    /* D 和 B 打的是同一批音节：诗词阁的拼音同样要在 legal 里、同样读得出来 */
    if (lv.world === 'B' || lv.world === 'D') {
      var norm = t.replace(/ü/g, 'v').toLowerCase();
      if (KZ.Pinyin.legal.indexOf(norm) < 0) errs.push(lv.id + ' 非法拼音音节 "' + t + '"（键盘形式 ' + norm + '）不在 legal 表');
    }
    if (lv.world === 'C' && !/^[A-Za-z0-9 .,?!']+$/.test(t)) errs.push(lv.id + ' 英文目标含规定外字符：' + t);
  });
  var kinds = Object.keys(cnt).length;
  need(kinds >= 6, lv.id + ' 只有 ' + kinds + ' 个不同目标，疑似录入错误');
  if (lv.world === 'C') {
    var dupC = Object.keys(cnt).filter(function (k) { return cnt[k] > 1; });
    if (dupC.length) warn.push(lv.id + ' 英文关出现重复目标：' + dupC.join(' '));
  }

  /* 世界 B 必须真的出现 ü，否则 ü→V 这条规则从没被验证过 */
  if (lv.id === 'B10') need(lv.raw.join(' ').indexOf('ü') >= 0, 'B10 应包含带 ü 的音节');
});

/* 关数按 KZ.Poems 现算，不写死 75：课本一首没抽进来就是少一关，
   写死的话这条检查会把「数据少了」读成「预期变了」。 */
var POEM_N = KZ.Poems.list.length;
need(byWorld.A === 13, '世界 A 应为 13 关，实际 ' + byWorld.A);
need(byWorld.B === 18, '世界 B 应为 18 关，实际 ' + byWorld.B);
need(byWorld.C === 15, '世界 C 应为 15 关，实际 ' + byWorld.C);
need(byWorld.D === POEM_N, '世界 D 应一关一首诗（' + POEM_N + ' 关），实际 ' + byWorld.D);
ok.push('关卡 ' + levels.length + ' 关（A' + byWorld.A + ' / B' + byWorld.B + ' / C' + byWorld.C + ' / D' + byWorld.D + '）');

/* ---------- 2b. 指法教学关 ---------- */
var teach = levels.filter(function (l) { return l.teach; });
need(teach.length === 1, '指法教学关只该有 1 关，实际 ' + teach.length);
need(teach[0] === levels[0], '教学关必须排在第一关，孩子才会先看到指法');
need(!teach[0].shuffle, '教学关不能洗牌：目标顺序就是十根手指的顺序');
need(levels[1].unlock === null, teach[0].id + ' 不该把 ' + levels[1].id + ' 锁在自己后面');
(function () {
  /* 教学关的内容必须落在基准键上，否则「先学 a 再学 s」这套顺序就没意义，
     而且孩子会在还没学过的手指上撞车。 */
  var home = 'asdfjkl; ';
  var bad = [], i, j;
  for (i = 0; i < teach[0].raw.length; i++) {
    for (j = 0; j < teach[0].raw[i].length; j++) {
      if (home.indexOf(teach[0].raw[i].charAt(j)) < 0) { bad.push(teach[0].raw[i]); break; }
    }
  }
  need(!bad.length, '教学关只该用基准键和空格，出现了别的目标：' + bad.join(' '));
})();
ok.push('指法教学关 ' + teach[0].id + '：' + teach[0].raw.length + ' 条按手指顺序排列，' + levels[1].id + ' 不被它挡住');

/* ---------- 3. 解锁链 ---------- */
need(!levels[0].unlock, levels[0].id + ' 是第一关，不该有前置');
var ids = {};
levels.forEach(function (l) { ids[l.id] = l; });
levels.forEach(function (l, i) {
  if (!l.unlock) return;
  need(!!ids[l.unlock.prev], l.id + ' 的前置关卡不存在：' + l.unlock.prev);
  need(i > 0 && levels.indexOf(ids[l.unlock.prev]) < i, l.id + ' 的前置必须排在它前面（防环）');
});
var reach = {};
levels.forEach(function (l) {
  if (!l.unlock) { reach[l.id] = true; return; }
  reach[l.id] = !!reach[l.unlock.prev];
});
levels.forEach(function (l) { need(reach[l.id], l.id + ' 永远无法解锁'); });
ok.push('解锁链线性、无环、全部可达');

/* ---------- 4. 拼音数据 ---------- */
need(KZ.Pinyin.legal.length > 380, 'legal 音节表偏少：' + KZ.Pinyin.legal.length);
var missTts = [], usedSyll = {};
(function () {
  /* 按「这一关打的是音节」来选世界，不是按世界名：只查 B 的话，诗词阁那 286 个
     音节里任何一个没有代表字都不会有人发现 —— TTS 会安静地拿中文音色去念一串
     英文字母，孩子听到的是「al v」而不是「lǖ」。 */
  levels.forEach(function (l) {
    if (l.unit !== 'syll') return;
    l.raw.forEach(function (t) { usedSyll[KZ.Levels.targetStr(t).replace(/ü/g, 'v').toLowerCase()] = 1; });
  });
  Object.keys(usedSyll).forEach(function (k) { if (!KZ.Pinyin.tts[k]) missTts.push(k); });
})();
need(missTts.length === 0, '这些音节没有朗读用代表汉字：' + missTts.join(' '));

(function () {
  var seen = {}, dup = [];
  KZ.Pinyin.legal.forEach(function (s) { if (seen[s]) dup.push(s); seen[s] = 1; });
  need(!dup.length, 'legal 表有重复音节：' + dup.join(' '));

  /* groups 运行时没人读，它的全部价值就在这里：教学分组写的每个音都必须
     真的能打字、能朗读，否则孩子会在关卡里撞到打不出来的音节。 */
  var noKey = [], noVoice = [];
  Object.keys(KZ.Pinyin.groups).forEach(function (g) {
    KZ.Pinyin.groups[g].forEach(function (s) {
      var k = s.replace(/ü/g, 'v').toLowerCase();
      if (KZ.Pinyin.legal.indexOf(k) < 0) noKey.push(g + ':' + s);
      if (!KZ.Pinyin.tts[k]) noVoice.push(g + ':' + s);
    });
  });
  need(!noKey.length, '教学分组里有不在 legal 的音节：' + noKey.join(' '));
  need(!noVoice.length, '教学分组里有读不出来的音节：' + noVoice.join(' '));

  var bare = KZ.Pinyin.legal.filter(function (k) { return !KZ.Pinyin.tts[k]; });
  need(!bare.length, 'legal 里这些音节没有朗读代表字：' + bare.join(' '));
})();

ok.push('拼音 legal ' + KZ.Pinyin.legal.length + ' 个，关卡用到的 ' + Object.keys(usedSyll).length + ' 个都有 TTS 代表字');

/* ---------- 4b. 古诗数据（世界 D 的内容源） ----------
   29-data-poems.js 的表头写着「行数相等、每行汉字数与音节数相等由自检守住」，这里就是那份守约。
   poemTargets 是按位置把第 n 个汉字和第 n 个音节配成一对，所以错一个字不是少一个字，
   而是后面整首全串位 —— 孩子照着「静」打出来的却是下一个字的拼音。 */
(function () {
  var HZG = /[㐀-鿿]/g;
  var HZ1 = /[㐀-鿿]/;
  var PUNCT = /^[，。、？！；：,.?!;:“”‘’《》〈〉（）【】…—–~－\s]$/;
  var po = KZ.Poems.list, i, j, k, p, clause, parts, hz;
  var mis = [], illegal = [], shape = [], mirrored = [];
  var hzTotal = 0;

  need(po.length >= 75, '必背古诗应有 75 首，实际 ' + po.length);
  var seenNo = {}, seenTa = {};
  for (i = 0; i < po.length; i++) {
    p = po[i];
    if (seenNo[p.no]) mis.push('序号重复 ' + p.no);
    seenNo[p.no] = 1;
    if (seenTa[p.title + '|' + p.author]) mis.push('同一首先重复收录：' + p.title + ' ' + p.author);
    seenTa[p.title + '|' + p.author] = 1;
    if (!p.title || !p.author || !p.lines.length) { mis.push('第 ' + (i + 1) + ' 首数据不全'); continue; }

    for (j = 0; j < p.lines.length; j++) {
      clause = p.lines[j][0]; parts = p.lines[j][1].split(' ');
      hz = clause.match(HZG) || [];
      if (hz.length !== parts.length) {
        mis.push(p.no + '《' + p.title + '》第' + (j + 1) + '句 ' + hz.length + ' 字 / ' + parts.length + ' 音：' + clause);
        continue;
      }
      hzTotal += hz.length;
      /* 非标点又非汉字的字符（全角数字、扩展 B 的生僻字）会静默掉出上面的 match，
         计数照样相等，配对却已经串了，所以这一句里剩下的字符必须全是标点。 */
      for (k = 0; k < clause.length; k++) {
        if (!HZ1.test(clause.charAt(k)) && !PUNCT.test(clause.charAt(k))) {
          shape.push(p.no + '《' + p.title + '》第' + (j + 1) + '句有规定外字符 ' + JSON.stringify(clause.charAt(k)));
        }
      }
      for (k = 0; k < parts.length; k++) {
        if (!/^[a-zü]+$/.test(parts[k])) shape.push(p.no + ':' + parts[k] + ' 不是纯小写拼音');
        else if (KZ.Pinyin.legal.indexOf(parts[k].replace(/ü/g, 'v')) < 0) illegal.push(p.no + ':' + parts[k]);
      }
    }
  }

  /* 关卡是诗的一面镜子：一首一关、条数等于字数，第 n 条的题干汉字就是第 n 个字。
     这条查的是 25-data-levels.js 里 poemTargets 的实际产出，不是它以为的产出。 */
  var dLv = levels.filter(function (l) { return l.world === 'D'; });
  need(dLv.length === po.length, '世界 D 要一关一首：' + dLv.length + ' 关 / ' + po.length + ' 首');
  for (i = 0; i < Math.min(dLv.length, po.length); i++) {
    p = po[i];
    var lv = dLv[i], n = 0, len = 0;
    if (lv.id !== 'D' + p.no) mirrored.push(lv.id + ' 不是第 ' + p.no + ' 首《' + p.title + '》');
    for (j = 0; j < p.lines.length; j++) len += (p.lines[j][0].match(HZG) || []).length;
    if (lv.raw.length !== len) mirrored.push(lv.id + ' 应有 ' + len + ' 条（这一首的字数），实际 ' + lv.raw.length);
    if (lv.shuffle) mirrored.push(lv.id + ' 不能洗牌：打乱了就不是背诗，是猜字');
    if (!lv.blind) mirrored.push(lv.id + ' 挑战模式必须盖住拼音，否则这一关变成抄写');
    for (j = 0; j < p.lines.length; j++) {
      hz = p.lines[j][0].match(HZG) || [];
      parts = p.lines[j][1].split(' ');
      for (k = 0; k < hz.length; k++, n++) {
        var t = lv.raw[n];
        if (!t || t.h !== hz[k] || KZ.Levels.targetStr(t) !== parts[k]) {
          mirrored.push(lv.id + ' 第' + (n + 1) + '条应是「' + hz[k] + '」→' + parts[k] +
            '，实际「' + (t ? t.h : '无') + '」→' + KZ.Levels.targetStr(t || ''));
        }
      }
    }
  }

  /* 课本里《凉州词》有两首（王之涣 / 王翰），地图上撞名的两关孩子分不清。
     dName 靠追加作者避开重名，这条就是守住它真的避开了。 */
  var seenName = {};
  for (i = 0; i < dLv.length; i++) {
    if (seenName[dLv[i].name]) {
      mirrored.push('两关同名「' + dLv[i].name + '」：' + seenName[dLv[i].name] + ' 和 ' + dLv[i].id);
    }
    seenName[dLv[i].name] = dLv[i].id;
  }

  /* 自由练习的皮跟着世界表走：SKINS 少一个世界不会报错，点那个页签会退回气球玩法 */
  var fallSrc = readJs('js/55-engine-fall.js');
  KZ.Levels.WORLD_LIST.forEach(function (w) {
    need(fallSrc.indexOf("key: '" + w + "'") >= 0,
      '世界 ' + w + ' 没有自由练习的皮（55-engine-fall.js 的 SKINS.' + w + '）');
  });

  need(!mis.length, '汉字与拼音对不齐（后面整首都会串位）：' + mis.join('　'));
  need(!illegal.length, '这些音节不在 legal 表，打不出来：' + illegal.join(' '));
  need(!shape.length, shape.join('　'));
  need(!mirrored.length, 'D 关卡和古诗数据不一致：' + mirrored.join('　'));
  ok.push('古诗 ' + po.length + ' 首，' + hzTotal + ' 个汉字与拼音逐字对齐；D 关卡按诗序一一镜像；四个世界都有自由练习');
})();

/* ---------- 5. 英文数据 ---------- */
var cCount = 0;
levels.forEach(function (l) {
  if (l.world !== 'C') return;
  cCount += l.raw.length;
  l.raw.forEach(function (t) { need(!!l.glosses[t], l.id + ' 缺少中文释义：' + t); });
});
need(KZ.Words.arcade.length >= 80, '街机词库偏少：' + KZ.Words.arcade.length);
ok.push('英文目标 ' + cCount + ' 条，街机词库 ' + KZ.Words.arcade.length + ' 条，释义齐全');

/* 掉落小游戏的词源：A/B/C 是字符串，D 是 {t, h}（看汉字打拼音）。
   两种写法都要能拆出可敲的键位 —— 曾经把 {t, zh} 整块丢进池子，
   引擎里 new Obj 又拿不到有效返回，画布上就冒出一个没有 text 的空壳。 */
KZ.Levels.WORLD_LIST.forEach(function (w) {
  var pool = KZ.Levels.arcadePool(w);
  need(pool.length >= 20, '街机世界 ' + w + ' 词源太少：' + pool.length);
  pool.forEach(function (t, i) {
    var s = KZ.Levels.targetStr(t);
    if (typeof s !== 'string' || !s) return errs.push('街机世界 ' + w + ' 词源第' + i + '项拆不出文本：' + JSON.stringify(t));
    if (w === 'D' && !KZ.Levels.targetHanzi(t)) errs.push('街机世界 D 词源第' + i + '项没有汉字题干：' + s);
    var bad = roundTrip(s);
    if (bad) errs.push('街机世界 ' + w + ' 词源 "' + s + '"：' + bad);
  });
});
ok.push('街机词源 ' + KZ.Levels.WORLD_LIST.join('/') + ' 全可敲：' + KZ.Levels.WORLD_LIST.map(function (w) {
  return KZ.Levels.arcadePool(w).length;
}).join('/'));

/* ---------- 6. 服装与定价 ---------- */
var flat = KZ.Costumes.flat;
var seenId = {};
var band = { 0: [0, 0], 1: [100, 200], 2: [220, 340], 3: [400, 560], 4: [600, 900] };
/* 数量按 CHARS 现算，不写死：加形象时这一条本来就该跟着数据走，
   写死的话每加一批都要记得来改，改漏一次就是把真问题当通过。 */
var nChars = KZ.Costumes.chars.length;
need(flat.length === nChars * 8, '服装总数应为 ' + nChars * 8 + '（' + nChars + ' 形象 × 8），实际 ' + flat.length);
/* 路径不写区间正则（`c[1-18]` 在字符类里其实只匹配「1 或 8」，c7 会被判成不规范），
   直接和这件服装自己的 charId/o 拼出来的路径比对，加多少个形象都不用再动这里。 */
flat.forEach(function (f) {
  need(!seenId[f.id], '服装 id 重复：' + f.id);
  seenId[f.id] = 1;
  var b = band[f.rarity];
  need(f.price >= b[0] && f.price <= b[1], f.id + ' 价格 ' + f.price + ' 不在 ' + f.rarityName + ' 区间 ' + b.join('-'));
  need(f.src === 'assets/sprites/' + f.charId + '_' + f.o + '.png', f.id + ' 图片路径不规范：' + f.src);
});
/* 每个形象除默认造型外的 7 件新造型的主题顺序，下面逐个比对。 */
var THEME_SHAPE = '职业体验,职业体验,幻想冒险,幻想冒险,幻想冒险,节日搞怪,节日搞怪';
var seenChar = {};
KZ.Costumes.chars.forEach(function (c) {
  need(c.outfits.length === 8, c.id + ' 应有 8 套服装，实际 ' + c.outfits.length);
  need(c.outfits[0].o === 'o1' && c.outfits[0].price === 0, c.id + ' 的 o1 必须是免费默认造型');
  need(!!c.name && !!c.tag && !!c.desc, c.id + ' 缺 name/tag/desc，封面卡片会空一块');
  need(!seenChar[c.name], '形象名字重复：' + c.name);
  seenChar[c.name] = 1;
  /* 主题必须正好是「2 职业 + 3 幻想 + 2 节日」：商店的分类按钮只有这三类，
     写错一个字（比如「职业」）那件衣服在任何筛选下都找不到，孩子只会以为商店少了货。 */
  var th = c.outfits.slice(1).map(function (f) { return f.theme; }).join(',');
  need(th === THEME_SHAPE, c.id + ' 服装主题不对：' + th);
  var on = {};
  c.outfits.forEach(function (f) {
    need(!on[f.name], c.id + ' 服装名字重复：' + f.name);
    on[f.name] = 1;
  });
});
var onSale = flat.filter(function (f) { return f.price > 0 && KZ.Costumes.artReady(f.id); });
var onSaleCost = 0;
onSale.forEach(function (f) { onSaleCost += f.price; });
ok.push('服装 ' + flat.length + ' 件（' + nChars + ' 个形象），总价 ' + KZ.Costumes.totalCost() +
  '；立绘已就位、商店开卖 ' + onSale.length + ' 件 / ' + onSaleCost + ' 分');
/* 缺立绘是已知在做的事，只报数量不当失败：缺的那格显示「立绘还没画好」，游戏照玩。
   但 PAINTED（商店卖不卖的唯一依据）必须和 assets/sprites 实际情况对上：
   写了假名字就是收了积分给空白，画齐了没登记就是明明能卖却一直挂着「画好才卖」。 */
KZ.Costumes.chars.forEach(function (c) {
  var have = [], o;
  for (o = 1; o <= 8; o++) {
    if (fs.existsSync(path.join(ROOT, 'assets/sprites/' + c.id + '_o' + o + '.png'))) have.push(o);
  }
  need(have.indexOf(1) >= 0, c.id + ' 连默认造型的立绘都没有，封面卡片会空掉');
  var painted = KZ.Costumes.artReady(c.id + '-o2');
  var miss = [];
  for (o = 1; o <= 8; o++) if (have.indexOf(o) < 0) miss.push('o' + o);
  if (painted) {
    need(!miss.length, 'PAINTED 说 ' + c.id + ' 画好了，实际缺 ' + miss.join('、') + '——商店会收了积分给空白');
  } else if (have.length === 8) {
    warn.push(c.id + '（' + c.name + '）8 张立绘都齐了，但没加进 28-data-costumes.js 的 PAINTED，商店仍然不卖它的 o2–o8');
  }
});
var noArt = flat.filter(function (f) { return !KZ.Costumes.artReady(f.id); });
if (noArt.length) {
  warn.push('还没画好、商店先不卖的服装 ' + noArt.length + ' / ' + flat.length + ' 件（' +
    noArt.slice(0, 4).map(function (f) { return f.id; }).join('、') + ' 等）');
} else {
  ok.push('服装立绘 ' + flat.length + ' 张全部就位，商店全部开卖');
}

/* ---------- 7. 经济曲线 ---------- */
var stub = { data: { daily: { firstBonus: false } }, rollDaily: function () {} };
var total = 0;
levels.forEach(function (l) {
  total += KZ.Levels.pointsFor({
    levelId: l.id, stars: 3, acc: 100, maxCombo: 40, speed: l.par[2], done: l.raw.length, total: l.raw.length
  }, false, stub);
});
/* 只数「商店真的在卖」的那些：立绘没画好的挂着「画好才卖」，
   拿它当便宜货来算经济曲线会把结论算错。 */
var cheap = Math.min.apply(null, onSale.map(function (f) { return f.price; }));
var early = 0;
for (var i = 0; i < 2; i++) {
  early += KZ.Levels.pointsFor({ levelId: levels[i].id, stars: 3, acc: 100, maxCombo: 20, speed: 0 }, false, { data: { daily: { firstBonus: true } }, rollDaily: function () {} });
}
need(early >= cheap, '前两关全三星只有 ' + early + ' 分，买不起最便宜的 ' + cheap + ' 分服装');
ok.push('全 3 星首通约 ' + total + ' 分 / 现在卖得出的是 ' + onSaleCost + ' 分（全画完 ' + KZ.Costumes.totalCost() + ' 分）；前两关 3 星 = ' + early + ' 分，最便宜服装 ' + cheap + ' 分');

/* ---------- 8. 存档 × 积分的真实接缝 ----------
   之前这里只拿一个 stub 去调 pointsFor，结果 recordRun 传的是 data 而不是 Save，
   一进挑战模式就崩。所以把真的 10-state.js 载进来跑一遍完整通关流程。 */
try {
  /* tickPlay 会读 document.hidden 来判断「切走了窗口，这段挂机时间不算」。
     Node 里没有 DOM，不补一个假 document 就直接抛异常，整段接缝测试白跑。 */
  globalThis.document = { hidden: false };
  eval(fs.readFileSync(path.join(ROOT, 'js/10-state.js'), 'utf8'));
  var Save = KZ.Save.init();
  need(Save.mode() === 'memory', 'Node 里应该降级成 memory 模式，实际 ' + Save.mode());
  Save.setChar('c3');
  Save.grantDefault('c3');
  var lv1 = levels[0], lv2 = levels[1];
  need(!Save.stars(lv1.id), '新档不该有星级');
  var r1 = Save.recordRun(lv1.id, {
    levelId: lv1.id, stars: 3, acc: 100, speed: lv1.par[2], maxCombo: 30,
    done: lv1.raw.length, total: lv1.raw.length, skipped: 0, mode: 'challenge', score: 100
  });
  need(r1.gained > 0, 'recordRun 没给出积分');
  need(Save.stars(lv1.id) === 3, '星级没写进存档');
  need(KZ.Levels.isUnlocked(lv2.id, Save), lv1.id + ' 拿了 3 星，' + lv2.id + ' 还是没解锁');
  need(!KZ.Levels.isUnlocked(levels[2].id, Save), levels[2].id + ' 不该被解锁');
  var r2 = Save.recordRun(lv1.id, {
    levelId: lv1.id, stars: 1, acc: 86, speed: lv1.par[0], maxCombo: 3,
    done: 3, total: lv1.raw.length, skipped: 0, mode: 'challenge', score: 40
  });
  need(r2.gained < r1.gained, '重玩没有打 35% 折扣');
  need(Save.stars(lv1.id) === 3, '星级被低分覆盖，应该只升不降');
  var json = Save.toJSON();
  Save.reset();
  need(Save.data.points === 0, '清档没清干净');
  need(Save.importText(json) === true, '导入自己导出的存档居然失败了');
  need(Save.data.points === JSON.parse(json).points, '导入后积分没回来');
  need(Save.stars(lv1.id) === 3, '导入后星级没回来');
  need(Save.importText('{"points":"不是数字"}') === false, '坏存档应该被拒绝');
  need(Save.importText('乱七八糟') === false, '非 JSON 应该被拒绝');
  need(Save.data.points === JSON.parse(json).points, '坏存档把当前进度冲掉了');
  need(Save.data.levels.B3 === undefined, '导入不该凭空多出关卡记录');
  /* 第一次没打过（时间到、0 星）是常态。原来 tries 把它当成「已经通关过」，
     于是孩子真正打通那一关时只拿 35% 的分、没有每日首关奖励、结算页也不说这是首通。 */
  var lvF = levels[3];
  Save.recordRun(lvF.id, { levelId: lvF.id, stars: 0, acc: 60, speed: 0, maxCombo: 0, done: 1, total: lvF.raw.length, skipped: 0, mode: 'challenge', score: 0 });
  need(!Save.stars(lvF.id), '0 星不该写进星级');
  var rF = Save.recordRun(lvF.id, { levelId: lvF.id, stars: 3, acc: 100, speed: lvF.par[2], maxCombo: 40, done: lvF.raw.length, total: lvF.raw.length, skipped: 0, mode: 'challenge', score: 300 });
  var rFwant = KZ.Levels.pointsFor({ levelId: lvF.id, stars: 3, acc: 100, speed: lvF.par[2], maxCombo: 40 }, false, { data: { daily: { firstBonus: true } }, rollDaily: function () {} });
  need(rF.gained >= rFwant, lvF.id + ' 失败一次后再通关只有 ' + rF.gained + ' 分，首通应为 ' + rFwant + ' 分');
  need(rF.first === true, lvF.id + ' 失败一次后再通关，结算页不再说这是第一次通关');
  /* 参与分必须靠真敲字换：空手结束一分不给，认真敲够 15 个正确键才给 10 分。
     否则一进关立刻结束也有 10 分，连点十次比认真打一关还多。 */
  var pIdle = Save.data.points;
  Save.recordRun(lvF.id, { levelId: lvF.id, stars: 0, acc: 0, speed: 0, maxCombo: 0, correct: 0, done: 0, total: lvF.raw.length, skipped: 0, mode: 'challenge', score: 0 });
  need(Save.data.points === pIdle, '一进关就结束也发了参与分，白送 ' + (Save.data.points - pIdle) + ' 分');
  var pTry = Save.data.points;
  Save.recordRun(lvF.id, { levelId: lvF.id, stars: 0, acc: 70, speed: 0, maxCombo: 0, correct: 20, done: 1, total: lvF.raw.length, skipped: 0, mode: 'challenge', score: 0 });
  need(Save.data.points - pTry === 10, '认真敲了 20 个键反而拿不到参与分，实际 ' + (Save.data.points - pTry));

  rejectedUnchanged(Save, badSaves);
  /* 值修复仍允许：不是结构错误，不能把 D5/D6 的合法迁移一并拒掉。 */
  need(Save.importText('{"points":5,"charId":"zz9","levels":{"A1":{"stars":99,"tries":2,"best":{"score":80,"stars":99}}}}') === true, '可修复的星级/形象 id 被拒绝');
  need(Save.stars('A1') === 3 && Save.data.levels.A1.best.stars === 3, '星级或最佳成绩没有封顶 3');
  /* 形象 id 被打错时必须退回「没选形象」，留着它顶栏会一路渲染成问号 */
  need(Save.data.charId === null, '不存在的 charId 没有被清空：' + Save.data.charId);
  need(Save.importText('{"points":9,"charId":"c3"}') === true && Save.data.charId === 'c3', '合法 charId 被误清了');
  need(Array.isArray(Save.data.owned) && Save.data.settings.restMin === 30 && Save.data.daily.arcade === 0, '旧档缺省字段没有补齐');
  Save.grantDefault('c1');
  need(Save.owned('c1-o1'), '补齐后的旧档发不出默认服装');
  Save.tickPlay();
  need(isFinite(Save.data.play.activeMs), 'activeMs 变成了 NaN，护眼提醒会永远不弹');

  /* 指法课上过一次就别再拦：练习模式永远不给星，只用星级判断的话，
     教学关推荐的那条路（先练一练）会每次进门都弹一遍。 */
  var ta = Save.toJSON();
  need(!Save.seenTeach('A0'), '新档不该记得指法课已经上过');
  Save.markTaught('A0');
  need(Save.seenTeach('A0'), 'markTaught 没写进存档');
  Save.importText(Save.toJSON());
  need(Save.seenTeach('A0'), '导出/导入把「指法课已上」弄丢了，孩子会反复看到同一张指法图');
  Save.reset();
  need(!Save.seenTeach('A0'), '清档后还记着指法课上过，新档第一次进 A0 直接跳过教学');
  need(Save.importText(ta) === true, '回灌测试前的存档失败');


  ok.push('存档链路：首通 ' + r1.gained + ' 分并解锁 ' + lv2.id + '，重玩 ' + r2.gained + ' 分，导出/导入可往返，坏档被拒');
} catch (e) {
  errs.push('存档×积分接缝崩了：' + e.message);
}

/* ---------- 9. 本机加载修补与导入原子性 ----------
   使用独立 VM 和可观察的 localStorage，不碰实际玩家进度。 */
try {
  var disk = {}, writes = 0;
  var storage = {
    getItem: function (key) { return disk[key] || null; },
    setItem: function (key, value) { disk[key] = String(value); writes++; },
    removeItem: function (key) { delete disk[key]; }
  };
  var ctx = vm.createContext({ localStorage: storage, document: { hidden: false } });
  ['js/00-util.js', 'js/28-data-costumes.js', 'js/10-state.js'].forEach(function (f) {
    vm.runInContext(readJs(f), ctx, { filename: f });
  });
  var localSave = ctx.KZ.Save.init();
  need(localSave.mode() === 'local', '模拟本机存储没有启用');
  localSave.setChar('c3');
  localSave.addPoints(400);
  localSave.buy('c3-o2', 120);
  localSave.equip('c3', 'o2');
  localSave.markTaught('A0');
  localSave.data.levels.A1 = { stars: 2, tries: 1, best: { score: 100, speed: 20, acc: 90, stars: 2 }, cleared: true };
  localSave.save();
  rejectedUnchanged(localSave, badSaves, function () { return writes + ':' + JSON.stringify(disk); });
  var localJson = localSave.toJSON();
  need(localSave.importText(localJson), '本机模式不能导入自己的存档');
  need(localSave.owned('c3-o2') && localSave.equippedOf('c3') === 'o2' && localSave.seenTeach('A0'), '导入往返丢失服装/教学记录');
  need(localSave.stars('A1') === 2, '导入往返丢失关卡记录');
  need(JSON.stringify(JSON.parse(disk['kzdt.v1.save'])) === JSON.stringify(localSave.data), '导入成功未落盘');

  /* hasOwnProperty 是不可信的 JSON 键，不能用存档自己的同名成员做检查。 */
  need(localSave.importText('{"points":5,"hasOwnProperty":0,"settings":{"hasOwnProperty":0},"levels":{"hasOwnProperty":{"stars":0},"A1":{"stars":2}}}'), 'JSON 同名字段让导入校验抛异常');
  need(localSave.totalStars() === 2, 'JSON 同名字段让星级查询抛异常');
  need(localSave.importText('{"points":0,"charId":"c3","owned":[],"levels":{"A1":{"stars":0,"tries":0,"best":null,"cleared":false}},"taught":{"A0":false},"settings":{"sfx":false,"voice":false,"dys":false,"strictCase":false,"restMin":0},"daily":{"date":"","firstBonus":false,"arcade":0},"play":{}}'), '合法的零值/false/空字段被误拒绝');
  need(!localSave.data.settings.sfx && localSave.data.settings.restMin === 0 && !localSave.seenTeach('A0'), '补默认值覆盖了合法的 false/零值');

  var brokenLocal = [
    { points: 5, charId: 'c3', owned: null, levels: 7, equipped: 'x', taught: 'x', settings: null, daily: null, play: { activeMs: 'abc' } },
    { points: 5, charId: 'c3', owned: {}, levels: [], equipped: [], taught: [], settings: [], daily: [], play: [] },
    { points: 5, charId: 'c3', levels: { A1: [], A2: { stars: 99, best: [] } }, daily: {}, play: {} }
  ];
  brokenLocal.forEach(function (obj) {
    disk['kzdt.v1.save'] = JSON.stringify(obj);
    localSave.load();
    need(localSave.data.charId === 'c3' && localSave.data.points === 5, '本机坏档修补丢失有效字段');
    localSave.grantDefault('c3');
    localSave.markTaught('A0');
    localSave.tickPlay();
    need(localSave.data.daily.arcade === 0 && isFinite(localSave.data.play.activeMs), '本机坏档修补后时长/每日积分不可用');
    if (obj.levels && obj.levels.A1) {
      need(localSave.data.levels.A1.best === null, '数组关卡记录没有重置');
      need(localSave.stars('A2') === 3 && localSave.data.levels.A2.best === null, '数组最佳成绩没有清空');
    }
    localSave.data.levels.A1 = { stars: 2, tries: 1, best: null };
    localSave.save();
    localSave.load();
    need(localSave.stars('A1') === 2 && localSave.owned('c3-o1') && localSave.seenTeach('A0'), '修补后新增的关卡/服装/教学进度在落盘时丢失');
    need(localSave.importText(localSave.toJSON()), '修补后的本机存档无法再次导入');
  });
  ['[]', 'null', '坏 JSON'].forEach(function (text) {
    var before = localSave.toJSON();
    disk['kzdt.v1.save'] = text;
    localSave.load();
    need(localSave.toJSON() === before, '无法读取的本机存档覆盖了当前进度');
  });
  /* 存储突然不可写时仍能接入合法导入，并准确降级到内存模式。 */
  storage.setItem = function () { throw new Error('存储不可写'); };
  need(localSave.importText(localJson), '存储不可写时合法导入被误报失败');
  need(localSave.mode() === 'memory' && !localSave.available && localSave.owned('c3-o2'), '存储降级后导入的进度丢失');
  ok.push('存档边界：' + badSaves.length + ' 种坏档在内存/本机模式均整体拒绝且不改进度；旧档补齐、D5/D6 值修复、本机数组修补及落盘往返通过');
} catch (e) {
  errs.push('本机存档边界崩了：' + e.message);
}

/* ---------- 报告 ---------- */
console.log('\n=== 通过 ===');
ok.forEach(function (s) { console.log('  ✓ ' + s); });
if (warn.length) {
  console.log('\n=== 提示（' + warn.length + '）===');
  warn.slice(0, 12).forEach(function (s) { console.log('  · ' + s); });
}
if (errs.length) {
  console.log('\n=== 失败（' + errs.length + '）===');
  errs.slice(0, 40).forEach(function (s) { console.log('  ✗ ' + s); });
  process.exit(1);
} else {
  console.log('\n全部检查通过。');
}
