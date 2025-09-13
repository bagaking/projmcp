import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertExactToolNames,
  collectToolNamesFromListResponse,
  EXPECTED_MCP_TOOL_NAMES,
  getReleaseEntryPoints,
  parsePackageManifest,
  parseJsonRpcStdoutLine,
  runMcpJsonRpcSmoke,
  selectPackageBinName,
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

test('release smoke expected tools match the README JSON-RPC smoke surface', () => {
  assert.deepEqual(
    EXPECTED_MCP_TOOL_NAMES,
    getReadmeJsonRpcSmokeToolMarker()
  );
});

test('assertExactToolNames accepts only the exact expected tool set', () => {
  assert.doesNotThrow(() => assertExactToolNames(EXPECTED_MCP_TOOL_NAMES));

  assert.throws(
    () => assertExactToolNames(EXPECTED_MCP_TOOL_NAMES.filter(name => name !== 'right_now')),
    new RegExp('tools/list missing expected tools: right_now')
  );

  assert.throws(
    () => assertExactToolNames([...EXPECTED_MCP_TOOL_NAMES, 'debug_tool']),
    new RegExp('tools/list included unexpected tools: debug_tool')
  );
});

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

test('parseJsonRpcStdoutLine accepts JSON-RPC stdout lines', () => {
  assert.deepEqual(
    parseJsonRpcStdoutLine('{"jsonrpc":"2.0","id":1,"result":{}}'),
    {
      jsonrpc: '2.0',
      id: 1,
      result: {}
    }
  );
});

test('parseJsonRpcStdoutLine rejects non-protocol stdout pollution', () => {
  assert.throws(
    () => parseJsonRpcStdoutLine('server started'),
    new RegExp('non-JSON-RPC output')
  );

  assert.throws(
    () => parseJsonRpcStdoutLine('{"message":"server started"}'),
    new RegExp('jsonrpc 2.0 marker')
  );
});

test('collectToolNamesFromListResponse extracts tool names', () => {
  assert.deepEqual(
    collectToolNamesFromListResponse({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: [
          { name: 'list_files' },
          { name: 'init_project_plan' }
        ]
      }
    }),
    ['list_files', 'init_project_plan']
  );
});

test('collectToolNamesFromListResponse rejects error or malformed responses', () => {
  assert.throws(
    () => collectToolNamesFromListResponse({
      jsonrpc: '2.0',
      id: 2,
      error: {
        code: -32603,
        message: 'broken'
      }
    }),
    new RegExp('returned an error')
  );

  assert.throws(
    () => collectToolNamesFromListResponse({
      jsonrpc: '2.0',
      id: 2,
      result: {}
    }),
    new RegExp('tools array')
  );
});

test('runMcpJsonRpcSmoke sends tools/list once when server notifications arrive first', async () => {
  const fixtureDir = makeFixtureDir('jsonrpc-notification-');
  const serverPath = join(fixtureDir, 'server.mjs');

  writeFileSync(serverPath, `
let buffer = '';
let toolsListCount = 0;

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newlineIndex = buffer.indexOf('\\n');

  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      handleMessage(JSON.parse(line));
    }

    newlineIndex = buffer.indexOf('\\n');
  }
});

function writeMessage(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

function handleMessage(message) {
  if (message.id === 1) {
    writeMessage({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    writeMessage({ jsonrpc: '2.0', method: 'notifications/progress', params: { step: 'ready' } });
    return;
  }

  if (message.id === 2 && message.method === 'tools/list') {
    toolsListCount += 1;
    setTimeout(() => {
      writeMessage({
        jsonrpc: '2.0',
        id: 2,
        result: {
          seenToolsList: toolsListCount,
          tools: ${toolListLiteral()}
        }
      });
    }, 50);
  }
}
`);

  const result = await runMcpJsonRpcSmoke(process.execPath, {
    args: [serverPath],
    cwd: fixtureDir,
    timeoutMs: 5000
  });
  const response = result.stdout
    .trim()
    .split('\n')
    .map(line => JSON.parse(line))
    .find(message => message.id === 2);

  assert.equal(response.result.seenToolsList, 1);
});

