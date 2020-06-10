import {
  download,
  BuildOptions,
  createLambda
} from "@vercel/build-utils";
import fs from "fs-extra";
import path from "path";
import { getdenoFiles, getbootFiles, getgenFiles } from "./util";

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
  const denoFiles = await getdenoFiles(workPath, meta.isDev || false);
  const bootFiles = await getbootFiles();
  const genFiles  = await getgenFiles(opts, downloadedFiles,bootFiles, denoFiles);

  // console.log({downloadedFiles, denoFiles,bootFiles,genFiles})

  // Files directory:
  // - .deno
  //    - /deps
  //    - /gen
  //    - /bin/deno 
  // - src
  // - bootstrap
  // - runtime.ts
  // - nowHandler.ts
  // - helpers.ts

  const lambda = await createLambda({
    files: {
      ...downloadedFiles,
      ...genFiles,
      ...denoFiles,
      ...bootFiles,
    },
    environment: {
      DENO_CONFIG: process.env.DENO_CONFIG || ''
    },
    handler: entrypoint,
    runtime: "provided"
  });
  
  return { output: lambda };
}
