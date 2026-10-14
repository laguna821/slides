"""Block a raster export when any visible SVG character has no loaded glyph."""
import json
import sys
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont

svg_path, font_paths = sys.argv[1:]
root = ET.parse(svg_path).getroot()
characters = set(''.join(''.join(node.itertext()) for node in root.iter()
                         if node.tag.split('}')[-1] == 'text'))
coverage = set()
for font_path in json.loads(font_paths):
    font = TTFont(font_path)
    coverage.update(font.getBestCmap())
missing = sorted(c for c in characters if not c.isspace() and ord(c) not in coverage)
if missing:
    raise ValueError('SVG glyphs missing: ' + repr(missing))
print(json.dumps({'characters': len(characters), 'missing': []}))
