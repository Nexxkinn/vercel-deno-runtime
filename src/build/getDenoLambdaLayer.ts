import {
    debug,
    Files,
    FileFsRef,
} from "@vercel/build-utils";
import path from "path";
import which from "which";
import execa from 'execa';
import { pathExists, writeFile,readFile } from "fs-extra";
import { DENO_VERSION, DENO_LATEST } from "./util";

const DOWNLOAD_URL = DENO_VERSION === DENO_LATEST

? `https://github.com/denoland/deno/latest/releases/deno-x86_64-unknown-linux-gnu.zip`
: `https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip`;
  
export default async function getDenoLambaLayer(
    workPath: string,
    isDev: boolean,
  ): Promise<Files> {
    const zipPath = path.join(workPath, "deno-x86_64-unknown-linux-gnu.zip");
    const layerDir = path.join(workPath, "layer");
    let denoPath: string;

    if (!DenoExists()) {
      debug("download and extract ", DOWNLOAD_URL);
      try {
        if (!(await pathExists(zipPath)))
          await execa("curl", ["-o", zipPath, "-L", DOWNLOAD_URL],{stdio:"ignore"});

        await execa("unzip", ["-o", zipPath, "-d", layerDir],{stdio:"ignore"});
        denoPath = path.join(layerDir, "deno");
      } catch (err) {
        debug("operation failed");
        throw new Error(`Failed: ${err.stdout} ${err.stderr}`);
      }
    } else {
      denoPath = await which("deno");
    }
  
    console.log('create bootstrap')
    const bootstrapPath = path.join(__dirname, "../assets/bootstrap");
    if (isDev) {
      const bashPath = await which("bash");
      const bootstrapFile = await readFile(bootstrapPath,'utf-8');
      await writeFile(
        bootstrapPath,
        bootstrapFile.replace("#!/bin/sh", `#!${bashPath}`),
      );
    }

    //await symlinkBinDeno(workPath,denoPath);
  
    return {
      bootstrap: new FileFsRef({
        mode: 0o755,
        fsPath: bootstrapPath,
      }),
      "bin/deno": new FileFsRef({
        mode: 0o755,
        fsPath: denoPath,
      })
    };
  }

/// this is for bootstrap file
// async function symlinkBinDeno(workPath: string,denoPath:string) {
//   console.log('create symlink')
//   const BootstrapDenoBinPath = path.join(workPath, 'bin', 'deno');
//   await symlink(denoPath, BootstrapDenoBinPath);
// }
/// check if deno exists in user file.
function DenoExists(){
  const w = which.sync('deno',{nothrow:true});
  return Boolean(w);
}