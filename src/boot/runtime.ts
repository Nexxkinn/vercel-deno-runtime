import * as base64 from 'https://deno.land/x/base64/mod.ts';
import { ServerRequest } from 'https://deno.land/std/http/server.ts';
import { BufReader, BufWriter } from 'https://deno.land/std/io/bufio.ts';
import { TextProtoReader } from 'https://deno.land/std/textproto/mod.ts';
import { Context, APIGatewayProxyEvent } from 'https://deno.land/x/lambda/mod.ts';
import { NowApiHandler, NowRequest, NowResponse, NowRequestCookies, NowRequestQuery } from './nowHandler.ts';

import { setLazyProp, getCookieParser, getQueryParser } from './helpers.ts';

interface LambdaContext extends Context {
    invokeid:any,
    callbackWaitsForEmptyEventLoop: any,
    done: any,
    fail: any,
    succeed: any
}

const {
	AWS_LAMBDA_FUNCTION_NAME,
	AWS_LAMBDA_FUNCTION_VERSION,
	AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
	AWS_LAMBDA_LOG_GROUP_NAME,
	AWS_LAMBDA_LOG_STREAM_NAME,
    _HANDLER,
    LAMBDA_TASK_ROOT,
	AWS_LAMBDA_RUNTIME_API
} = Deno.env.toObject();
// unused: LAMBDA_TASK_ROOT

const RUNTIME_PATH = '2018-06-01/runtime';
const [HANDLER_FILE,HANDLER_NAME] = _HANDLER.split('.');

async function initialize() {
    let handler: NowApiHandler | null = null;
    while (true) {
        const { event, context } = await invocationNext();
        let result;
        try {
            
            // import lambda function handler dynamically once.
            if (!handler) {
                const module = await import(`../${_HANDLER}`);
                handler = module.default;
                if (!handler) {
                    throw new Error('Failed to load handler function');
                }
            }

            const data = JSON.parse(event.body || '');
            const input = new Deno.Buffer(base64.toUint8Array(data.body || ''));
            const output = new Deno.Buffer(new Uint8Array(6000000)); // maximum lambda file size

            const req:NowRequest = new ServerRequest();
            req.r = new BufReader(input);
            req.w = new BufWriter(output);
            req.headers = new Headers();
            req.method = data.method;
            req.url = data.path;
            req.proto = 'HTTP/2.0';
            req.protoMinor = 0;
            req.protoMajor = 2;

            for (const [name, value] of Object.entries(data.headers)) {
                if (typeof value === 'string') {
                    req.headers.set(name, value);
                }
                // TODO: handle multi-headers?
            }

            setLazyProp<NowRequestCookies>(req, 'cookies', getCookieParser(req));
            setLazyProp<NowRequestQuery>(req,'query', getQueryParser(req));

            let res:NowResponse = {
                send: (body:any) => send( res, req, body ),
                statuscode: (statuscode:number) => status( res, statuscode ),
                json: (jsonBody:any) => json( res, jsonBody )
            }

            // run user function
            await handler(req,res);

            // execute respond if client had not implement it.
            if (!req.w.usedBufferBytes) { 
                if (req.body) await req.respond(res);
                else throw new Deno.errors.UnexpectedEof();
            }
            
            // TODO: dynamically determine buffer size.
            // output.length has a mismatch size of a few hundret bytes compared to boy.bytlength.
            // not including size argument will make bufReader use default size 4096 Bytes.
            // console.log({outlen:output.length})
            const bufr = new BufReader(output,output.length);
            const tp = new TextProtoReader(bufr);
            
            const firstLine = await tp.readLine() || 'HTTP/2.0 200 OK'; // e.g. "HTTP/1.1 200 OK"
            const statuscode = res ? res.status || 200 : parseInt(firstLine.split(' ', 2)[1], 10); // get statuscode either from res or req.
            const headers = await tp.readMIMEHeader() || new Headers();
            const headersObj: { [name: string]: string } = {};
            for (const [name, value] of headers.entries()) {
                headersObj[name] = value;
            }

            let buff = new Uint8Array(bufr.size());
            const size = await bufr.read(buff)||bufr.size();
            const body = buff.slice(0,size);
            if (!body) throw new Deno.errors.UnexpectedEof();
            // console.log({
            //     outlen:output.length,
            //     bodylen:body.byteLength,
            // })
            await req.finalize();

            result = {
                statusCode: statuscode,
                headers: headersObj,
                encoding: 'base64',
                body: base64.fromUint8Array(body)
            }
        } catch(e) {
            console.log(e);
            continue;
        }
        await invocationResponse(result,context);
    }
}

async function invocationResponse(result:any,context:LambdaContext) {
    console.log("invoke Response")
    console.log({result})
    const res = await LambdaFetch(`invocation/${context.awsRequestId}/response`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(result)
	});
	if (res.status !== 202) {
		throw new Error(
			`Unexpected "/invocation/response" response: ${JSON.stringify(res)}`
		);
    }
}

async function invocationNext(){
    const next = await LambdaFetch('invocation/next');
    const headers = next.headers;
    const requestId = headers.get('lambda-runtime-aws-request-id') || '';
    const invokedFunctionArn = headers.get('lambda-runtime-invoked-function-arn') || '';
    const deadline = Number(headers.get('lambda-runtime-deadline-ms'));

    const clientctx = headers.get('lambda-runtime-client-context');
    const clientcontext =  clientctx ? JSON.parse(clientctx) : undefined;
    
    const cog_iden = headers.get('lambda-runtime-cognito-identity');
    const identity =  cog_iden ? JSON.parse(cog_iden) : undefined;

    Deno.env.set('_X_AMZN_TRACE_ID', headers.get('lambda-runtime-trace-id') || '');

    const context:LambdaContext = {
        functionName: AWS_LAMBDA_FUNCTION_NAME,
        functionVersion: AWS_LAMBDA_FUNCTION_VERSION,
        memoryLimitInMB: AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
        logStreamName: AWS_LAMBDA_LOG_STREAM_NAME,
        logGroupName: AWS_LAMBDA_LOG_GROUP_NAME,
        invokedFunctionArn: invokedFunctionArn,
        awsRequestId: requestId,
        invokeid:requestId,
        identity:identity,
        clientContext: clientcontext,
        getRemainingTimeInMillis: () => deadline - Date.now(),
        // legacy. let it unused.
        callbackWaitsForEmptyEventLoop: undefined,
        done: undefined,
        fail: undefined,
        succeed: undefined
    }

    const event:APIGatewayProxyEvent = JSON.parse(next.body);
    return { event, context };
}

async function LambdaFetch(path: string, options?: RequestInit) {
    const API_ROOT = `http://${AWS_LAMBDA_RUNTIME_API}/${RUNTIME_PATH}`;
	const url = `${API_ROOT}/${path}`;
	const res = await fetch(url, options);
	const body = await res.text();
	return {
		status: res.status,
		headers: res.headers,
		body
    };
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

try {
    await initialize();
} catch (err) {
    console.error(err);
    Deno.exit(1);
}
  