import {
  readJson,
  writeJson
} from './deps.ts';

const sha = Deno.env.get('CI_COMMIT_SHA');
if (!sha) {
  throw Error('No CI_COMMIT_SHA specified.');
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
