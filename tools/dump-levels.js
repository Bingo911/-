/* dev-only dump: print every level's curriculum slot so the B-world pinyin
   ordering can be compared against the plan table by eye. */
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
['js/00-util.js', 'js/20-ime.js', 'js/26-data-pinyin.js', 'js/27-data-words.js',
  'js/28-data-costumes.js', 'js/25-data-levels.js'].forEach(function (f) {
  eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
});
var KZ = globalThis.KZ;
var only = process.argv[2] || '';
KZ.Levels.all().forEach(function (lv) {
  if (only && lv.world !== only) return;
  var lens = lv.raw.map(function (t) { return t.length; });
  console.log(
    lv.id.padEnd(4) +
    String(lv.name).padEnd(12) +
    ' unit=' + lv.unit + ' dur=' + lv.duration + ' par=' + lv.par.join('/') +
    ' acc=' + lv.accGate.join('/') + ' n=' + lv.raw.length +
    ' gate1=' + KZ.Levels.gateCount(lens, lv.unit, lv.par[0], lv.duration) +
    (lv.boss ? ' BOSS' : '') + (lv.caseStrict ? ' case' : '') + (lv.ordered ? ' ord' : '')
  );
  console.log('      ' + lv.raw.slice(0, 8).join(' '));
});
