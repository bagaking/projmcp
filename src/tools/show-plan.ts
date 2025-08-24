import { z } from 'zod';
import { ITool, IToolResponse, IFileManager } from '../interfaces/core-interfaces.js';
import { getRightNowTime } from '../utils/time-helper.js';

/**
 * Tool for showing project plan
 */
export class ShowPlanTool implements ITool {
  readonly name = 'show_plan';
  readonly description = 'Display the project plan from PLAN.md';
  readonly inputSchema = {}; // No parameters required

  constructor(private readonly fileManager: IFileManager) {}

  async execute(_args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      const rightNow = getRightNowTime();
      const content = await this.fileManager.readFile('PLAN.md');
      
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
      
      return {
        content: [{
          type: 'text' as const,
          text: 'PLAN.md not found. Please run init_project_plan first.'
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
}