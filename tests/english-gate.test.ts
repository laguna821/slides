import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReview} from '../scripts/release-gate';
import {policy} from '../src/lib/policy';
test('English web publication no longer requires archived PDF review',()=>{
 const r=JSON.parse(fs.readFileSync('validation/release-review.json','utf8'));
 r.policyVersion=policy.version;r.digest='fixture';r.status='passed';
 const routes=r.readers.filter((x:any)=>x.route.startsWith('/en/')).map((x:any)=>x.route);
 const works=JSON.parse(fs.readFileSync('content/works.json','utf8'));
 assert.equal(routes.length,works.filter((w:any)=>w.reader&&w.visibility!=='draft').length);
 validateReview(r,'fixture',routes);
 validateReview({...r,prints:[],englishPrints:[]},'fixture',routes);
});
