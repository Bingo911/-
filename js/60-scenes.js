/* 场景路由与弹层。file:// 下 history.pushState 会抛错，所以只切 class，不碰地址栏。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var scenes = {};
  var current = null;
  var currentName = '';
  var overlayOpen = false;

  /* 教学关的三句话，屏幕上读一遍、喇叭里也念一遍 */
  var TEACH_RULE = '八个手指搭在中间这一排：左手 A S D F，右手 J K L 分号。'
    + 'F 和 J 上各有一个小凸点，摸到凸点就是放好了。'
    + '眼睛只看屏幕，不打字的手指不要动，打完一个键手指回到原位。';

  var S = {
    add: function (name, def) { scenes[name] = def; },
    name: function () { return currentName; },

    go: function (name, arg) {
      var def = scenes[name];
      if (!def) { S.error('找不到场景：' + name); return; }
      /* 换页一定关掉弹层：留着它，新场景里每一次按键都会被 isOpen() 当成
         「弹层挡着呢」直接吞掉，孩子看到的是点了开始却什么都没发生。 */
      if (overlayOpen) S.closeOverlay();
      if (current && current.leave) { try { current.leave(); } catch (e) {} }
      KZ.Tts.stop();
      currentName = name;
      current = def;
      var host = root.document.getElementById('scene');
      U.clear(host);
      host.scrollTop = 0;
      def.enter(host, arg || {});
      KZ.Shell.renderTopbar();
      KZ.Shell.renderStatus();
    },

    overlay: function (cfg) {
      var box = root.document.getElementById('overlay');
      var inner = U.el('div', 'overlay__box');
      U.clear(box);
      if (cfg.title) U.add(inner, U.el('h2', 'overlay__title', cfg.title));
      if (cfg.sub) U.add(inner, U.el('p', 'overlay__sub', cfg.sub));
      var i;
      if (cfg.body) for (i = 0; i < cfg.body.length; i++) U.add(inner, cfg.body[i]);
      if (cfg.acts && cfg.acts.length) {
        var acts = U.el('div', 'overlay__acts');
        for (i = 0; i < cfg.acts.length; i++) {
          (function (a) {
            var b = U.el('button', 'btn' + (a.primary ? '' : ' btn--plain'), a.text);
            b.type = 'button';
            if (a.disabled) b.disabled = true;
            else U.on(b, 'click', function () {
              KZ.Sfx.unlock();
              KZ.Sfx.click();
              if (!a.keepOpen) S.closeOverlay();
              if (a.on) a.on();
            });
            U.add(acts, b);
          })(cfg.acts[i]);
        }
        U.add(inner, acts);
      }
      U.add(box, inner);
      box.hidden = false;
      overlayOpen = true;
      return inner;
    },

    closeOverlay: function () {
      var box = root.document.getElementById('overlay');
      box.hidden = true;
      U.clear(box);
      overlayOpen = false;
    },

    isOpen: function () { return overlayOpen; },

    error: function (msg) {
      var el = root.document.getElementById('boot-error');
      el.hidden = false;
      U.add(el, U.el('b', null, '出错了'), U.el('div', null, String(msg)));
      root.document.body.classList.remove('booting');
    },

    /* ---------- 关卡场景 ---------- */

    playLevel: function (levelId, mode) {
      var lv = KZ.Levels.get(levelId);
      if (!lv) return;
      S.go('play', { level: lv, mode: mode });
    }
  };

  /* 打字关卡场景：把引擎挂进来，结束后走结算与护眼检查 */
  S.add('play', {
    enter: function (host, arg) {
      var lv = arg.level, mode = arg.mode || 'challenge';
      /* .play 直接当引擎的宿主：中间再套 div 会打断 flex 链，
         「目标区自己滚、键盘钉在底部」就永远不生效（键盘被顶到屏幕外）。 */
      var wrap = U.el('div', 'play');
      U.add(host, wrap);

      function start() {
        if (lv.teach) KZ.Save.markTaught(lv.id);
        KZ.Typing.open({
          level: lv, mode: mode, host: wrap,
          onFinish: function (res) { onDone(res, lv, mode); }
        });
      }

      /* 教学关先上指法图再开打：指法这件事讲一遍比闷头打十遍管用，
         而且这一关的键位是孩子第一次见，一进来就计时只会把人吓住。
         看过一次就不再拦（练习不给星，光看星级会让推荐的那条路每次都弹），
         屏幕键盘下方一直有指位图例，练的时候随时能回头对。
         弹层是整屏的，顶栏被挡住点不到，所以必须给一条「不练了」的退路，
         否则看了指法图想走的人只能被迫开一局。 */
      if (lv.teach && !KZ.Save.stars(lv.id) && !KZ.Save.seenTeach(lv.id)) {
        KZ.Scenes.overlay({
          title: lv.name,
          sub: '先认清每根手指管哪些键，颜色跟键盘上键帽下边那条色是一样的',
          body: [KZ.Keyboard.teachBox(), U.el('p', 'teach__rule', TEACH_RULE)],
          acts: [
            { text: '我准备好了，开始练', primary: true, on: start },
            { text: '先不练，回地图', on: function () { KZ.Scenes.go('map', { world: 'A' }); } }
          ]
        });
        KZ.Tts.speak(TEACH_RULE);
      } else {
        start();
      }
    },
    leave: function () {
      KZ.Typing.discard();
    }
  });

  function onDone(res, lv, mode) {
    var save = KZ.Save;
    var outcome = null;
    if (mode === 'practice') {
      /* 练习也给分，但只按真正打完的条数给。原来是无条件 +20，
         「先练一练 → 立刻结束」几秒钟就是一轮，比街机还宽松。 */
      /* 引擎的 done 包含三错后跳过的条目，不能把它们当作完成发分。
         只打了半条、或者全靠跳过结束，都还没有真正完成一条。 */
      var completed = Math.max(0, res.done - (res.skipped || 0));
      var flat = res.correct > 0 && completed > 0 ? Math.max(4, Math.round(20 * completed / Math.max(1, res.total))) : 0;
      if (flat > 0) save.addPoints(flat);
      outcome = { gained: flat, first: false, up: false, practice: true };
    } else {
      outcome = save.recordRun(lv.id, res);
    }
    /* 练习模式永远 0 星，用它放「失败」音效等于惩罚肯练的孩子 */
    if (mode !== 'practice') { if (res.stars >= 1) KZ.Sfx.clear(); else KZ.Sfx.fail(); }
    KZ.Reward.show(res, lv, outcome, function () {
      /* autoRest 在 play 场景里是静默的（计时中绝不打断），所以要先离开再查。
         原来这里调的是根本不存在的 Shell.maybeRest，一点「回到地图」就抛 TypeError。 */
      S.go('map', { world: lv.world });
      KZ.Shell.autoRest();
    });
  }

  KZ.Scenes = S;
})(typeof window !== 'undefined' ? window : globalThis);
