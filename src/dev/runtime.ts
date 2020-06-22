import { serve } from 'https://deno.land/std@0.57.0/http/server.ts';

function isNetAddr(v: any): v is Deno.NetAddr {
	return v && typeof v.port === 'number';
}

const entrypoint = Deno.env.get('DEV_ENTRYPOINT');
const mod = await import(`file://${entrypoint}`);
const handler = mod.default;
if (!handler) throw new Error(`unable to load function ${entrypoint}`);

const fdPort = await Deno.open('/dev/fd/3',{read:false,write:true});

const server = serve({port:0});

if (isNetAddr(server.listener.addr)) {
	const { port } = server.listener.addr;
	const portBytes = new TextEncoder().encode(String(port));
	Deno.writeAllSync(fdPort, portBytes);
	Deno.close(fdPort.rid);
}

for await (const req of server) {
	handler(req);
}