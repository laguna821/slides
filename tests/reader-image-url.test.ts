import test from 'node:test';
import assert from 'node:assert/strict';
import {portableReaderImageUrl} from '../scripts/reader-image-url';
const url='https://assets.example.com/verified.png',assets={sample:{url,kind:'image',mime:'image/png',sha256:'a'.repeat(64),verifiedAt:'2026-10-19T00:00:00Z'}};
test('local images become absolute and registered external images remain portable',()=>{
  assert.equal(portableReaderImageUrl('/images/a.png',assets),'https://achmage-slides.vercel.app/images/a.png');
  assert.equal(portableReaderImageUrl(url,assets),url);
});
test('unregistered, protocol-relative and unverified external images are rejected',()=>{
  for(const u of ['https://other.example.com/a.png','//other.example.com/a.png','data:image/png;base64,a'])assert.throws(()=>portableReaderImageUrl(u,assets));
  assert.throws(()=>portableReaderImageUrl(url,{sample:{...assets.sample,verifiedAt:null}}));
});
