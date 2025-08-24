/**
 * Right Now Tool - Returns current time in multiple formats
 * Provides UTC, local timezone, and timestamp formats for comprehensive time information
 */

import { z } from 'zod';
import { ITool, IFileManager, IToolResponse } from '../interfaces/core-interfaces.js';
import { getRightNowExtended } from '../utils/time-helper.js';

/**
 * Tool for getting current time in multiple formats
 * Returns UTC ISO string, local timezone string, Unix timestamp (seconds), and Unix timestamp (milliseconds)
 */
export class RightNowTool implements ITool {
  readonly name = 'right_now';
  readonly description = 'Get current time in multiple formats: UTC ISO, local timezone, Unix timestamp (seconds and milliseconds)';
  readonly inputSchema = {};

  constructor(private readonly fileManager: IFileManager) {}

  async execute(_args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      const timeInfo = getRightNowExtended();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(timeInfo, null, 2)
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting current time: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}