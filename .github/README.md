# vercel-deno
> This runtime is currently on development and might be broken on some specific cases specified in the Known Limitation section.

Deno runtime for `vercel`.

## Usage

```json
// now.json
{
  "functions": {
    "api/**/*.{ts,tsx}": {
      "runtime": "vercel-deno-runtime"
    }
  },
  "build":{
    "env":{
      "DENO_VERSION":"1.0.5 OR latest",
      "DENO_CONFIG":"tsconfig.json",
      "DENO_UNSTABLE":true
    }
  }
}
```

```ts
// /api/hello.ts
import { NowRequest, NowResponse } from "https://deno.land/x/npm:vercel-deno-runtime/dist/boot/nowHandler.ts";
  
export default async function handler(req:NowRequest,res:NowResponse) {
  res.statuscode(200).send(`Welcome to deno ${Deno.version.deno} 🦕`);
}
```

## Available config ( with default value )
 - `DENO_VERSION` : "latest"
 - `DENO_CONFIG` : ""
 - `DENO_UNSTABLE` : false

Note: `vercel` v17.x or above are required to use the above configuration.

## Known limitation
- only works on linux, for now.

## TODO
- [x] Suport Now Launcher
- [x] Support base64 conversion for binary files response
- [ ] implement caching for downloading deno 
- [ ] add support for windows and macos

## References
- [deno-lambda](https://github.com/hayd/deno-lambda) by [Andy Hayden](https://github.com/hayd)
- [vercel-deno](https://github.com/TooTallNate/vercel-deno) by [TooTallNate](https://github.com/TooTallNate)
- [now-deno](https://github.com/lucacasonato/now-deno) by [lucacasonato](https://github.com/lucacasonato)