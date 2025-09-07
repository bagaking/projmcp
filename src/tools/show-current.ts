import { z } from 'zod';
import { ITool, IToolResponse, IFileManager } from '../interfaces/core-interfaces.js';
import { getRightNowTime } from '../utils/time-helper.js';

/**
 * Tool for showing current project status
 */
export class ShowCurrentTool implements ITool {
  readonly name = 'show_current';
  readonly description = 'Display the current project status from CURRENT.md';
  readonly inputSchema = {}; // No parameters required

  constructor(private readonly fileManager: IFileManager) {}

  async execute(_args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      const rightNow = getRightNowTime();
      const content = await this.fileManager.readFile('CURRENT.md');
      
      return {
        content: [{
          type: 'text' as const,
          text: content
        }],
        _meta: {
          tool: this.name,
          right_now: rightNow
        }
      };
    } catch (error) {
      const rightNow = getRightNowTime();
      const errorMessage = this.isNotFoundError(error)
        ? 'CURRENT.md not found. Please run init_project_plan first.'
        : `Error reading CURRENT.md: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      return {
        content: [{
          type: 'text' as const,
          text: errorMessage
        }],
        isError: true,
        _meta: {
          tool: this.name,
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
          right_now: rightNow
        }
      };
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return (error as { code?: string }).code === 'ENOENT';
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes('not found');
  }
}
