import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Collect independent failures in one execution; a failed build cannot produce
// a passing web artifact from old output. These checks never approve production.
export const checks = [
  {name:'source',script:'build:source'},
  {name:'types',script:'check'},
  {name:'tests',script:'test'},
  {name:'translations',file:'scripts/report-missing-translations.ts',diagnostic:true},
  {name:'web',file:'scripts/build-web.ts',args:['--write-redirects'],requires:'source'},
];

export async function collect(run, write) {
  const results=[];
  for (const check of checks) {
    if(check.requires && !results.find(r=>r.name===check.requires)?.passed){
      results.push({name:check.name,passed:false,status:'blocked',reason:'Source build did not pass'});
      continue;
    }
    const result=await run(check);
    await write(check.name+'.log',result.output);
    results.push({name:check.name,passed:result.exitCode===0,status:result.exitCode===0?'passed':'failed',
      exitCode:result.exitCode,diagnostic:!!check.diagnostic});
  }
  const report={version:1,purpose:'technical-preview',productionApproval:false,
    passed:results.every(r=>r.passed),checks:results};
  await write('report.json',JSON.stringify(report,null,2));
  return report;
}

export async function main(){
  const folder='validation/remote-preview';await fs.mkdir(folder,{recursive:true});
  const run=async check=>{
    const npm=process.env.npm_execpath || (process.platform==='win32'
      ? path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js') : null);
    const argv=check.script
      ? (npm?[npm,'run',check.script]:null)
      : [path.resolve('node_modules/tsx/dist/cli.mjs'),check.file,...(check.args||[])];
    const command=argv?process.execPath:(process.platform==='win32'?'npm.cmd':'npm');
    const args=argv||['run',check.script];
    const p=spawnSync(command,args,{encoding:'utf8',maxBuffer:16*1024*1024});
    const output=(p.stdout||'')+(p.stderr||'')+(p.error?'\n'+p.error.message:'');
    console.log(check.name+': '+(p.status===0?'passed':'failed')+' (full log saved)');
    return {exitCode:p.status??1,output};
  };
  const report=await collect(run,(name,value)=>fs.writeFile(path.join(folder,name),value));
  if(process.env.GITHUB_STEP_SUMMARY){
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'## Technical preview\n\n'+
      report.checks.map(r=>`- ${r.name}: ${r.status}`).join('\n')+
      '\n\nProduction review and user approval remain separate. Full logs: remote-preview artifact.\n');
  }
  process.exitCode=report.passed?0:1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await main();
