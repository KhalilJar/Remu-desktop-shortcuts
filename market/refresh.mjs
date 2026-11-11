#!/usr/bin/env node
/**
 * Refresh `market/index.json` for the version in `package.json`.
 *
 * Usage:
 *   node market/refresh.mjs                 # uses the current HEAD commit (refuses a dirty tree)
 *   node market/refresh.mjs --commit <sha>  # pin an explicit commit
 *
 * The market index pins every version to an exact commit, so this has to run
 * *after* the release commit is pushed: a commit that only exists locally
 * cannot be installed by anyone else.
 *
 * Run it from anywhere; paths are resolved from this file.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const MAX_VERSIONS = 20;

const fail = (message) => {
  console.error(`market/refresh: ${message}`);
  process.exit(1);
};
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (typeof pkg.version !== 'string' || !SEMVER.test(pkg.version)) {
  fail(`package.json version ${JSON.stringify(pkg.version)} is not an exact SemVer version`);
}

const indexFile = join(here, 'index.json');
const index = JSON.parse(readFileSync(indexFile, 'utf8'));
const plugin = index.plugins?.find((entry) => entry.name === pkg.name);
if (plugin === undefined) fail(`index.json has no plugin named ${JSON.stringify(pkg.name)}`);

const at = process.argv.indexOf('--commit');
let commit = at === -1 ? null : process.argv[at + 1];
if (commit === null || commit === undefined) {
  if (git('status', '--porcelain') !== '') {
    fail('the working tree is dirty; commit first, or pass --commit <sha> for a commit that is already pushed');
  }
  commit = git('rev-parse', 'HEAD');
}
if (!COMMIT.test(commit)) fail(`commit ${JSON.stringify(commit)} is not a lowercase 40-hex-digit SHA`);

const source = { type: 'git', url: plugin.repository.url, commit };
const entry = { version: pkg.version, publishTimestamp: Math.floor(Date.now() / 1000), source };

const precedence = (version) => version.split('-')[0].split('.').map(Number);
plugin.versions = plugin.versions
  .filter((version) => version.version !== pkg.version)
  .concat(entry)
  .sort((left, right) => {
    const [a, b] = [precedence(left.version), precedence(right.version)];
    for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return b[i] - a[i];
    return 0;
  })
  .slice(0, MAX_VERSIONS);

writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
console.log(`market/index.json: ${pkg.name} ${pkg.version} -> ${commit}`);
