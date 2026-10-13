import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHtml} from '../scripts/localization';
test('localization preserves markup, links and anchors and separates translated inline words',()=>{
 const s=translateHtml('<h2 id="stable">원문</h2><p><b>판단</b>입니다.</p><a href="/source/">원문</a>',{'원문':'Source','판단':'Judgment','입니다.':'matters.'},true);
 assert.match(s,/id="stable"/);assert.match(s,/href="\/source\/"/);assert.match(s,/<b> Judgment <\/b> matters\./);
});
test('untranslated content fails closed while code is preserved verbatim',()=>{
 assert.throws(()=>translateHtml('<p>누락된 번역</p>',{},true),/Missing English translation/);
 assert.match(translateHtml('<code>한글 예제</code>',{},true),/한글 예제/);
});
