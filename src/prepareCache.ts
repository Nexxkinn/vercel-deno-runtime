import { PrepareCacheOptions } from '@vercel/build-utils'
//import { spawn } from 'child_process';

export default function prepareCache({files,entrypoint}: PrepareCacheOptions) {
    console.log("Execute caching for deno");

    const deno = files['.deno/bin/deno'].fsPath;
    const entry = files[entrypoint].fsPath;
    const env = {
        ...process.env,
        DENO_DIR:'/tmp/.deno',

    }
    console.log({deno,entry,env});
    // if (deno && entry) {
    //     const ls = spawn(deno,['cache',entry],
    //     {
    //         env
    //     })
    // }
    // execute caching
    // TODO: add cache here
}