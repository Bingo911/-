/* 立绘处理。sourceAlpha 素材保留原生透明通道，其他素材沿用绿幕处理。
   AI 出图不会老实给 #00FF00：实测 6 张背景绿从 #5FC47E 到 #96DF4E 都有，
   脚下还带一圈深绿投影，右下角有「Qoder AI 生成」水印。所以背景色按每张图的角点
   自动取样，投影用同色相压暗规则，水印靠连通块清理（见 pruneJunk）；
   抠不干净的单件在服装表里标 cardMode 退回圆角卡片。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var cache = {};      /* id -> {canvas|img, meta} */
  var order = [];      /* LRU */
  var MAX = 28;
  var loading = {};
  /* 缺图也要记下来：不记的话顶栏每重绘一次就再去请求一次同一个不存在的文件，
     控制台里全是重复的 ERR_FILE_NOT_FOUND，真正的问题被埋掉。 */
  var missing = {};

  function lruTouch(id) {
    var i = order.indexOf(id);
    if (i >= 0) order.splice(i, 1);
    order.push(id);
    while (order.length > MAX) {
      var drop = order.shift();
      if (drop !== id) delete cache[drop];
    }
  }

  /* 角点取样：bg 是四角合并后的中位色（当作背景色），
     spread 是四角各自中位色之间的最大色距 —— 背景越均匀，spread 越小，抠图越可信。 */
  function cornerStats(data, w, h) {
    var k = 16, x, y, i, j, off;
    var boxes = [[0, 0], [w - k, 0], [0, h - k], [w - k, h - k]];
    var all = [], per = [];
    for (i = 0; i < boxes.length; i++) {
      var s = [];
      for (y = 0; y < k; y++) for (x = 0; x < k; x++) {
        off = ((boxes[i][1] + y) * w + (boxes[i][0] + x)) * 4;
        var px = [data[off], data[off + 1], data[off + 2]];
        s.push(px); all.push(px);
      }
      s.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
      per.push(s[Math.floor(s.length / 2)]);
    }
    all.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
    var spread = 0;
    for (i = 0; i < per.length; i++) for (j = i + 1; j < per.length; j++) {
      var dd = Math.abs(per[i][0] - per[j][0]) + Math.abs(per[i][1] - per[j][1]) + Math.abs(per[i][2] - per[j][2]);
      if (dd > spread) spread = dd;
    }
    return { bg: all[Math.floor(all.length / 2)], spread: spread };
  }

  /* 从四边泛洪填充所有连通的透明像素；没被填到的就是包在角色内部的洞。
     手臂和身体之间的三角缝是正常的小洞，但角色身上如果有一块纯绿衣服，
     会被整片抠穿成一个大洞 —— 所以看"最大连通洞"而不是洞的总量。 */
  function maxHole(d, w, h) {
    var seen = new Uint8Array(w * h);
    var stack = [], x, y, off, px, py, qx, qy, n = w * h;
    var T = function (p) { return d[p * 4 + 3] < 128; };
    var push = function (q) { if (!seen[q] && T(q)) { seen[q] = 1; stack.push(q); } };
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      var p = stack.pop();
      px = p % w; py = (p - px) / w;
      if (px > 0) push(p - 1);
      if (px < w - 1) push(p + 1);
      if (py > 0) push(p - w);
      if (py < h - 1) push(p + w);
    }
    var best = 0;
    for (off = 0; off < n; off++) {
      if (T(off) && !seen[off]) {
        /* 逐个统计封闭连通块 */
        var size = 0, st = [off];
        seen[off] = 1;
        while (st.length) {
          var q = st.pop(); size++;
          qx = q % w; qy = (q - qx) / w;
          if (qx > 0 && !seen[q - 1] && T(q - 1)) { seen[q - 1] = 1; st.push(q - 1); }
          if (qx < w - 1 && !seen[q + 1] && T(q + 1)) { seen[q + 1] = 1; st.push(q + 1); }
          if (qy > 0 && !seen[q - w] && T(q - w)) { seen[q - w] = 1; st.push(q - w); }
          if (qy < h - 1 && !seen[q + w] && T(q + w)) { seen[q + w] = 1; st.push(q + w); }
        }
        if (size > best) best = size;
      }
    }
    return best / n;
  }

  /* 抠完再做一次连通块清理。右下角那行「Qoder AI 生成」水印、以及零星的深色碎点，
     都是跟角色不连通的独立小块：留着有两个坏处 —— 游戏里会飘一层鬼影，而且下面
     「按不透明像素裁边」会被它们撑到整张图，角色凭空缩小一圈（实测小星那张小了 20%）。
     规则很保守：最大的一块永远保留；右下角水印区里的小块丢掉；别处只丢极碎的点。
     绝不按颜色删，所以不会出现「为了去水印把角色的脚也削掉」。 */
  function pruneJunk(d, w, h) {
    var n = w * h, TH = 40;
    var lab = new Int32Array(n);
    var stack = new Int32Array(n);
    var comps = [], id = 0, p0, p, nb, x, y, i;
    var solid = function (q) { return d[q * 4 + 3] >= TH; };

    for (p0 = 0; p0 < n; p0++) {
      if (lab[p0] || !solid(p0)) continue;
      id++;
      var top = 0, size = 0, minX = w, maxX = 0, minY = h, maxY = 0;
      lab[p0] = id; stack[top++] = p0;
      while (top) {
        p = stack[--top];
        x = p % w; y = (p - x) / w;
        size++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x > 0) { nb = p - 1; if (!lab[nb] && solid(nb)) { lab[nb] = id; stack[top++] = nb; } }
        if (x < w - 1) { nb = p + 1; if (!lab[nb] && solid(nb)) { lab[nb] = id; stack[top++] = nb; } }
        if (y > 0) { nb = p - w; if (!lab[nb] && solid(nb)) { lab[nb] = id; stack[top++] = nb; } }
        if (y < h - 1) { nb = p + w; if (!lab[nb] && solid(nb)) { lab[nb] = id; stack[top++] = nb; } }
      }
      comps.push({ id: id, size: size, minX: minX, minY: minY });
    }
    if (comps.length < 2) return { comps: comps.length, px: 0 };

    var big = comps[0];
    for (i = 1; i < comps.length; i++) if (comps[i].size > big.size) big = comps[i];

    var kill = {}, gone = 0, blocks = 0;
    for (i = 0; i < comps.length; i++) {
      var c = comps[i];
      if (c === big) continue;
      /* 水印区同时也是一双脚的位置，所以那里只认「绝对很小」的碎块：
         一条腿万一跟身子断开，按相对比例会被当成水印整条削掉。 */
      var inWm = c.minX > w * 0.55 && c.minY > h * 0.8 && c.size < n * 0.012;
      if (inWm ? c.size < big.size * 0.3 : c.size < big.size * 0.0035) {
        kill[c.id] = 1; gone += c.size; blocks++;
      }
    }
    if (!blocks) return { comps: comps.length, px: 0 };
    for (p0 = 0; p0 < n; p0++) if (kill[lab[p0]]) d[p0 * 4 + 3] = 0;
    return { comps: comps.length, px: gone, ratio: gone / big.size };
  }

  function keyOut(img, cfg) {
    var maxSide = 620;
    var sc = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    var w = Math.max(1, Math.round((img.naturalWidth || img.width) * sc));
    var h = Math.max(1, Math.round((img.naturalHeight || img.height) * sc));

    var cv = U.el('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.drawImage(img, 0, 0, w, h);

    var im = g.getImageData(0, 0, w, h);
    var d = im.data;
    var cs = cornerStats(d, w, h);
    var bg = cs.bg;
    var br = bg[0], bgr = bg[1], bb = bg[2];
    var bgLum = (br + bgr + bb) / 3;
    /* 色距在这两个值之间做线性过渡：低于 lo 直接透明，高于 hi 完全保留 */
    var lo = 42, hi = 130;

    var i, r, gg, b, dist, a, lum, x, y;
    var cut = 0, kept = 0, soft = 0, total = w * h;

    for (i = 0; i < d.length; i += 4) {
      r = d[i]; gg = d[i + 1]; b = d[i + 2];
      if (cfg.sourceAlpha) {
        /* 自带透明通道的素材直接保留颜色和透明度，包括黑色衣服、绿色花裙和半透明披风。 */
        a = d[i + 3];
        if (a === 0) cut++;
        else if (a > 128) kept++;
        else soft++;
        continue;
      }
      dist = Math.abs(r - br) + Math.abs(gg - bgr) + Math.abs(b - bb);
      if (dist <= lo) a = 0;
      else if (dist >= hi) a = 255;
      else a = (dist - lo) * 255 / (hi - lo);

      if (a > 0) {
        lum = (r + gg + b) / 3;
        /* 脚底投影是同色相的深绿，纯色距会被它骗过去，单独压掉。
           门槛必须是「真的带绿」：绿通道明显高出另外两通道才算投影。黑发、
           深灰衣服常常 g 只比 r/b 大一两个数，按「绿最大」去压会把整片头发
           打成半透明雪花（实测小月 o4 的黑发全废）。 */
        if (gg - (r > b ? r : b) > 22 && lum < bgLum * 0.86) a *= 0.22;
        if (a > 0 && gg > r && gg > b) {
          /* 去绿边色溢：把残留绿像素的绿通道拉向另外两通道的均值 */
          var avg = (r + b) / 2;
          if (gg > avg + 16) gg = avg + 16;
          d[i + 1] = gg;
        }
      }

      if (a < 40) {
        /* 40 以下全清。这一档装的是背景渐变的雾、脚底投影和文字的毛边：留着
           立绘会带一层淡淡的绿方框，按不透明像素裁边时还会把裁剪框撑到整张图，
           角色凭空缩小一圈。代价只是边缘少了一两个像素的软边，可以接受。 */
        a = 0; cut++;
      } else if (a > 128) kept++;
      else soft++;
      d[i + 3] = a < 255 ? Math.round(a) : 255;
    }

    var junk = cfg.sourceAlpha ? { px: 0 } : pruneJunk(d, w, h);
    g.putImageData(im, 0, 0);

    /* 按不透明像素裁掉外圈空白，角色在画面里的占比就统一了。
       d 就是 im.data，alpha 已经写进去了，直接扫它，省掉一次 GPU 回读。 */
    var minX = w, minY = h, maxX = -1, maxY = -1, step = 2;
    var probe = d;
    for (y = 0; y < h; y += step) for (x = 0; x < w; x += step) {
      if (probe[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    var meta = {
      bg: bg,
      sourceAlpha: !!cfg.sourceAlpha,
      spread: cs.spread,      /* 四角色差：背景不均匀（渐变/暗角）就会很大 */
      cut: cut / total,       /* 抠掉的占比：全身立绘天然 60-80%，本身不是质量信号 */
      kept: kept / total,     /* 留下的角色占比 */
      soft: soft / total,     /* 半透明过渡带：背景是渐变时这一项会爆掉，边缘出现绿 halo */
      hole: maxHole(d, w, h), /* 最大的封闭透明块：角色身上有纯绿衣服时会抠穿成大洞 */
      junk: junk.px,          /* 清掉的连通碎块像素数：水印和碎点，正常在几百到几千 */
      cropped: null
    };
    if (maxX < 0) { meta.failed = true; return { canvas: cv, meta: meta }; }
    var pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    var cw = maxX - minX + 1, ch = maxY - minY + 1;

    var out = U.el('canvas');
    var targetH = cfg.h || 320;
    out.width = Math.max(1, Math.round(cw * (targetH / ch)));
    out.height = targetH;
    var og = out.getContext('2d');
    og.imageSmoothingEnabled = true;
    og.imageSmoothingQuality = 'high';
    og.drawImage(cv, minX, minY, cw, ch, 0, 0, out.width, out.height);
    meta.cropped = [minX, minY, cw, ch];
    return { canvas: out, meta: meta };
  }

  /* 抠图质检：返回失败原因，null 表示可以安全抠图。
     阈值来自 6 张基础立绘的实测（背景均匀、角色占比 20-30%、封闭洞 <0.1%）。 */
  function quality(m) {
    if (m.failed) return '整张图都被抠掉了';
    if (m.kept < 0.05) return '角色只剩 ' + Math.round(m.kept * 100) + '%，被抠穿了';
    if (m.kept > 0.95) return '背景没抠掉（留下 ' + Math.round(m.kept * 100) + '%）';
    if (!m.sourceAlpha && m.spread > 120) return '四角背景色差 ' + m.spread + '，背景不均匀';
    if (!m.sourceAlpha && m.soft > 0.14) return '半透明过渡带 ' + Math.round(m.soft * 100) + '%，会有绿 halo';
    if (!m.sourceAlpha && m.hole > 0.02) return '身上有 ' + Math.round(m.hole * 100) + '% 的封闭镂空';
    return null;
  }

  /* 同一个抠好的 canvas 常常要同时出现在顶栏和商店里。
     直接 append 会把节点从上一处搬走；而 canvas.cloneNode() 只复制宽高、
     不复制位图，会得到一张空图 —— 只能新建一张再 drawImage 过去。 */
  function cloneCanvas(src) {
    var c = U.el('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  var Sprites = {
    quality: quality,
    clone: cloneCanvas,

    /* 懒处理：只在做当前这一张时才抠图，一进门就把全部服装预处理会把首屏卡住好几秒 */
    get: function (id, cb) {
      if (cache[id]) { lruTouch(id); cb(cache[id], cache[id].meta); return; }
      if (missing[id]) { cb(null, { error: missing[id] }); return; }
      if (loading[id]) { loading[id].push(cb); return; }
      loading[id] = [cb];

      var spec = KZ.Costumes.byId(id);
      if (!spec) {
        /* loading 里已经挂了这一批回调，不清掉的话它们永远等不到 */
        delete loading[id];
        cb(null, { error: 'unknown ' + id });
        return;
      }
      var cfg = { h: spec.spriteH, sourceAlpha: spec.sourceAlpha };

      var img = U.el('img');
      img.onload = function () {
        var res, why;
        if (spec.cardMode) {
          res = { canvas: null, img: img, meta: { card: true } };
        } else {
          try { res = keyOut(img, cfg); }
          catch (e) { res = { canvas: null, img: img, meta: { card: true, keyError: String(e) } }; }
          why = res.meta.card ? null : quality(res.meta);
          if (why || res.meta.keyError) {
            /* 抠图明显失败：退回卡片，宁可难看也不要缺胳膊少腿 */
            res.meta.autoCard = true;
            res.meta.why = why || res.meta.keyError;
            res.meta.card = true;
            res.canvas = null;
          }
        }
        cache[id] = res;
        lruTouch(id);
        var list = loading[id] || [];
        delete loading[id];
        for (var i = 0; i < list.length; i++) list[i](res, res.meta);
      };
      img.onerror = function () {
        missing[id] = '缺图 ' + spec.src;
        var list = loading[id] || [];
        delete loading[id];
        for (var i = 0; i < list.length; i++) list[i](null, { error: '缺图 ' + spec.src });
      };
      img.src = spec.src;
      img.alt = spec.name;
    },

    /* 把立绘放进一个容器；缺图时显示占位而不是破图 */
    mount: function (host, id, cb) {
      U.clear(host);
      var ph = U.el('div', 'fit__ph', '…');
      U.add(host, ph);
      Sprites.get(id, function (res, meta) {
        U.clear(host);
        var n;
        if (!res) {
          U.add(host, U.el('div', 'fit__ph fit__ph--miss', '缺图'));
        } else if (res.img) {
          n = U.el('img');
          n.src = res.img.src;
          n.alt = (KZ.Costumes.byId(id) || {}).name || id;
          if (meta && meta.card) n.className = 'is-card';
          U.add(host, n);
        } else {
          /* canvas 是同一个缓存节点，直接 append 会把它从别处搬走 —— 必须复制一份 */
          U.add(host, cloneCanvas(res.canvas));
        }
        if (cb) cb(res, meta);
      });
    },

    /* 顶栏和选形象卡片要的是"一眼看清是谁"的头像。整张 270×360 立绘塞进 62px 的圆里
       只剩两只脚，所以按立绘自己的宽度从头顶往下截一个正方形。 */
    badge: function (host, id, cb) {
      U.clear(host);
      Sprites.get(id, function (res, meta) {
        U.clear(host);
        if (!res) {
          U.add(host, U.el('span', 'fit__ph fit__ph--miss', '?'));
        } else if (res.canvas) {
          /* 正方形从头顶往下截，横向取中间 —— 角色永远画在画面中轴上 */
          var cv = res.canvas;
          var s = Math.min(cv.width, cv.height);
          var c = U.el('canvas');
          c.width = s; c.height = s;
          c.getContext('2d').drawImage(cv, (cv.width - s) / 2, 0, s, s, 0, 0, s, s);
          U.add(host, c);
        } else {
          var n = U.el('img');
          n.src = res.img.src;
          U.add(host, n);
        }
        if (cb) cb(res, meta);
      });
    }
  };

  KZ.Sprites = Sprites;
})(typeof window !== 'undefined' ? window : globalThis);
