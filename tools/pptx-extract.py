"""Dump the ruby-version poem PPTX into a readable UTF-8 text file.

Slide text is extracted shape by shape, paragraph by paragraph, keeping run
order. Each segment is tagged by script so the pinyin line and the hanzi line
can be told apart downstream.
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'

CJK = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
LAT = re.compile(r'[A-Za-z\u00c0-\u02ff]')

SRC = sys.argv[1] if len(sys.argv) > 1 else ''
OUT = sys.argv[2] if len(sys.argv) > 2 else 'pptx-dump.txt'


def run_text(r):
    t = r.find(A + 't')
    return t.text if t is not None and t.text else ''


def script_of(text):
    if not text:
        return 'sym'
    if CJK.search(text):
        return 'zh'
    if LAT.search(text):
        return 'lat'
    return 'sym'


def para(runs):
    """Merge consecutive runs of the same script: [(kind, text), ...]."""
    out, cur, kind = [], '', None
    for text in runs:
        script = script_of(text)
        if script != kind:
            if cur:
                out.append((kind, cur))
            kind, cur = script, text
        else:
            cur += text
    if cur:
        out.append((kind, cur))
    return out


def main():
    z = zipfile.ZipFile(SRC)
    slides = sorted((n for n in z.namelist()
                     if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                    key=lambda s: int(re.search(r'(\d+)', s).group(1)))
    lines = []
    for idx, name in enumerate(slides, 1):
        root = ET.fromstring(z.read(name))
        lines.append('===== slide %d =====' % idx)
        for sp in root.iter(P + 'sp'):
            paras = []
            for p in sp.iter(A + 'p'):
                segs = para([run_text(r) for r in p.findall(A + 'r')])
                if segs:
                    paras.append(segs)
            if not paras:
                continue
            lines.append('  --shape--')
            for segs in paras:
                lines.append('    ' + ' | '.join('[%s]%s' % (k, v) for k, v in segs))
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('slides=%d lines=%d -> %s' % (len(slides), len(lines), OUT))


if __name__ == '__main__':
    main()
