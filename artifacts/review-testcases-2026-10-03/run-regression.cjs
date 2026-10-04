/* Run existing suites without overwriting their historical evidence or inputs. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const OUT = __dirname;
const suites = [
  ['qa-regression.cjs', 'node'],
  ['qa-sprite-alpha.cjs', 'alpha'],
  ['qa-elsa.cjs', 'elsa'],
  ['qa-pikachu.cjs', 'pikachu'],
  ['qa-character-swaps.cjs', 'character-swaps'],
  ['qa-tts.cjs', 'tts']
];
function clean(text) {
  return String(text).split(ROOT).join('<项目目录>')
    .split(JSON.stringify(ROOT).slice(1, -1)).join('<项目目录>');
}
const results = [];
for (const [script, label] of suites) {
  const lines = [], files = [], localProcess = { execPath:process.execPath, version:process.version, exitCode:0 };
  const fsProxy = Object.create(fs);
  fsProxy.mkdirSync = () => fs.mkdirSync(OUT, { recursive:true });
  fsProxy.writeFileSync = (file, data, options) => {
    const resolved = path.resolve(file);
    if (!resolved.startsWith(path.join(ROOT, 'artifacts') + path.sep)) throw new Error('Unexpected output target');
    const basename = path.basename(resolved);
    const name = basename === 'compatibility-results.json' ? label + '-' + basename : basename;
    fs.writeFileSync(path.join(OUT, name), typeof data === 'string' ? clean(data) : data, options);
    files.push(name);
  };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'tools', script), 'utf8'), {
      require(name) { return name === 'node:fs' || name === 'fs' ? fsProxy : require(name); },
      __dirname:path.join(ROOT, 'tools'), process:localProcess, Buffer,
      console:{ log(...args) { lines.push(args.map(String).join(' ')); } }
    }, { filename:script });
    results.push({ script, status:localProcess.exitCode ? 'FAIL' : 'PASS', exitCode:localProcess.exitCode, files });
  } catch (error) {
    lines.push(error.stack);
    results.push({ script, status:'FAIL', error:clean(error.stack), files });
  }
  fs.writeFileSync(path.join(OUT, label + '-output.txt'), clean(lines.join('\n')) + '\n');
  console.log(results[results.length - 1].status + ' ' + script);
}
const files = ['index.html', '测试用例.md', ...fs.readdirSync(path.join(ROOT, 'js')).map(x => 'js/' + x),
  ...fs.readdirSync(path.join(ROOT, 'css')).map(x => 'css/' + x), ...suites.map(([x]) => 'tools/' + x)];
const sha256 = Object.fromEntries(files.map(file => [file,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex')]));
fs.writeFileSync(path.join(OUT, 'suite-results.json'), JSON.stringify({ timestamp:new Date().toISOString(),
  node:process.version, results, sha256 }, null, 2));
process.exitCode = results.some(x => x.status === 'FAIL') ? 1 : 0;
