# vercel-deno
> This runtime is currently on development and might be broken on some specific cases specified in the Known Limitation section.

Run Deno runtime on `vercel`. 🦕 + λ + 🔼 = ❤️

## Usage

```json
// now.json
{
  "functions": {
    "api/**/*.{ts,tsx}": {
      "runtime": "vercel-deno"
    }
  },
  "build":{
    "env":{
      "DENO_VERSION":"1.0.5 OR latest",
      "DENO_TSCONFIG":"tsconfig.json",
      "DENO_FLAGS":"--allow-read", 
      "DENO_UNSTABLE":true
    }
  }
}
```

```ts
// hello.ts

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from "https://deno.land/x/lambda/mod.ts";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  return {
    body: `Welcome to deno ${Deno.version.deno} 🦕`,
    headers: { "content-type": "text/html;charset=utf8" },
    statusCode: 200
  };
}
```

## Available config ( with default value )
```
DENO_VERSION : "latest"
DENO_TSCONFIG : ""
DENO_FLAGS : "--allow-all"
DENO_UNSTABLE : false
```

Note: `vercel` v17.x or above are required to use the above configuration.

## Known limitation
- Limited to AWS Lambda gateway
- Unable to send response with binary files
- only works on linux, for now.

## TODO
- [ ] Suport Now Launcher
- [ ] Support base64 conversion for binary files response
- [ ] implement caching
- [ ] add support for windows and macos

## Credits
- [deno-lambda](https://github.com/hayd/deno-lambda) by [Andy Hayden](https://github.com/hayd)
- [now-deno](https://github.com/lucacasonato/now-deno) by [lucacasonato](https://github.com/lucacasonato)