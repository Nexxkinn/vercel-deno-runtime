import { serve } from './deps.ts';
import { NowApiHandler, NowRequest, NowResponse, NowRequestCookies, NowRequestQuery } from './nowHandler.ts';

function isNetAddr(v: any): v is Deno.NetAddr {
	return v && typeof v.port === 'number';
}

const entrypoint = Deno.env.get('DEV_ENTRYPOINT');

const mod = await import(`file://${entrypoint}`);
const handler = mod.default;
if (!handler) throw new Error(`unable to load function ${entrypoint}`);
// TODO: send data to file descriptor 3 for windows.
// https://github.com/denoland/deno/issues/6305 might solve it
const server = serve({port:0});

if (!isNetAddr(server.listener.addr)) throw new Error('No Listener found');

const { port } = server.listener.addr;
const portFile = Deno.env.get('DEV_PORT') as string;
const portBytes = new TextEncoder().encode(String(port));
Deno.writeFile(portFile, portBytes);
Deno.env.delete('DEV_PORT');

for await (const req of server) {

	let res:NowResponse = {
		send: (body:any) => send( res, req, body ),
		statuscode: (statuscode:number) => status( res, statuscode ),
		json: (jsonBody:any) => json( res, jsonBody )
	}
	await handler(req,res);
	await req.respond(res);
}

function send(res:NowResponse,req:NowRequest,body:any):NowResponse {
    let chunk: unknown = body;
    // let encoding: 'utf8' | undefined;

    // write headers
    switch (typeof chunk) {
        case 'string':
            if (!res.headers?.get('content-type')) {
                res.headers?.set('content-type', 'text/html');
            }
            break;
        case 'boolean':
        case 'number':
        case 'object':
            if (chunk === null) {
            chunk = '';
            } else if (chunk instanceof Uint8Array) {
                if (!res.headers?.get('content-type')) {
                  res.headers?.set('content-type', 'application/octet-stream');
                }
              } else {
                return json(res, chunk);
              }
        break;
    }

    // TODO: populate ETag
    // let etag: string | undefined;
    // if (
    //     !res.getHeader('etag') &&
    //     len !== undefined &&
    //     (etag = createETag(chunk, encoding))
    // ) {
    //     res.setHeader('etag', etag);
    // }


    if (204 === res.status || 304 === res.status) {
        res.headers?.delete('Content-Type');
        res.headers?.delete('Content-Length');
        res.headers?.delete('Transfer-Encoding');
        chunk = '';
    }

    // if (typeof chunk === 'string') {
    //     encoding = 'utf8';
    
    //     // reflect this in content-type
    //     const type = res.headers?.get('content-type');
    //     if (typeof type === 'string') {
    //       res.setHeader('content-type', setCharset(type, 'utf-8'));
    //     }
    // }

    res.body = body;
    return res;
}

function status(res:NowResponse,status:number):NowResponse {
    res.status = status;
    return res;
}

function json(res:NowResponse,body:any):NowResponse {
    res.body = JSON.stringify(body);
    if (!res.headers?.get('content-type')) {
        res.headers?.set('content-type', 'application/json; charset=utf-8');
      }
    return res;
}