/* 拼音数据层：无调音节白名单 legal（ü 的键盘形式为 v）、教学分组 groups、TTS 汉字映射 tts、B1-B18 关卡目标（显示串，绝不带音调）。
   运行时只读 tts 和 levelTargets；legal 与 groups 是给 tools/validate-levels.js 的契约，
   用来保证关卡和分组里出现的每个音都真能敲、真能读。 */
(function (root) {

  var legal = [
    "a", "ai", "an", "ang", "ao", "e", "ei", "en", "eng", "er", "i", "ie", "o", "ou", "u", "v", "ve", "vn",
    "wu", "ya", "yan", "yang", "yao", "ye", "yi", "yin", "ying", "yo", "yong", "you", "yu", "yuan", "yue", "yun",
    "wa", "wai", "wan", "wang", "wei", "wen", "wo", "weng",
    "ba", "bai", "ban", "bang", "bao", "bei", "ben", "beng", "bi", "bian", "biao", "bie", "bin", "bing", "bo", "bu",
    "pa", "pai", "pan", "pang", "pao", "pei", "pen", "peng", "pi", "pian", "piao", "pie", "pin", "ping", "po", "pou", "pu",
    "ma", "mai", "man", "mang", "mao", "me", "mei", "men", "meng", "mi", "mian", "miao", "mie", "min", "ming", "miu", "mo", "mou", "mu",
    "fa", "fan", "fang", "fei", "fen", "feng", "fo", "fou", "fu",
    "b", "p", "m", "f",
    "da", "dai", "dan", "dang", "dao", "de", "dei", "den", "deng", "di", "dia", "dian", "diao", "die", "ding", "diu", "dong", "dou", "du", "duan", "dui", "dun", "duo",
    "ta", "tai", "tan", "tang", "tao", "te", "teng", "ti", "tian", "tiao", "tie", "ting", "tong", "tou", "tu", "tuan", "tui", "tun", "tuo",
    "na", "nai", "nan", "nang", "nao", "ne", "nei", "nen", "neng", "ni", "nian", "niang", "niao", "nie", "nin", "ning", "niu", "nong", "nu", "nuan", "nv", "nve", "nue", "nuo",
    "la", "lai", "lan", "lang", "lao", "le", "lei", "leng", "li", "lia", "lian", "liang", "liao", "lie", "lin", "ling", "liu", "lo", "long", "lou", "lu", "luan", "lun", "luo", "lv", "lve", "lue",
    "d", "t", "n", "l",
    "ga", "gai", "gan", "gang", "gao", "ge", "gei", "gen", "geng", "gong", "gou", "gu", "gua", "guai", "guan", "guang", "gui", "gun", "guo",
    "ka", "kai", "kan", "kang", "kao", "ke", "ken", "keng", "kong", "kou", "ku", "kua", "kuai", "kuan", "kuang", "kui", "kun", "kuo",
    "ha", "hai", "han", "hang", "hao", "he", "hei", "hen", "heng", "hong", "hou", "hu", "hua", "huai", "huan", "huang", "hui", "hun", "huo",
    "g", "k", "h",
    "ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing", "jiong", "jiu", "ju", "juan", "jue", "jun",
    "qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing", "qiong", "qiu", "qu", "quan", "que", "qun",
    "xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing", "xiong", "xiu", "xu", "xuan", "xue", "xun",
    "j", "q", "x",
    "zha", "zhai", "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng", "zhi", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang", "zhui", "zhun", "zhuo",
    "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng", "chi", "chong", "chou", "chu", "chua", "chuai", "chuan", "chuang", "chui", "chun", "chuo",
    "sha", "shai", "shan", "shang", "shao", "she", "shei", "shen", "sheng", "shi", "shou", "shu", "shua", "shuai", "shuan", "shuang", "shui", "shun", "shuo",
    "ran", "rang", "rao", "re", "ren", "reng", "ri", "rong", "rou", "ru", "ruan", "rui", "run", "ruo",
    "zh", "ch", "sh", "r",
    "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng", "zi", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo",
    "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng", "ci", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo",
    "sa", "sai", "san", "sang", "sao", "se", "sen", "seng", "si", "song", "sou", "su", "suan", "sui", "sun", "suo",
    "z", "c", "s", "y", "w",
    "ui", "iu", "in", "un", "ing", "ong"
  ];

  var groups = {
    simpleFinals: ["a", "o", "e", "i", "u", "ü"],
    initials: ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"],
    compoundFinals: ["ai", "ei", "ui", "ao", "ou", "iu", "ie", "üe", "er"],
    frontNasal: ["an", "en", "in", "un", "ün"],
    backNasal: ["ang", "eng", "ing", "ong"],
    zeroInitial: ["yi", "wu", "yu", "ye", "yue", "yuan", "yin", "yun", "ying", "ya", "yo", "yao", "you", "yan", "yang", "yong"],
    wholeRecog: ["zhi", "chi", "shi", "ri", "zi", "ci", "si", "yi", "wu", "yu", "ye", "yue", "yuan", "yin", "yun", "ying"]
  };

  var tts = {
    "a": "啊", "ai": "爱", "an": "安", "ang": "昂", "ao": "袄", "e": "鹅", "ei": "诶", "en": "恩", "eng": "鞥", "er": "儿",
    "i": "衣", "ie": "耶", "o": "哦", "ou": "欧", "u": "乌", "v": "鱼", "ve": "月", "vn": "晕",
    "wu": "五", "ya": "牙", "yan": "眼", "yang": "羊", "yao": "摇", "ye": "也", "yi": "一", "yin": "音", "ying": "鹰",
    "yo": "哟", "yong": "用", "you": "有", "yu": "鱼", "yuan": "圆", "yue": "月", "yun": "云",
    "wa": "挖", "wai": "歪", "wan": "玩", "wang": "王", "wei": "位", "wen": "问", "wo": "我", "weng": "翁",
    "ba": "八", "bai": "白", "ban": "半", "bang": "帮", "bao": "包", "bei": "北", "ben": "本", "beng": "蹦",
    "bi": "比", "bian": "边", "biao": "标", "bie": "别", "bin": "宾", "bing": "冰", "bo": "波", "bu": "不",
    "pa": "怕", "pai": "拍", "pan": "盘", "pang": "胖", "pao": "跑", "pei": "陪", "pen": "盆", "peng": "朋",
    "pi": "皮", "pian": "片", "piao": "票", "pie": "撇", "pin": "拼", "ping": "平", "po": "坡", "pou": "剖", "pu": "扑",
    "ma": "妈", "mai": "麦", "man": "满", "mang": "忙", "mao": "猫", "me": "么", "mei": "美", "men": "门", "meng": "梦",
    "mi": "米", "mian": "面", "miao": "苗", "mie": "灭", "min": "民", "ming": "明", "miu": "谬", "mo": "末", "mou": "某", "mu": "木",
    "fa": "发", "fan": "饭", "fang": "房", "fei": "非", "fen": "分", "feng": "风", "fo": "佛", "fou": "否", "fu": "父",
    "da": "大", "dai": "代", "dan": "蛋", "dang": "当", "dao": "刀", "de": "的", "dei": "得", "den": "扽", "deng": "等",
    "di": "弟", "dia": "嗲", "dian": "点", "diao": "叼", "die": "叠", "ding": "钉", "diu": "丢", "dong": "东", "dou": "豆",
    "du": "读", "duan": "短", "dui": "对", "dun": "吨", "duo": "多",
    "ta": "他", "tai": "台", "tan": "谈", "tang": "糖", "tao": "桃", "te": "特", "teng": "疼", "ti": "提",
    "tian": "天", "tiao": "跳", "tie": "铁", "ting": "听", "tong": "同", "tou": "头", "tu": "兔", "tuan": "团", "tui": "腿", "tun": "吞", "tuo": "拖",
    "na": "那", "nai": "奶", "nan": "南", "nang": "囊", "nao": "脑", "ne": "呢", "nei": "内", "nen": "嫩", "neng": "能",
    "ni": "你", "nian": "年", "niang": "娘", "niao": "鸟", "nie": "捏", "nin": "您", "ning": "宁", "niu": "牛",
    "nong": "农", "nu": "努", "nuan": "暖", "nv": "女", "nve": "虐", "nue": "虐", "nuo": "挪",
    "la": "拉", "lai": "来", "lan": "蓝", "lang": "狼", "lao": "老", "le": "乐", "lei": "泪", "leng": "冷",
    "li": "李", "lia": "俩", "lian": "莲", "liang": "凉", "liao": "料", "lie": "列", "lin": "林", "ling": "铃",
    "liu": "六", "lo": "啰", "long": "龙", "lou": "楼", "lu": "路", "luan": "乱", "lun": "轮", "luo": "落", "lv": "绿", "lve": "略", "lue": "略",
    "ga": "嘎", "gai": "改", "gan": "干", "gang": "钢", "gao": "高", "ge": "哥", "gei": "给", "gen": "跟",
    "geng": "更", "gong": "工", "gou": "狗", "gu": "古", "gua": "瓜", "guai": "怪", "guan": "关", "guang": "光", "gui": "贵", "gun": "棍", "guo": "国",
    "ka": "卡", "kai": "开", "kan": "看", "kang": "抗", "kao": "考", "ke": "课", "ken": "肯", "keng": "坑",
    "kong": "空", "kou": "口", "ku": "苦", "kua": "跨", "kuai": "快", "kuan": "宽", "kuang": "光", "kui": "亏", "kun": "捆", "kuo": "阔",
    "ha": "哈", "hai": "海", "han": "汗", "hang": "行", "hao": "好", "he": "河", "hei": "黑", "hen": "很",
    "heng": "横", "hong": "红", "hou": "后", "hu": "湖", "hua": "花", "huai": "怀", "huan": "环", "huang": "黄", "hui": "回", "hun": "魂", "huo": "火",
    "ji": "鸡", "jia": "家", "jian": "见", "jiang": "江", "jiao": "脚", "jie": "姐", "jin": "金", "jing": "京",
    "jiong": "炯", "jiu": "九", "ju": "句", "juan": "卷", "jue": "觉", "jun": "军",
    "qi": "七", "qia": "掐", "qian": "钱", "qiang": "强", "qiao": "桥", "qie": "且", "qin": "亲", "qing": "青",
    "qiong": "穷", "qiu": "球", "qu": "去", "quan": "全", "que": "雀", "qun": "裙",
    "xi": "西", "xia": "下", "xian": "先", "xiang": "想", "xiao": "小", "xie": "写", "xin": "心", "xing": "星",
    "xiong": "熊", "xiu": "休", "xu": "须", "xuan": "选", "xue": "雪", "xun": "寻",
    "zha": "渣", "zhai": "摘", "zhan": "站", "zhang": "张", "zhao": "找", "zhe": "这", "zhei": "这", "zhen": "真",
    "zheng": "正", "zhi": "支", "zhong": "中", "zhou": "周", "zhu": "猪", "zhua": "抓", "zhuai": "拽",
    "zhuan": "专", "zhuang": "庄", "zhui": "追", "zhun": "准", "zhuo": "桌",
    "cha": "茶", "chai": "柴", "chan": "馋", "chang": "长", "chao": "超", "che": "车", "chen": "晨", "cheng": "城",
    "chi": "吃", "chong": "虫", "chou": "抽", "chu": "出", "chua": "欻", "chuai": "揣", "chuan": "穿", "chuang": "床",
    "chui": "吹", "chun": "春", "chuo": "戳",
    "sha": "沙", "shai": "晒", "shan": "山", "shang": "上", "shao": "少", "she": "蛇", "shei": "谁", "shen": "深",
    "sheng": "声", "shi": "十", "shou": "手", "shu": "书", "shua": "刷", "shuai": "帅", "shuan": "拴", "shuang": "双",
    "shui": "水", "shun": "顺", "shuo": "说",
    "ran": "然", "rang": "让", "rao": "绕",
    "re": "热", "ren": "人", "reng": "扔", "ri": "日", "rong": "容", "rou": "肉", "ru": "如", "ruan": "软", "rui": "瑞", "run": "润", "ruo": "若",
    "za": "杂", "zai": "在", "zan": "暂", "zang": "脏", "zao": "早", "ze": "责", "zei": "贼", "zen": "怎",
    "zeng": "增", "zi": "子", "zong": "总", "zou": "走", "zu": "足", "zuan": "钻", "zui": "最", "zun": "尊", "zuo": "做",
    "ca": "擦", "cai": "菜", "can": "参", "cang": "藏", "cao": "草", "ce": "侧", "cen": "岑", "ceng": "层",
    "ci": "次", "cong": "从", "cou": "凑", "cu": "粗", "cuan": "窜", "cui": "翠", "cun": "村", "cuo": "错",
    "sa": "撒", "sai": "赛", "san": "三", "sang": "桑", "sao": "扫", "se": "色", "sen": "森", "seng": "僧",
    "si": "四", "song": "松", "sou": "搜", "su": "苏", "suan": "算", "sui": "岁", "sun": "孙", "suo": "锁",
    "b": "玻", "p": "坡", "m": "摸", "f": "佛", "d": "得", "t": "特", "n": "讷", "l": "勒",
    "g": "哥", "k": "科", "h": "喝", "j": "基", "q": "欺", "x": "希", "zh": "之", "ch": "吃", "sh": "诗", "r": "日",
    "z": "资", "c": "雌", "s": "思", "y": "衣", "w": "乌",
    "ui": "威", "iu": "优", "in": "因", "un": "温", "ing": "英", "ong": "翁"
  };

  var levelTargets = {
    B1: ["ü", "a", "i", "o", "u", "e", "i", "u", "a", "ü", "e", "o", "a", "i", "ü", "u", "e", "o", "i", "a", "u", "ü", "e", "i", "o", "a", "ü", "u", "e", "o"],
    B2: ["b", "p", "m", "ba", "f", "b", "po", "p", "bo", "m", "bi", "f", "bu", "b", "mi", "m", "mo", "p", "mu", "f", "fu", "m", "ma", "b", "pi", "p", "fo", "f", "pu", "m"],
    B3: ["d", "da", "t", "di", "n", "lü", "l", "tu", "d", "ni", "t", "te", "n", "du", "l", "d", "na", "ti", "n", "nu", "t", "de", "l", "la", "d", "l", "n", "t", "lü", "l"],
    B4: ["g", "ga", "k", "h", "ge", "k", "gu", "g", "ka", "h", "ke", "k", "ku", "g", "ha", "h", "he", "g", "hu", "k", "ga", "h", "gu", "g", "ka", "k", "he", "h", "ku", "g"],
    B5: ["j", "ji", "q", "qu", "x", "ju", "j", "qi", "q", "xu", "x", "x", "j", "qu", "q", "xi", "x", "ju", "j", "qi", "q", "xu", "x", "qu", "j", "ji", "q", "q", "x", "xi"],
    B6: ["z", "zi", "zh", "zhi", "c", "ci", "ch", "chi", "s", "si", "sh", "shi", "r", "ri", "ze", "zhe", "ca", "cha", "sa", "sha", "re", "zhi", "ci", "si", "zi", "shi", "chi", "ri", "zhe", "ze", "sha", "sa", "cha", "ca"],
    B7: ["yi", "wu", "yu", "ye", "yue", "ya", "yo", "yao", "you", "yan", "yang", "yin", "ying", "yong", "yun", "yuan", "wan", "wen", "wang", "wo", "wa", "wai", "wei", "wu", "yi", "yu", "ying", "yong", "yue", "yuan", "yin", "yun", "ye", "you", "yang", "yan"],
    B8: ["de", "bo", "gu", "mi", "la", "pi", "ku", "nu", "zhi", "fo", "ti", "me", "lu", "bi", "si", "he", "du", "mo", "li", "fu", "ge", "ni", "bu", "te", "po", "qi", "le", "mu", "zi", "ke", "ji", "tu", "xi", "ne", "pu", "shi", "ri", "ci", "hu", "mi"],
    B9: ["bai", "dou", "gao", "kai", "liu", "mei", "zao", "gui", "nai", "pao", "jiu", "shao", "fei", "ao", "lao", "dui", "hao", "sui", "mao", "niu", "chai", "tui", "sou", "lai", "qiu", "gai", "mou", "cou", "xiu", "hai", "zhao", "cui", "tao", "hou", "diu", "zhai", "dai", "ei", "shai", "ou"],
    B10: ["die", "lü", "jue", "tie", "üe", "nie", "que", "lie", "nü", "bie", "er", "xue", "lüe", "ye", "nüe", "jie", "pie", "yue", "mie", "xie", "qie", "nüe", "die", "üe", "lie", "xue", "yue", "jue", "nie", "bie", "tie", "er", "lüe", "que"],
    B11: ["ban", "bin", "en", "pan", "pin", "man", "min", "fan", "dan", "tan", "nan", "lan", "gan", "kan", "han", "zhan", "chan", "shan", "ren", "ben", "pen", "men", "fen", "gen", "hen", "nin", "lin", "jin", "qin", "xin", "gun", "kun", "hun", "lun", "ün", "an", "in", "un", "en", "ban"],
    B12: ["bang", "pang", "mang", "fang", "deng", "teng", "bing", "ping", "ming", "ding", "ting", "ning", "dong", "tong", "nong", "long", "ang", "eng", "ing", "ong", "geng", "keng", "heng", "zheng", "cheng", "sheng", "neng", "leng", "gang", "kang", "hang", "zhang", "chang", "shang", "gong", "hong", "zhong", "chong", "bing", "bang"],
    B13: ["an", "ang", "en", "eng", "in", "ing", "bin", "bing", "min", "ming", "ren", "reng", "xin", "xing", "hun", "hong", "dun", "dong", "pin", "ping", "jin", "jing", "lin", "ling", "gen", "geng", "zhen", "zheng", "shen", "sheng", "gan", "gang", "tan", "tang", "han", "hang"],
    B14: ["gua", "jiao", "duo", "zhuan", "guang", "hua", "qiao", "luo", "chuan", "huang", "zhua", "xiao", "zuo", "shuan", "zhuang", "jia", "xia", "qia", "diao", "niao", "liao", "biao", "piao", "miao", "tuan", "nuan", "luan", "suan", "cuan", "zuan", "guai", "huai", "zhuai", "chuai", "shuai", "kua", "jiao", "xiao", "guang", "huang"],
    B15: ["zhi", "zi", "chi", "shi", "ri", "ci", "si", "yi", "zhi", "chi", "shi", "zi", "ri", "ci", "yi", "si", "zhi", "shi", "chi", "yi", "zi", "si", "ri", "ci", "zhi", "shi", "chi", "yi"],
    B16: ["wu", "yu", "ye", "yue", "yuan", "yin", "yun", "ying", "yu", "wu", "ying", "yun", "yin", "yuan", "yue", "ye", "wu", "yu", "ye", "yue", "yin", "yun", "ying", "yuan", "wu", "yu", "ye", "ying"],
    B17: ["b", "d", "p", "q", "z", "zh", "c", "ch", "s", "sh", "n", "l", "f", "h", "bo", "po", "de", "te", "ne", "le", "re", "ri", "d", "b", "q", "p", "zh", "z", "ch", "c", "sh", "s", "l", "n", "h", "f", "po", "bo", "te", "ne"],
    B18: ["e", "e", "e", "qu", "xiang", "xiang", "tian", "ge", "bai", "mao", "fu", "lü", "shui", "hong", "zhang", "bo", "qing", "bo", "chuang", "qian", "ming", "yue", "guang", "yi", "shi", "di", "shang", "shuang", "ju", "tou", "wang", "ming", "yue", "di", "tou", "si", "gu", "xiang"]
  };

  root.KZ = root.KZ || {};
  root.KZ.Pinyin = {
    legal: legal,
    groups: groups,
    tts: tts,
    levelTargets: levelTargets
  };

})(typeof window !== 'undefined' ? window : globalThis);
