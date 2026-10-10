"""Verify actual PDF text/font/page geometry. Render every page for review."""
import sys,json,re,unicodedata
from pathlib import Path
import fitz
pdf=fitz.open(sys.argv[1]); source=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
def key(s):return re.sub(r'\s','',unicodedata.normalize('NFC',s))
text=key(''.join(p.get_text(clip=fitz.Rect(55,62.2,p.rect.width-55,p.rect.height-62.2)) for p in pdf))
missing=[]
for f in source['proof']['fragments']:
    x0,y0,x1,y1=f['box'];mm=72/25.4
    box=fitz.Rect(20*mm+x0*.75-.75,22*mm+y0*.75-.75,20*mm+x1*.75+.75,22*mm+y1*.75+.75)
    actual=key(pdf[f['page']-1].get_text(clip=box))
    if key(f['text']) not in actual: missing.append({'page':f['page'],'id':f['id'],'expected':f['text'],'actual':actual})
# Paragraphs crossing columns/pages can be interspersed by running furniture.
# Use ordered character matching, removing only known running metadata later.
fonts={f[0]:f for p in pdf for f in p.get_fonts(full=True)}
embedded=all(bool(pdf.extract_font(x)[3]) for x,f in fonts.items() if f[2]!='Type3')
a4=all(abs(p.rect.width-595.276)<.5 and abs(p.rect.height-841.89)<.5 for p in pdf)
if len(pdf)!=source['proof']['pages']:raise RuntimeError('DOM/PDF page count mismatch')
if not source['proof']['sourceOrder']:raise RuntimeError('Source order/coverage differs after layout')
if missing:print(json.dumps({'missing':missing[:12]},ensure_ascii=False));sys.exit(1)
if not embedded or not a4:raise RuntimeError('PDF fonts or A4 size invalid')
for f in source['proof']['imageBoxes']:
    x0,y0,x1,y1=f['box'];mm=72/25.4
    box=fitz.Rect(20*mm+x0*.75,22*mm+y0*.75,20*mm+x1*.75,22*mm+y1*.75)
    pix=pdf[f['page']-1].get_pixmap(clip=box,colorspace=fitz.csGRAY,alpha=False)
    ink=sum(v<235 for v in pix.samples)
    if ink<max(10,len(pix.samples)*.001):raise RuntimeError('Blank image area in actual PDF')
for i,p in enumerate(pdf):
    p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False).save(Path(sys.argv[1]).parent/f'page-{i+1:03}.png')
print(json.dumps({'pages':len(pdf),'textMissing':0,'fontsEmbedded':embedded,'a4':a4,'pdfLinks':sum(len(p.get_links()) for p in pdf),'pdfVerifier':'PyMuPDF '+fitz.VersionBind}))
