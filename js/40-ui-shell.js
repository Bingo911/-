/* 外壳：顶栏、设置、护眼提醒、状态条 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});
  var U = KZ.U;

  var els = {};

  function pill(cls, ico, val, key) {
    var p = U.el('div', 'pill ' + cls);
    U.add(p, U.el('span', 'pill__ico', ico), U.el('span', null, val));
    els[key] = p;
    return p;
  }

  function navBtn(text, scene) {
    var b = U.el('button', 'btn btn--ghost btn--sm', text);
    b.type = 'button';
    U.on(b, 'click', function () {
      KZ.Sfx.unlock(); KZ.Sfx.click();
      if (scene === 'settings') Shell.settings();
      else if (scene === 'arcade') KZ.Scenes.go('arcade', { world: 'A' });
      else KZ.Scenes.go(scene);
    });
    return b;
  }

  var Shell = {
    init: function () {
      var host = root.document.getElementById('statusbar');
      els.status = host;
      /* 每 5 秒检查一次游玩时长，护眼提醒只在关卡之间弹 */
      root.setInterval(function () { Shell.autoRest(); }, 5000);
      return Shell;
    },

    renderTopbar: function () {
      var bar = root.document.getElementById('topbar');
      U.clear(bar);
      var save = KZ.Save;
      if (!save.data.charId) {
        U.add(bar, U.el('div', 'topbar__who', '打字小勇士'), U.el('div', 'spacer'));
        return;
      }
      var ch = KZ.Costumes.char(save.data.charId);
      var av = U.el('button', 'topbar__avatar');
      av.type = 'button';
      av.title = '换形象';
      U.on(av, 'click', function () { KZ.Scenes.go('cover'); });
      KZ.Sprites.badge(av, save.data.charId + '-' + save.equippedOf(save.data.charId));

      var who = U.el('div', 'topbar__who');
      U.add(who, U.el('span', null, ch.name), U.el('small', null, ch.tag));

      U.add(bar, av, who,
        pill('pill--gold', '★', String(save.data.points), 'points'),
        pill('pill--star', '⭐', String(save.totalStars()) + '/' + KZ.Levels.totalStarsPossible(), 'stars'),
        U.el('div', 'spacer'),
        navBtn('闯关地图', 'map'), navBtn('服装商店', 'shop'),
        navBtn('自由练习', 'arcade'), navBtn('设置', 'settings'));
    },

    bumpPoints: function () {
      if (!els.points) return;
      els.points.classList.remove('bump');
      void els.points.offsetWidth;
      els.points.classList.add('bump');
      var s = KZ.Save;
      els.points.lastChild.textContent = String(s.data.points);
      if (els.stars) els.stars.lastChild.textContent = s.totalStars() + '/' + KZ.Levels.totalStarsPossible();
    },

    renderStatus: function () {
      var s = KZ.Save;
      var msg = [];
      if (!s.available) msg.push('这台电脑禁止了本地存储，进度不会被保存。可以在设置里「导出存档」备份。');
      /* 语音包是异步到位的，还在等的时候别说「没找到」——Chrome 每次冷启动都会闪一下 */
      if (!KZ.Tts.available() && !KZ.Tts.pending()) msg.push(KZ.Tts.status());
      /* 缺立绘的提示也走这里：直接往 #statusbar 里塞会被下一次 renderStatus 清掉，
         或者塞进一个已经 display:none 的条里，永远看不见。 */
      if (KZ.Boot && KZ.Boot.assetNote) msg.push(KZ.Boot.assetNote);
      U.clear(els.status);
      if (msg.length) U.add(els.status, U.el('span', null, msg.join('　·　')));
      els.status.style.display = msg.length ? '' : 'none';
    },

    /* ---------- 护眼 ---------- */

    needRest: function () {
      var min = KZ.Save.data.settings.restMin;
      if (!min || min < 5) return false;
      /* 提醒要说得出「你玩了多久」，所以必须真的玩过那么久才开口 */
      if (KZ.Save.data.play.activeMs < 5 * 60000) return false;
      return KZ.Save.sinceRest() > min * 60000;
    },

    autoRest: function () {
      /* 关卡进行中绝不打断计时，只在地图/商店/结算等场景之间提醒 */
      if (!Shell.needRest()) return;
      if (KZ.Scenes.isOpen()) return;
      var n = KZ.Scenes.name();
      if (n === 'play' || n === 'arcade') return;
      Shell.rest();
    },

    rest: function () {
      KZ.Sfx.rest();
      var left = 20;
      var played = Math.round(KZ.Save.data.play.activeMs / 60000);
      var clock = U.el('div', 'rest-clock', String(left));
      var tip = U.el('p', 'overlay__sub', '看看窗外的远处，眨眨眼睛，活动一下肩膀。');
      var acts = [{ text: '我休息好了', disabled: true, keepOpen: true }];
      var inner = KZ.Scenes.overlay({
        title: '眼睛累啦',
        sub: '已经连着玩了 ' + Math.max(1, played) + ' 分钟，先让眼睛歇 ' + left + ' 秒',
        body: [clock, tip], acts: acts
      });
      var btn = inner.querySelector('.overlay__acts .btn');
      var t = root.setInterval(function () {
        /* 弹层被换页换掉时（结算 → 回地图就是这条路）把倒计时一起拆掉。
           让它继续数会在看不见的地方自己 ack 掉这次休息，等于孩子没休息也算休息完。 */
        if (!KZ.Scenes.isOpen()) { root.clearInterval(t); return; }
        left--;
        clock.textContent = String(Math.max(0, left));
        if (left <= 0) {
          root.clearInterval(t);
          btn.disabled = false;
          KZ.Save.ackRest();
        }
      }, 1000);
      btn.disabled = true;
      /* acts 里标了 disabled，overlay 就不会替它挂 handler —— 倒计时结束前点不动，
         结束后由这个 handler 收尾。 */
      U.on(btn, 'click', function () {
        if (btn.disabled) return;
        root.clearInterval(t);
        KZ.Scenes.closeOverlay();
      });
      return true;
    },

    /* ---------- 设置 ---------- */

    settings: function () {
      var s = KZ.Save.data.settings;
      var body = [];
      /* 关掉设置要回到打开它的那一页。商店页回去是应该的；地图以外的其它页
         （关卡、街机）重进会重开一局，不如退回地图。 */
      var from = KZ.Scenes.name() === 'shop' ? 'shop' : (KZ.Save.data.charId ? 'map' : 'cover');

      function toggle(label, key, extra) {
        var row = U.el('div', 'row');
        row.style.minHeight = '56px';
        var b = U.el('button', 'btn btn--sm ' + (s[key] ? '' : 'btn--plain'), s[key] ? '已开启' : '已关闭');
        b.type = 'button';
        U.on(b, 'click', function () {
          s[key] = !s[key];
          KZ.Save.save();
          b.textContent = s[key] ? '已开启' : '已关闭';
          b.className = 'btn btn--sm ' + (s[key] ? '' : 'btn--plain');
          if (key === 'dys') root.document.body.classList.toggle('dyslexic', !!s.dys);
          if (key === 'voice' && !s.voice) KZ.Tts.stop();
          if (key === 'sfx' && s.sfx) KZ.Sfx.click();
        });
        var lab = U.el('div', 'col');
        U.add(lab, U.el('b', null, label));
        if (extra) U.add(lab, U.el('small', 'muted', extra));
        U.add(row, lab, U.el('div', 'spacer'), b);
        return row;
      }

      body.push(toggle('音效', 'sfx', '打字、过关、金币的声音'),
        toggle('朗读发音', 'voice', KZ.Tts.status()),
        toggle('容易看的字母', 'dys', '英文用更分得清的字体，字母间距更大'),
        toggle('大写必须按 Shift', 'strictCase', '关掉后小写也算对，先练熟再打开'));

      var restRow = U.el('div', 'row');
      restRow.style.minHeight = '56px';
      function restLabel() { return s.restMin ? s.restMin + ' 分钟' : '不提醒'; }
      var restBtn = U.el('button', 'btn btn--sm', restLabel());
      restBtn.type = 'button';
      U.on(restBtn, 'click', function () {
        var steps = [15, 20, 30, 45, 0];
        var i = steps.indexOf(s.restMin);
        s.restMin = steps[(i + 1) % steps.length];
        KZ.Save.save();
        restBtn.textContent = restLabel();
      });
      var restLab = U.el('div', 'col');
      U.add(restLab, U.el('b', null, '护眼提醒'),
        U.el('small', 'muted', '只在关卡之间弹出，不会打断正在计时的挑战'));
      U.add(restRow, restLab, U.el('div', 'spacer'), restBtn);
      body.push(restRow);

      var data = U.el('div', 'col');
      U.add(data, U.el('h3', null, '存档'),
        U.el('p', 'muted', '模式：' + (KZ.Save.available ? '本机保存' : '仅内存（不会保存）')),
        U.el('p', 'muted', '积分 ' + KZ.Save.data.points + '　星级 ' + KZ.Save.totalStars() + '　已购服装 ' + KZ.Save.data.owned.length),
        /* 中文输入法实机测试要靠这个：看得见每一键按出的 e.code 和 shift 状态 */
        U.el('p', 'muted', '按 F9 打开键位日志，输入法出问题时就按给它看。'));

      var acts = [
        { text: '导出存档', on: function () { KZ.Save.download(); } },
        { text: '导入存档', keepOpen: true, on: function () { pickFile(); } },
        { text: '现在休息一次', on: function () { root.setTimeout(Shell.rest, 200); } },
        {
          /* 这个年龄的孩子会乱点，清空又是不可逆的，所以必须二次确认 */
          text: '清空进度', on: function () {
            KZ.Scenes.overlay({
              title: '真的要清空吗？',
              sub: '星星、积分、已经买下的服装都会没有，而且没法恢复。',
              acts: [
                { text: '先导出备份', keepOpen: true, on: function () { KZ.Save.download(); } },
                { text: '不要清空', keepOpen: true, primary: true, on: function () { Shell.settings(); } },
                {
                  text: '确定清空', on: function () {
                    KZ.Save.reset();
                    root.document.body.classList.remove('dyslexic');
                    KZ.Scenes.go('cover');
                  }
                }
              ]
            });
          }
        },
        { text: '关闭', primary: true, on: function () { KZ.Scenes.go(from); } }
      ];

      KZ.Scenes.overlay({ title: '设置', body: [data].concat(body), acts: acts });
    }
  };

  /* 导入用 <input type=file> + FileReader，这两样在 file:// 下都可用。
     全页面只留一个输入框：孩子点「取消」时浏览器不给任何事件，
     每次新建的话取消十次就挂着十个隐形 input。 */
  var fileInput = null;

  function dropFileInput(inp) {
    if (inp.parentNode) inp.parentNode.removeChild(inp);
    if (fileInput === inp) fileInput = null;
  }

  function pickFile() {
    if (fileInput) dropFileInput(fileInput);
    var inp = U.el('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.style.display = 'none';
    U.add(root.document.body, inp);
    fileInput = inp;

    function settled(ok) {
      dropFileInput(inp);
      if (!ok) {
        /* 导入失败时存档根本没动，把孩子踢回选形象页只会让他们以为进度没了 */
        KZ.Scenes.overlay({
          title: '这个文件读不出来',
          sub: '请确认是本游戏导出的存档文件，再试一次。你的进度没有被改动。',
          acts: [{ text: '好', primary: true, on: function () { Shell.settings(); } }]
        });
        return;
      }
      root.document.body.classList.toggle('dyslexic', !!KZ.Save.data.settings.dys);
      KZ.Scenes.closeOverlay();
      KZ.Scenes.go('map');
    }

    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) { dropFileInput(inp); return; }
      var fr = new root.FileReader();
      /* 读一半失败（文件被别人删了、是二进制）也得有交代，不然点了没反应 */
      fr.onerror = function () { settled(false); };
      fr.onload = function () { settled(KZ.Save.importText(String(fr.result))); };
      fr.readAsText(f);
    };
    inp.click();
  }

  KZ.Shell = Shell;
})(typeof window !== 'undefined' ? window : globalThis);
