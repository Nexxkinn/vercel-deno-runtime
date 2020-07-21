import {
  assert,
  assertStringContains,
} from 'https://deno.land/std@0.61.0/testing/asserts.ts';
import {
  readJson,
  writeJson,
  ensureDir,
} from 'https://deno.land/std@0.61.0/fs/mod.ts';
import { join } from 'https://deno.land/std@0.61.0/path/mod.ts';

const isWin = Deno.build.os == 'windows';
const runNow = isWin ? ['now.cmd'] : ['npx', 'vercel'];

const now: any = await readJson('test/now.json');
await writeJson('test/now.json', now, { spaces: 2 });
await ensureDir('test/.vercel');
await writeJson('test/.vercel/project.json', {
  projectId: 'QmNww3o6cGyoLMEbB8K5AHm9ozEQGbybyhSYhTZc4ATy5j',
  orgId: '1Msr0JfY7YsvfjsLqayd0tWC',
});

// Deno.test({
//   name: 'deploy to now',
//   async fn() {
//     const proc = Deno.run({
//       cmd: runNow.concat('-c', '-f', '-t', Deno.env.get('NOW_TOKEN')!),
//       cwd: join(Deno.cwd(), 'example'),
//       stdout: 'piped',
//       stderr: 'piped',
//     });
//     const status = await proc.status();
//     const decoder = new TextDecoder();
//     assert(status.success, decoder.decode(await proc.stderrOutput()));
//     const url = decoder.decode(await proc.output());
//     proc.close();
//     console.log(`Deployed to ${url}`);
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     const req = await fetch(`${url}/api/version`);
//     assert(req.ok);
//     const text = await req.text();
//     assertStringContains(text, 'Welcome to deno');
//     assertStringContains(text, '🦕');
//   },
// });

// Deno.test({
//   name: 'deploy to now with specific version',
//   async fn() {
//     const proc = Deno.run({
//       cmd: runNow.concat(
//         '-c',
//         '-f',
//         '-t',
//         Deno.env.get('NOW_TOKEN')!,
//         '--build-env',
//         "DENO_VERSION=0.40.0"
//       ),
//       cwd: join(Deno.cwd(), 'example'),
//       stdout: 'piped',
//       stderr: 'piped',
//     });
//     const status = await proc.status();
//     const decoder = new TextDecoder();
//     assert(status.success, decoder.decode(await proc.stderrOutput()));
//     const url = decoder.decode(await proc.output());
//     proc.close();
//     console.log(`Deployed to ${url}`);
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     const req = await fetch(`${url}/api/version`);
//     assert(req.ok);
//     const text = await req.text();
//     assertStringContains(text, 'Welcome to deno');
//     assertStringContains(text, '0.40.0');
//     assertStringContains(text, '🦕');
//   },
// });

// TODO(lucacasonato): reenable test on macOS
if (Deno.build.os === 'linux') {
  console.log(Deno.env.get('NOW_TOKEN'));
  Deno.test({
    name: 'run on now dev',
    async fn() {
      const proc = Deno.run({
        cmd: runNow.concat('dev', '-d', '-t', Deno.env.get('NOW_TOKEN')!),
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
