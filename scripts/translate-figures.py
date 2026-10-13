"""Create English derivatives of editable diagrams; preserve Korean originals."""
import json,re,base64,io,hashlib
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from lxml import etree
root=Path.cwd()
strings=json.loads((root/'content/i18n/figure-strings.json').read_text(encoding='utf-8'))
font=TTFont(root/'public/fonts/AchmageSameTone-1.000.woff2')
opts=subset.Options();opts.flavor='woff2'
sub=subset.Subsetter(options=opts);sub.populate(text=''.join(strings.values())+'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?()/-→↔')
sub.subset(font);out=io.BytesIO();font.save(out);encoded=base64.b64encode(out.getvalue()).decode()
assert len(out.getvalue())<128*1024
data=json.loads((root/'src/generated/content.json').read_text(encoding='utf-8'))
mapping={};proof=[]
for work in data['works']:
 for url in work.get('reader',{}).get('images',[]):
  if not url.endswith('.svg'):continue
  original=(root/('public'+url)).read_bytes()
  tree=etree.fromstring(original)
  text_nodes=tree.xpath('//*[local-name()="text" or local-name()="tspan"]')
  count=0
  for node in text_nodes:
   if node.text and re.search('[가-힣]',node.text):
    ko=node.text.strip();en=strings[ko];node.text=en;count+=1
    # Retain authored line breaks; cap the translated line to its original text slot.
    if not node.get('textLength'):
     size=float(re.search(r'[\d.]+',node.get('font-size','24')).group())
     width=sum(size*(1 if '\uac00'<=c<='\ud7a3' else .55) for c in ko)
     node.set('textLength',str(round(max(width,size*2),1)));node.set('lengthAdjust','spacingAndGlyphs')
  for style in tree.xpath('//*[local-name()="style"]'):
   style.text=re.sub(r'@font-face\s*\{[^}]*\}','',style.text or '')
  style=etree.SubElement(tree,'{http://www.w3.org/2000/svg}style')
  style.text=f"@font-face{{font-family:SameToneDiagram;src:url(data:font/woff2;base64,{encoded}) format('woff2');font-weight:100 900}}text,tspan{{font-family:SameToneDiagram,sans-serif!important}}"
  tree.set('lang','en')
  target='/reading/en/figures/'+Path(url).stem+'.svg'
  dest=root/('public'+target);dest.parent.mkdir(parents=True,exist_ok=True)
  result=etree.tostring(tree,encoding='utf-8',xml_declaration=False);dest.write_bytes(result)
  mapping[url]=target;proof.append({'source':url,'sourceHash':hashlib.sha256(original).hexdigest(),'target':target,'sha256':hashlib.sha256(result).hexdigest(),'translatedLines':count,'fontBytes':len(out.getvalue())})
(root/'content/i18n/figures.json').write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
(root/'content/i18n/figure-manifest.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
print(f'{len(mapping)} English SVG derivatives; embedded font {len(out.getvalue())} bytes')