test('runMcpJsonRpcSmoke rejects servers missing default release tools', async () => {
  const fixtureDir = makeFixtureDir('jsonrpc-missing-release-tool-');
  const serverPath = join(fixtureDir, 'server.mjs');

  writeFileSync(serverPath, `
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newlineIndex = buffer.indexOf('\\n');

  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      handleMessage(JSON.parse(line));
    }

    newlineIndex = buffer.indexOf('\\n');
  }
});

function writeMessage(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

function handleMessage(message) {
  if (message.id === 1) {
    writeMessage({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    return;
  }

  if (message.id === 2 && message.method === 'tools/list') {
    writeMessage({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: ${toolListLiteral(EXPECTED_MCP_TOOL_NAMES.filter(name => name !== 'right_now'))}
      }
    });
  }
}
`);

  await assert.rejects(
    runMcpJsonRpcSmoke(process.execPath, {
      args: [serverPath],
      cwd: fixtureDir,
      timeoutMs: 5000
    }),
    new RegExp('tools/list missing expected tools: right_now')
  );
});

test('runMcpJsonRpcSmoke rejects servers with unexpected release tools', async () => {
  const fixtureDir = makeFixtureDir('jsonrpc-unexpected-release-tool-');
  const serverPath = join(fixtureDir, 'server.mjs');

  writeFileSync(serverPath, `
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newlineIndex = buffer.indexOf('\\n');

  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      handleMessage(JSON.parse(line));
    }

    newlineIndex = buffer.indexOf('\\n');
  }
});

function writeMessage(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

function handleMessage(message) {
  if (message.id === 1) {
    writeMessage({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    return;
  }

  if (message.id === 2 && message.method === 'tools/list') {
    writeMessage({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: ${toolListLiteral([...EXPECTED_MCP_TOOL_NAMES, 'debug_tool'])}
      }
    });
  }
}
`);

  await assert.rejects(
    runMcpJsonRpcSmoke(process.execPath, {
      args: [serverPath],
      cwd: fixtureDir,
      timeoutMs: 5000
    }),
    new RegExp('tools/list included unexpected tools: debug_tool')
  );
});

test('runMcpJsonRpcSmoke rejects trailing stdout without a JSON-RPC newline', async () => {
  const fixtureDir = makeFixtureDir('jsonrpc-trailing-stdout-');
  const serverPath = join(fixtureDir, 'server.mjs');

  writeFileSync(serverPath, `
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newlineIndex = buffer.indexOf('\\n');

  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      handleMessage(JSON.parse(line));
    }

    newlineIndex = buffer.indexOf('\\n');
  }
});

function writeMessage(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

function handleMessage(message) {
  if (message.id === 1) {
    writeMessage({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    return;
  }

  if (message.id === 2 && message.method === 'tools/list') {
    writeMessage({
      jsonrpc: '2.0',
      id: 2,
      result: {
        tools: ${toolListLiteral()}
      }
    });
    process.stdout.write('server started');
  }
}
`);

  await assert.rejects(
    runMcpJsonRpcSmoke(process.execPath, {
      args: [serverPath],
      cwd: fixtureDir,
      timeoutMs: 5000
    }),
    new RegExp('incomplete JSON-RPC output')
  );
});

test('selectPackageBinName returns string and object bin names', () => {
  assert.equal(
    selectPackageBinName({
      name: 'example-package',
      bin: 'dist/index.js'
    }),
    'example-package'
  );

  assert.equal(
    selectPackageBinName({
      name: '@scope/example-package',
      bin: {
        'example-bin': 'dist/index.js'
      }
    }),
    'example-bin'
  );
});

test('selectPackageBinName rejects packages without bin entries', () => {
  assert.throws(
    () => selectPackageBinName({ name: 'example-package' }),
    new RegExp('does not define a bin entry')
  );
});

function toolListLiteral(toolNames = EXPECTED_MCP_TOOL_NAMES) {
  return JSON.stringify(toolNames.map(name => ({ name })), null, 10);
}

function getReadmeJsonRpcSmokeToolMarker() {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const markerPattern = new RegExp(
    '<!--\\s*projmcp:json-rpc-smoke-tools\\s+(\\[[^\\n]*\\])\\s*-->'
  );
  const markerJson = readme.match(markerPattern)?.[1];

  assert.ok(markerJson, 'README must include the projmcp:json-rpc-smoke-tools marker');
  const toolNames = JSON.parse(markerJson);

  assert.ok(Array.isArray(toolNames), 'README JSON-RPC smoke tools marker must be an array');
  assert.ok(toolNames.every(name => typeof name === 'string'), 'README JSON-RPC smoke tools marker must contain only strings');

  return toolNames;
}

function makeFixtureDir(prefix) {
  const fixtureDir = join(tmpdir(), `validate-release-${prefix}${process.pid}-${Date.now()}`);
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  return fixtureDir;
}
