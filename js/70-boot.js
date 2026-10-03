/* 启动与自检。缺文件、缺图、存储被禁都要在界面上说清楚，不能静默失败。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var NEED = ['U', 'Save', 'Keys', 'Pinyin', 'Words', 'Costumes', 'Levels', 'Tts',
    'Sprites', 'Sfx', 'Keyboard', 'Typing', 'Scenes', 'Fall', 'Reward', 'Shell'];

  function fatal(lines) {
    var el = root.document.getElementById('boot-error');
    el.hidden = false;
    U.clear(el);
    U.add(el, U.el('b', null, '游戏没能启动'));
    var i;
    for (i = 0; i < lines.length; i++) U.add(el, U.el('div', null, String(lines[i])));
    root.document.body.classList.remove('booting');
  }

  var Boot = {
    run: function () {
      var missing = [], i;
      for (i = 0; i < NEED.length; i++) if (!KZ[NEED[i]]) missing.push('js 模块缺失：KZ.' + NEED[i]);
      if (missing.length) { fatal(missing); return; }

      KZ.Save.init();
      KZ.Keys.init();
      KZ.Tts.init();
      KZ.Shell.init();

      root.document.body.classList.toggle('dyslexic', !!KZ.Save.data.settings.dys);
      if (U.fonts.hasKai()) root.document.body.classList.add('kai');

      /* 浏览器要求先有用户手势才允许出声 */
      var unlock = function () { KZ.Sfx.unlock(); };
      U.on(root.document, 'click', unlock);
      U.on(root, 'keydown', unlock);

      if (KZ.Save.data.charId) KZ.Save.grantDefault(KZ.Save.data.charId);

      KZ.Scenes.go(KZ.Save.data.charId ? 'map' : 'cover');
      root.document.body.classList.remove('booting');

      Boot.checkAssets();
      Boot.checkContent();
    },

    /* 立绘是外部文件，缺哪张就必须在界面上说清楚，否则孩子只看到一片问号。
       这里只用 Image 探一次存在性：全量走一遍抠图管线会把首屏主线程占住一两秒，
       而 Sprites 本来是懒处理的。
       只探 PAINTED 说「已经画好」的那些：还没画好的服装商店挂着「画好才卖」，
       是进行中的事，不该每次开机都在状态栏报一遍，更不该为它们发注定失败的请求。
       真在的图被人改名或删掉，这一条照样会当场报出来。 */
    checkAssets: function () {
      var list = KZ.Costumes.flat.filter(function (f) { return KZ.Costumes.artReady(f.id); });
      var i, pending = list.length, miss = [];
      var done = function () {
        if (--pending > 0) return;
        if (!miss.length) return;
        Boot.assetNote = '有 ' + miss.length + ' 张立绘文件不在：' +
          miss.slice(0, 6).join('、') + (miss.length > 6 ? ' …' : '');
        KZ.Shell.renderStatus();
      };
      if (!pending) return;
      for (i = 0; i < list.length; i++) {
        (function (spec) {
          var img = U.el('img');
          img.onload = done;
          img.onerror = function () { miss.push(spec.src); done(); };
          img.src = spec.src;
        })(list[i]);
      }
    },

    checkContent: function () {
      var bad = [], lv = KZ.Levels.all(), i, j, t, s, want, k;
      for (i = 0; i < lv.length; i++) {
        if (!lv[i].raw.length) bad.push(lv[i].id + ' 没有目标内容');
        for (j = 0; j < lv[i].raw.length; j++) {
          /* 目标有两种写法：字符串和诗词阁的 {t, h}。直接 t.charAt 的话，
             整串 D 关卡会一个字符都查不到却不报任何错——自检必须查真正要打的那串拼音。 */
          s = KZ.Levels.targetStr(lv[i].raw[j]);
          if (typeof s !== 'string' || !s) {
            bad.push(lv[i].id + ' 第 ' + (j + 1) + ' 条没有可打的文本（这一句的汉字和拼音没对上）');
            continue;
          }
          if (lv[i].world === 'D' && !KZ.Levels.targetHanzi(lv[i].raw[j])) {
            bad.push(lv[i].id + ' 第 ' + (j + 1) + ' 条「' + s + '」没有汉字题干，卡片上会只剩一串拼音');
          }
          for (k = 0; k < s.length; k++) {
            want = KZ.Keys.lookup(s.charAt(k));
            if (!want) { bad.push(lv[i].id + ' 第 ' + (j + 1) + ' 条含打不出的字符「' + s.charAt(k) + '」：' + s); break; }
          }
        }
      }
      if (bad.length) {
        root.setTimeout(function () {
          KZ.Scenes.overlay({
            title: '内容自检发现问题',
            body: [U.el('p', 'muted', '共 ' + bad.length + ' 条，只列前 12 条'),
            U.el('pre', null, bad.slice(0, 12).join('\n'))],
            acts: [{ text: '知道了', primary: true, on: function () { KZ.Scenes.closeOverlay(); } }]
          });
        }, 600);
      }
      Boot.contentBad = bad.length;
    }
  };

  KZ.Boot = Boot;

  root.onerror = function (msg, src, line) {
    if (src && /index\.html/.test(String(src))) return false;
    fatal([msg, src ? src + ':' + line : '']);
    return false;
  };

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', function () { Boot.run(); });
  } else {
    Boot.run();
  }
})(typeof window !== 'undefined' ? window : globalThis);
