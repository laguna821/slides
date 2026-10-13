import {spawnSync} from 'node:child_process';
if(!process.env.npm_execpath)throw Error('Run npm run upload:prepare');
const verify=spawnSync(process.execPath,[process.env.npm_execpath,'run','release:verify'],{stdio:'inherit'});
const request=spawnSync(process.execPath,[process.env.npm_execpath,'run','upload:request'],{stdio:'inherit',env:{...process.env,UPLOAD_VALIDATION:verify.status===0?'success':'failure'}});
process.exitCode=verify.status===0&&request.status===0?0:1;
