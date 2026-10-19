import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {load} from 'cheerio';
import {shareCodeTokens} from '../scripts/share-code-tokens';

test('source-token sharing preserves code, both themes and unrelated inline styles',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pele-code-'));
 try{
  const token='<span style="color:#D73A49;--shiki-dark:#F97583">if &lt; 2 &amp;&amp; 한글</span>';
  const html='<html><head></head><body><div data-source-code class="source-code"><pre class="astro-code"><code>'+token.repeat(20)+'</code></pre><span style="width:50px">keep</span></div><p style="color:#D73A49;--shiki-dark:#F97583">outside</p></body></html>';
  await fs.writeFile(path.join(root,'one.html'),html);await fs.writeFile(path.join(root,'two.html'),html);
  const result=await shareCodeTokens(root);assert.equal(result.styles,1);assert.equal(result.tokens,40);assert(result.savedBytes>0);
  const before=load(html),after=load(await fs.readFile(path.join(root,'one.html'),'utf8'));
  assert.equal(before('code').text(),after('code').text());assert.equal(after('p').attr('style'),before('p').attr('style'));
  assert.equal(after('span[style="width:50px"]').length,1);
  const url=after('link').attr('href')!;const css=await fs.readFile(path.join(root,url),'utf8');
  assert(css.includes('color:#D73A49;--shiki-dark:#F97583'));assert.equal(after('code span[style]').length,0);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
