import {StartDevServerResult, BuildOptions} from '@vercel/build-utils';
import { getdenoFiles } from '../build/util';
import execa from 'execa';
declare type StartDevServerOptions = BuildOptions
export async function startDevServer(
	opts: StartDevServerOptions
): Promise<StartDevServerResult> {

	const {entrypoint,workPath,config,meta = {}} = opts;
	const tsconfig = process.env.DENO_CONFIG || '';
	let denoBinPath:string = '';

	switch(process.platform) {
		case 'win32':
			const wincheck = await execa('powershell',['-command','(Get-Command deno).Source']);
			denoBinPath = wincheck.stdout;
			break;
		case 'linux':
		default:
			const lincheck  = await execa('which',['deno'],{stderr:'ignore'});
			denoBinPath = lincheck.stdout;
			break;
	}
	if(!denoBinPath) throw new Error("Deno binary file not found");

	return {port:0,pid:0}
	
}