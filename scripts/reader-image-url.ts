/** Portable reader exports use site-local URLs or a registered, hash-verified R2 image. */
export function portableReaderImageUrl(url:string,assets:Record<string,any>):string {
  if(url.startsWith('/')&&!url.startsWith('//'))return 'https://achmage-slides.vercel.app'+url;
  const asset=Object.values(assets).find(a=>a.url===url&&a.kind==='image'&&/^image\//.test(a.mime)&&/^[a-f0-9]{64}$/.test(a.sha256)&&a.verifiedAt);
  if(!asset||!/^https:\/\//.test(url))throw Error('Unregistered reader image: '+url);
  return url;
}
