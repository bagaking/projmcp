#!/usr/bin/env node

/**
 * Comprehensive release validation script
 * Ensures code quality, build integrity, and package readiness before publishing
 */

import { execFileSync, execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'node:url';

const REQUIRED_FILES = [
  'README.md',
  'package.json',
  'dist/index.js'
];

const OPTIONAL_FILES = [
  'LICENSE',
  'CHANGELOG.md'
];

const REQUIRED_ENTRY_POINTS = [
  {
    source: 'required release entry',
    path: 'dist/index.js'
  }
];

export function parsePackageManifest(stdout) {
  let foundJsonArray = false;
  let packageManifest = null;

  for (const manifestList of parseJsonArrays(stdout)) {
    foundJsonArray = true;
    const manifest = manifestList[0];

    if (isNpmPackManifest(manifest)) {
      packageManifest = manifest;
    }
  }

  if (packageManifest) {
    return packageManifest;
  }

  if (foundJsonArray) {
    throw new Error('npm pack manifest did not include file entries');
  }

  throw new Error('npm pack did not return a JSON manifest');
}

export function normalizePackagePath(file) {
  return file.startsWith('./') ? file.slice(2) : file;
}

export function collectPackageEntryPoints(pkg) {
  const entryPoints = [];

  if (typeof pkg.main === 'string' && pkg.main.length > 0) {
    entryPoints.push({
      source: 'package main',
      path: pkg.main
    });
  }

  if (typeof pkg.bin === 'string' && pkg.bin.length > 0) {
    entryPoints.push({
      source: 'package bin',
      path: pkg.bin
    });
  } else if (pkg.bin && typeof pkg.bin === 'object' && !Array.isArray(pkg.bin)) {
    for (const [name, binPath] of Object.entries(pkg.bin)) {
      if (typeof binPath === 'string' && binPath.length > 0) {
        entryPoints.push({
          source: `package bin ${name}`,
          path: binPath
        });
      }
    }
  }

  return entryPoints;
}

export function getReleaseEntryPoints(pkg) {
  const entryPointUses = new Map();

  for (const entryPoint of [
    ...collectPackageEntryPoints(pkg),
    ...REQUIRED_ENTRY_POINTS
  ]) {
    const entryPath = normalizePackagePath(entryPoint.path);
    const entryPointUse = entryPointUses.get(entryPath) ?? {
      path: entryPath,
      sources: []
    };

    entryPointUse.sources.push(entryPoint.source);
    entryPointUses.set(entryPath, entryPointUse);
  }

  return [...entryPointUses.values()];
}

export function validateEntryPointFile(entryPoint, cwd = process.cwd()) {
  const fullPath = resolve(cwd, entryPoint);
  let stats;

  try {
    stats = statSync(fullPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('file does not exist');
    }
    throw new Error(`could not stat file: ${error.message}`);
  }

  if (!stats.isFile()) {
    throw new Error('path is not a file');
  }

  let contents;
  try {
    contents = readFileSync(fullPath, 'utf8');
  } catch (error) {
    throw new Error(`could not read file: ${error.message}`);
  }

  if (contents.trim().length === 0) {
    throw new Error('file is empty');
  }

  try {
    execFileSync(process.execPath, ['--check', fullPath], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();

    throw new Error(`node --check failed${output ? `: ${output}` : ''}`);
  }

  return {
    size: stats.size
  };
}

function isNpmPackManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return false;
  }

  if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
    return false;
  }

  if (!Array.isArray(manifest.files)) {
    return false;
  }

  return typeof manifest.filename === 'string'
    || manifest.files.some(file => file && typeof file.path === 'string');
}

function *parseJsonArrays(stdout) {
  for (let start = stdout.indexOf('['); start !== -1; start = stdout.indexOf('[', start + 1)) {
    const end = findJsonArrayEnd(stdout, start);

    if (end === -1) {
      continue;
    }

    const candidate = stdout.slice(start, end + 1);

    try {
      const value = JSON.parse(candidate);
      if (Array.isArray(value)) {
        yield value;
      }
    } catch {
      // Keep scanning; prepack/build logs may include bracketed prefixes.
    }
  }
}

