import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {load} from 'cheerio';
import {renderReader} from '../src/lib/reader';

test('topic lecture retains every table cell in a complete reader table',()=>{
 const source=load(fs.readFileSync('public/decks/still-working-on-my-topic-2026-10-20/v1.0.0/source-web.html','utf8'));
 const reader=load(renderReader(fs.readFileSync('content/editorial/still-working-on-my-topic-2026-10-20.md','utf8')).html);
 const cells=($:ReturnType<typeof load>)=>$('table').toArray().map(table=>$(table).find('tr').toArray().map(row=>$(row).find('th,td').toArray().map(cell=>$(cell).text().replace(/\s+/g,' ').trim())));
 assert.equal(source('.slide').length,62);
 assert.equal(reader('table').length,15);
 assert.deepEqual(cells(reader),cells(source));
 assert.equal(reader('p').toArray().filter(p=>/^\|[\s|]*$/.test(reader(p).text())).length,0);
});
