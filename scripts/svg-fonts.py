"""Decode exact embedded fonts and instantiate requested SVG font weights."""
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source, prefix, weights_json = sys.argv[1:]
font = TTFont(source)
family = font['name'].getDebugName(16) or font['name'].getDebugName(1)
if not family:
    raise ValueError('Embedded font has no family name')
weights = sorted(set(json.loads(weights_json)))
paths = []
aliases = {}
for weight in weights:
    output = Path(prefix + '-' + str(weight) + '-v3.ttf')
    exact_family = family + 'Exact' + str(weight) if weight % 100 else family
    if weight % 100:
        aliases[str(weight)] = exact_family
    if not output.exists():
        instance = TTFont(source)
        if 'fvar' in instance:
            axes = {axis.axisTag: (weight if axis.axisTag == 'wght' else axis.defaultValue)
                    for axis in instance['fvar'].axes}
            instance = instantiateVariableFont(instance, axes, inplace=True)
        instance.flavor = None
        instance['OS/2'].usWeightClass = weight
        if weight % 100:
            # SVG parsers may accept only 100-step weights. Preserve the exact
            # outlines using a unique normal-weight family instead of rounding.
            instance['OS/2'].usWeightClass = 400
            for name in instance['name'].names:
                if name.nameID in (1, 16):
                    name.string = exact_family.encode(name.getEncoding())
                elif name.nameID in (2, 17):
                    name.string = 'Regular'.encode(name.getEncoding())
                elif name.nameID == 6:
                    name.string = exact_family.replace(' ', '').encode(name.getEncoding())
        instance.save(output)
    paths.append(str(output.resolve()))
print(json.dumps({'family': family, 'files': paths, 'weightAliases': aliases}))
