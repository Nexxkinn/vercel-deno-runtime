import { PrepareCacheOptions } from '@vercel/build-utils'
/// unused. 
export default function prepareCache({files,entrypoint}: PrepareCacheOptions) {
    console.log("Execute caching for deno");

    const deno = files['.deno/bin/deno'].fsPath;
    const entry = files[entrypoint].fsPath;
    const env = {
        ...process.env,
        DENO_DIR:'/tmp/.deno',

    }
    console.log({deno,entry,env});
}