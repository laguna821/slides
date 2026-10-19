import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSourceOnly} from '../scripts/source-only';
test('an explicit registered source stays archived while public outputs cannot be excluded',()=>{
 const file='decks/new/source.html',notes={decks:[{source:'/'+file},{source:'/decks/new/index.html'}]};
 const works=[{artifacts:[{url:'/decks/new/index.html'}]}];
 assert(validateSourceOnly([file],notes,works,[]).has(file));
 assert.throws(()=>validateSourceOnly(['decks/new/index.html'],notes,works,[]));
 assert.throws(()=>validateSourceOnly(['unregistered.html'],notes,[],[]));
 assert.throws(()=>validateSourceOnly(['../outside.html'],notes,[],[]));
});
