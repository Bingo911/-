/* 朗读。很多中文音色会把拼音拉丁字母拼读成 "B-A"，所以拼音一律送代表汉字。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});

  var ready = false;
  var gaveUp = false;
  var zhVoice = null;
  var enVoice = null;

  /* 语音包是异步到位的：启动那一瞬间 getVoices() 常常还是空的。
     所以「朗读不可用」这句话必须等到重试窗口用完再说，否则每次开机都会在孩子
     面前闪一条假警报（而设置面板里明明白白列着 Huihui）。 */
  function repaint() {
    if (KZ.Shell && KZ.Shell.renderStatus) KZ.Shell.renderStatus();
  }

  function scan() {
    if (!root.speechSynthesis) return;
    var v = root.speechSynthesis.getVoices() || [];
    if (!v.length) return;
    /* 每次重新挑选，后到的普通话音色也能替换旧列表；不把粤语或其他地区音色当普通话。 */
    zhVoice = null;
    enVoice = null;
    var i, lang;
    for (i = 0; i < v.length; i++) {
      lang = (v[i].lang || '').replace(/_/g, '-').toLowerCase();
      if (/^(zh|cmn)-(hans-)?cn$/.test(lang) && (!zhVoice || v[i].default)) zhVoice = v[i];
      if (!enVoice && lang.indexOf('en') === 0) enVoice = v[i];
    }
    /* 没有匹配语言的音色时静默降级为纯视觉反馈，绝不弹错误框。 */
    ready = !!(zhVoice || enVoice);
  }

  function on() {
    return KZ.Save && KZ.Save.data.settings.voice && root.speechSynthesis;
  }

  var Tts = {
    init: function () {
      if (!root.speechSynthesis) return Tts;
      scan();
      /* Chrome/Edge 的 getVoices() 初始为空，必须等 voiceschanged */
      root.speechSynthesis.onvoiceschanged = function () {
        scan();
        if (ready) repaint();
      };
      var tries = 0;
      var t = root.setInterval(function () {
        scan();
        if (ready) { root.clearInterval(t); repaint(); return; }
        if (++tries > 12) {
          /* 到这儿才认定「这台电脑真的没有中文语音」，并把状态栏刷出来 */
          gaveUp = true;
          root.clearInterval(t);
          repaint();
        }
      }, 150);
      return Tts;
    },

    available: function () { return !!root.speechSynthesis && ready; },

    /* 语音包还在等：这段时间不给孩子任何「朗读不可用」的结论 */
    pending: function () { return !!root.speechSynthesis && !ready && !gaveUp; },

    status: function () {
      if (!root.speechSynthesis) return '这台电脑不支持朗读';
      if (!ready) return gaveUp ? '没找到中国大陆普通话或英文的语音包' : '正在等待系统语音…';
      return '普通话（中国大陆）：' + (zhVoice ? zhVoice.name : '未安装') + ' / 英文：' +
        (enVoice ? enVoice.name : (zhVoice ? '用普通话音色代读' : '无'));
    },

    stop: function () { if (root.speechSynthesis) { try { root.speechSynthesis.cancel(); } catch (e) {} } },

    /* text 为拼音 ASCII 形式（lv 这种）时传 kind='pinyin'，会先换成汉字再读 */
    speak: function (text, kind) {
      if (!on()) return;
      /* 国内很多电脑只装了中文语音包。英文没有 en 音色时用中文音色代读，
         总比整个英文城一点声音都没有好；反过来中文音色读不了汉字以外的东西，
         所以拼音只认 zh 音色，没有就安静。 */
      var chinese = kind === 'pinyin' || /[\u3400-\u9fff]/.test(text || '');
      var payload = text, voice = chinese ? zhVoice : (enVoice || zhVoice), rate = 0.9;
      if (kind === 'pinyin') {
        var map = KZ.Pinyin && KZ.Pinyin.tts;
        var key = (text || '').replace(/ü/g, 'v').toLowerCase();
        payload = (map && map[key]) || text;
        voice = zhVoice;
        rate = 0.8;
      }
      if (!voice) return;
      try { root.speechSynthesis.cancel(); } catch (e) {}
      var u = new root.SpeechSynthesisUtterance(payload);
      u.voice = voice;
      u.lang = voice === zhVoice ? 'zh-CN' : voice.lang;
      u.rate = rate;
      u.pitch = 1;
      /* 每次 speak 前先 cancel，孩子打得快时前面的音不会被排队读完 */
      try { root.speechSynthesis.speak(u); } catch (e) {}
    }
  };

  KZ.Tts = Tts;
})(typeof window !== 'undefined' ? window : globalThis);
