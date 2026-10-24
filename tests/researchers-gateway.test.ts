import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import gallery from '../content/pele-researchers.json';
import works from '../content/works.json';
test('research gateway links to 14 distinct examples and all 15 categories',()=>{
 assert.equal(gallery.cards.length,14);
 assert.equal(new Set(gallery.cards.map(c=>c.id)).size,14);
 assert.equal(new Set(gallery.cards.map(c=>c.type)).size,14);
 assert.equal(new Set(gallery.categories.map(c=>c.id)).size,15);
 for(const c of gallery.cards){const u=new URL(c.url);assert.equal(u.origin,new URL(gallery.galleryUrl).origin);assert.equal(u.searchParams.get('case'),c.id);assert(c.tags.length>=2&&c.tags.length<=3);}
 for(const c of gallery.categories)assert.equal(new URL(c.url).searchParams.get('type'),c.id);
 assert.equal(works.find(w=>w.id==='pele-atlas')!.slug,'pele-atlas');
});
test('gateway is a static link surface without an embedded gallery runtime',async()=>{
 const source=await fs.readFile('src/components/PeleResearchers.astro','utf8');
 assert(!/<(?:iframe|script)\b/.test(source));
 assert(!source.includes('mermaid-gallery/index.json'));
 for(const href of ['/pele/','/talks/pele-atlas/explore/','/talks/pele-social-science/code/'])assert(source.includes(href));
});
