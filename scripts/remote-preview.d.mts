export interface PreviewCheck {name:string;script?:string;file?:string;args?:string[];diagnostic?:boolean;requires?:string}
export interface PreviewResult {name:string;passed:boolean;status:string;reason?:string;exitCode?:number;diagnostic?:boolean}
export interface PreviewReport {version:number;purpose:string;productionApproval:boolean;passed:boolean;checks:PreviewResult[]}
export const checks:PreviewCheck[];
export function collect(run:(check:PreviewCheck)=>Promise<{exitCode:number;output:string}>,write:(name:string,value:string)=>Promise<unknown>):Promise<PreviewReport>;
export function main():Promise<void>;
