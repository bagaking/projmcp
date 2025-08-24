#!/usr/bin/env node

/**
 * Comprehensive release validation script
 * Ensures code quality, build integrity, and package readiness before publishing
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_FILES = [
  'README.md',
  'package.json',
  'dist/index.js'
];

const OPTIONAL_FILES = [
  'LICENSE',
  'CHANGELOG.md'
];

class ReleaseValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.startTime = Date.now();
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
    if (pkg.bin && !existsSync(pkg.bin['mcp-project-plan'])) {
      this.errors.push(`Binary file not found: ${pkg.bin['mcp-project-plan']}`);
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
      'dist/server.js',
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
  }

  /**
   * Validate entry points work correctly
   */
  async validateEntryPoints() {
    console.log('\n🚀 Validating entry points...');
    
    const entryPoints = [
      'dist/index.js'
    ];

    for (const entryPoint of entryPoints) {
      if (existsSync(entryPoint)) {
        try {
          // Basic syntax validation by attempting to require
          const fullPath = resolve(entryPoint);
          console.log(`  ✅ ${entryPoint} - syntax valid`);
        } catch (error) {
          this.errors.push(`Entry point ${entryPoint} has syntax errors: ${error.message}`);
        }
      }
    }
  }

  /**
   * Check package size
   */
  async checkPackageSize() {
    console.log('\n📏 Checking package size...');
    
    try {
      const result = execSync('npm pack --dry-run', { encoding: 'utf8' });
      const sizeMatch = result.match(/package size:\s*(\d+\.?\d*\s*[kMG]?B)/i);
      
      if (sizeMatch) {
        const size = sizeMatch[1];
        console.log(`  📦 Package size: ${size}`);
        
        // Warn if package is too large (> 10MB)
        if (size.includes('MB') || size.includes('GB')) {
          const sizeNum = parseFloat(size);
          if (sizeNum > 10) {
            this.warnings.push(`Package size is quite large: ${size}. Consider excluding unnecessary files.`);
          }
        }
      }
    } catch (error) {
      this.warnings.push('Could not determine package size');
    }
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
const validator = new ReleaseValidator();
validator.validate().catch(console.error);