/* 本机 HTTP 服务：在项目目录执行 node tools/serve-local.js [端口]。
   仅监听 127.0.0.1，不提供目录列表；Ctrl+C 停止。无需安装依赖。 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var port = Number(process.argv[2] || 8080);
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('端口必须是 1–65535 的整数');
  process.exit(1);
}

function reply(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

var server = http.createServer(function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    reply(res, 405, 'Method not allowed');
    return;
  }
  var pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { reply(res, 400, 'Bad request'); return; }
  if (pathname.indexOf('\0') >= 0) { reply(res, 400, 'Bad request'); return; }
  var file = path.resolve(ROOT, '.' + pathname);
  var relative = path.relative(ROOT, file);
  if (relative === '..' || relative.indexOf('..' + path.sep) === 0 || path.isAbsolute(relative)) {
    reply(res, 403, 'Forbidden');
    return;
  }
  if (pathname === '/') file = path.join(ROOT, 'index.html');
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) { reply(res, 404, 'Not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') { res.end(); return; }
    var stream = fs.createReadStream(file);
    stream.on('error', function () { res.destroy(); });
    stream.pipe(res);
  });
});

server.on('error', function (err) {
  console.error('本机 HTTP 服务启动失败：' + err.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', function () {
  console.log('打字小勇士：http://localhost:' + port + '/');
  console.log('目录：' + ROOT);
});
process.on('SIGINT', function () { server.close(); });
process.on('SIGTERM', function () { server.close(); });
