import {
  assert,
  assertStringContains,
  readJson,
  writeJson,
  ensureDir,
  join 
} from './deps.ts';

const isWin = Deno.build.os == 'windows';
const runVercel = isWin ? ['now.cmd'] : ['npx', 'vercel'];

const now: any = await readJson('test/now.json');
await writeJson('test/now.json', now, { spaces: 2 });
await ensureDir('test/.vercel');
await writeJson('test/.vercel/project.json', {
  projectId: 'QmNww3o6cGyoLMEbB8K5AHm9ozEQGbybyhSYhTZc4ATy5j',
  orgId: '1Msr0JfY7YsvfjsLqayd0tWC',
});

Deno.test({
  name: 'deploy to vercel',
  async fn() {
    const proc = Deno.run({
      cmd: runVercel.concat('-c', '-f', '-t', Deno.env.get('NOW_TOKEN')!),
      cwd: join(Deno.cwd(), 'test'),
      stdout: 'piped',
      stderr: 'piped',
    });
    const status = await proc.status();
    const decoder = new TextDecoder();
    assert(status.success, decoder.decode(await proc.stderrOutput()));
    const url = decoder.decode(await proc.output());
    proc.close();
    console.log(`Deployed to ${url}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const req = await fetch(url);
    assert(req.ok);
    const text = await req.text();
    assertStringContains(text, 'Welcome to deno');
    assertStringContains(text, '🦕');
  },
});

// TODO(lucacasonato): reenable test on macOS
if (Deno.build.os === 'linux') {
  Deno.test({
    name: 'run on now dev',
    async fn() {
      const proc = Deno.run({
        cmd: runVercel.concat('dev', '-d', '-t', Deno.env.get('NOW_TOKEN')!),
        cwd: join(Deno.cwd(), 'test'),
        stdout: 'inherit',
        stderr: 'inherit',
      });
      await new Promise(resolve => setTimeout(resolve, 20000));
      for (let i = 0; i < 4; i++) {
        try {
          const req = await fetch(`http://localhost:3000/`);
          if (req.ok) {
            const text = await req.text();
            assertStringContains(text, 'Welcome to deno');
            assertStringContains(text, '🦕');
            proc.kill(2);
            proc.close();
            Deno.exit(0);
          }
        } catch (err) {
          console.log(err);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      proc.kill(2);
      proc.close();
      throw Error('Failed to send request to now dev');
    },
  });
}
