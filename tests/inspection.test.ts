import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {inspectionHtml} from '../src/lib/inspection';
import {extractHtml} from '../src/lib/extract';

test('binary projection preserves text, anchors, ordinary assets and structured data',()=>{
  const html='<main><section class="slide" id="finding"><h1>결과</h1><p>β = .23 [95% CI .10, .36]</p><img src="/actual.svg"><img src="data:image/png;base64,'+'A'.repeat(1024*1024)+'"><a href="/evidence/#n1">근거</a><script type="application/json">{"kept":true}</script><script type="text/plain">data:application/json;base64,eyJrZXB0Ijp0cnVlfQ==</script></section></main>';
  const projected=inspectionHtml(html),a=load(html),b=load(projected);
  assert(projected.length<1000);assert.equal(a('main').text(),b('main').text());
  assert.equal(a('a').attr('href'),b('a').attr('href'));
  assert.equal(a('section').attr('id'),b('section').attr('id'));
  assert.equal(b('img').first().attr('src'),'/actual.svg');
  assert(projected.includes('data:application/json;base64,eyJrZXB0Ijp0cnVlfQ=='));
  const before=extractHtml(html,'/deck.html'),after=extractHtml(projected,'/deck.html');
  assert.equal(before.text,after.text);assert.deepEqual(before.segments,after.segments);
});
