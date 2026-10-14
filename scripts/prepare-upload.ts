import {spawnSync} from 'node:child_process';
if(!process.env.npm_execpath)throw Error('Run npm run upload:prepare');
for(const script of ['build:source','assets:sync','web:prepare']){
 const prepared=spawnSync(process.execPath,[process.env.npm_execpath,'run',script],{stdio:'inherit'});
 if(prepared.status!==0)throw Error('Upload preparation stopped at '+script+'; no deployment attempted');
}
const verify=spawnSync(process.execPath,[process.env.npm_execpath,'run','release:verify'],{stdio:'inherit'});
const request=spawnSync(process.execPath,[process.env.npm_execpath,'run','upload:request'],{stdio:'inherit',env:{...process.env,UPLOAD_VALIDATION:verify.status===0?'success':'failure'}});
process.exitCode=verify.status===0&&request.status===0?0:1;
