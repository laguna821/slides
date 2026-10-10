"""Subset embedded WOFF2 fonts without changing SVG vectors or text.

Usage: python scripts/subset-reader-svg-font.py original.svg output.svg
Requires fonttools[woff]. Keep the original asset; register the new content-hash
URL, fontSubsetOf, and SHA256 only after rendering and source checks.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import io
import re
import xml.etree.ElementTree as ET
from fontTools import subset
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
if args.source.resolve() == args.output.resolve() or args.output.exists():
    parser.error('Use a new output path; never overwrite an original asset.')
original = args.source.read_text(encoding='utf8')
root = ET.fromstring(original)
glyphs = ''.join(''.join(e.itertext()) for e in root.iter()
                 if e.tag.endswith('}text') or e.tag == 'text')
face_pattern = r'@font-face\s*\{[^}]+\}'

def subset_face(match):
    face = match.group(0)
    data = re.search(r'data:font/woff2;base64,([^\s\)\'\"]+)', face)
    if not data:
        raise ValueError('Expected an embedded WOFF2 font')
    font = TTFont(io.BytesIO(base64.b64decode(data.group(1))), recalcTimestamp=False)
    required = {ord(c) for c in glyphs if ord(c) in font.getBestCmap()}
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=glyphs)
    subsetter.subset(font)
    if not required <= set(font.getBestCmap()):
        raise ValueError('Original text glyph missing after subsetting')
    result = io.BytesIO()
    font.save(result)
    if len(result.getvalue()) > 128 * 1024:
        raise ValueError('Subset still exceeds reader font budget')
    return face.replace(data.group(1), base64.b64encode(result.getvalue()).decode('ascii'))

result, count = re.subn(face_pattern, subset_face, original)
if not count or re.sub(face_pattern, '', result) != re.sub(face_pattern, '', original):
    raise ValueError('No embedded font or non-font SVG content changed')
payload = result.encode('utf8')
args.output.write_bytes(payload)
print({'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
       'fontFaces': count, 'uniqueCharacters': len(set(glyphs))})
