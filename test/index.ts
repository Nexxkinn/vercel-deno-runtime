import { NowRequest, NowResponse } from "./nowHandler.ts";
  
export default async function handler(req:NowRequest,res:NowResponse) {
  res.headers = new Headers({ "content-type": "text/html;charset=utf8" });
  res.statuscode(200).send(`Welcome to deno ${Deno.version.deno} 🦕`);
}