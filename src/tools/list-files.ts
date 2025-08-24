import { z } from 'zod';
import { IFileManager, ITool, IToolResponse } from '../interfaces/core-interfaces.js';

export const ListFilesSchema = z.object({
  type: z.enum(['all', 'sprint', 'doc', 'code', 'opinion'])
});

export type ListFilesArgs = z.infer<typeof ListFilesSchema>;

export class ListFilesTool implements ITool {
  readonly name = 'list_files';
  readonly description = 'List files in project_plan directory with comprehensive metadata and statistics';
  readonly inputSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['all', 'sprint', 'doc', 'code', 'opinion'],
        description: 'Filter files by type'
      }
    },
    required: ['type'],
    additionalProperties: false,
    $schema: 'http://json-schema.org/draft-07/schema#'
  };

  constructor(private fileManager: IFileManager) {}

  async execute(args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      // Validate and parse arguments
      const parsedArgs = ListFilesSchema.parse(args);
      
      const files = await this.fileManager.listFiles(parsedArgs.type);
      const status = await this.fileManager.getProjectStatus();

      // Enhanced statistics calculation
      const fileList = files.map(file => ({
        name: file.name,
        type: file.type,
        lines: file.lineCount,
        words: this.estimateWordCount(file.lineCount),
        characters: file.size,
        modified: file.lastModified.split('T')[0],
        size_kb: Math.round(file.size / 1024 * 100) / 100,
        relative_size: this.categorizeFileSize(file.size)
      }));

      // Comprehensive summary with enhanced metrics
      const summary = {
        total_files: files.length,
        type_filter: parsedArgs.type,
        has_project_plan: status.hasProjectPlan,
        statistics: {
          total_lines: fileList.reduce((sum, file) => sum + file.lines, 0),
          total_words: fileList.reduce((sum, file) => sum + file.words, 0),
          total_size_kb: Math.round(fileList.reduce((sum, file) => sum + file.size_kb, 0) * 100) / 100,
          average_lines_per_file: files.length > 0 ? Math.round(fileList.reduce((sum, file) => sum + file.lines, 0) / files.length) : 0,
          largest_file: fileList.length > 0 ? fileList.reduce((max, file) => file.lines > max.lines ? file : max, fileList[0]) : null,
          file_type_breakdown: this.calculateFileTypeBreakdown(fileList)
        },
        last_updated: new Date().toISOString()
      };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ summary, files: fileList }, null, 2)
        }],
        _meta: {
          tool: this.name,
          execution_time: new Date().toISOString(),
          file_count: files.length
        }
      };

    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing files: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true,
        _meta: {
          tool: this.name,
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      };
    }
  }

  /**
   * Estimate word count based on line count (average ~8 words per line for documentation)
   */
  private estimateWordCount(lineCount: number): number {
    return Math.round(lineCount * 8);
  }

  /**
   * Categorize file size for human-friendly display
   */
  private categorizeFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) return 'tiny';
    if (sizeInBytes < 5120) return 'small';
    if (sizeInBytes < 20480) return 'medium';
    if (sizeInBytes < 102400) return 'large';
    return 'very_large';
  }

  /**
   * Calculate breakdown by file type
   */
  private calculateFileTypeBreakdown(fileList: Array<{ type: string; lines: number; size_kb: number }>): Record<string, { count: number; total_lines: number; total_size_kb: number }> {
    const breakdown: Record<string, { count: number; total_lines: number; total_size_kb: number }> = {};
    
    for (const file of fileList) {
      if (!breakdown[file.type]) {
        breakdown[file.type] = { count: 0, total_lines: 0, total_size_kb: 0 };
      }
      breakdown[file.type].count++;
      breakdown[file.type].total_lines += file.lines;
      breakdown[file.type].total_size_kb += file.size_kb;
    }

    // Round size values
    Object.values(breakdown).forEach(stats => {
      stats.total_size_kb = Math.round(stats.total_size_kb * 100) / 100;
    });

    return breakdown;
  }
}