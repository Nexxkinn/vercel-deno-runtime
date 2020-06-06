cofig support:
- DENO_CONFIG
- DENO_UNSTABLE
- DENO_FLAG

# now-denolis
> Please do not use it outisde of experimental level. 

Run Deno with custom config on `vercel`. 🦕🔧 + λ = ❤️

Basically now-deno with an option to use your own `tsconfig.json` 

## Usage

```json
// now.json
{
  "functions": {
    "api/**/*.{ts,tsx}": {
      "runtime": "@otogira/now-denolis@0.4.5"
    }
  },
  "build":{ #required
    "env":{
      "DENO_VERSION":"1.0.0 OR latest",
      "DENO_TSCONFIG":"./tsconfig.json" #add_this_line
    }
  }
}
```

Note: You need `vercel` v17.x or above to use the above configuration.

## Use case
- Custom React SSR that require adding `jsx:react` variable in the config
- Overriding [defafult config](https://deno.land/manual/getting_started/typescript) from deno
- Migrating from other framework that heavily use custom config

## Credits
- [deno-lambda](https://github.com/hayd/deno-lambda) by [Andy Hayden](https://github.com/hayd)
- [now-deno](https://github.com/lucacasonato/now-deno) by [lucacasonato](https://github.com/lucacasonato)