function findJsonArrayEnd(input, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

class ReleaseValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
    this.packageManifest = null;
  }

  /**
   * Run all validation checks
   */
  async validate() {
    console.log('🔍 Starting release validation...\n');

    try {
      await this.checkRequiredFiles();
      await this.validatePackageJson();
      await this.checkBuildOutput();
      await this.runCodeQualityChecks();
      await this.validateEntryPoints();
      await this.checkPackageSize();
      await this.validatePublishedContents();
      await this.validateNpmIgnore();
      
      this.printResults();
      
      if (this.errors.length > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Validation failed with error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check all required files exist
   */
  async checkRequiredFiles() {
    console.log('📁 Checking required files...');
    
    for (const file of REQUIRED_FILES) {
      if (!existsSync(file)) {
        this.errors.push(`Missing required file: ${file}`);
      } else {
        console.log(`  ✅ ${file}`);
      }
    }

    for (const file of OPTIONAL_FILES) {
      if (!existsSync(file)) {
        this.warnings.push(`Missing recommended file: ${file}`);
      } else {
        console.log(`  ✅ ${file} (recommended)`);
      }
    }
  }

  /**
   * Validate package.json configuration
   */
  async validatePackageJson() {
    console.log('\n📦 Validating package.json...');
    
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    
    const requiredFields = ['name', 'version', 'description', 'main', 'author', 'license'];
    for (const field of requiredFields) {
      if (!pkg[field]) {
        this.errors.push(`Missing required package.json field: ${field}`);
      } else {
        console.log(`  ✅ ${field}: ${pkg[field]}`);
      }
    }

    // Validate version format
    if (pkg.version && !/^\d+\.\d+\.\d+(-.*)?$/.test(pkg.version)) {
      this.errors.push(`Invalid version format: ${pkg.version}`);
    }

    // Check for proper files array
    if (!pkg.files || !Array.isArray(pkg.files)) {
      this.warnings.push('Consider adding "files" array to control published content');
    } else {
      console.log(`  ✅ files: ${pkg.files.length} entries`);
    }

    // Validate bin entry
    if (pkg.bin) {
      const binPath = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0];
      if (binPath && !existsSync(binPath)) {
        this.errors.push(`Binary file not found: ${binPath}`);
      }
    }
  }

  /**
   * Check build output integrity
   */
  async checkBuildOutput() {
    console.log('\n🔨 Checking build output...');
    
    if (!existsSync('dist')) {
      this.errors.push('dist directory not found - run npm run build first');
      return;
    }

    const distFiles = [
      'dist/index.js',
      'dist/utils/file-manager.js',
      'dist/utils/template-generator.js',
      'dist/services/logger.js',
      'dist/services/tool-registry.js',
      'dist/services/mcp-server.js'
    ];

    for (const file of distFiles) {
      if (!existsSync(file)) {
        this.errors.push(`Missing build output: ${file}`);
      } else {
        const stats = statSync(file);
        console.log(`  ✅ ${file} (${Math.round(stats.size / 1024 * 100) / 100} KB)`);
      }
    }
  }

  /**
   * Run code quality checks
   */
  async runCodeQualityChecks() {
    console.log('\n🔍 Running code quality checks...');
    
    try {
      console.log('  📝 Running ESLint...');
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('  ✅ ESLint passed');
    } catch (error) {
      this.errors.push('ESLint checks failed');
    }

    try {
      console.log('  🔧 Running TypeScript compilation...');
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('  ✅ TypeScript compilation passed');
    } catch (error) {
      this.errors.push('TypeScript compilation failed');
    }

    try {
      console.log('  🧪 Running smoke tests against build output...');
      execSync('node --test tests/*.test.js', { stdio: 'inherit' });
      console.log('  ✅ Smoke tests passed');
    } catch (error) {
      this.errors.push('Smoke tests failed');
    }
  }

  /**
   * Validate entry points work correctly
   */
  async validateEntryPoints() {
    console.log('\n🚀 Validating entry points...');

    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const entryPoints = getReleaseEntryPoints(pkg);

    for (const entryPoint of entryPoints) {
      const sourceLabel = entryPoint.sources.join(', ');

      try {
        const result = validateEntryPointFile(entryPoint.path);
        const sizeKb = Math.round(result.size / 1024 * 100) / 100;
        console.log(`  ✅ ${entryPoint.path} (${sourceLabel}) - file readable, syntax valid (${sizeKb} KB)`);
      } catch (error) {
        this.errors.push(`Entry point ${entryPoint.path} (${sourceLabel}) failed validation: ${error.message}`);
      }
    }
  }

  /**
   * Check package size
   */
  async checkPackageSize() {
    console.log('\n📏 Checking package size...');
    
    try {
      const manifest = this.getPackageManifest();
      
      if (manifest.size) {
        const sizeKb = Math.round(manifest.size / 1024 * 100) / 100;
        const unpackedSizeKb = Math.round(manifest.unpackedSize / 1024 * 100) / 100;
        console.log(`  📦 Package size: ${sizeKb} KB compressed, ${unpackedSizeKb} KB unpacked`);
        
        // Warn if package is too large (> 10MB)
        if (manifest.size > 10 * 1024 * 1024) {
          this.warnings.push(`Package size is quite large: ${sizeKb} KB. Consider excluding unnecessary files.`);
        }
      }
    } catch (error) {
      this.warnings.push('Could not determine package size');
    }
  }

  async validatePublishedContents() {
    console.log('\n📦 Validating published package contents...');

    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
      const manifest = this.getPackageManifest();
      const packedFiles = new Set(manifest.files.map(file => file.path));
      const requiredPackageFiles = new Set([
        'package.json',
        'README.md',
        'LICENSE',
        'CHANGELOG.md',
        pkg.main
      ].map(normalizePackagePath));

      if (pkg.bin) {
        const binEntries = typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin);
        binEntries.forEach(entry => requiredPackageFiles.add(normalizePackagePath(entry)));
      }

      for (const file of requiredPackageFiles) {
        if (!packedFiles.has(file)) {
          this.errors.push(`Published package is missing required file: ${file}`);
        } else {
          console.log(`  ✅ Includes ${file}`);
        }
      }

      const forbiddenPrefixes = ['src/', 'test/', 'tests/', 'scripts/', 'project_plan/', '.github/'];
      const forbiddenFiles = ['manual-test.sh', 'test-enhanced.js', 'debug-schema.js', 'tsconfig.json'];

      const forbiddenPackedFiles = manifest.files
        .map(file => file.path)
        .filter(path =>
          forbiddenPrefixes.some(prefix => path.startsWith(prefix)) ||
          forbiddenFiles.includes(path) ||
          path.startsWith('dist/direct-mcp-server.') ||
          path.startsWith('.eslintrc')
        );

      if (forbiddenPackedFiles.length > 0) {
        this.errors.push(`Published package includes maintainer-only files: ${forbiddenPackedFiles.join(', ')}`);
      } else {
        console.log('  ✅ Excludes source, tests, scripts, and local project planning files');
      }
    } catch (error) {
      this.errors.push(`Could not validate published package contents: ${error.message}`);
    }
  }

  getPackageManifest() {
    if (this.packageManifest) {
      return this.packageManifest;
    }

    const result = execSync('npm pack --dry-run --json', { encoding: 'utf8' });
    this.packageManifest = parsePackageManifest(result);
    return this.packageManifest;
  }

  /**
   * Validate .npmignore configuration
   */
  async validateNpmIgnore() {
    console.log('\n🚫 Validating .npmignore...');
    
    if (!existsSync('.npmignore')) {
      this.warnings.push('No .npmignore file found - consider adding one to control published content');
      return;
    }

    const npmignore = readFileSync('.npmignore', 'utf8');
    const shouldIgnore = ['src/', 'tsconfig.json', '.eslintrc', 'test/', '*.test.'];
    
    for (const pattern of shouldIgnore) {
      if (!npmignore.includes(pattern)) {
        this.warnings.push(`.npmignore should probably include: ${pattern}`);
      } else {
        console.log(`  ✅ Ignoring ${pattern}`);
      }
    }
  }

  /**
   * Print validation results
   */
  printResults() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All checks passed! Ready to publish.');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ ERRORS (must fix):');
        this.errors.forEach(error => console.log(`  • ${error}`));
      }
      
      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS (should consider):');
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }
    
    console.log(`\n⏱️  Validation completed in ${duration}ms`);
    
    if (this.errors.length === 0) {
      console.log('\n✅ Package is ready for publishing!');
      console.log('\nNext steps:');
      console.log('  • npm run release:dry-run  # Test publish without actually publishing');
      console.log('  • npm run release:patch    # Publish patch version');
      console.log('  • npm run release:minor    # Publish minor version');
    } else {
      console.log(`\n❌ Found ${this.errors.length} errors. Please fix them before publishing.`);
    }
  }
}

// Run validation
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const validator = new ReleaseValidator();
  validator.validate().catch(console.error);
}
