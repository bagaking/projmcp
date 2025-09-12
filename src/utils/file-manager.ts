/**
 * File management utilities for project plan operations
 * Follows SRP: Single responsibility for file system operations
 * Implements comprehensive security validation and structured logging
 */

import { constants, promises as fs } from 'fs';
import { resolve } from 'path';
import { FileInfo, FileType, FILE_PATTERNS, ProjectStatus } from '../types.js';
import { IFileManager, ILogger } from '../interfaces/core-interfaces.js';
import { SecurityValidator, DEFAULT_SECURITY_CONFIG } from './security-validator.js';
import { LoggerFactory, LoggerUtils } from '../services/logger.js';

/**
 * Core file manager class following best practices
 * Implements IFileManager interface with comprehensive security and logging
 */
export class FileManager implements IFileManager {
  private readonly projectPlanDir: string;
  private readonly securityValidator: SecurityValidator;
  private readonly logger: ILogger;

  constructor(basePath: string = process.cwd()) {
    this.projectPlanDir = resolve(basePath, 'project_plan');
    this.securityValidator = new SecurityValidator(DEFAULT_SECURITY_CONFIG, this.projectPlanDir);
    this.logger = LoggerFactory.getLogger();
    
    this.logger.info('FileManager initialized', { 
      projectPlanDir: this.projectPlanDir,
      basePath 
    });
  }

  /**
   * Ensure project_plan directory exists
   */
  async ensureProjectPlanDir(): Promise<void> {
    try {
      await this.securityValidator.validateTrustedBasePath();
    } catch (error) {
      if (!this.isNotFoundError(error)) {
        throw error;
      }

      await fs.mkdir(this.projectPlanDir, { recursive: true });
      await this.securityValidator.validateTrustedBasePath();
    }
  }

  /**
   * Get project plan directory path
   */
  getProjectPlanDir(): string {
    return this.projectPlanDir;
  }

  /**
   * Check if project plan directory exists and has core files
   */
  async hasValidProjectPlan(): Promise<boolean> {
    try {
      await this.securityValidator.validateTrustedBasePath();
      
      // Check for core files
      const planExists = await this.isTrustedRegularFile('PLAN.md');
      const currentExists = await this.isTrustedRegularFile('CURRENT.md');
      
      return planExists && currentExists;
    } catch (error) {
      if (!this.isNotFoundError(error)) {
        throw error;
      }

      return false;
    }
  }

  /**
   * List files in project_plan directory with filtering and metadata
   */
  async listFiles(type: FileType = 'all'): Promise<FileInfo[]> {
    await this.ensureProjectPlanDir();

    const files = await fs.readdir(this.projectPlanDir);
    const fileInfos: FileInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fileType = this.categorizeFile(file);
      
      // Apply type filter
      if (type !== 'all' && fileType !== type) continue;

      try {
        const regularFile = await this.validateTrustedRegularFile(file);
        const content = await this.readRegularFileNoFollow(regularFile.path);
        const lineCount = content.split('\n').length;

        fileInfos.push({
          name: file,
          path: regularFile.path,
          type: fileType,
          lineCount,
          lastModified: regularFile.stats.mtime.toISOString(),
          size: regularFile.stats.size,
        });
      } catch (error) {
        console.warn(`Failed to read file ${file}:`, error);
      }
    }

