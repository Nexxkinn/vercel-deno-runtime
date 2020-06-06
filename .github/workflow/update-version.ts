import {
  readJson,
  writeJson,
  ensureDir,
} from 'https://deno.land/std/fs/mod.ts';

const sha = Deno.env.get('GITHUB_SHA');
if (!sha) {
  throw Error('No GITHUB_SHA specified.');
}
const name = Deno.env.get('PACKAGE_NAME');
if (!name) {
  throw Error('No PACKAGE_NAME specified.');
}
const tag = `0.1.0-${sha}`;
const pkg: any = await readJson('package.json');
pkg.name = name;
pkg.version = tag;
await writeJson('package.json', pkg, { spaces: 2 });

const now: any = await readJson('test/now.json');
now.builds['**/*.ts'].runtime = `${name}@${tag}`;
await writeJson('test/now.json', now, { spaces: 2 });
await ensureDir('test/.vercel');
await writeJson('test/.vercel/project.json', {
  projectId: 'QmNww3o6cGyoLMEbB8K5AHm9ozEQGbybyhSYhTZc4ATy5j',
  orgId: '1Msr0JfY7YsvfjsLqayd0tWC',
});
