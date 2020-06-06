import { Files, FileFsRef } from "@vercel/build-utils/dist";
import path from "path";
import fs from 'fs-extra';

export default async function grabDenoDirFiles(denoDirPath: string): Promise<Files> {
    const files: Files = {};
  
    const dir = await walk(denoDirPath);
  
    dir.forEach(file => {
      const f = path.join('.deno_dir', file.replace(denoDirPath + '/', ''));
      files[f] = new FileFsRef({ fsPath: file, mode: 0o755 });
    });
  
    return files;
  }

async function walk(dir: string): Promise<string[]> {
    const f = await fs.readdir(dir);
    const files = await Promise.all(
        f.map(async file => {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) return walk(filePath);
        else if (stats.isFile()) return filePath;
        throw 'File not dir or file: ' + filePath;
        })
    );

return files.flat();
}