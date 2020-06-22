import { StartDevServerResult, BuildOptions} from '@vercel/build-utils';
import { join } from 'path';
import { spawn } from 'child_process';
import execa from 'execa';
import internal from 'stream';

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
	const env: typeof process.env = {
		...process.env,
		...meta.env,
		DEV_ENTRYPOINT: join(workPath, entrypoint),
	};

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

	const tsconfig = process.env.DENO_CONFIG ? ['--config',join(workPath,process.env.DENO_CONFIG)] : [];
	const args: string[] = [
		'run',
		'--allow-env',
		'--allow-net',
		'--allow-read',
		'--allow-write',
		...tsconfig,
		join(__dirname, 'runtime.ts'),
	];

	const child = spawn('deno', args, {
		cwd: workPath,
		env,
		stdio: ['ignore', 'ignore', 'ignore', 'pipe'], /// stdin, stdout, stderr, /dev/fd/3
	});

	/// we listen any response from /dev/fd/3 and close it.
	const portPipe = child.stdio[3] as internal.Readable; 
	const onPort = new Promise<DevPort>((resolve) => { 
		portPipe.setEncoding('utf8');
		portPipe.once('data', (d) => resolve({ port: Number(d) }) );
	});
	const onExit = new Promise<[number, string | null]>( (res) => child.on('exit',res));
	
	const result = await Promise.race([onPort,onExit]);

	if(isDevPort(result)) return { port: result.port, pid:child.pid }
	else throw new Error(`Failed to start dev server for ${entrypoint} (code:${result[0]}, signal:${result[1]})`)
}