    // Sort by type first, then by name
    return fileInfos.sort((a, b) => {
      if (a.type !== b.type) {
        return this.getTypeOrder(a.type) - this.getTypeOrder(b.type);
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get project status summary
   */
  async getProjectStatus(): Promise<ProjectStatus> {
    const hasProjectPlan = await this.hasValidProjectPlan();
    const files = await this.listFiles();
    
    const filesByType: Record<FileType, number> = {
      all: files.length,
      sprint: 0,
      doc: 0,
      code: 0,
      opinion: 0,
    };

    // Count files by type (excluding 'all')
    files.forEach(file => {
      if (file.type !== 'all') {
        filesByType[file.type]++;
      }
    });

    const lastModified = files.length > 0 
      ? Math.max(...files.map(f => new Date(f.lastModified).getTime()))
      : Date.now();

    return {
      hasProjectPlan,
      totalFiles: files.length,
      filesByType,
      lastUpdated: new Date(lastModified).toISOString(),
    };
  }

  /**
   * Read file content safely
   */
  async readFile(filePath: string): Promise<string> {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'FileManager', 'readFile', { filePath });

    try {
      // Enhanced security validation
      const regularFile = await this.validateTrustedRegularFile(filePath);
      
      const content = await this.readRegularFileNoFollow(regularFile.path);
      
      // Additional content validation for security
      this.securityValidator.validateFileContent(content, `file: ${filePath}`);
      
      this.logger.info('File read successfully', { 
        filePath: regularFile.path,
        contentLength: content.length 
      });
      
      LoggerUtils.logPerformance(this.logger, 'readFile', startTime, { filePath });
      return content;
      
    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'FileManager', 'readFile', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * Write file content safely
   */
  async writeFile(fileName: string, content: string): Promise<string> {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'FileManager', 'writeFile', { 
      fileName, 
      contentLength: content.length 
    });

    try {
      await this.ensureProjectPlanDir();
      
      // Comprehensive security validation
      const validatedPath = await this.securityValidator.validateWritableFileOperation(fileName, content, `writeFile: ${fileName}`);
      await this.validateWritableTarget(validatedPath);
      
      // Atomic write operation with backup for existing files
      const fileExists = await this.fileExists(validatedPath);
      let backupPath: string | undefined;
      
      if (fileExists) {
        backupPath = `${validatedPath}.backup.${Date.now()}`;
        await this.copyRegularFileNoFollow(validatedPath, backupPath);
        this.logger.info('Created backup before overwrite', { originalPath: validatedPath, backupPath });
      }

      try {
        await this.writeRegularFileNoFollow(validatedPath, content);
        
        // Cleanup backup on successful write
        if (backupPath) {
          await fs.unlink(backupPath);
        }
        
        this.logger.info('File written successfully', { 
          filePath: validatedPath,
          contentLength: content.length,
          wasOverwrite: fileExists
        });
        
        LoggerUtils.logPerformance(this.logger, 'writeFile', startTime, { fileName });
        return validatedPath;
        
      } catch (writeError) {
        // Restore from backup if write failed and backup exists
        if (backupPath && await this.fileExists(backupPath)) {
          try {
            await fs.rename(backupPath, validatedPath);
            this.logger.info('Restored from backup after write failure', { filePath: validatedPath });
          } catch (restoreError) {
            this.logger.error('Failed to restore from backup', restoreError as Error, { 
              originalPath: validatedPath, 
              backupPath 
            });
          }
        }
        throw writeError;
      }
      
    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'FileManager', 'writeFile', error as Error, { fileName });
      throw error;
    }
  }

  /**
   * Validate file accessibility and permissions
   * @param filePath - Path to validate
   * @throws Error if file is not accessible
   */
  private async validateFileAccessibility(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`File not accessible: ${filePath}`);
    }
  }

  private async validateTrustedRegularFile(filePath: string) {
    const validatedPath = this.securityValidator.validateFilePath(filePath);
    const stats = await fs.lstat(validatedPath);

    if (stats.isSymbolicLink()) {
      throw new Error('SecurityValidation: Refusing to read symbolic link target');
    }

    if (!stats.isFile()) {
      throw new Error('SecurityValidation: Refusing to read non-file target');
    }

    await this.securityValidator.validateResolvedPathContainment(validatedPath);
    await this.validateFileAccessibility(validatedPath);

    return {
      path: validatedPath,
      stats,
    };
  }

