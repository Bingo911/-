"""Regenerate js/29-data-poems.js from the textbook PPTX of the 75 required poems.

    python tools/build-poems.py <path-to-pptx>

The deck puts one poem per slide: a pinyin line above the matching hanzi line.
Extraction pairs the two streams by position, so the alignment is only trusted
when a slide's hanzi count equals its syllable count; anything else is printed
as an anomaly and makes the run exit non-zero (the file is still written, so a
broken slide can be inspected). Deck typos are corrected by the tables below
rather than by hand-editing the generated file, which would be lost next run.

Tones are dropped because the game types bare letters (see 26-data-pinyin.js:
「显示串，绝不带音调」), while ü keeps its umlaut to match world B's spelling.
"""
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'

TONE_MARKS = ''.join([u'\u0300', u'\u0301', u'\u0303', u'\u0304', u'\u030c'])
CJK = re.compile(r'[\u3400-\u9fff]')
PY_TOKEN = re.compile(r'[A-Za-z\u00c0-\u024f]+')
CLAUSE_END = '，。！？；、'

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'js' / '29-data-poems.js'

# 课件自身的错，按标题上的编号记在这儿，重新生成时不会被课件冲掉。
# 只改字、不改音的走 CHAR_FIX（这几个字和原字的无调拼音本来就相同）；
# 拼音也要改、或者课件把句子排倒了句序的，整首写死在 OVERRIDES 里 ——
# 光排句子会把拼音留在原来的那一行上，字和音就错开了，这种错计数查不出来。
CHAR_FIX = [
    # 《七步诗》通行本作「持作羹」「釜下燃」
    ('持做羹', '持作羹'),
    ('釜下然', '釜下燃'),
    # 《春夜喜雨》是「野径」，课件作「夜径」（两个字都读 ye）
    ('夜径云俱黑', '野径云俱黑'),
    # 《元日》是「曈曈」（日字旁），课件作「瞳瞳」
    ('瞳瞳日', '曈曈日'),
    # 《题临安邸》通行本作「作汴州」
    ('杭州做汴州', '杭州作汴州'),
    # 《秋夜将晓出篱门迎凉有感》是「南望」（向南望王师），课件作「难望」，两字同音
    ('难望王师', '南望王师'),
    # 《黄鹤楼送孟浩然之广陵》部编版作「唯见」
    ('惟见长江', '唯见长江'),
]

# 整首的订正：[汉字句, 无调拼音]，句数必须和课件抽到的一致，
# 每句汉字数和音节数由下面的例行检查兜住。
OVERRIDES = {
    # 《望庐山瀑布》二三句的句读排反了（「挂前川。」接「飞流……，」）
    20: [
        ('日照香炉生紫烟，', 'ri zhao xiang lu sheng zi yan'),
        ('遥看瀑布挂前川。', 'yao kan pu bu gua qian chuan'),
        ('飞流直下三千尺，', 'fei liu zhi xia san qian chi'),
        ('疑是银河落九天。', 'yi shi yin he luo jiu tian'),
    ],
    # 《饮湖上初晴后雨》课件作「潋艳」「空朦」「雨欲奇」，通行本「潋滟」「空蒙」「雨亦奇」
    55: [
        ('水光潋滟晴方好，', 'shui guang lian yan qing fang hao'),
        ('山色空蒙雨亦奇。', 'shan se kong meng yu yi qi'),
        ('欲把西湖比西子，', 'yu ba xi hu bi xi zi'),
        ('淡妆浓抹总相宜。', 'dan zhuang nong mo zong xiang yi'),
    ],
    # 《晓出净慈寺送林子方》课件把「接天莲叶无穷碧」印在了「风光不与四时同」前面
    63: [
        ('毕竟西湖六月中，', 'bi jing xi hu liu yue zhong'),
        ('风光不与四时同。', 'feng guang bu yu si shi tong'),
        ('接天莲叶无穷碧，', 'jie tian lian ye wu qiong bi'),
        ('映日荷花别样红。', 'ying ri he hua bie yang hong'),
    ],
    # 《乡村四月》是「绿遍山原白满川」，课件受下半句「白满川」带偏写成了「绿满山原」，
    # 拼音得跟着改（man → bian），所以整首走 OVERRIDES
    68: [
        ('绿遍山原白满川，', 'lü bian shan yuan bai man chuan'),
        ('子规声里雨如烟。', 'zi gui sheng li yu ru yan'),
        ('乡村四月闲人少，', 'xiang cun si yue xian ren shao'),
        ('才了蚕桑又插田。', 'cai le can sang you cha tian'),
    ],
    # 《石灰吟》是「粉骨碎身」，课件按成语语序写成了「粉身碎骨」；二三句句读也跟着正
    71: [
        ('千锤万凿出深山，', 'qian chui wan zao chu shen shan'),
        ('烈火焚烧若等闲。', 'lie huo fen shao ruo deng xian'),
        ('粉骨碎身浑不怕，', 'fen gu sui shen hun bu pa'),
        ('要留清白在人间。', 'yao liu qing bai zai ren jian'),
    ],
    # 《竹石》是「还坚劲」（jìng，第三句仄声收），课件作「坚韧」
    72: [
        ('咬定青山不放松，', 'yao ding qing shan bu fang song'),
        ('立根原在破岩中。', 'li gen yuan zai po yan zhong'),
        ('千磨万击还坚劲，', 'qian mo wan ji hai jian jing'),
        ('任尔东西南北风。', 'ren er dong xi nan bei feng'),
    ],
}
AUTHOR_FIX = {
    '【唐】王之焕': '【唐】王之涣',
    '【明】郑燮': '【清】郑燮',   # 郑板桥是清的，课件标成了明
}


