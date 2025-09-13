import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  getReleaseEntryPoints,
  parsePackageManifest,
  validateEntryPointFile
} from '../scripts/validate-release.js';

const manifest = {
  id: 'example-package@0.3.11',
  name: 'example-package',
  version: '0.3.11',
  size: 1234,
  unpackedSize: 5678,
  files: [
    {
      path: 'package.json',
      size: 100,
      mode: 420
    }
  ]
};

test('parsePackageManifest parses pure npm pack JSON output', () => {
  assert.deepEqual(parsePackageManifest(JSON.stringify([manifest])), manifest);
});

test('parsePackageManifest skips leading plain noise', () => {
  const stdout = [
    'running build before pack',
    'build completed',
    JSON.stringify([manifest])
  ].join('\n');

  assert.deepEqual(parsePackageManifest(stdout), manifest);
});

test('parsePackageManifest skips leading bracketed info noise', () => {
  const stdout = [
    '[info] running prepack build',
    '[info] build completed',
    JSON.stringify([manifest])
  ].join('\n');

  assert.deepEqual(parsePackageManifest(stdout), manifest);
});

test('parsePackageManifest skips leading JSON-looking noise arrays', () => {
  const stdout = [
    '["not the manifest"]',
    JSON.stringify([manifest])
  ].join('\n');

  assert.deepEqual(parsePackageManifest(stdout), manifest);
});

test('parsePackageManifest skips leading files-shaped JSON noise without npm pack fields', () => {
  const stdout = [
    JSON.stringify([{ files: ['generated.log'] }]),
    JSON.stringify([manifest])
  ].join('\n');

  assert.deepEqual(parsePackageManifest(stdout), manifest);
});

test('parsePackageManifest throws when output does not contain JSON', () => {
  assert.throws(
    () => parsePackageManifest('build finished without npm pack output'),
    new RegExp('npm pack did not return a JSON manifest')
  );
});

test('parsePackageManifest throws when output contains only invalid JSON', () => {
  assert.throws(
    () => parsePackageManifest('[{"path":"unterminated"'),
    new RegExp('npm pack did not return a JSON manifest')
  );
});

test('parsePackageManifest throws when JSON is not a package manifest', () => {
  assert.throws(
    () => parsePackageManifest('[{"name":"example-package"}]'),
    new RegExp('npm pack manifest did not include file entries')
  );
});

test('getReleaseEntryPoints covers package main and bin entries', () => {
  assert.deepEqual(
    getReleaseEntryPoints({
      main: './dist/index.js',
      bin: {
        'example-package': 'dist/index.js',
        'example-helper': './dist/helper.js'
      }
    }),
    [
      {
        path: 'dist/index.js',
        sources: ['package main', 'package bin example-package', 'required release entry']
      },
      {
        path: 'dist/helper.js',
        sources: ['package bin example-helper']
      }
    ]
  );
});

test('getReleaseEntryPoints covers string package bin entries', () => {
  assert.deepEqual(
    getReleaseEntryPoints({
      main: 'dist/main.js',
      bin: './dist/cli.js'
    }),
    [
      {
        path: 'dist/main.js',
        sources: ['package main']
      },
      {
        path: 'dist/cli.js',
        sources: ['package bin']
      },
      {
        path: 'dist/index.js',
        sources: ['required release entry']
      }
    ]
  );
});

test('validateEntryPointFile stats, reads, and syntax-checks a valid entry point', () => {
  const fixtureDir = makeFixtureDir('valid-entry-');
  writeFileSync(join(fixtureDir, 'entry.js'), 'const answer = 42;\n');

  assert.deepEqual(
    validateEntryPointFile('entry.js', fixtureDir),
    {
      size: 19
    }
  );
});

test('validateEntryPointFile rejects a missing entry point', () => {
  const fixtureDir = makeFixtureDir('missing-entry-');

  assert.throws(
    () => validateEntryPointFile('entry.js', fixtureDir),
    new RegExp('file does not exist')
  );
});

test('validateEntryPointFile rejects directories as entry points', () => {
  const fixtureDir = makeFixtureDir('directory-entry-');
  mkdirSync(join(fixtureDir, 'entry.js'));

  assert.throws(
    () => validateEntryPointFile('entry.js', fixtureDir),
    new RegExp('path is not a file')
  );
});

test('validateEntryPointFile rejects empty entry points', () => {
  const fixtureDir = makeFixtureDir('empty-entry-');
  writeFileSync(join(fixtureDir, 'entry.js'), '  \n');

  assert.throws(
    () => validateEntryPointFile('entry.js', fixtureDir),
    new RegExp('file is empty')
  );
});

test('validateEntryPointFile rejects syntax-invalid entry points', () => {
  const fixtureDir = makeFixtureDir('invalid-entry-');
  writeFileSync(join(fixtureDir, 'entry.js'), 'const broken = ;\n');

  assert.throws(
    () => validateEntryPointFile('entry.js', fixtureDir),
    new RegExp('node --check failed')
  );
});

function makeFixtureDir(prefix) {
  const fixtureDir = join(tmpdir(), `validate-release-${prefix}${process.pid}-${Date.now()}`);
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  return fixtureDir;
}
