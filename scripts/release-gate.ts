import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { policy } from '../src/lib/policy';
import works from '../content/works.json';
import { workHref } from '../src/lib/schema';
export const reviewRoutes=[...new Set(['/', '/archive/', '/posters/', ...works.filter(w=>w.visibility!=='draft').map(w=>workHref(w as any))])];
export async function releaseManifest(root=process.cwd()) {
  const files=['package.json','package-lock.json','astro.config.mjs','tsconfig.json','vercel.json','AGENTS.md'];
  const works=JSON.parse(await fs.readFile(path.join(root,'content/works.json'),'utf8'));
  for(const work of works)for(const source of [work.htmlSource,work.markdownSource].filter(Boolean)){
    const absolute=path.resolve(root,source);
    if(!absolute.startsWith(path.resolve(root)+path.sep))throw Error('Source outside repository');
    files.push(path.relative(root,absolute).replaceAll('\\','/'));
  }
  for(const dir of ['src','content','public','scripts','tests','docs','.github']) for(const file of await fs.readdir(path.join(root,dir),{recursive:true})) {
    const rel=dir+'/'+file.replaceAll('\\','/');
    if(rel.startsWith('src/generated/') || ['public/search-index.json','public/catalogue.json','public/AI_reading_3week_pilot_20261008.html'].includes(rel))continue;
    if((await fs.stat(path.join(root,rel))).isFile())files.push(rel);
  }
  const result:Record<string,string>={};
  for(const file of [...new Set(files)].sort()){const bytes=await fs.readFile(path.join(root,file));result[file]=createHash('sha256').update(/\.(?:ts|js|mjs|astro|css|json|md|html|svg|vtt|txt|yaml|yml)$/.test(file)?bytes.toString('utf8').replaceAll('\r\n','\n'):bytes).digest('hex');}
  return result;
}
export async function releaseDigest(root=process.cwd()){return createHash('sha256').update(JSON.stringify(await releaseManifest(root))).digest('hex');}
export function validateReview(review:any,digest:string){
  if(review.policyVersion!==policy.version || review.digest!==digest || review.status!=='passed')throw Error('미리보기 검토가 없거나 변경 후 오래되었습니다. 같은 파일 해시의 검토를 갱신하세요.');
  for(const route of reviewRoutes)
    for(const width of [375,768,1440])for(const theme of ['light','dark'])
      if(!review.views?.some((v:any)=>v.route===route && v.width===width && Math.abs(v.actualWidth-width)<=1 && v.theme===theme && v.overflow===false && v.brokenImages?.length===0))throw Error('화면 검토 누락: '+route+'/'+width+'/'+theme);
  if(!review.functional?.search || !review.functional?.posterFixture || !review.functional?.keyboard)throw Error('기능 검토 누락');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/release-gate.ts')){
  const digest=await releaseDigest();
  if(process.argv.includes('--digest'))console.log(digest);
  else {const review=JSON.parse(await fs.readFile('validation/release-review.json','utf8'));
    if(review.digest!==digest){const actual=await releaseManifest();const expected=review.sourceFiles||{};console.error('Review file differences', [...new Set([...Object.keys(actual),...Object.keys(expected)])].filter(file=>actual[file]!==expected[file]));}
    validateReview(review,digest);console.log('Release review matches policy and content digest');}
}