def fix_text(clause):
    for bad, good in CHAR_FIX:
        clause = clause.replace(bad, good)
    return clause


def override_pairs(no, legal, idx):
    """OVERRIDES 里的整首订正，音节现推：手打的拼音也要过同一道合法性检查。"""
    problems = []
    pairs = []
    for clause, syllables in OVERRIDES[no]:
        take = syllables.split()
        if len(CJK.findall(clause)) != len(take):
            problems.append('第%d页《%s》订正表本身对不上：%s ↔ %s' %
                            (idx, no, clause, syllables))
        for s in take:
            if s.replace('ü', 'v') not in legal:
                problems.append('第%d页《%s》订正表里有非法音节：%s' % (idx, no, s))
        pairs.append((clause, take))
    return pairs, problems


def strip_tone(text):
    """pīn → pin, lǜ → lü (the umlaut survives, the tone mark does not)."""
    decomposed = unicodedata.normalize('NFD', text)
    bare = ''.join(c for c in decomposed if c not in TONE_MARKS)
    return unicodedata.normalize('NFC', bare).lower()


def legal_set():
    src = (ROOT / 'js' / '26-data-pinyin.js').read_text(encoding='utf-8')
    block = src.split('var legal = [', 1)[1].split('];', 1)[0]
    return set(re.findall(r'"([^"]+)"', block))


def segment(token, legal):
    """Split a run-on syllable string the deck typoed together.

    「wàngwáng」 is one regex token but two hanzi. Only strings that are not
    themselves a legal syllable get segmented, and the segmentation must cover
    the whole token — a partial guess would silently shift every later syllable.
    """
    if token in legal:
        return [token]
    longest = max(len(s) for s in legal)
    n = len(token)
    dp = [None] * (n + 1)
    dp[n] = []
    for i in range(n - 1, -1, -1):
        for j in range(i + 1, min(n, i + longest) + 1):
            part = token[i:j]
            if part in legal and dp[j] is not None:
                cand = [part] + dp[j]
                if dp[i] is None or len(cand) < len(dp[i]):
                    dp[i] = cand
    return dp[0] if dp[0] is not None else [token]


def slide_shapes(xml):
    """The text of every shape on a slide, in document order."""
    out = []
    root = ET.fromstring(xml)
    for sp in root.iter(P + 'sp'):
        parts = []
        for p in sp.iter(A + 'p'):
            for r in p.findall(A + 'r'):
                t = r.find(A + 't')
                if t is not None and t.text:
                    parts.append(t.text)
        text = ''.join(parts)
        if text.strip():
            out.append(text)
    return out


def body_of(shape_texts):
    """The poem body is the shape carrying the most hanzi."""
    best, best_n = None, -1
    for text in shape_texts:
        n = len(CJK.findall(text))
        if PY_TOKEN.search(text) and n > best_n:
            best, best_n = text, n
    return best or ''


def is_py(c):
    return c.isascii() and c.isalpha() or '\u00c0' <= c <= '\u024f' or c in " '’”"


