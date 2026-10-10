import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEditorialLinks,sourceUnits} from '../scripts/editorial';
import {renderReader} from '../src/lib/reader';
test('editorial publication blocks unresolved links while preserving code examples',()=>{
 for(const s of ['[대상](https://example.com','[[볼트 노트]]','file:///C:/private.md','C:\\Users\\author\\note.md']){
  assert.throws(()=>validateEditorialLinks('<p>'+s+'</p>'));
  assert.doesNotThrow(()=>validateEditorialLinks('<pre><code>'+s+'</code></pre>'));
 }
 assert.doesNotThrow(()=>validateEditorialLinks(renderReader('[공식 설명](https://example.com)').html));
 assert.throws(()=>validateEditorialLinks('<a href="relative.md">노트</a>'));
 assert.throws(()=>validateEditorialLinks('<a href="">빈 링크</a>'));
});
test('archival units and prior anchors survive editorial structure changes',()=>{
 assert.equal(sourceUnits('## 첫 장\n\n본문\n\n## 다음 장\n\n끝').length,2);
 const r=renderReader('<span class="reader-anchor" id="old-title"></span>\n\n## 새 제목\n\n[이전 위치](#old-title)');
 assert(r.html.includes('id="old-title"'));
 assert.equal(r.headings.length,1);
});
