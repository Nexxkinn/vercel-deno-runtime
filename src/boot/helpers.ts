import { NowRequest, NowRequestCookies, NowRequestQuery } from "./nowHandler.ts";
import { getCookies } from "https://deno.land/std@0.61.0/http/cookie.ts";

export function setLazyProp<T>(req: NowRequest, prop: string, getter: () => T) {
  const opts = { configurable: true, enumerable: true };
  const optsReset = { ...opts, writable: true };

  Object.defineProperty(req, prop, {
    ...opts,
    get: () => {
      const value = getter();
      // we set the property on the object to avoid recalculating it
      Object.defineProperty(req, prop, { ...optsReset, value });
      return value;
    },
    set: (value) => {
      Object.defineProperty(req, prop, { ...optsReset, value });
    },
  });
}

export function getCookieParser(req: NowRequest) {
  return ():NowRequestCookies => getCookies(req);
}

export function getQueryParser({ url = "/" }: NowRequest) {
  return function parseQuery(): NowRequestQuery {
      let query:NowRequestCookies = {};
      const data = new URL(url);
      if(data.searchParams){
          for(const [key,value] of data.searchParams) {
              query[key] = value;
          }
      }
    return query;
  };
}