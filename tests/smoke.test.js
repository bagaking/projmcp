import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { InitProjectTool } from '../dist/tools/init-project.js';
import { ListFilesTool } from '../dist/tools/list-files.js';
import { ProjectPlanMCPServer } from '../dist/services/mcp-server.js';
import { QuerySprintTool } from '../dist/tools/query-sprint.js';
import { FileManager } from '../dist/utils/file-manager.js';
import { SecurityValidator, DEFAULT_SECURITY_CONFIG } from '../dist/utils/security-validator.js';
import { TemplateGenerator } from '../dist/utils/template-generator.js';

process.env.LOG_LEVEL = 'error';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const builtEntryPoint = join(repoRoot, 'dist', 'index.js');

async function withTempProject(fn) {
  const baseDir = await mkdtemp(join(tmpdir(), 'projmcp-'));

  try {
    await fn(baseDir);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
}

function responseText(result) {
  assert.equal(result.content?.[0]?.type, 'text');
  assert.equal(typeof result.content[0].text, 'string');
  return result.content[0].text;
}

test('built tools initialize and inspect a project_plan directory', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const templateGenerator = new TemplateGenerator();

    const initResult = await new InitProjectTool(fileManager, templateGenerator).execute({});
    assert.equal(initResult.isError, undefined);
    assert.equal(
      responseText(initResult).includes('Project plan structure initialized successfully'),
      true
    );
    assert.equal(await fileManager.hasValidProjectPlan(), true);

    const listResult = await new ListFilesTool(fileManager).execute({ type: 'all' });
    assert.equal(listResult.isError, undefined);

    const listing = JSON.parse(responseText(listResult));
    assert.equal(listing.summary.has_project_plan, true);
    assert.equal(listing.summary.total_files, 3);
    assert.deepEqual(
      listing.files.map((file) => file.name).sort(),
      ['CURRENT.md', 'M01_S01.initial_setup.md', 'PLAN.md']
    );

    const sprintResult = await new QuerySprintTool(fileManager).execute({ sprintId: 'M01_S01' });
    assert.equal(sprintResult.isError, undefined);
    assert.equal(responseText(sprintResult).includes('# M01_S01: Initial Setup'), true);
  });
});

test('security validator rejects traversal paths and active content', () => {
  const validator = new SecurityValidator(
    DEFAULT_SECURITY_CONFIG,
    join(tmpdir(), 'project_plan')
  );

  assert.equal(
    throwsMessage(() => validator.validateFilePath('../outside.md')).includes('path'),
    true
  );
  assert.equal(
    throwsMessage(() => validator.validateFileContent('<script>alert(1)</script>')).includes('malicious'),
    true
  );
});

test('security validator consistently rejects repeated malicious content checks', () => {
  const validator = new SecurityValidator(
    DEFAULT_SECURITY_CONFIG,
    join(tmpdir(), 'project_plan')
  );

  const maliciousContent = '<script>alert(1)</script>';

  assert.equal(
    throwsMessage(() => validator.validateFileContent(maliciousContent)).includes('malicious'),
    true
  );
  assert.equal(
    throwsMessage(() => validator.validateFileContent(maliciousContent)).includes('malicious'),
    true
  );
});

test('server status reports the package.json version', () => {
  const fileManager = new FileManager(tmpdir());
  const templateGenerator = new TemplateGenerator();
  const server = new ProjectPlanMCPServer(fileManager, templateGenerator);

  assert.equal(server.getStatus().version, packageJson.version);
});

test('stdio server startup does not write non-protocol logs to stdout', async () => {
  await withTempProject(async (baseDir) => {
    const result = await runServerBriefly(baseDir);

    assert.equal(result.stdout, '');
    assert.equal(result.stderr.includes('MCP Project Plan Server started successfully'), true);
  });
});

function runServerBriefly(cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [builtEntryPoint], {
      cwd,
      env: {
        ...process.env,
        LOG_LEVEL: 'info'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, 500);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.includes('MCP Project Plan Server started successfully')) {
        child.kill('SIGTERM');
      }
    });
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
    child.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ stdout, stderr });
      }
    });
  });
}

function throwsMessage(fn) {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  }
  assert.fail('expected function to throw');
}
