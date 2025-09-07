import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, mkdir, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { InitProjectTool } from '../dist/tools/init-project.js';
import { ListFilesTool } from '../dist/tools/list-files.js';
import { ProjectPlanMCPServer } from '../dist/services/mcp-server.js';
import { QuerySprintTool } from '../dist/tools/query-sprint.js';
import { ShowCurrentTool } from '../dist/tools/show-current.js';
import { ShowPlanTool } from '../dist/tools/show-plan.js';
import { ShowStatusTool } from '../dist/tools/show-status.js';
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

test('security validator rejects sibling paths sharing the trusted base prefix', () => {
  const trustedBasePath = join(tmpdir(), 'project_plan');
  const validator = new SecurityValidator(DEFAULT_SECURITY_CONFIG, trustedBasePath);

  assert.equal(
    throwsMessage(() => validator.validateFilePath('../project_plan_evil/PLAN.md')).includes('path'),
    true
  );
});

test('security validator accepts only top-level filenames', () => {
  const validator = new SecurityValidator(
    DEFAULT_SECURITY_CONFIG,
    join(tmpdir(), 'project_plan')
  );

  assert.equal(
    throwsMessage(() => validator.validateFilePath('subdir/file.md')).includes('nested'),
    true
  );
  assert.equal(
    throwsMessage(() => validator.validateFilePath('subdir\\file.md')).includes('nested'),
    true
  );
  assert.equal(
    throwsMessage(() => validator.validateFilePath('./PLAN.md')).includes('nested'),
    true
  );
});

test('file manager rejects nested read and write paths', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);

    await fileManager.ensureProjectPlanDir();

    await assert.rejects(
      () => fileManager.readFile('subdir/file.md'),
      new RegExp('nested paths', 'i')
    );
    await assert.rejects(
      () => fileManager.writeFile('subdir/file.md', 'content'),
      new RegExp('nested paths', 'i')
    );
  });
});

test('file manager rejects symlink read escapes from project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const outsideDir = join(baseDir, 'outside');
    const outsideFile = join(outsideDir, 'OUTSIDE.md');

    await fileManager.ensureProjectPlanDir();
    await mkdir(outsideDir);
    await writeFile(outsideFile, 'outside secret', 'utf-8');
    await symlink(outsideFile, join(fileManager.getProjectPlanDir(), 'LINK.md'));

    await assert.rejects(
      () => fileManager.readFile('LINK.md'),
      new RegExp('path traversal', 'i')
    );
  });
});

test('file manager rejects symlink reads even when the target stays in project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const planDir = fileManager.getProjectPlanDir();

    await fileManager.ensureProjectPlanDir();
    await writeFile(join(planDir, 'TARGET.md'), 'inside content', 'utf-8');
    await symlink(join(planDir, 'TARGET.md'), join(planDir, 'LINK.md'));

    await assert.rejects(
      () => fileManager.readFile('LINK.md'),
      new RegExp('ELOOP|symbolic link|symlink|too many', 'i')
    );
  });
});

test('file manager listFiles skips symlink entries escaping project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const outsideDir = join(baseDir, 'outside');
    const outsideFile = join(outsideDir, 'OUTSIDE.md');

    await fileManager.ensureProjectPlanDir();
    await mkdir(outsideDir);
    await writeFile(outsideFile, 'outside secret\nsecond line', 'utf-8');
    await symlink(outsideFile, join(fileManager.getProjectPlanDir(), 'DOCREF_001.escape.md'));

    const files = await fileManager.listFiles('all');

    assert.deepEqual(
      files.map((file) => file.name),
      []
    );
  });
});

test('file manager listFiles skips symlink entries inside project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const planDir = fileManager.getProjectPlanDir();

    await fileManager.ensureProjectPlanDir();
    await writeFile(join(planDir, 'DOCREF_001.target.md'), 'inside content', 'utf-8');
    await symlink(join(planDir, 'DOCREF_001.target.md'), join(planDir, 'DOCREF_002.link.md'));

    const files = await fileManager.listFiles('all');

    assert.deepEqual(
      files.map((file) => file.name),
      ['DOCREF_001.target.md']
    );
  });
});

