import { BuildOptions, DownloadedFiles, Files, glob, FileFsRef, download } from "@vercel/build-utils/dist";
import { stat, readdir, readFile, writeFile, move } from "fs-extra";
import { join } from 'path';
import execa from "execa";
import { DenoVersion } from "../types";

interface Graph {
	deps: string[];
	version_hash: string;
}

export function parseDenoVersion(version: string): DenoVersion {
  if (version === "latest") return { major: 999, minor: 999, build: 999 };

  const pattern = new RegExp(/^([0-9]+)\.([0-9]+)\.([0-9]+)/m);
  const parse = pattern.exec(version) || [];
  return {
    major: Number(parse[1]),
    minor: Number(parse[2]),
    build: Number(parse[3]),
  };
}

export async function getdenoFiles(workPath:string,isDev:Boolean): Promise<Files> {
  console.log("get deno binary files")

  const DENO_LATEST = "latest";
  const DENO_VERSION = process.env.DENO_VERSION || DENO_LATEST;
  const DOWNLOAD_URL = DENO_VERSION === DENO_LATEST
      ? `https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip`
      : `https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip`;

  const denobinDir   = join(workPath,'.deno/bin/');
  const denozipPath  = join(denobinDir,'deno.zip');
  let   denoPath     = '';
  // check if local deno binary exists
  if(isDev) {
    try {
      const checklocalDeno = await execa('which',['deno'],{stderr:'ignore'});
      denoPath = checklocalDeno.stdout;
    }
    catch(e) {};
  }

  if (!denoPath) {
    try {
      console.log(`downloading deno ${DENO_VERSION}`)
      await execa("curl", ['--location','--create-dirs','--output', denozipPath, DOWNLOAD_URL],{ stdio: 'pipe' });
      
      console.log(`Extract deno.zip`);
      await execa("unzip", [denozipPath,'-d',denobinDir],{ stdio: 'pipe' });

      // const {stdout} = await execa(`ls`,[ join(workPath,'.deno/bin/')],{ stdio: 'pipe' });
      // console.log(stdout);
      // await execa('chmod',['+x',denoPath]);

      console.log(`remove deno.zip`);
      await execa("rm",[denozipPath],{ stdio: 'pipe' });
      denoPath = join(denobinDir,'deno');
    } catch (err) {
      console.log(err);
      throw new Error(err);
    }
  } 
  else console.log('using local deno binary')

  return {
    ".deno/bin/deno": new FileFsRef({
      mode: 0o755,
      fsPath: denoPath,
    })
  };
}


export async function getbootFiles(workPath:string):Promise<Files>{
  console.log('get bootstrap')
  const bootstrapPath = join(__dirname, "../boot/bootstrap");
  const runtimeGlobs   = await glob("boot/*.ts",{cwd:join(__dirname,"../")});
  const runtimeFiles   = await download(runtimeGlobs,workPath);
  return {
    ...runtimeFiles,
    bootstrap: new FileFsRef({
      mode: 0o755,
      fsPath: bootstrapPath,
    })
  }
}

/**
 * returns .deno files 
 */
export async function CacheEntryPoint(opts:BuildOptions, downloadedFiles:DownloadedFiles, denoFiles:Files, bootFiles:Files){
  
  console.log(`Caching imports for ${opts.entrypoint}`)
  // TODO: create separate function to parse user ENV values
  const tsconfig = process.env.DENO_CONFIG ? [`-c`,`${downloadedFiles[process.env.DENO_CONFIG].fsPath}`] : [];

  const {workPath,entrypoint} = opts;
  const denobinPath = '.deno/bin/deno';
  const runtimePath = 'boot/runtime.ts';
  const denobin     = denoFiles[denobinPath].fsPath;
  const runtime     = bootFiles[runtimePath].fsPath;
  const entry       = downloadedFiles[entrypoint].fsPath;

  if(denobin && runtime) {
    await execa(denobin,['cache',...tsconfig,runtime,entry],
      {
        env: { DENO_DIR:join(workPath,'.deno/') },
        stdio: 'ignore',
      }
    )
  }

  // patch .graph files to use file paths beginning with /var/task
  // reference : https://github.com/TooTallNate/vercel-deno/blob/5a236aab30eeb4a6e68216a80f637e687bc59d2b/src/index.ts#L98-L118
  const workPathUri = `file://${workPath}`;
  for await (const file of getGraphFiles(join(workPath, '.deno/gen/file'))) {
		let needsWrite = false;
		const graph: Graph = JSON.parse(await readFile(file, 'utf8'));
		for (let i = 0; i < graph.deps.length; i++) {
			const dep = graph.deps[i];
			if (dep.startsWith(workPathUri)) {
				const updated = `file:///var/task/${dep.substring(
					workPathUri.length
				)}`;
				graph.deps[i] = updated;
				needsWrite = true;
			}
		}
		if (needsWrite) {
			console.log('Patched %j', file);
			await writeFile(file, JSON.stringify(graph));
		}
  }
  
  // move generated files to AWS path /var/task
  
  const cwd = join(workPath,'.deno','gen','file',workPath);
  const aws_task = join(workPath,'.deno','gen','file','var','task');
  await move(cwd,aws_task,{overwrite:true});
  return await glob(".deno/**",workPath);
}

async function* getGraphFiles(dir: string): AsyncIterable<string> {
	const files = await readdir(dir);
	for (const file of files) {
		const absolutePath = join(dir, file);
		if (file.endsWith('.graph')) {
			yield absolutePath;
		} else {
			const s = await stat(absolutePath);
			if (s.isDirectory()) {
				yield* getGraphFiles(absolutePath);
			}
		}
	}
}