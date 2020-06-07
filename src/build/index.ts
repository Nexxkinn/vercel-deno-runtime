import {
  download,
  BuildOptions,
  Files,
  debug,
  DownloadedFiles,
  createLambda,
  FileFsRef,
} from "@vercel/build-utils";
import fs from "fs-extra";
import path from "path";
import {
  getWorkPath,
  parseDenoVersion,
} from "./util";
import gatherExtraFiles from "./gatherExtraFiles";
import runUserScripts from "./runUserScripts";
import grabDenoDirFiles from "./grabDenoDirFiles";
import getDenoLambaLayer from "./getDenoLambdaLayer";
import {version} from '../version';
import execa from "execa";

export default async function build(opts: BuildOptions) {
  const { files, entrypoint, workPath: wp, config, meta = {} } = opts;
  const workPath = getWorkPath(wp, entrypoint);
  await fs.mkdirp(workPath);
  // if (meta.isDev) {
  //   debug('checking that deno is available');
  //   ensureDeno();
  //   debug('checking that bash is available');
  //   ensureBash();
  // }

  const lambdaFiles = await getDenoLambaLayer(workPath, meta.isDev || false);
  // if (meta.isDev) {
  //   debug('symlinking local deno to replace deno-lambda-layer bin/deno');
  //   await replaceBinDeno(workPath);
  // }

  console.log("downloading source files");
  const downloadedFiles = await download(
    files,
    path.join(workPath, "src"),
    meta,
  );

  const entryPath = downloadedFiles[entrypoint].fsPath;

  await runUserScripts(entryPath);
  const extraFiles = await gatherExtraFiles(config.includeFiles, entryPath);

  return buildDenoLambda(
    opts,
    downloadedFiles,
    extraFiles,
    lambdaFiles,
    workPath,
  );
}

async function buildDenoLambda(
  { entrypoint }: BuildOptions,
  downloadedFiles: DownloadedFiles,
  extraFiles: DownloadedFiles,
  layerFiles: Files,
  workPath: string,
) {
  // Booleans
  const unstable = !!process.env.DENO_UNSTABLE;
  let tsconfig= "";
  try {
    const CONFIG = process.env.DENO_TSCONFIG || '';
    if(CONFIG) {
      tsconfig = downloadedFiles[CONFIG].fsPath || '';
      console.log(`using custom typescript config: ${process.env.DENO_TSCONFIG}`)
    }
  }
  catch(err){
    console.log(`DENO_TSCONFIG variable was set to ${process.env.DENO_TSCONFIG}, but no such file exists. ignoring...`)
  }

  console.log("building single file");
  const entrypointPath = downloadedFiles[entrypoint].fsPath;
  const entrypointDirname = path.dirname(entrypointPath);

  const extname = path.extname(entrypointPath);
  const binName = path.basename(entrypointPath).replace(extname, "");
  const binPath = path.join(workPath, binName) + ".bundle.js";
  const denoDir = path.join(workPath, "layer", ".deno_dir");
  const denoVer = parseDenoVersion(process.env.DENO_VERSION || "latest");

  console.log("running `deno bundle`...");
  try {
    const denoBin = layerFiles["bin/deno"].fsPath as string;
    await execa(
      denoBin,
      [
        "bundle",
        entrypointPath,
        binPath,
        ...(tsconfig && (denoVer.major >= 1) ? ["-c", tsconfig] : []),
        ...(unstable ? ["--unstable"] : []),
      ],
      {
        env: {
          DENO_DIR: denoDir,
        },
        cwd: entrypointDirname,
        stdio: "pipe",
      },
    );
  } catch (err) {
    debug("failed to `deno bundle`");
    throw new Error(
      "Failed to run `deno bundle`: " + err.stdout + " " + err.stderr,
    );
  }

  const denoDirFiles = await grabDenoDirFiles(denoDir);

  const lambda = await createLambda({
    files: {
      ...extraFiles,
      ...layerFiles,
      ...denoDirFiles,
      [binName + ".bundle.js"]: new FileFsRef({
        mode: 0o755,
        fsPath: binPath,
      }),
    },
    handler: binName + ".handler",
    runtime: "provided",
    environment: {
      HANDLER_EXT: "bundle.js",
      PATH: process.env.PATH + ":./bin",
    },
  });

  if (version === 3) {
    return { output: lambda };
  }

  return {
    [entrypoint]: lambda,
  };
}
