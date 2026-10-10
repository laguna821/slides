import policy from '../../content/site-policy.json';
import type { Work, Media, Resource } from './schema';
export { policy };
export function validatePolicy(works: Work[], media: Media[], resources: Resource[]) {
  for(const w of works.filter(w=>w.visibility!=='draft')) {
    for(const [key,value] of Object.entries({title:w.title,summary:w.summary,posterAlt:w.posterAlt,registeredAt:w.registeredAt}))
      if(!value?.trim()) throw Error(`${w.id}: required ${key}`);
    if(['talk','lecture'].includes(w.kind) && (!w.audience?.trim() || !w.takeaways.length)) throw Error(w.id+': audience and takeaways required');
    if(['talk','lecture','note'].includes(w.kind)&&!w.reader)throw Error(w.id+': full reader contract required');
    if(w.kind==='motion' && (!w.productionNote?.trim() || !media.some(m=>m.workId===w.id))) throw Error(w.id+': motion description/media required');
    if(w.kind!=='motion' && !w.artifacts.length && !resources.some(r=>r.workId===w.id) && !w.resourceIds.length && !w.markdownSource) throw Error(w.id+': no usable output');
    if(w.featuredOrder && !w.featuredReason?.trim()) throw Error(w.id+': featured reason required');
    if(w.visibility==='unlisted' && w.seo!=='noindex') throw Error(w.id+': unlisted must be noindex');
    const artifactIds=w.artifacts.map(a=>a.id);
    if(artifactIds.some(id=>!id) || new Set(artifactIds).size!==artifactIds.length || w.artifacts.some(a=>!a.role)) throw Error(w.id+': artifact id/role required');
  }
  for(const r of resources){
    const owner=works.find(w=>w.id===r.workId)!; if(owner.visibility==='draft') continue;
    for(const v of r.versions){
      if(v.id===r.currentVersion && !policy.acceptedPosterViewers.includes(v.viewerVersion)) throw Error(r.id+': poster viewer migration required');
      for(const url of [v.html,v.pdf,v.image].filter(Boolean) as string[]) if(!v.files[url]) throw Error(r.id+': missing output hash');
    }
  }
}
