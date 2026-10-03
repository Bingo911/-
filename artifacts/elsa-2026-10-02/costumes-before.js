/* 18 个形象 × 8 套服装。整套换装 = 整张立绘替换，所以不需要图层对齐。
   默认造型 o1 免费（选中形象时自动拥有），o2-o8 用积分购买，价格按 o 的序号自动落在四档上。
   c1、c9、c13 是用户点名要的作品角色；其余是为本游戏新设计的原创角色。
   c1 保留原有的 hint 提示。
   立绘目前都能抠干净，所以没有一件标 cardMode；万一以后换图抠不干净，
   给那件加 cardMode: true 就退回圆角卡片展示（见 js/35-sprite.js）。 */
(function (root) {
  var KZ = root.KZ || (root.KZ = {});

  var RARITY = { 1: '普通', 2: '稀有', 3: '史诗', 4: '传说' };
  var PRICE = { 2: [120, 160], 4: [240, 300], 6: [420, 520], 8: [760] };

  /* 已经画好全套 o2–o8 立绘的形象。商店用它决定一件衣服卖不卖，结算页用它决定
     提不提「你有能买的衣服了」——因为没画好的服装买回去是看不见的，攒一周积分
     换一块空白是这一版最容易发生的亏。
     画完一个形象就把它的 id 加进来：tools/validate-levels.js 会核对这个表里的
     形象 8 张 PNG 是不是真在 assets/sprites/ 下，写了假名字的校验直接不过。 */
  var PAINTED = { c1: 1, c2: 1, c3: 1, c4: 1, c5: 1, c6: 1, c7: 1, c8: 1, c9: 1, c10: 1, c11: 1, c12: 1, c13: 1 };

  var CHARS = [
    {
      id: 'c1', name: '擎天柱', tag: '汽车人领袖', desc: '勇敢又可靠，红蓝经典涂装',
      hint: '提醒：变形金刚是 Hasbro 的版权形象，只能自家孩子本地玩，不要分享或上架。',
      outfits: [
        { o: 'o1', name: '经典红蓝', theme: '默认' },
        { o: 'o2', name: '警车涂装', theme: '职业体验' },
        { o: 'o3', name: '消防涂装', theme: '职业体验' },
        { o: 'o4', name: '太空装甲', theme: '幻想冒险' },
        { o: 'o5', name: '忍者装甲', theme: '幻想冒险' },
        { o: 'o6', name: '海盗装甲', theme: '幻想冒险' },
        { o: 'o7', name: '恐龙睡衣', theme: '节日搞怪' },
        { o: 'o8', name: '黄金庆典', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c2', name: '闪电', tag: '原创机器人', desc: '爱探索的侦察机器人，橙青配色',
      outfits: [
        { o: 'o1', name: '出厂涂装', theme: '默认' },
        { o: 'o2', name: '邮递机器人', theme: '职业体验' },
        { o: 'o3', name: '医护机器人', theme: '职业体验' },
        { o: 'o4', name: '忍者机甲', theme: '幻想冒险' },
        { o: 'o5', name: '魔法机甲', theme: '幻想冒险' },
        { o: 'o6', name: '海盗机甲', theme: '幻想冒险' },
        { o: 'o7', name: '圣诞机甲', theme: '节日搞怪' },
        { o: 'o8', name: '南瓜机甲', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c3', name: '小星', tag: '小男孩', desc: '爱笑的小学生，蓝白运动衫',
      outfits: [
        { o: 'o1', name: '运动衫', theme: '默认' },
        { o: 'o2', name: '小医生', theme: '职业体验' },
        { o: 'o3', name: '小厨师', theme: '职业体验' },
        { o: 'o4', name: '小忍者', theme: '幻想冒险' },
        { o: 'o5', name: '小魔法师', theme: '幻想冒险' },
        { o: 'o6', name: '小海盗', theme: '幻想冒险' },
        { o: 'o7', name: '圣诞装', theme: '节日搞怪' },
        { o: 'o8', name: '南瓜怪装', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c4', name: '小月', tag: '小女孩', desc: '扎两个小辫子，黄色小裙子',
      outfits: [
        { o: 'o1', name: '黄裙子', theme: '默认' },
        { o: 'o2', name: '小老师', theme: '职业体验' },
        { o: 'o3', name: '消防员', theme: '职业体验' },
        { o: 'o4', name: '小仙女', theme: '幻想冒险' },
        { o: 'o5', name: '魔法少女', theme: '幻想冒险' },
        { o: 'o6', name: '海盗船长', theme: '幻想冒险' },
        { o: 'o7', name: '新年唐装', theme: '节日搞怪' },
        { o: 'o8', name: '生日小丑', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c5', name: '团团', tag: '小熊猫', desc: '圆滚滚的熊猫，戴红围巾',
      outfits: [
        { o: 'o1', name: '红围巾', theme: '默认' },
        { o: 'o2', name: '快递员', theme: '职业体验' },
        { o: 'o3', name: '大厨', theme: '职业体验' },
        { o: 'o4', name: '熊猫忍者', theme: '幻想冒险' },
        { o: 'o5', name: '熊猫侠客', theme: '幻想冒险' },
        { o: 'o6', name: '熊猫法师', theme: '幻想冒险' },
        { o: 'o7', name: '春节舞狮', theme: '节日搞怪' },
        { o: 'o8', name: '恐龙睡衣', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c6', name: '小满', tag: '小恐龙', desc: '橙色的小恐龙，一颗小门牙',
      outfits: [
        { o: 'o1', name: '原色', theme: '默认' },
        { o: 'o2', name: '宇航员', theme: '职业体验' },
        { o: 'o3', name: '医生', theme: '职业体验' },
        { o: 'o4', name: '忍者龙', theme: '幻想冒险' },
        { o: 'o5', name: '海盗龙', theme: '幻想冒险' },
        { o: 'o6', name: '法师龙', theme: '幻想冒险' },
        { o: 'o7', name: '圣诞龙', theme: '节日搞怪' },
        { o: 'o8', name: '黄金皇冠', theme: '节日搞怪' }
      ]
    },

    /* ---------- c7–c18：第二批 12 个形象，c9、c13 按用户要求替换为熊二、阿奇 ----------
       服装颜色一律避开绿色：立绘是绿幕拍的，js/35-sprite.js 按四角中位色抠图，
       绿色的衣服或身体部位会被当成背景一起抠穿。 */
    {
      id: 'c7', name: '艾雪', tag: '冰雪小姑娘', desc: '银白长发，冰蓝斗篷，拿雪花法杖',
      outfits: [
        { o: 'o1', name: '冰雪斗篷', theme: '默认' },
        { o: 'o2', name: '小护士', theme: '职业体验' },
        { o: 'o3', name: '滑雪教练', theme: '职业体验' },
        { o: 'o4', name: '极光仙女', theme: '幻想冒险' },
        { o: 'o5', name: '雪人公主', theme: '幻想冒险' },
        { o: 'o6', name: '星海法师', theme: '幻想冒险' },
        { o: 'o7', name: '新年汉服', theme: '节日搞怪' },
        { o: 'o8', name: '生日皇冠', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c8', name: '小雷', tag: '电气小兽', desc: '琥珀黄的原创小兽，尾巴是闪电形',
      outfits: [
        { o: 'o1', name: '出厂毛色', theme: '默认' },
        { o: 'o2', name: '邮递小兽', theme: '职业体验' },
        { o: 'o3', name: '医护小兽', theme: '职业体验' },
        { o: 'o4', name: '闪电忍者', theme: '幻想冒险' },
        { o: 'o5', name: '雷霆法师', theme: '幻想冒险' },
        { o: 'o6', name: '太空探险兽', theme: '幻想冒险' },
        { o: 'o7', name: '圣诞小兽', theme: '节日搞怪' },
        { o: 'o8', name: '南瓜小兽', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c9', name: '熊二', tag: '熊出没伙伴', desc: '金棕毛、浅色大肚皮，憨厚爱笑的熊二',
      outfits: [
        { o: 'o1', name: '经典金棕', theme: '默认' },
        { o: 'o2', name: '护林员', theme: '职业体验' },
        { o: 'o3', name: '面包师傅', theme: '职业体验' },
        { o: 'o4', name: '竹子侠客', theme: '幻想冒险' },
        { o: 'o5', name: '山地巫师', theme: '幻想冒险' },
        { o: 'o6', name: '海盗大熊', theme: '幻想冒险' },
        { o: 'o7', name: '春节舞狮', theme: '节日搞怪' },
        { o: 'o8', name: '生日派对', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c10', name: '竹豆', tag: '探险小熊猫', desc: '红棕毛的小熊猫，头顶飞行护目镜',
      outfits: [
        { o: 'o1', name: '飞行护目镜', theme: '默认' },
        { o: 'o2', name: '机修师', theme: '职业体验' },
        { o: 'o3', name: '小船长', theme: '职业体验' },
        { o: 'o4', name: '竹林忍者', theme: '幻想冒险' },
        { o: 'o5', name: '幻影刺客', theme: '幻想冒险' },
        { o: 'o6', name: '星际领航员', theme: '幻想冒险' },
        { o: 'o7', name: '中秋月光装', theme: '节日搞怪' },
        { o: 'o8', name: '化妆舞会装', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c11', name: '角角', tag: '小三角龙', desc: '珊瑚粉的小恐龙，奶白角和颈盾',
      outfits: [
        { o: 'o1', name: '奶白围巾', theme: '默认' },
        { o: 'o2', name: '小交警', theme: '职业体验' },
        { o: 'o3', name: '园艺师', theme: '职业体验' },
        { o: 'o4', name: '熔岩龙装', theme: '幻想冒险' },
        { o: 'o5', name: '冰霜龙装', theme: '幻想冒险' },
        { o: 'o6', name: '机械龙装', theme: '幻想冒险' },
        { o: 'o7', name: '新年舞龙', theme: '节日搞怪' },
        { o: 'o8', name: '生日彩带', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c12', name: '星宝', tag: '宇航小猫', desc: '灰蓝毛的小猫，白宇航服挂一颗红星',
      outfits: [
        { o: 'o1', name: '白宇航服', theme: '默认' },
        { o: 'o2', name: '机舱维修员', theme: '职业体验' },
        { o: 'o3', name: '太空厨师', theme: '职业体验' },
        { o: 'o4', name: '星云法师', theme: '幻想冒险' },
        { o: 'o5', name: '月球骑士', theme: '幻想冒险' },
        { o: 'o6', name: '时空旅人', theme: '幻想冒险' },
        { o: 'o7', name: '圣诞袜装', theme: '节日搞怪' },
        { o: 'o8', name: '南瓜猫装', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c13', name: '阿奇', tag: '汪汪队警犬', desc: '竖耳德牧，蓝色警帽和警用背包',
      outfits: [
        { o: 'o1', name: '蓝警服', theme: '默认' },
        { o: 'o2', name: '交警', theme: '职业体验' },
        { o: 'o3', name: '搜救员', theme: '职业体验' },
        { o: 'o4', name: '侦探风衣', theme: '幻想冒险' },
        { o: 'o5', name: '骑士盔甲', theme: '幻想冒险' },
        { o: 'o6', name: '太空特警', theme: '幻想冒险' },
        { o: 'o7', name: '新年礼服', theme: '节日搞怪' },
        { o: 'o8', name: '万圣警长', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c14', name: '焰焰', tag: '消防机甲', desc: '红银装甲的小机器人，头顶消防盔',
      outfits: [
        { o: 'o1', name: '红银消防装', theme: '默认' },
        { o: 'o2', name: '救援工程兵', theme: '职业体验' },
        { o: 'o3', name: '医护机甲', theme: '职业体验' },
        { o: 'o4', name: '熔岩战神', theme: '幻想冒险' },
        { o: 'o5', name: '雷霆机甲', theme: '幻想冒险' },
        { o: 'o6', name: '深海机甲', theme: '幻想冒险' },
        { o: 'o7', name: '春节灯笼装', theme: '节日搞怪' },
        { o: 'o8', name: '黄金庆典', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c15', name: '跳跳', tag: '小兔', desc: '米白毛的兔子，长耳朵橘色背带裤',
      outfits: [
        { o: 'o1', name: '橘背带裤', theme: '默认' },
        { o: 'o2', name: '邮递员', theme: '职业体验' },
        { o: 'o3', name: '烘焙师', theme: '职业体验' },
        { o: 'o4', name: '月兔剑客', theme: '幻想冒险' },
        { o: 'o5', name: '森林骑士', theme: '幻想冒险' },
        { o: 'o6', name: '魔法学徒', theme: '幻想冒险' },
        { o: 'o7', name: '新年唐装', theme: '节日搞怪' },
        { o: 'o8', name: '生日小丑', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c16', name: '阿赤', tag: '狐狸画家', desc: '橘红毛的狐狸，米色围裙拿一支画笔',
      outfits: [
        { o: 'o1', name: '画家围裙', theme: '默认' },
        { o: 'o2', name: '美术老师', theme: '职业体验' },
        { o: 'o3', name: '咖啡师', theme: '职业体验' },
        { o: 'o4', name: '暗夜侠盗', theme: '幻想冒险' },
        { o: 'o5', name: '幻影魔术师', theme: '幻想冒险' },
        { o: 'o6', name: '星际探险家', theme: '幻想冒险' },
        { o: 'o7', name: '中秋兔王装', theme: '节日搞怪' },
        { o: 'o8', name: '南瓜狂欢装', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c17', name: '波波', tag: '小海獭', desc: '棕灰毛的海獭，蓝围巾抱一只粉贝壳',
      outfits: [
        { o: 'o1', name: '蓝围巾', theme: '默认' },
        { o: 'o2', name: '救生员', theme: '职业体验' },
        { o: 'o3', name: '海洋厨师', theme: '职业体验' },
        { o: 'o4', name: '珍珠法师', theme: '幻想冒险' },
        { o: 'o5', name: '深海骑士', theme: '幻想冒险' },
        { o: 'o6', name: '海盗大副', theme: '幻想冒险' },
        { o: 'o7', name: '新年锦鲤装', theme: '节日搞怪' },
        { o: 'o8', name: '万圣糖果装', theme: '节日搞怪' }
      ]
    },
    {
      id: 'c18', name: '斗斗', tag: '工程机甲', desc: '工程黄的小机器人，一只手臂是铲斗',
      outfits: [
        { o: 'o1', name: '工程黄', theme: '默认' },
        { o: 'o2', name: '道路施工员', theme: '职业体验' },
        { o: 'o3', name: '起重操作员', theme: '职业体验' },
        { o: 'o4', name: '钢铁斗士', theme: '幻想冒险' },
        { o: 'o5', name: '挖掘魔法师', theme: '幻想冒险' },
        { o: 'o6', name: '星港装卸工', theme: '幻想冒险' },
        { o: 'o7', name: '春节花车装', theme: '节日搞怪' },
        { o: 'o8', name: '生日蛋糕甲', theme: '节日搞怪' }
      ]
    }
  ];

  var byId = {};
  var flat = [];

  (function () {
    var ci, oi, ch, of, rarity, price;
    for (ci = 0; ci < CHARS.length; ci++) {
      ch = CHARS[ci];
      for (oi = 0; oi < ch.outfits.length; oi++) {
        of = ch.outfits[oi];
        of.id = ch.id + '-' + of.o;
        of.charId = ch.id;
        of.charName = ch.name;
        of.src = 'assets/sprites/' + ch.id + '_' + of.o + '.png';
        of.spriteH = 360;
        if (of.o === 'o1') {
          of.rarity = 0; of.price = 0; of.default = true;
        } else {
          rarity = (of.o === 'o2' || of.o === 'o3') ? 1 : (of.o === 'o4' || of.o === 'o5') ? 2 : (of.o === 'o6' || of.o === 'o7') ? 3 : 4;
          of.rarity = rarity;
          price = PRICE[rarity === 1 ? 2 : rarity === 2 ? 4 : rarity === 3 ? 6 : 8];
          of.price = price[(of.o === 'o2' || of.o === 'o4' || of.o === 'o6') ? 0 : 1] || price[0];
        }
        of.rarityName = of.default ? '默认' : RARITY[of.rarity];
        byId[of.id] = of;
        flat.push(of);
      }
    }
  })();

  KZ.Costumes = {
    chars: CHARS,
    flat: flat,
    byId: function (id) { return byId[id]; },
    char: function (id) {
      var i;
      for (i = 0; i < CHARS.length; i++) if (CHARS[i].id === id) return CHARS[i];
      return CHARS[0];
    },
    ofChar: function (charId) {
      var i, out = [];
      for (i = 0; i < CHARS.length; i++) if (CHARS[i].id === charId) return CHARS[i].outfits;
      return out;
    },
    defaultId: function (charId) { return charId + '-o1'; },
    /* 默认造型永远有图（免费、不用买），其余看这个形象画完没有 */
    artReady: function (id) {
      var of = byId[id];
      if (!of) return false;
      return !!of.default || PAINTED[of.charId] === 1;
    },
    paintedChars: function () {
      var out = [], k;
      for (k in PAINTED) if (PAINTED.hasOwnProperty(k)) out.push(k);
      return out;
    },
    totalCost: function () {
      var i, s = 0;
      for (i = 0; i < flat.length; i++) s += flat[i].price;
      return s;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
