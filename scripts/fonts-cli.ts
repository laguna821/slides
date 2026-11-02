import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readFontRegistry, prepareFontBundle, verifyPublicFonts, validateFontArchives, validateFontManifest, checkFontReceipt, connectFonts, receiptPath, preservePublishedFonts } from './font-cdn';
import { readManifest, manifestPath } from './web-assets';
import {readCollection} from './pele-collection';
const mode=process.argv[2];
const registry=await readFontRegistry();
if(mode==='prepare') {
  await prepareFontBundle(registry);
  console.log('Prepared append-only font inventory: '+Object.keys(registry.fonts).length+' fonts');
} else if(mode==='publish' || mode==='verify') {
  if(mode==='publish' && (process.env.CI || process.env.VERCEL))throw Error('Font publication is a local upload-preparation operation, never CI/Vercel');
  await validateFontArchives(registry);await preservePublishedFonts(registry);
  let result=await verifyPublicFonts(registry,mode==='publish');
  if(result.missing.length) {
    await prepareFontBundle(registry);
    // Wrangler uploads only missing content; the full inventory preserves all old URLs.
    const deploy=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','.local/font-cdn/wrangler.json'],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
    if(deploy.status!==0)throw Error('Cloudflare publication outcome needs observation; verify the service before retrying');
    result=await verifyPublicFonts(registry);
  }
  const manifest=await readManifest();connectFonts(manifest,registry);
  for(const file of (await readCollection()).files.filter(f=>f.mime.startsWith('font/'))) {
    const font=registry.fonts[file.sha256];
    if(!font || font.bytes!==file.bytes)throw Error('Unregistered collection font: '+file.path);
    manifest.paths[file.path]=registry.origin+font.path;
  }
  await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(receiptPath,JSON.stringify(result,null,2)+'\n');
  console.log('Verified public font service: '+result.responses.length+' immutable files');
} else if(mode==='check') {
  await validateFontArchives(registry);validateFontManifest(await readManifest(),registry);await checkFontReceipt(registry);
  console.log('Font sources, registrations and public verification receipt match');
} else throw Error('Expected prepare, publish, verify, or check');
