# Deno Runtime for Vercel (`vercel-deno-runtime`)

A runtime designed for those who wants to migrate serverless functions built on [Node](https://nodejs.org/) runtime to [🦕Deno](https://deno.land/) that is compatible with ▲Vercel's `NowRequest` and `NowResponse`.

## Usage

```json
// vercel.json
{
  "functions": {
    "api/**/*.{ts,tsx}": {
      "runtime": "vercel-deno-runtime"
    }
  },
  "build":{
    "env":{
      "DENO_VERSION":"1.1.0 OR latest",
      "DENO_CONFIG":"tsconfig.json",
      "DENO_UNSTABLE":true
    }
  }
}
```

```ts
// /api/hello.ts
import { NowRequest, NowResponse } from "https://unpkg.com/vercel-deno-runtime@latest/dist/boot/nowHandler.ts";
  
export default async function handler(req:NowRequest,res:NowResponse) {
  res.statuscode(200).send(`Welcome to deno ${Deno.version.deno} 🦕`);
}
```

Note: `vercel` v17.x or above are required to use the above configuration.

## Configurations

| Name | Description | Default |
| --- | --- | --- |
| `DENO_VERSION` | Which `deno` version to be used for serverless functions | `latest` |
| `DENO_CONFIG` | Implement custom `tsconfig.json` to be used for serverless functions | `<empty>` | 
| `DENO_UNSTABLE` | add `--unstable` flag at build-time `deno cache`  and runtime `deno run` | `false`


## Development
- [x] Suport Now Launcher
- [x] add support for windows
- [ ] implement caching for downloading deno 
- [ ] add support for macos

## References
- [deno-lambda](https://github.com/hayd/deno-lambda) by [Andy Hayden](https://github.com/hayd)
- [vercel-deno](https://github.com/TooTallNate/vercel-deno) by [TooTallNate](https://github.com/TooTallNate)
- [now-deno](https://github.com/lucacasonato/now-deno) by [lucacasonato](https://github.com/lucacasonato)