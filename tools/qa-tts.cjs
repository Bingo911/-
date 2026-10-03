/* 普通话选择与教学朗读回归：node tools/qa-tts.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, status:'PASS' }); }
  catch (error) { results.push({ name, status:'FAIL', error:error.stack }); }
}
const mainland = { name:'普通话', lang:'zh-CN' };
const english = { name:'English', lang:'en-US' };
const cantonese = { name:'粤语', lang:'zh-HK' };
function fixture(voices) {
  let list = voices, timer, cancels = 0;
  const spoken = [];
  const ctx = vm.createContext({ KZ:{ Save:{ data:{ settings:{ voice:true } } }, Pinyin:{ tts:{ lv:'绿' } } },
    speechSynthesis:{ getVoices:() => list, cancel() { cancels++; }, speak(u) { spoken.push(u); } },
    SpeechSynthesisUtterance:function (text) { this.text = text; },
    setInterval(fn) { timer = fn; return 1; }, clearInterval() {} });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/30-tts.js'), 'utf8'), ctx);
  ctx.KZ.Tts.init();
  return { ctx, tts:ctx.KZ.Tts, spoken, cancels:() => cancels,
    load(v) { list = v; ctx.speechSynthesis.onvoiceschanged(); }, tick() { timer(); } };
}
test('中文教学说明和拼音只用大陆普通话，英文目标仍用英语', () => {
  const f = fixture([cantonese, { name:'台湾中文', lang:'zh-TW' }, english, mainland]);
  f.tts.speak('十根手指各管哪些键');
  f.tts.speak('lü', 'pinyin');
  f.tts.speak('cat', 'en');
  assert.equal(f.spoken[0].voice, mainland);
  assert.equal(f.spoken[0].lang, 'zh-CN');
  assert.equal(f.spoken[0].pitch, 1);
  assert.equal(f.spoken[1].text, '绿');
  assert.equal(f.spoken[1].voice, mainland);
  assert.equal(f.spoken[2].voice, english);
});
test('接受大陆语言标签的下划线及简体写法', () => {
  for (const lang of ['zh_CN', 'ZH-cn', 'zh-Hans-CN', 'cmn-CN', 'cmn-Hans-CN']) {
    const voice = { name:'普通话', lang }, f = fixture([cantonese, voice]);
    f.tts.speak('指法之家'); assert.equal(f.spoken[0].voice, voice);
    assert.equal(f.spoken[0].lang, 'zh-CN');
  }
});
test('不把粤语、台湾中文、未标地区的中文或英文代作普通话', () => {
  const f = fixture([cantonese, { lang:'zh-TW' }, { lang:'zh' }, { lang:'zh-Hans' }, english]);
  f.tts.speak('教学说明'); f.tts.speak('lv', 'pinyin');
  assert.equal(f.spoken.length, 0);
  assert.match(f.tts.status(), /普通话（中国大陆）：未安装/);
  f.tts.speak('cat', 'en'); assert.equal(f.spoken[0].voice, english);
});
test('空语音列表延迟加载后可朗读，后到普通话可被选择', () => {
  const f = fixture([]); assert.equal(f.tts.pending(), true);
  f.load([english]); f.tts.speak('中文'); assert.equal(f.spoken.length, 0);
  f.load([cantonese, english, mainland]);
  f.tts.speak('中文'); assert.equal(f.spoken[0].voice, mainland);
  assert.equal(f.tts.available(), true);
});
test('默认大陆音色优先且刷新列表后重新选择', () => {
  const selected = { name:'默认普通话', lang:'zh-CN', default:true };
  const f = fixture([mainland, selected]);
  f.tts.speak('中文'); assert.equal(f.spoken[0].voice, selected);
  f.load([mainland]); f.tts.speak('中文'); assert.equal(f.spoken[1].voice, mainland);
});
test('只有普通话时仍可朗读，连续朗读和停止会打断旧语音', () => {
  const f = fixture([mainland]);
  f.tts.speak('cat', 'en'); f.tts.speak('lv', 'pinyin');
  assert.equal(f.spoken.length, 2); assert.equal(f.cancels(), 2);
  f.tts.stop(); assert.equal(f.cancels(), 3);
  f.ctx.KZ.Save.data.settings.voice = false; f.tts.speak('中文');
  assert.equal(f.spoken.length, 2);
});
test('没有普通话和英语时结束等待并提示缺少语音包', () => {
  const f = fixture([cantonese]);
  for (let i = 0; i < 13; i++) f.tick();
  assert.equal(f.tts.available(), false); assert.equal(f.tts.pending(), false);
  assert.match(f.tts.status(), /没找到中国大陆普通话/);
});
const out = path.join(ROOT, 'artifacts', 'qa-2026-10-02-mandarin');
fs.mkdirSync(out, { recursive:true });
fs.writeFileSync(path.join(out, 'tts-results.json'), JSON.stringify({ timestamp:new Date().toISOString(), results }, null, 2));
for (const result of results) console.log(result.status + ' ' + result.name + (result.error ? '\n' + result.error : ''));
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : 0;