def is_hz(c):
    return bool(CJK.match(c)) or c in CLAUSE_END


def blocks(body):
    """Scan the body into alternating pinyin runs and hanzi runs.

    The deck always writes a line's pinyin just before that line's hanzi, so
    pairing them locally keeps one typo from shifting every later syllable.
    """
    out, cur, kind = [], '', None
    for c in body:
        k = 'py' if is_py(c) else ('hz' if is_hz(c) else None)
        if k != kind:
            if cur.strip():
                out.append((kind, cur))
            kind, cur = k, c
        else:
            cur += c
    if cur.strip():
        out.append((kind, cur))
    return [(k, t) for k, t in out if k and (t.strip() if k == 'py' else CJK.search(t))]


def split_clauses(hanzi_run):
    """「江南可采莲，莲叶何田田。」→ ['江南可采莲，', '莲叶何田田。']"""
    out, buf = [], ''
    for ch in hanzi_run:
        if not (is_hz(ch)):
            continue
        buf += ch
        if ch in CLAUSE_END:
            out.append(buf)
            buf = ''
    if CJK.search(buf):
        out.append(buf)
    return out


def clauses(body, legal):
    """[(clause_hanzi_with_punct, [syllable, ...]), ...] plus a list of problems."""
    pairs, dropped, pending = [], [], []
    for kind, text in blocks(body):
        if kind == 'py':
            for tok in PY_TOKEN.findall(text):
                pending.extend(segment(strip_tone(tok), legal))
            continue
        for clause in split_clauses(text):
            want = len(CJK.findall(clause))
            if want > len(pending):
                dropped.append('「%s」前面只剩 %d 个音节（需要 %d）' % (clause, len(pending), want))
                pending = []
                continue
            pairs.append((clause, pending[:want]))
            pending = pending[want:]
    if pending:
        dropped.append('配对结束后还剩 %d 个音节：%s' % (len(pending), ' '.join(pending)))
    return pairs, dropped


def clean_text(s):
    return re.sub(r'\s+', '', s)


def bare_title(s):
    """课件把标题写成「56、《惠崇〈春江晚景〉」，书名号嵌在书名号里：
       strip 只削得掉末位的 》，中间的会留在标题里，所以直接全删。"""
    return re.sub(r'^\s*\d+\s*[、.．，,]?', '', clean_text(s)).replace('《', '').replace('》', '')


def title_author(shape_texts, body):
    """The deck numbers its titles（「4、咏鹅」）, which is the only reliable marker."""
    title, author = '', ''
    for text in shape_texts:
        if text == body or not CJK.search(text):
            continue
        if not title and re.match(r'^\s*\d+\s*[、.．]', text):
            title = bare_title(text)
            continue
        # 作者行可以带注音（【唐】李峤(qiáo)），括号里的拉丁字母不算拼音正文
        rest = re.sub(r'[（(][^（()）]*[)）]', '', text)
        if not author and len(CJK.findall(rest)) <= 12 and not re.search(r'[A-Za-z\u00c0-\u024f]', rest):
            author = clean_text(rest)
    if not title:
        for text in shape_texts:
            if text == body or not CJK.search(text):
                continue
            if len(CJK.findall(text)) <= 14 and not re.match(r'^【', clean_text(text)):
                title = bare_title(text)
                break
    return title, author


