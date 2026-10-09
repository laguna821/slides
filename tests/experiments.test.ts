import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {verifyExperiments} from '../scripts/experiments';
const original=JSON.parse(await fs.readFile('content/experiments.json','utf8'));
test('registered series assets, provenance, paper and PDF link are valid',async()=>assert.equal(await verifyExperiments(),original.items.length));
test('public experiment cannot silently enter listings',async()=>{const m=structuredClone(original);m.items[0].visibility='listed';await assert.rejects(verifyExperiments(process.cwd(),'public',m),/exposure/);});
test('experiment output changes invalidate the asset pin',async()=>{const m=structuredClone(original);m.items[0].files['poster.pdf']='0'.repeat(64);await assert.rejects(verifyExperiments(process.cwd(),'public',m),/changed/);});
test('unapproved renderer cannot ship as an experiment',async()=>{const m=structuredClone(original);m.items[0].viewerVersion='unknown';await assert.rejects(verifyExperiments(process.cwd(),'public',m),/renderer/);});
