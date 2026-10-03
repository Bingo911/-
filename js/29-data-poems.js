/* 古诗数据层：小学生必背古诗 75 首（部编版），汉字与无调拼音按位置逐字对齐。
   每首 = 若干句，每句 = [汉字句（含标点）, 空格分隔的音节]。行数相等、每行汉字数与音节数
   相等是硬约束，由 tools/validate-levels.js 检查；数据来源与再生成方式见 tools/build-poems.py。
   拼音一律不带音调（和 26-data-pinyin.js 同一条规矩），ü 保留分音符，敲的是 V 键。 */
(function (root) {
  var list = [
    { no: 1, title: "江南", author: "汉乐府", lines: [
      ["江南可采莲，", "jiang nan ke cai lian"],
      ["莲叶何田田。", "lian ye he tian tian"],
      ["鱼戏莲叶间。", "yu xi lian ye jian"],
      ["鱼戏莲叶东，", "yu xi lian ye dong"],
      ["鱼戏莲叶西。", "yu xi lian ye xi"],
      ["鱼戏莲叶南，", "yu xi lian ye nan"],
      ["鱼戏莲叶北。", "yu xi lian ye bei"]
    ] },
    { no: 2, title: "长歌行", author: "汉乐府", lines: [
      ["青青园中葵，", "qing qing yuan zhong kui"],
      ["朝露待日晞。", "zhao lu dai ri xi"],
      ["阳春布德泽，", "yang chun bu de ze"],
      ["万物生光辉。", "wan wu sheng guang hui"],
      ["常恐秋节至，", "chang kong qiu jie zhi"],
      ["焜黄华叶衰。", "kun huang hua ye shuai"],
      ["百川东到海，", "bai chuan dong dao hai"],
      ["何时复西归。", "he shi fu xi gui"],
      ["少壮不努力，", "shao zhuang bu nu li"],
      ["老大徒伤悲。", "lao da tu shang bei"]
    ] },
    { no: 3, title: "敕勒歌", author: "北朝民歌", lines: [
      ["敕勒川，", "chi le chuan"],
      ["阴山下，", "yin shan xia"],
      ["天似穹庐，", "tian si qiong lu"],
      ["笼盖四野。", "long gai si ye"],
      ["天苍苍，", "tian cang cang"],
      ["野茫茫，", "ye mang mang"],
      ["风吹草低见牛羊。", "feng chui cao di xian niu yang"]
    ] },
    { no: 4, title: "咏鹅", author: "【唐】骆宾王", lines: [
      ["鹅，", "e"],
      ["鹅，", "e"],
      ["鹅，", "e"],
      ["曲项向天歌。", "qu xiang xiang tian ge"],
      ["白毛浮绿水，", "bai mao fu lü shui"],
      ["红掌拨清波。", "hong zhang bo qing bo"]
    ] },
    { no: 5, title: "风", author: "【唐】李峤", lines: [
      ["解落三秋叶，", "jie luo san qiu ye"],
      ["能开二月花。", "neng kai er yue hua"],
      ["过江千尺浪，", "guo jiang qian chi lang"],
      ["入竹万竿斜。", "ru zhu wan gan xie"]
    ] },
    { no: 6, title: "咏柳", author: "【唐】贺知章", lines: [
      ["碧玉妆成一树高，", "bi yu zhuang cheng yi shu gao"],
      ["万条垂下绿丝绦。", "wan tiao chui xia lü si tao"],
      ["不知细叶谁裁出，", "bu zhi xi ye shui cai chu"],
      ["二月春风似剪刀。", "er yue chun feng si jian dao"]
    ] },
    { no: 7, title: "回乡偶书", author: "【唐】贺知章", lines: [
      ["少小离家老大回，", "shao xiao li jia lao da hui"],
      ["乡音无改鬓毛衰。", "xiang yin wu gai bin mao shuai"],
      ["儿童相见不相识，", "er tong xiang jian bu xiang shi"],
      ["笑问客从何处来。", "xiao wen ke cong he chu lai"]
    ] },
    { no: 8, title: "凉州词", author: "【唐】王之涣", lines: [
      ["黄河远上白云间，", "huang he yuan shang bai yun jian"],
      ["一片孤城万仞山。", "yi pian gu cheng wan ren shan"],
      ["羌笛何须怨杨柳，", "qiang di he xu yuan yang liu"],
      ["春风不度玉门关。", "chun feng bu du yu men guan"]
    ] },
    { no: 9, title: "七步诗", author: "【三国·魏】曹植", lines: [
      ["煮豆持作羹，", "zhu dou chi zuo geng"],
      ["漉菽以为汁。", "lu shu yi wei zhi"],
      ["萁在釜下燃，", "qi zai fu xia ran"],
      ["豆在釜中泣。", "dou zai fu zhong qi"],
      ["本是同根生，", "ben shi tong gen sheng"],
      ["相煎何太急。", "xiang jian he tai ji"]
    ] },
    { no: 10, title: "登鹳雀楼", author: "【唐】王之涣", lines: [
      ["白日依山尽，", "bai ri yi shan jin"],
      ["黄河入海流。", "huang he ru hai liu"],
      ["欲穷千里目，", "yu qiong qian li mu"],
      ["更上一层楼。", "geng shang yi ceng lou"]
    ] },
    { no: 11, title: "春晓", author: "【唐】孟浩然", lines: [
      ["春眠不觉晓，", "chun mian bu jue xiao"],
      ["处处闻啼鸟。", "chu chu wen ti niao"],
      ["夜来风雨声，", "ye lai feng yu sheng"],
      ["花落知多少。", "hua luo zhi duo shao"]
    ] },
    { no: 12, title: "凉州词", author: "【唐】王翰", lines: [
      ["葡萄美酒夜光杯，", "pu tao mei jiu ye guang bei"],
      ["欲饮琵琶马上催。", "yu yin pi pa ma shang cui"],
      ["醉卧沙场君莫笑，", "zui wo sha chang jun mo xiao"],
      ["古来征战几人回？", "gu lai zheng zhan ji ren hui"]
    ] },
    { no: 13, title: "出塞", author: "【唐】王昌龄", lines: [
      ["秦时明月汉时关，", "qin shi ming yue han shi guan"],
      ["万里长征人未还。", "wan li chang zheng ren wei hai"],
      ["但使龙城飞将在，", "dan shi long cheng fei jiang zai"],
      ["不教胡马度阴山。", "bu jiao hu ma du yin shan"]
    ] },
    { no: 14, title: "芙蓉楼送辛渐", author: "【唐】王昌龄", lines: [
      ["寒雨连江夜入吴，", "han yu lian jiang ye ru wu"],
      ["平明送客楚山孤。", "ping ming song ke chu shan gu"],
      ["洛阳亲友如相问，", "luo yang qin you ru xiang wen"],
      ["一片冰心在玉壶。", "yi pian bing xin zai yu hu"]
    ] },
    { no: 15, title: "鹿柴", author: "【唐】王维", lines: [
      ["空山不见人，", "kong shan bu jian ren"],
      ["但闻人语响。", "dan wen ren yu xiang"],
      ["返景入深林，", "fan jing ru shen lin"],
      ["复照青苔上。", "fu zhao qing tai shang"]
    ] },
    { no: 16, title: "送元二使安西", author: "【唐】王维", lines: [
      ["渭城朝雨浥轻尘，", "wei cheng chao yu yi qing chen"],
      ["客舍青青柳色新。", "ke she qing qing liu se xin"],
      ["劝君更尽一杯酒，", "quan jun geng jin yi bei jiu"],
      ["西出阳关无故人。", "xi chu yan guan wu gu ren"]
    ] },
    { no: 17, title: "九月九日忆山东兄弟", author: "【唐】王维", lines: [
      ["独在异乡为异客，", "du zai yi xiang wei yi ke"],
      ["每逢佳节倍思亲。", "mei feng jia jie bei si qin"],
      ["遥知兄弟登高处，", "yao zhi xiong di deng gao chu"],
      ["遍插茱萸少一人。", "bian cha zhu yu shao yi ren"]
    ] },
    { no: 18, title: "静夜思", author: "【唐】李白", lines: [
      ["床前明月光，", "chuang qian ming yue guang"],
      ["疑是地上霜。", "yi shi di shang shuang"],
      ["举头望明月，", "ju tou wang ming yue"],
      ["低头思故乡。", "di tou si gu xiang"]
    ] },
    { no: 19, title: "古朗月行（节录）", author: "【唐】李白", lines: [
      ["小时不识月，", "xiao shi bu shi yue"],
      ["呼作白玉盘。", "hu zuo bai yu pan"],
      ["又疑瑶台镜，", "you yi yao tai jing"],
      ["飞在青云端。", "fei zai qing yun duan"]
    ] },
    { no: 20, title: "望庐山瀑布", author: "【唐】李白", lines: [
      ["日照香炉生紫烟，", "ri zhao xiang lu sheng zi yan"],
      ["遥看瀑布挂前川。", "yao kan pu bu gua qian chuan"],
      ["飞流直下三千尺，", "fei liu zhi xia san qian chi"],
      ["疑是银河落九天。", "yi shi yin he luo jiu tian"]
    ] },
    { no: 21, title: "赠汪伦", author: "【唐】李白", lines: [
      ["李白乘舟将欲行，", "li bai cheng zhou jiang yu xing"],
      ["忽闻岸上踏歌声。", "hu wen an shang ta ge sheng"],
      ["桃花潭水深千尺，", "tao hua tan shui shen qian chi"],
      ["不及汪伦送我情。", "bu ji wang lun song wo qing"]
    ] },
    { no: 22, title: "黄鹤楼送孟浩然之广陵", author: "【唐】李白", lines: [
      ["故人西辞黄鹤楼，", "gu ren xi ci huang he lou"],
      ["烟花三月下扬州。", "yan hua san yue xia yang zhou"],
      ["孤帆远影碧空尽，", "gu fan yuan ying bi kong jin"],
      ["唯见长江天际流。", "wei jian chang jiang tian ji liu"]
    ] },
    { no: 23, title: "早发白帝城", author: "【唐】李白", lines: [
      ["朝辞白帝彩云间，", "chao ci bai di cai yun jian"],
      ["千里江陵一日还。", "qian li jiang ling yi ri hai"],
      ["两岸猿声啼不住，", "liang an yuan sheng ti bu zhu"],
      ["轻舟已过万重山。", "qing zhou yi guo wan zhong shan"]
    ] },
    { no: 24, title: "望天门山", author: "【唐】李白", lines: [
      ["天门中断楚江开，", "tian men zhong duan chu jiang kai"],
      ["碧水东流至此回。", "bi shui dong liu zhi ci hui"],
      ["两岸青山相对出，", "liang an qing shan xiang dui chu"],
      ["孤帆一片日边来。", "gu fan yi pian ri bian lai"]
    ] },
    { no: 25, title: "别董大", author: "【唐】高适", lines: [
      ["千里黄云白日曛，", "qian li huang yun bai ri xun"],
      ["北风吹雁雪纷纷。", "bei feng chui yan xue fen fen"],
      ["莫愁前路无知己，", "mo chou qian lu wu zhi ji"],
      ["天下谁人不识君？", "tian xia shei ren bu shi jun"]
    ] },
    { no: 26, title: "绝句（两个黄鹂）", author: "【唐】杜甫", lines: [
      ["两个黄鹂鸣翠柳，", "liang ge huang li ming cui liu"],
      ["一行白鹭上青天。", "yi hang bai lu shang qing tian"],
      ["窗含西岭千秋雪，", "chuang han xi ling qian qiu xue"],
      ["门泊东吴万里船。", "men bo dong wu wan li chuan"]
    ] },
    { no: 27, title: "春夜喜雨", author: "【唐】杜甫", lines: [
      ["好雨知时节，", "hao yu zhi shi jie"],
      ["当春乃发生。", "dang chun nai fa sheng"],
      ["随风潜入夜，", "sui feng qian ru ye"],
      ["润物细无声。", "run wu xi wu sheng"],
      ["野径云俱黑，", "ye jing yun ju hei"],
      ["江船火独明。", "jiang chuan huo du ming"],
      ["晓看红湿处，", "xiao kan hong shi chu"],
      ["花重锦官城。", "hua zhong jin guan cheng"]
    ] },
    { no: 28, title: "绝句（迟日江山）", author: "【唐】杜甫", lines: [
      ["迟日江山丽，", "chi ri jiang shan li"],
      ["春风花草香。", "chun feng hua cao xiang"],
      ["泥融飞燕子，", "ni rong fei yan zi"],
      ["沙暖睡鸳鸯。", "sha nuan shui yuan yang"]
    ] },
    { no: 29, title: "江畔独步寻花", author: "【唐】杜甫", lines: [
      ["黄师塔前江水东，", "huang shi ta qian jiang shui dong"],
      ["春光懒困倚微风。", "chun guang lan kun yi wei feng"],
      ["桃花一簇开无主，", "tao hua yi cu kai wu zhu"],
      ["可爱深红爱浅红？", "ke ai shen hong ai qian hong"]
    ] },
    { no: 30, title: "枫桥夜泊", author: "【唐】张继", lines: [
      ["月落乌啼霜满天，", "yue luo wu ti shuang man tian"],
      ["江枫渔火对愁眠。", "jiang feng yu huo dui chou mian"],
      ["姑苏城外寒山寺，", "gu su cheng wai han shan si"],
      ["夜半钟声到客船。", "ye ban zhong sheng dao ke chuan"]
    ] },
    { no: 31, title: "滁州西涧", author: "【唐】韦应物", lines: [
      ["独怜幽草涧边生，", "du lian you cao jian bian sheng"],
      ["上有黄鹂深树鸣。", "shang you huang li shen shu ming"],
      ["春潮带雨晚来急，", "chun chao dai yu wan lai ji"],
      ["野渡无人舟自横。", "ye du wu ren zhou zi heng"]
    ] },
    { no: 32, title: "游子吟", author: "【唐】孟郊", lines: [
      ["慈母手中线，", "ci mu shou zhong xian"],
      ["游子身上衣。", "you zi shen shang yi"],
      ["临行密密缝，", "lin xing mi mi feng"],
      ["意恐迟迟归。", "yi kong chi chi gui"],
      ["谁言寸草心，", "shui yan cun cao xin"],
      ["报得三春晖。", "bao de san chun hui"]
    ] },
    { no: 33, title: "早春呈水部张十八员外", author: "【唐】韩愈", lines: [
      ["天街小雨润如酥，", "tian jie xiao yu run ru su"],
      ["草色遥看近却无。", "cao se yao kan jin que wu"],
      ["最是一年春好处，", "zui shi yi nian chun hao chu"],
      ["绝胜烟柳满皇都。", "jue sheng yan liu man huang dou"]
    ] },
    { no: 34, title: "渔歌子", author: "【唐】张志和", lines: [
      ["西塞山前白鹭飞，", "xi sai shan qian bai lu fei"],
      ["桃花流水鳜鱼肥。", "tao hua liu shui gui yu fei"],
      ["青箬笠，", "qing ruo li"],
      ["绿蓑衣，", "lü suo yi"],
      ["斜风细雨不须归。", "xie feng xi yu bu xu gui"]
    ] },
    { no: 35, title: "塞下曲", author: "【唐】卢纶", lines: [
      ["月黑雁飞高，", "yue hei yan fei gao"],
      ["单于夜遁逃。", "chan yu ye dun tao"],
      ["欲将轻骑逐，", "yu jiang qing qi zhu"],
      ["大雪满弓刀。", "da xue man gong dao"]
    ] },
    { no: 36, title: "望洞庭", author: "【唐】刘禹锡", lines: [
      ["湖光秋月两相和，", "hu guang qiu yue liang xiang he"],
      ["潭面无风镜未磨。", "tan mian wu feng jing wei mo"],
      ["遥望洞庭山水翠，", "yao wang dong ting shan shui cui"],
      ["白银盘里一青螺。", "bai yin pan li yi qing luo"]
    ] },
    { no: 37, title: "浪淘沙", author: "【唐】刘禹锡", lines: [
      ["九曲黄河万里沙，", "jiu qu huang he wan li sha"],
      ["浪淘风簸自天涯。", "lang tao feng bo zi tian ya"],
      ["如今直上银河去，", "ru jin zhi shang yin he qu"],
      ["同到牵牛织女家。", "tong dao qian niu zhi nü jia"]
    ] },
    { no: 38, title: "赋得古原草送别", author: "【唐】白居易", lines: [
      ["离离原上草，", "li li yuan shang cao"],
      ["一岁一枯荣。", "yi sui yi ku rong"],
      ["野火烧不尽，", "ye huo shao bu jin"],
      ["春风吹又生。", "chun feng chui you sheng"],
      ["远芳侵古道，", "yuan fang qin gu dao"],
      ["晴翠接荒城。", "qing cui jie huang cheng"],
      ["又送王孙去，", "you song wang sun qu"],
      ["萋萋满别情。", "qi qi man bie qing"]
    ] },
    { no: 39, title: "池上", author: "【唐】白居易", lines: [
      ["小娃撑小艇，", "xiao wa cheng xiao ting"],
      ["偷采白莲回。", "tou cai bai lian hui"],
      ["不解藏踪迹，", "bu jie cang zong ji"],
      ["浮萍一道开。", "fu ping yi dao kai"]
    ] },
    { no: 40, title: "忆江南", author: "【唐】白居易", lines: [
      ["江南好，", "jiang nan hao"],
      ["风景旧曾谙。", "feng jing jiu ceng an"],
      ["日出江花红胜火，", "ri chu jiang hua hong sheng huo"],
      ["春来江水绿如蓝。", "chun lai jiang shui lü ru lan"],
      ["能不忆江南？", "neng bu yi jiang nan"]
    ] },
    { no: 41, title: "小儿垂钓", author: "【唐】胡令能", lines: [
      ["蓬头稚子学垂纶，", "peng tou zhi zi xue chui lun"],
      ["侧坐莓苔草映身。", "ce zuo mei tai cao ying shen"],
      ["路人借问遥招手，", "lu ren jie wen yao zhao shou"],
      ["怕得鱼惊不应人。", "pa de yu jing bu ying ren"]
    ] },
    { no: 42, title: "悯农（春种一粒）", author: "【唐】李绅", lines: [
      ["春种一粒粟，", "chun zhong yi li su"],
      ["秋收万颗子。", "qiu shou wan ke zi"],
      ["四海无闲田，", "si hai wu xian tian"],
      ["农夫犹饿死。", "nong fu you e si"]
    ] },
    { no: 43, title: "悯农（锄禾日当）", author: "【唐】李绅", lines: [
      ["锄禾日当午，", "chu he ri dang wu"],
      ["汗滴禾下土。", "han di he xia tu"],
      ["谁知盘中餐，", "shui zhi pan zhong can"],
      ["粒粒皆辛苦。", "li li jie xin ku"]
    ] },
    { no: 44, title: "江雪", author: "【唐】柳宗元", lines: [
      ["千山鸟飞绝，", "qian shan niao fei jue"],
      ["万径人踪灭。", "wan jing ren zong mie"],
      ["孤舟蓑笠翁，", "gu zhou suo li weng"],
      ["独钓寒江雪。", "du diao han jiang xue"]
    ] },
    { no: 45, title: "寻隐者不遇", author: "【唐】贾岛", lines: [
      ["松下问童子，", "song xia wen tong zi"],
      ["言师采药去。", "yan shi cai yao qu"],
      ["只在此山中，", "zhi zai ci shan zhong"],
      ["云深不知处。", "yun shen bu zhi chu"]
    ] },
    { no: 46, title: "山行", author: "【唐】杜牧", lines: [
      ["远上寒山石径斜，", "yuan shang han shan shi jing xie"],
      ["白云生处有人家。", "bai yun sheng chu you ren jia"],
      ["停车坐爱枫林晚，", "ting che zuo ai feng lin wan"],
      ["霜叶红于二月花。", "shuang ye hong yu er yue hua"]
    ] },
    { no: 47, title: "清明", author: "【唐】杜牧", lines: [
      ["清明时节雨纷纷，", "qing ming shi jie yu fen fen"],
      ["路上行人欲断魂。", "lu shang xing ren yu duan hun"],
      ["借问酒家何处有？", "jie wen jiu jia he chu you"],
      ["牧童遥指杏花村。", "mu tong yao zhi xing hua cun"]
    ] },
    { no: 48, title: "江南春", author: "【唐】杜牧", lines: [
      ["千里莺啼绿映红，", "qian li ying ti lü ying hong"],
      ["水村山郭酒旗风。", "shui cun shan guo jiu qi feng"],
      ["南朝四百八十寺，", "nan chao si bai ba shi si"],
      ["多少楼台烟雨中。", "duo shao lou tai yan yu zhong"]
    ] },
    { no: 49, title: "蜂", author: "【唐】罗隐", lines: [
      ["不论平地与山尖，", "bu lun ping di yu shan jian"],
      ["无限风光尽被占。", "wu xian feng guang jin bei zhan"],
      ["采得百花成蜜后，", "cai de bai hua cheng mi hou"],
      ["为谁辛苦为谁甜？", "wei shui xin ku wei shui tian"]
    ] },
    { no: 50, title: "乐游原", author: "【唐】李商隐", lines: [
      ["向晚意不适，", "xiang wan yi bu shi"],
      ["驱车登古原。", "qu che deng gu yuan"],
      ["夕阳无限好，", "xi yang wu xian hao"],
      ["只是近黄昏。", "zhi shi jin huang hun"]
    ] },
    { no: 51, title: "元日", author: "【宋】王安石", lines: [
      ["爆竹声中一岁除，", "bao zhu sheng zhong yi sui chu"],
      ["春风送暖入屠苏。", "chun feng song nuan ru tu su"],
      ["千门万户曈曈日，", "qian men wan hu tong tong ri"],
      ["总把新桃换旧符。", "zong ba xin tao huan jiu fu"]
    ] },
    { no: 52, title: "泊船瓜洲", author: "【宋】王安石", lines: [
      ["京口瓜洲一水间，", "jing kou gua zhou yi shui jian"],
      ["钟山只隔数重山。", "zhong shan zhi ge shu zhong shan"],
      ["春风又绿江南岸，", "chun feng you lü jiang nan an"],
      ["明月何时照我还。", "ming yue he shi zhao wo hai"]
    ] },
    { no: 53, title: "书湖阴先生壁", author: "【宋】王安石", lines: [
      ["茅檐长扫净无苔，", "mao yan chang sao jing wu tai"],
      ["花木成畦手自栽。", "hua mu cheng qi shou zi zai"],
      ["一水护田将绿绕，", "yi shui hu tian jiang lü rao"],
      ["两山排闼送青来。", "liang shan pai ta song qing lai"]
    ] },
    { no: 54, title: "六月二十七日望湖楼醉书", author: "【宋】苏轼", lines: [
      ["黑云翻墨未遮山，", "hei yun fan mo wei zhe shan"],
      ["白雨跳珠乱入船。", "bai yu tiao zhu luan ru chuan"],
      ["卷地风来忽吹散，", "juan di feng lai hu chui san"],
      ["望湖楼下水如天。", "wang hu lou xia shui ru tian"]
    ] },
    { no: 55, title: "饮湖上初晴后雨", author: "【宋】苏轼", lines: [
      ["水光潋滟晴方好，", "shui guang lian yan qing fang hao"],
      ["山色空蒙雨亦奇。", "shan se kong meng yu yi qi"],
      ["欲把西湖比西子，", "yu ba xi hu bi xi zi"],
      ["淡妆浓抹总相宜。", "dan zhuang nong mo zong xiang yi"]
    ] },
    { no: 56, title: "惠崇春江晚景", author: "【宋】苏轼", lines: [
      ["竹外桃花三两枝，", "zhu wai tao hua san liang zhi"],
      ["春江水暖鸭先知。", "chun jiang shui nuan ya xian zhi"],
      ["蒌蒿满地芦芽短，", "lou hao man di lu ya duan"],
      ["正是河豚欲上时。", "zheng shi he tun yu shang shi"]
    ] },
    { no: 57, title: "题西林壁", author: "【宋】苏轼", lines: [
      ["横看成岭侧成峰，", "heng kan cheng ling ce cheng feng"],
      ["远近高低各不同。", "yuan jin gao di ge bu tong"],
      ["不识庐山真面目，", "bu shi lu shan zhen mian mu"],
      ["只缘身在此山中。", "zhi yuan shen zai ci shan zhong"]
    ] },
    { no: 58, title: "夏日绝句", author: "【宋】李清照", lines: [
      ["生当作人杰，", "sheng dang zuo ren jie"],
      ["死亦为鬼雄。", "si yi wei gui xiong"],
      ["至今思项羽，", "zhi jin si xiang yu"],
      ["不肯过江东。", "bu ken guo jiang dong"]
    ] },
    { no: 59, title: "示儿", author: "【宋】陆游", lines: [
      ["死去元知万事空，", "si qu yuan zhi wan shi kong"],
      ["但悲不见九州同。", "dan bei bu jian jiu zhou tong"],
      ["王师北定中原日，", "wang shi bei ding zhong yuan ri"],
      ["家祭无忘告乃翁。", "jia ji wu wang gao nai weng"]
    ] },
    { no: 60, title: "秋夜将晓出篱门迎凉有感", author: "【宋】陆游", lines: [
      ["三万里河东入海，", "san wan li he dong ru hai"],
      ["五千仞岳上摩天。", "wu qian ren yue shang mo tian"],
      ["遗民泪尽胡尘里，", "yi min lei jin hu chen li"],
      ["南望王师又一年。", "nan wang wang shi you yi nian"]
    ] },
    { no: 61, title: "四时田园杂兴（昼出耘田）", author: "【宋】范成大", lines: [
      ["昼出耘田夜绩麻，", "zhou chu yun tian ye ji ma"],
      ["村庄儿女各当家。", "cun zhuang er nü ge dang jia"],
      ["童孙未解供耕织，", "tong sun wei jie gong geng zhi"],
      ["也傍桑阴学种瓜。", "ye bang sang yin xue zhong gua"]
    ] },
    { no: 62, title: "四时田园杂兴（梅子金黄）", author: "【宋】范成大", lines: [
      ["梅子金黄杏子肥，", "mei zi jin huang xing zi fei"],
      ["麦花雪白菜花稀。", "mai hua xue bai cai hua xi"],
      ["日长篱落无人过，", "ri chang li luo wu ren guo"],
      ["唯有蜻蜓蛱蝶飞。", "wei you qing ting jia die fei"]
    ] },
    { no: 63, title: "晓出净慈寺送林子方", author: "【宋】杨万里", lines: [
      ["毕竟西湖六月中，", "bi jing xi hu liu yue zhong"],
      ["风光不与四时同。", "feng guang bu yu si shi tong"],
      ["接天莲叶无穷碧，", "jie tian lian ye wu qiong bi"],
      ["映日荷花别样红。", "ying ri he hua bie yang hong"]
    ] },
    { no: 64, title: "小池", author: "【宋】杨万里", lines: [
      ["泉眼无声惜细流，", "quan yan wu sheng xi xi liu"],
      ["树阴照水爱晴柔。", "shu yin zhao shui ai qing rou"],
      ["小荷才露尖尖角，", "xiao he cai lu jian jian jiao"],
      ["早有蜻蜓立上头。", "zao you qing ting li shang tou"]
    ] },
    { no: 65, title: "春日", author: "【宋】朱熹", lines: [
      ["胜日寻芳泗水滨，", "sheng ri xun fang si shui bin"],
      ["无边光景一时新。", "wu bian guang jing yi shi xin"],
      ["等闲识得东风面，", "deng xian shi de dong feng mian"],
      ["万紫千红总是春。", "wan zi qian hong zong shi chun"]
    ] },
    { no: 66, title: "题临安邸", author: "【宋】林升", lines: [
      ["山外青山楼外楼，", "shan wai qing shan lou wai lou"],
      ["西湖歌舞几时休？", "xi hu ge wu ji shi xiu"],
      ["暖风熏得游人醉，", "nuan feng xun de you ren zui"],
      ["直把杭州作汴州。", "zhi ba hang zhou zuo bian zhou"]
    ] },
    { no: 67, title: "游园不值", author: "【宋】叶绍翁", lines: [
      ["应怜屐齿印苍苔，", "ying lian ji chi yin cang tai"],
      ["小扣柴扉久不开。", "xiao kou chai fei jiu bu kai"],
      ["春色满园关不住，", "chun se man yuan guan bu zhu"],
      ["一枝红杏出墙来。", "yi zhi hong xing chu qiang lai"]
    ] },
    { no: 68, title: "乡村四月", author: "【宋】翁卷", lines: [
      ["绿遍山原白满川，", "lü bian shan yuan bai man chuan"],
      ["子规声里雨如烟。", "zi gui sheng li yu ru yan"],
      ["乡村四月闲人少，", "xiang cun si yue xian ren shao"],
      ["才了蚕桑又插田。", "cai le can sang you cha tian"]
    ] },
    { no: 69, title: "江上渔者", author: "【宋】范仲淹", lines: [
      ["江上往来人，", "jiang shang wang lai ren"],
      ["但爱鲈鱼美。", "dan ai lu yu mei"],
      ["君看一叶舟，", "jun kan yi ye zhou"],
      ["出没风波里。", "chu mo feng bo li"]
    ] },
    { no: 70, title: "墨梅", author: "【元】王冕", lines: [
      ["我家洗砚池头树，", "wo jia xi yan chi tou shu"],
      ["朵朵花开淡墨痕。", "duo duo hua kai dan mo hen"],
      ["不要人夸颜色好，", "bu yao ren kua yan se hao"],
      ["只留清气满乾坤。", "zhi liu qing qi man qian kun"]
    ] },
    { no: 71, title: "石灰吟", author: "【明】于谦", lines: [
      ["千锤万凿出深山，", "qian chui wan zao chu shen shan"],
      ["烈火焚烧若等闲。", "lie huo fen shao ruo deng xian"],
      ["粉骨碎身浑不怕，", "fen gu sui shen hun bu pa"],
      ["要留清白在人间。", "yao liu qing bai zai ren jian"]
    ] },
    { no: 72, title: "竹石", author: "【清】郑燮", lines: [
      ["咬定青山不放松，", "yao ding qing shan bu fang song"],
      ["立根原在破岩中。", "li gen yuan zai po yan zhong"],
      ["千磨万击还坚劲，", "qian mo wan ji hai jian jing"],
      ["任尔东西南北风。", "ren er dong xi nan bei feng"]
    ] },
    { no: 73, title: "所见", author: "【清】袁枚", lines: [
      ["牧童骑黄牛，", "mu tong qi huang niu"],
      ["歌声振林樾。", "ge sheng zhen lin yue"],
      ["意欲捕鸣蝉，", "yi yu bu ming chan"],
      ["忽然闭口立。", "hu ran bi kou li"]
    ] },
    { no: 74, title: "村居", author: "【清】高鼎", lines: [
      ["草长莺飞二月天，", "cao zhang ying fei er yue tian"],
      ["拂堤杨柳醉春烟。", "fu di yang liu zui chun yan"],
      ["儿童散学归来早，", "er tong san xue gui lai zao"],
      ["忙趁东风放纸鸢。", "mang chen dong feng fang zhi yuan"]
    ] },
    { no: 75, title: "己亥杂诗", author: "【清】龚自珍", lines: [
      ["浩荡离愁白日斜，", "hao dang li chou bai ri xie"],
      ["吟鞭东指即天涯。", "yin bian dong zhi ji tian ya"],
      ["落红不是无情物，", "luo hong bu shi wu qing wu"],
      ["化作春泥更护花。", "hua zuo chun ni geng hu hua"]
    ] }
  ];

  var byNo = {};
  list.forEach(function (p) { byNo[p.no] = p; });

  root.KZ = root.KZ || {};
  root.KZ.Poems = { list: list, byNo: byNo };
})(typeof window !== 'undefined' ? window : globalThis);
