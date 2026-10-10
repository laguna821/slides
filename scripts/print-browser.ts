import { layoutEditorialPdf } from './hanmark/io/editorialPdfFlow';
import { pdfTableCellOverflows } from './hanmark/io/editorialPdfTables';

declare global { interface Window { printReady: Promise<unknown> } }
window.printReady = (async () => {
  const root = document.querySelector<HTMLElement>('.hanmark-editorial-pdf-root')!;
  const body = root.querySelector<HTMLElement>('.hanmark-editorial-pdf-body')!;
  const title = document.querySelector<HTMLElement>('.print-title')!;
  const key = (s:string) => s.normalize('NFC').replace(/\s/g,'');
  const expected = key(body.textContent || '');
  // HanMark's block model wraps inline list contents in paragraphs. Adapt the
  // shared reader DOM to that model without reparsing or rewriting its text.
  for (const li of Array.from(body.querySelectorAll('li'))) {
    let p: HTMLParagraphElement | undefined;
    for (const child of Array.from(li.childNodes)) {
      const block = child instanceof HTMLElement && /^(P|UL|OL|TABLE|PRE|BLOCKQUOTE|FIGURE|DIV|H[1-6])$/.test(child.tagName);
      if(block) { p=undefined; continue; }
      if(!p) { p=document.createElement('p');li.insertBefore(p,child); }
      p.append(child);
    }
  }
  body.querySelectorAll('.reader-anchor').forEach(x=>x.remove());
  body.querySelectorAll('img').forEach(i=>{i.loading='eager';});
  await document.fonts.ready;
  await document.fonts.load('400 10pt Pretendard','한글 가나다 ABC 0123');
  await document.fonts.load('700 10pt Pretendard','한글 가나다 ABC 0123');
  await Promise.all(Array.from(body.querySelectorAll('img'),i=>i.decode()));
  const images=Array.from(body.querySelectorAll('img'),i=>i.getAttribute('src'));
  const style=document.querySelector<HTMLStyleElement>('#print-styles')!;
  const offset=title.getBoundingClientRect().height+24;
  if(offset>260) throw Error('First-page title exceeds print budget; edit title metadata');
  root.dataset.firstPageInset=String(offset);
  await layoutEditorialPdf(root,style,{mode:'two-column-b',columnGapMm:10,sectionPageBreaks:false,tableWidth:'auto'});
  const pages=Array.from(body.querySelectorAll<HTMLElement>('.hanmark-pdf-page'));
  // Reconstruct source-unit order, because floats move spatially. Repeated table
  // headers are tracked separately by HanMark's cell IDs.
  const units=new Map<number,string[]>();
  const seenHeaders=new Set<string>();
  body.querySelectorAll<HTMLElement>('[data-pdf-source-id]').forEach(n=>{
    if(n.parentElement?.closest('[data-pdf-source-id]')) return;
    const copy=n.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[data-pdf-repeated-header]').forEach(n=>n.remove());
    copy.querySelectorAll<HTMLElement>('thead [data-pdf-cell-id]').forEach(cell=>{const id=cell.dataset.pdfCellId!;if(seenHeaders.has(id))cell.remove();else seenHeaders.add(id);});
    const id=Number(n.dataset.pdfSourceId);const text=key(copy.textContent||'');
    const parts=units.get(id)||[];parts.push(text);units.set(id,parts);
  });
  const actual=key([...units].sort(([a],[b])=>a-b).flatMap(([,v])=>v).join(''));
  // Table continuation may repeat headings; coverage is independently verified
  // per original leaf and PDF text extraction by the exporter.
  const sourceOrder=actual===expected;
  const geometry: string[]=[];
  for(const page of pages){
    const rect=page.getBoundingClientRect();
    for(const el of page.querySelectorAll<HTMLElement>('.hanmark-pdf-unit,.hanmark-pdf-figure,.hanmark-pdf-wide-table')) {
      const r=el.getBoundingClientRect();
      if(r.left<rect.left-1||r.right>rect.right+1||r.top<rect.top-1||r.bottom>rect.bottom+1) geometry.push('page '+page.dataset.pdfPage+' '+el.className);
    }
  }
  const tableOverflow=pdfTableCellOverflows(body);
  const readFragments=()=>Array.from(body.querySelectorAll<HTMLElement>('[data-pdf-source-id]')).filter(n=>!n.parentElement?.closest('[data-pdf-source-id]')&&n.textContent?.trim()).map(n=>{
    const page=n.closest<HTMLElement>('.hanmark-pdf-page')!;
    const p=page.getBoundingClientRect(),r=n.getBoundingClientRect();
    return {page:Number(page.dataset.pdfPage),id:n.dataset.pdfSourceId,text:n.textContent,box:[r.left-p.left,r.top-p.top,r.right-p.left,r.bottom-p.top]};
  });
  const actualImages=Array.from(body.querySelectorAll('img'),i=>i.getAttribute('src'));
  if(JSON.stringify([...images].sort())!==JSON.stringify([...actualImages].sort()))throw Error('Print media omitted or duplicated');
  if(geometry.length||tableOverflow.length)throw Error(JSON.stringify({geometry,tableOverflow}));
  for(let index=0;index<pages.length;index++){
    const page=pages[index];
    if(!index)page.append(title);
  }
  await document.fonts.ready;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const fragments=readFragments();
  const visualTextIds: number[]=[];
  for(const page of pages){
    const blocks=Array.from(page.querySelectorAll<HTMLElement>('[data-pdf-source-id]')).filter(n=>!n.parentElement?.closest('[data-pdf-source-id]')&&!n.matches('.hanmark-pdf-figure'));
    const group=(n:HTMLElement)=>{const column=n.closest<HTMLElement>('.hanmark-pdf-column');return column?1+Number(column.dataset.pdfColumn):(n.dataset.pdfFloatEdge==='top'?0:3);};
    const band=(n:HTMLElement)=>Number(n.closest<HTMLElement>('[data-pdf-band]')?.dataset.pdfBand||0);
    blocks.sort((a,b)=>band(a)-band(b)||group(a)-group(b)||a.getBoundingClientRect().top-b.getBoundingClientRect().top);
    visualTextIds.push(...blocks.map(n=>Number(n.dataset.pdfSourceId)));
  }
  if(visualTextIds.some((id,i)=>i>0&&id<visualTextIds[i-1]))throw Error('Visual text/table order reversed: '+JSON.stringify(visualTextIds.filter((id,i)=>i>0&&id<visualTextIds[i-1]).map(id=>({id,previous:visualTextIds[visualTextIds.indexOf(id)-1],text:fragments.find(f=>Number(f.id)===id)?.text?.slice(0,150)}))));
  if(title.getBoundingClientRect().height+12>offset)throw Error('Title/body first-page collision');
  const imageBoxes=Array.from(body.querySelectorAll('img'),n=>{
    const page=n.closest<HTMLElement>('.hanmark-pdf-page')!,p=page.getBoundingClientRect(),r=n.getBoundingClientRect();
    return {page:Number(page.dataset.pdfPage),box:[r.left-p.left,r.top-p.top,r.right-p.left,r.bottom-p.top]};
  });
  for(const page of pages){
    const p=page.getBoundingClientRect();
    const blocks=Array.from(page.querySelectorAll<HTMLElement>('.hanmark-pdf-column,.hanmark-pdf-figure,.hanmark-pdf-wide-table'));
    for(const n of blocks){const r=n.getBoundingClientRect();if(r.right>p.right+1||r.bottom>p.bottom+1||r.left<p.left-1||r.top<p.top-1)geometry.push('Final paint overflow '+page.dataset.pdfPage);}
    for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
      const a=blocks[i].getBoundingClientRect(),b=blocks[j].getBoundingClientRect();
      if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)geometry.push('Final paint overlap '+page.dataset.pdfPage);
    }
  }
  if(geometry.length)throw Error(JSON.stringify(geometry));
  return {pages:pages.length,images:images.length,sourceOrder,geometry,tableOverflow,fragments,imageBoxes,firstPageInsetPx:offset,sourceText:expected,layoutText:actual};
})();
