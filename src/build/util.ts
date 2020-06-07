import {
  Meta,
  Config,
} from "@vercel/build-utils";
import { DenoVersion } from "../types";
import path from "path";
import execa from "execa";

export const DENO_LATEST = "latest";
export const DENO_VERSION = process.env.DENO_VERSION || DENO_LATEST;
export async function getDeno(
  _config?: Config,
  meta?: Meta,
): Promise<DenoVersion> {
  if (meta && meta.isDev) {
    // Use the system-installed version of `deno` in PATH for `now dev`
    const command = "deno --version";
    let proc: { stdout: string; stderr: string};
    if (process.platform === "win32") {
      proc = await execa("cmd.exe", ["/C", command], { stdio: 'pipe' });
    } else {
      proc = await execa("sh", ["-c", command], { stdio: 'pipe' });
    }
    let deno = proc.stdout.split(/\n/)[0];
    return parseDenoVersion(deno);
  } else {
    return parseDenoVersion(DENO_VERSION);
  }
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

export const getWorkPath = (workPath: string, entrypoint: string) =>
  path.join(workPath, ".now", "builders", "now-denolis", entrypoint);
