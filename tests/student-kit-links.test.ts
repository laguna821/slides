import test from 'node:test';
import assert from 'node:assert/strict';
import {isRemoved,externalStudentKits} from '../scripts/web-assets';
test('the two versioned student kits survive web projection',()=>{
  for(const url of externalStudentKits)assert.equal(isRemoved(url),false);
});
test('local archives and arbitrary remote archives remain excluded',()=>{
  for(const url of ['/kits/kit.zip','kit.pdf','https://example.com/kit.zip','https://github.com/laguna821/slides/releases/download/other/kit.zip'])assert.equal(isRemoved(url),true);
});