  private async isTrustedRegularFile(filePath: string): Promise<boolean> {
    try {
      await this.validateTrustedRegularFile(filePath);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error) || this.isSecurityValidationError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async validateWritableTarget(filePath: string): Promise<void> {
    try {
      const stats = await fs.lstat(filePath);
      if (stats.isSymbolicLink()) {
        throw new Error('SecurityValidation: Refusing to write symbolic link target');
      }
      if (!stats.isFile()) {
        throw new Error('SecurityValidation: Refusing to write non-file target');
      }
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return;
      }
      throw error;
    }
  }

  private async copyRegularFileNoFollow(sourcePath: string, backupPath: string): Promise<void> {
    this.assertNoFollowAvailable();

    const sourceHandle = await fs.open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const content = await sourceHandle.readFile();
      const backupHandle = await fs.open(
        backupPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        0o600
      );
      try {
        await backupHandle.writeFile(content);
      } finally {
        await backupHandle.close();
      }
    } finally {
      await sourceHandle.close();
    }
  }

  private async readRegularFileNoFollow(filePath: string): Promise<string> {
    this.assertNoFollowAvailable();

    const fileHandle = await fs.open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      return await fileHandle.readFile('utf-8');
    } finally {
      await fileHandle.close();
    }
  }

  private async writeRegularFileNoFollow(filePath: string, content: string): Promise<void> {
    this.assertNoFollowAvailable();

    const fileHandle = await fs.open(
      filePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
      0o600
    );

    try {
      await fileHandle.writeFile(content, 'utf-8');
    } finally {
      await fileHandle.close();
    }
  }

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'ENOENT';
  }

  private isSecurityValidationError(error: unknown): boolean {
    return error instanceof Error && error.message.startsWith('SecurityValidation:');
  }

  private assertNoFollowAvailable(): void {
    if (typeof constants.O_NOFOLLOW !== 'number') {
      throw new Error('SecurityValidation: O_NOFOLLOW is unavailable on this platform');
    }
  }

  /**
   * Generate next sequential filename for record types
   */
  async generateFileName(type: 'doc' | 'code' | 'opinion', target: string): Promise<string> {
    const files = await this.listFiles(type);
    
    let nextNumber = 1;
    const prefix = type === 'doc' ? 'DOCREF_' : 
      type === 'code' ? 'CODEREF_' : 
        'OPINIONS_';

    if (type === 'doc' || type === 'opinion') {
      // For numbered types, find the next available number
      const existingNumbers = files
        .map(f => f.name.match(new RegExp(`^${prefix}(\\d{3})`)))
        .filter(match => match)
        .map(match => parseInt(match![1], 10));

      if (existingNumbers.length > 0) {
        nextNumber = Math.max(...existingNumbers) + 1;
      }

      const paddedNumber = nextNumber.toString().padStart(3, '0');
      const sanitizedTarget = this.sanitizeFileName(target);
      return `${prefix}${paddedNumber}.${sanitizedTarget}.md`;
    } else {
      // For code references, use descriptive naming
      const sanitizedTarget = this.sanitizeFileName(target);
      return `${prefix}${sanitizedTarget}.md`;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Categorize file based on naming patterns
   */
  private categorizeFile(fileName: string): FileType {
    if (FILE_PATTERNS.sprint.test(fileName)) return 'sprint';
    if (FILE_PATTERNS.doc.test(fileName)) return 'doc';
    if (FILE_PATTERNS.code.test(fileName)) return 'code';
    if (FILE_PATTERNS.opinion.test(fileName)) return 'opinion';
    return 'doc'; // Default fallback
  }

  /**
   * Get sort order for file types
   */
  private getTypeOrder(type: FileType): number {
    const order = { sprint: 0, doc: 1, code: 2, opinion: 3, all: 4 };
    return order[type] ?? 5;
  }

  /**
   * Sanitize filename for safe file system usage
   */
  private sanitizeFileName(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
