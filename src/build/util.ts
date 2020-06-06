import {
  Meta,
  Config,
  execAsync,
} from "@vercel/build-utils";
import { DenoVersion } from "../types";
import path from "path";

export const DENO_LATEST = "latest";
export const DENO_VERSION = process.env.DENO_VERSION || DENO_LATEST;
export async function getDeno(
  _config?: Config,
  meta?: Meta,
): Promise<DenoVersion> {
  if (meta && meta.isDev) {
    // Use the system-installed version of `deno` in PATH for `now dev`
    const command = "deno --version";
    let proc: { stdout: string; stderr: string; code: number };
    if (process.platform === "win32") {
      proc = await execAsync("cmd.exe", ["/C", command]);
    } else {
      proc = await execAsync("sh", ["-c", command]);
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
