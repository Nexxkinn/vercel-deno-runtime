import {
  download,
  BuildOptions,
  createLambda
} from "@vercel/build-utils";
import fs from "fs-extra";
import path from "path";
import { getdenoFiles, getbootFiles, CacheEntryPoint } from "./util";

export default async function build(opts: BuildOptions) {
  const { files, entrypoint, workPath, meta = {} } = opts;
  await fs.mkdirp(workPath);

  console.log("downloading source files");

  const downloadedFiles = await download(
    files,
    path.join(workPath, "src"),
    meta,
  );
  // configure environment variable
  const denoFiles = await getdenoFiles(workPath,meta.isDev || false);
  const bootFiles = await getbootFiles(workPath);
  const cacheFiles = await CacheEntryPoint(opts, downloadedFiles,denoFiles,bootFiles);

  // console.log({downloadedFiles, denoFiles,bootFiles,genFiles})

  // Files directory:
  // - .deno
  //    - /deps
  //    - /gen
  //    - /bin/deno
  //    - *.d.ts 
  // - src
  // - bootstrap
  // - runtime.ts
  // - nowHandler.ts
  // - helpers.ts

  const lambda = await createLambda({
    files: {
      ...downloadedFiles,
      ...bootFiles,
      ...cacheFiles,
      ...denoFiles
    },
    environment: {
      DENO_CONFIG: process.env.DENO_CONFIG || ''
    },
    handler: entrypoint,
    runtime: "provided"
  });
  
  return { output: lambda };
}
