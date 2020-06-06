import {
    execAsync,
    debug,
    Files,
    FileFsRef,
} from "@vercel/build-utils";
import path from "path";
import which from "which";
import { pathExists, writeFile, readFile, symlink } from "fs-extra";
import { DENO_VERSION, DENO_LATEST } from "./util";

const DOWNLOAD_URL = DENO_VERSION === DENO_LATEST

? `https://github.com/denoland/deno/latest/releases/deno-x86_64-unknown-linux-gnu.zip`
: `https://github.com/denoland/deno/releases/download/${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip`;
  
export default async function getDenoLambaLayer(
    workPath: string,
    isDev: boolean,
  ): Promise<Files> {
    const zipPath = path.join(workPath, "deno-x86_64-unknown-linux-gnu.zip");
    let denoPath: string;
    if (!(await pathExists(zipPath)) && !isDev) {
      debug("download and extract ", DOWNLOAD_URL);
      try {
        const layerDir = path.join(workPath, "layer");
        await execAsync("curl", ["-o", zipPath, "-L", DOWNLOAD_URL]);
        await execAsync("unzip", ["-o", zipPath, "-d", layerDir]);
        denoPath = path.join(layerDir, "deno");
      } catch (err) {
        debug("operation failed");
        throw new Error(`Failed: ${err.stdout} ${err.stderr}`);
      }
    } else {
      // it is a dev config. just ensure deno is available
      if (!process.env.DENO_INSTALL) throw new Error("deno is not installed yet");
      denoPath = await which("deno");
    }
  
    // get bootstrap
    const bootstrapPath = path.join(process.cwd(), "assets/bootstrap");
    if (isDev) {
      const bashPath = await which("bash");
      const bootstrapFile = await readFile(bootstrapPath, "utf8");
      await writeFile(
        bootstrapPath,
        bootstrapFile.replace("#!/bin/sh", `#!${bashPath}`),
      );
    }

    await symlinkBinDeno(workPath,denoPath);
  
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

/// this method is used to link deno path in the bootstrap file.
async function symlinkBinDeno(workPath: string,denoPath:string) {
  const BootstrapDenoBinPath = path.join(workPath, 'bin', 'deno');
  await symlink(denoPath, BootstrapDenoBinPath);
}