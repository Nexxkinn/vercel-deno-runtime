import { StartDevServerResult, BuildOptions} from '@vercel/build-utils';
import fs, { readFile } from 'fs-extra';
import { join } from 'path';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import execa from 'execa';

declare type StartDevServerOptions = BuildOptions
interface DevPort {
	port: number;
}

function isDevPort(obj:any): obj is DevPort {
	return obj && typeof obj.port === 'number';
}


export default async function startDevServer(
	opts: StartDevServerOptions
): Promise<StartDevServerResult> {
	console.log('running dev server');

	const {entrypoint,workPath,meta = {}} = opts;

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
	if(!denoBinPath) throw new Error("Unable to found Deno binary file");

	const tsconfig = () => {
		const conf = process.env.DENO_CONFIG 
		? join(workPath,process.env.DENO_CONFIG)
		: opts.files['tsconfig.json'] ? opts.files['tsconfig.json'].fsPath : "";

		return conf ? ['--config',conf] : [];
	} 
	const args: string[] = [
		'run',
		'--allow-env',
		'--allow-net',
		'--allow-read',
		'--allow-write',
		...tsconfig(),
		join(__dirname, '../boot/dev.runtime.ts'),
	];
	
	const portFile = join( tmpdir(), `deno-port-${Math.random().toString(32).substring(2)}` );

	const env: typeof process.env = {
		...process.env,
		...meta.env,
		DEV_ENTRYPOINT: join(workPath, entrypoint),
		DEV_PORT:portFile
	};

	await fs.createFile(portFile);
	/// listen any response from tmp/deno-port-RAND
	const getPort:Promise<DevPort> = new Promise((res) => {
		const me = fs.watch(portFile,"utf-8",async () => {
			const file = await readFile(portFile,{encoding:'utf8'})
			if(file.length > 0) {
				console.log('Dev port received.');
				me.close();
				await fs.remove(portFile);
				res({ port: Number(file) })
			}
		})
	})

	const child = spawn(denoBinPath, args, {
		cwd: workPath,
		env,
		stdio: ['ignore','inherit', 'inherit'], /// stdin, stdout, stderr
	});
	console.log('waiting for dev port...');

	const result = await getPort;

	if(isDevPort(result)) return { port: result.port, pid:child.pid }
	else throw new Error(`Failed to start dev server for ${entrypoint} (code:${result[0]}, signal:${result[1]})`)
}