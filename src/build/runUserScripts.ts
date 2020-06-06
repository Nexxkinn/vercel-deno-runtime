import path from "path";
import fs from 'fs-extra';
import { runShellScript } from "@vercel/build-utils/dist";

export default async function runUserScripts(entrypoint: string) {
    const entryDir = path.dirname(entrypoint);
    const buildScriptPath = path.join(entryDir, 'build.sh');
    const buildScriptExists = await fs.pathExists(buildScriptPath);
  
    if (buildScriptExists) {
      console.log('running `build.sh`...');
      await runShellScript(buildScriptPath);
    }
  }