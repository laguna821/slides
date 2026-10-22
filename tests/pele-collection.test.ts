import test from 'node:test';
import assert from 'node:assert/strict';
import {readCollection,validateCollection,verifyCollectionSources,collectionRewrites} from '../scripts/pele-collection';
test('complete collection preserves 39 unique groups and 104 actual input/output cases',async()=>{await verifyCollectionSources(await readCollection());});
test('collection proxy stays in the declared namespace with public immutable assets',async()=>{const c=await readCollection();validateCollection(c);assert.equal(collectionRewrites(c).length,255);assert(c.files.some(f=>f.path==='/pele/workbench/index.html'));assert.equal(c.files.filter(f=>f.path.endsWith('.hwpx')).length,3);});
test('collection refuses traversal, duplicate entries and unverified remote payloads',async()=>{const c=await readCollection();const clone=()=>structuredClone(c);let x=clone();x.files[0].path='/pele/../secret';assert.throws(()=>validateCollection(x));x=clone();x.files.push(x.files[0]);assert.throws(()=>validateCollection(x));x=clone();delete x.files.find(f=>f.delivery==='proxy')!.verifiedAt;assert.throws(()=>validateCollection(x));});
