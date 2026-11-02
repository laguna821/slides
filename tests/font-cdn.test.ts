import test from 'node:test';
import assert from 'node:assert/strict';
import {fontPath,fontMime,fontSourcePath,connectFonts,validateFontManifest,validateRegistry,type FontRegistry} from '../scripts/font-cdn';
import {sha,assetKey,transformText,type Manifest} from '../scripts/web-assets';
const bytes=Buffer.from('wOF2fixture');const digest=sha(bytes);
const css="@font-face{font-family:SameTone; font-weight:100 900}";
const license='Fixture license';
const cssPath='/css/sametone/1.000/'+sha(css)+'.css';
const licensePath='/licenses/'+sha(license)+'.txt';
const registry:FontRegistry={version:1,service:'achmage-fonts',origin:'https://achmage-fonts.test.workers.dev',sameToneCss:cssPath,fonts:{[digest]:{sha256:digest,bytes:bytes.length,mime:'font/woff2',sourcePath:'public/fonts/shared/'+digest+'.woff2',path:fontPath(digest,'font/woff2'),licenses:[licensePath]}},texts:[{path:cssPath,content:css,mime:'text/css'},{path:licensePath,content:license,mime:'text/plain'}]};
function fixture():Manifest{return {version:1,assets:{[assetKey('font/woff2',bytes)]:{sourceHash:digest,sha256:digest,bytes:bytes.length,mime:'font/woff2',kind:'font',url:'/fonts/shared/'+digest+'.woff2',verifiedAt:'fixture'}},paths:{'/old/font.woff2':'/fonts/shared/'+digest+'.woff2'}};}
test('migration flattens historical aliases and preserves archive paths without modifying bytes',()=>{
  const m=fixture();connectFonts(m,registry);validateFontManifest(m,registry);
  const url=registry.origin+fontPath(digest,'font/woff2');
  assert.equal(m.paths['/old/font.woff2'],url);
  assert.equal(Object.values(m.assets)[0].sourcePath,registry.fonts[digest].sourcePath);
  const first=JSON.stringify(m);connectFonts(m,registry);assert.equal(JSON.stringify(m),first);
  const text=transformText('<link rel="preload" as="font" href="../old/font.woff2" crossorigin><style>@font-face{font-weight:100 900;src:url(data:font/woff2;base64,'+bytes.toString('base64')+")} .x{src:url('../old/font.woff2?v=1#face')}</style>",'decks/index.html',m);
  assert(!text.includes('data:font'));assert(text.includes(url+'?v=1#face'));assert(text.includes('100 900'));
});
test('unknown hashes and local URLs block ordinary publication',()=>{
  assert.throws(()=>validateFontManifest(fixture(),registry),/Unregistered/);
  const m=fixture();m.assets[Object.keys(m.assets)[0]].sha256='a'.repeat(64);
  assert.throws(()=>connectFonts(m,registry),/Register font license/);
});
test('archive paths and public file addresses cannot escape or change content',()=>{
  assert.equal(fontMime(bytes),'font/woff2');assert.throws(()=>fontMime(Buffer.from('bad')));
  assert.throws(()=>fontSourcePath('public/fonts/../../.env'));
  validateRegistry(registry);
  const mutated=structuredClone(registry);mutated.texts[0].content+='changed';assert.throws(()=>validateRegistry(mutated),/immutable/);
  const noLicense=structuredClone(registry);noLicense.fonts[digest].licenses=[];assert.throws(()=>validateRegistry(noLicense),/license/);
});