def js_escape(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')


def deck_no(shape_texts):
    """The number printed in the slide's title shape (deck page = number + 1)."""
    for text in shape_texts:
        m = re.match(r'^\s*(\d+)\s*[、.．]', text)
        if m and CJK.search(text):
            return int(m.group(1))
    return 0


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    legal = legal_set()
    z = zipfile.ZipFile(sys.argv[1])
    slides = sorted((n for n in z.namelist()
                     if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                    key=lambda s: int(re.search(r'(\d+)', s).group(1)))
    poems, problems = [], []
    for idx, name in enumerate(slides, 1):
        texts = slide_shapes(z.read(name))
        if idx == 1:
            continue
        body = body_of(texts)
        pairs, dropped = clauses(body, legal)
        title, author = title_author(texts, body)
        no = deck_no(texts)
        if not pairs:
            problems.append('第%d页《%s》抽不到任何句子' % (idx, title))
            continue
        if no in OVERRIDES:
            if len(OVERRIDES[no]) != len(pairs):
                problems.append('第%d页《%s》订正表 %d 句，课件抽到 %d 句，整首按订正表出' %
                                (idx, title, len(OVERRIDES[no]), len(pairs)))
            fixed, bad_fix = override_pairs(no, legal, idx)
            problems.extend(bad_fix)
            pairs = fixed
        pairs = [(fix_text(c), s) for c, s in pairs]
        # 有的末句课件漏了句点（《春晓》「花落知多少」），孩子照着敲会以为少了个字
        pairs = [(c if c[-1] in CLAUSE_END else c + '。', s) for c, s in pairs]
        bad = []
        for clause, take in pairs:
            if len(CJK.findall(clause)) != len(take):
                bad.append('%s ↔ %s' % (clause, ' '.join(take)))
            for s in take:
                if s.replace('ü', 'v') not in legal:
                    bad.append('%s → %s' % (clause, s))
        if bad:
            problems.append('第%d页《%s》音节对不上或不合法：%s' %
                            (idx, title, '; '.join(sorted(set(bad))[:6])))
        if dropped:
            problems.append('第%d页《%s》对齐异常：%s' % (idx, title, '; '.join(dropped)))
        poems.append({'no': no or len(poems) + 1, 'slide': idx, 'title': title,
                      'author': AUTHOR_FIX.get(author, author), 'pairs': pairs})

    poems.sort(key=lambda p: p['no'])
    if [p['no'] for p in poems] != list(range(1, 76)):
        problems.append('课件编号不是连续的 1–75：%s' % [p['no'] for p in poems])
    dupe = {}
    for po in poems:
        dupe[(po['title'], po['author'])] = dupe.get((po['title'], po['author']), 0) + 1
    for po in poems:
        if dupe[(po['title'], po['author'])] > 1:
            # 用首句区分，不用「其一／其二」：课件把《绝句》两组都印成了同名，
            # 而通行本里「两个黄鹂」是绝句四首其三、「迟日江山丽」是绝句二首其一，
            # 编号谁先谁后全看版本，孩子背错了反而怪到游戏头上。首句是死的。
            po['title'] += '（%s）' % ''.join(CJK.findall(po['pairs'][0][0])[:4])

    lines = []
    lines.append('/* 古诗数据层：小学生必背古诗 75 首（部编版），汉字与无调拼音按位置逐字对齐。')
    lines.append('   每首 = 若干句，每句 = [汉字句（含标点）, 空格分隔的音节]。行数相等、每行汉字数与音节数')
    lines.append('   相等是硬约束，由 tools/validate-levels.js 检查；数据来源与再生成方式见 tools/build-poems.py。')
    lines.append('   拼音一律不带音调（和 26-data-pinyin.js 同一条规矩），ü 保留分音符，敲的是 V 键。 */')
    lines.append('(function (root) {')
    lines.append('  var list = [')
    for po in poems:
        lines.append('    { no: %d, title: "%s", author: "%s", lines: [' %
                     (po['no'], js_escape(po['title']), js_escape(po['author'])))
        for clause, take in po['pairs']:
            lines.append('      ["%s", "%s"],' % (js_escape(clause), ' '.join(take)))
        lines[-1] = lines[-1][:-1]
        lines.append('    ] },')
    lines[-1] = lines[-1][:-1]
    lines.append('  ];')
    lines.append('')
    lines.append('  var byNo = {};')
    lines.append('  list.forEach(function (p) { byNo[p.no] = p; });')
    lines.append('')
    lines.append('  root.KZ = root.KZ || {};')
    lines.append('  root.KZ.Poems = { list: list, byNo: byNo };')
    lines.append('})(typeof window !== \'undefined\' ? window : globalThis);')
    lines.append('')
    OUT.write_text('\n'.join(lines), encoding='utf-8')

    total_lines = sum(len(p['pairs']) for p in poems)
    total_chars = sum(len(CJK.findall(c)) for p in poems for c, _ in p['pairs'])
    print('生成 %s：%d 首 / %d 句 / %d 个汉字目标' % (OUT, len(poems), total_lines, total_chars))
    for p in poems:
        print('  %2d《%s》%s  %d 句' % (p['no'], p['title'], p['author'], len(p['pairs'])))
    if problems:
        print('\n异常 %d 条：' % len(problems))
        for msg in problems:
            print('  ! ' + msg)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
