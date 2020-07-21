import { serve } from 'https://deno.land/std/http/server.ts';

function isNetAddr(v: any): v is Deno.NetAddr {
	return v && typeof v.port === 'number';
}

const entrypoint = Deno.env.get('DEV_ENTRYPOINT');
const portfile = Deno.env.get('DEV_PORT') as string;

const mod = await import(`file://${entrypoint}`);
const handler = mod.default;
if (!handler) throw new Error(`unable to load function ${entrypoint}`);
// TODO: send data to file descriptor 3 for windows.
// https://github.com/denoland/deno/issues/6305 might solve it
const server = serve({port:0});

if (!isNetAddr(server.listener.addr)) throw new Error('No Listener found');

const { port } = server.listener.addr;
const fdPort = await Deno.open(portfile,{read:false,write:true});
const portBytes = new TextEncoder().encode(String(port));
Deno.writeAllSync(fdPort, portBytes);
Deno.close(fdPort.rid);

for await (const req of server) {
	handler(req);
}