test('file manager does not report symlinked core files as a valid project plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const planDir = fileManager.getProjectPlanDir();

    await fileManager.ensureProjectPlanDir();
    await writeFile(join(planDir, 'PLAN.target.md'), 'plan content', 'utf-8');
    await writeFile(join(planDir, 'CURRENT.target.md'), 'current content', 'utf-8');
    await symlink(join(planDir, 'PLAN.target.md'), join(planDir, 'PLAN.md'));
    await symlink(join(planDir, 'CURRENT.target.md'), join(planDir, 'CURRENT.md'));

    assert.equal(await fileManager.hasValidProjectPlan(), false);
    assert.equal((await fileManager.getProjectStatus()).hasProjectPlan, false);

    const listedNames = (await fileManager.listFiles('all')).map((file) => file.name);
    assert.equal(listedNames.includes('PLAN.md'), false);
    assert.equal(listedNames.includes('CURRENT.md'), false);
  });
});

test('show_current and show_plan preserve security errors instead of reporting not found', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const planDir = fileManager.getProjectPlanDir();

    await fileManager.ensureProjectPlanDir();
    await writeFile(join(planDir, 'PLAN.target.md'), 'plan content', 'utf-8');
    await writeFile(join(planDir, 'CURRENT.target.md'), 'current content', 'utf-8');
    await symlink(join(planDir, 'PLAN.target.md'), join(planDir, 'PLAN.md'));
    await symlink(join(planDir, 'CURRENT.target.md'), join(planDir, 'CURRENT.md'));

    const currentResult = await new ShowCurrentTool(fileManager).execute({});
    assert.equal(currentResult.isError, true);
    assert.match(responseText(currentResult), new RegExp('SecurityValidation|symbolic link', 'i'));
    assert.equal(responseText(currentResult).includes('not found'), false);

    const planResult = await new ShowPlanTool(fileManager).execute({});
    assert.equal(planResult.isError, true);
    assert.match(responseText(planResult), new RegExp('SecurityValidation|symbolic link', 'i'));
    assert.equal(responseText(planResult).includes('not found'), false);

    const statusTool = new ShowStatusTool(fileManager);
    assert.match(responseText(await statusTool.showCurrent()), new RegExp('SecurityValidation|symbolic link', 'i'));
    assert.match(responseText(await statusTool.showPlan()), new RegExp('SecurityValidation|symbolic link', 'i'));
  });
});

test('file manager rejects symlink write escapes from project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const outsideDir = join(baseDir, 'outside');
    const outsideFile = join(outsideDir, 'OUTSIDE.md');

    await fileManager.ensureProjectPlanDir();
    await mkdir(outsideDir);
    await writeFile(outsideFile, 'outside secret', 'utf-8');
    await symlink(outsideFile, join(fileManager.getProjectPlanDir(), 'LINK.md'));

    await assert.rejects(
      () => fileManager.writeFile('LINK.md', 'overwrite attempt'),
      new RegExp('path traversal', 'i')
    );
  });
});

test('file manager rejects symlink writes even when the target stays in project_plan', async () => {
  await withTempProject(async (baseDir) => {
    const fileManager = new FileManager(baseDir);
    const planDir = fileManager.getProjectPlanDir();

    await fileManager.ensureProjectPlanDir();
    await writeFile(join(planDir, 'TARGET.md'), 'inside content', 'utf-8');
    await symlink(join(planDir, 'TARGET.md'), join(planDir, 'LINK.md'));

    await assert.rejects(
      () => fileManager.writeFile('LINK.md', 'overwrite attempt'),
      new RegExp('symbolic link', 'i')
    );
  });
});

test('file manager rejects a symlinked project_plan root', async () => {
  await withTempProject(async (baseDir) => {
    const outsideDir = join(baseDir, 'outside');
    const outsideFile = join(outsideDir, 'PLAN.md');
    const projectPlanLink = join(baseDir, 'project_plan');
    const fileManager = new FileManager(baseDir);

    await mkdir(outsideDir);
    await writeFile(outsideFile, 'outside content', 'utf-8');
    await symlink(outsideDir, projectPlanLink);

    await assert.rejects(
      () => fileManager.hasValidProjectPlan(),
      new RegExp('symbolic link', 'i')
    );
    await assert.rejects(
      () => fileManager.readFile('PLAN.md'),
      new RegExp('symbolic link', 'i')
    );
    await assert.rejects(
      () => fileManager.writeFile('PLAN.md', 'overwrite attempt'),
      new RegExp('symbolic link', 'i')
    );
    await assert.rejects(
      () => fileManager.listFiles('all'),
      new RegExp('symbolic link', 'i')
    );
  });
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
