/**
 * File management utilities for project plan operations
 * Follows SRP: Single responsibility for file system operations
 */

import { promises as fs } from 'fs';
import { join, resolve, dirname } from 'path';
import { FileInfo, FileType, FILE_PATTERNS, ProjectStatus } from '../types.js';

/**
 * Core file manager class following best practices
 */
export class FileManager {
  private readonly projectPlanDir: string;

  constructor(basePath: string = process.cwd()) {
    this.projectPlanDir = resolve(basePath, 'project_plan');
  }

  /**
   * Ensure project_plan directory exists
   */
  async ensureProjectPlanDir(): Promise<void> {
    try {
      await fs.access(this.projectPlanDir);
    } catch {
      await fs.mkdir(this.projectPlanDir, { recursive: true });
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
      await fs.access(this.projectPlanDir);
      
      // Check for core files
      const planExists = await this.fileExists(join(this.projectPlanDir, 'PLAN.md'));
      const currentExists = await this.fileExists(join(this.projectPlanDir, 'CURRENT.md'));
      
      return planExists && currentExists;
    } catch {
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

      const filePath = join(this.projectPlanDir, file);
      const fileType = this.categorizeFile(file);
      
      // Apply type filter
      if (type !== 'all' && fileType !== type) continue;

      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const lineCount = content.split('\n').length;

        fileInfos.push({
          name: file,
          path: filePath,
          type: fileType,
          lineCount,
          lastModified: stats.mtime.toISOString(),
          size: stats.size,
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
    const resolvedPath = resolve(filePath);
    
    // Security: Ensure path is within project_plan directory
    if (!resolvedPath.startsWith(this.projectPlanDir)) {
      throw new Error('Access denied: File must be within project_plan directory');
    }

    return await fs.readFile(resolvedPath, 'utf-8');
  }

  /**
   * Write file content safely
   */
  async writeFile(fileName: string, content: string): Promise<string> {
    await this.ensureProjectPlanDir();
    
    const filePath = join(this.projectPlanDir, fileName);
    
    // Ensure we're writing to project_plan directory
    if (dirname(filePath) !== this.projectPlanDir) {
      throw new Error('Access denied: Can only write files to project_plan directory');
    }

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
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
  private async fileExists(path: string): Promise<boolean> {
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