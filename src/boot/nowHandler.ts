import { Cookies, ServerRequest, Response } from './deps.ts';

export type NowRequestCookies = Cookies;

export type NowRequestQuery = { [key: string]: string | string[] };
export type NowRequestBody = any;
import Reader = Deno.Reader;


export type NowRequest = ServerRequest & {
    query?: NowRequestQuery;
    cookies?: NowRequestCookies;
}
export type NowResponse = Response & {
    send(body: Uint8Array | Reader | string):NowResponse;
    statuscode (statusCode: number):NowResponse;
    json(jsonBody: any):NowResponse;
}

export type NowApiHandler = (req: NowRequest, res: NowResponse) => void | Promise<void>;
