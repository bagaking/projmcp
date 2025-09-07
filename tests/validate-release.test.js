import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePackageManifest } from '../scripts/validate-release.js';

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
