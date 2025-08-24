import { z } from 'zod';
import { ITool, IToolResponse, IFileManager } from '../interfaces/core-interfaces.js';
import { getRightNowTime } from '../utils/time-helper.js';

// Schema is now defined inline within the tool class

export class QuerySprintTool implements ITool {
  readonly name = 'query_sprint';
  readonly description = 'Query specific sprint information by sprint ID';
  readonly inputSchema = {
    sprintId: z.string().regex(/^M\d{2}_S\d{2}$/).describe('Sprint ID in format M01_S01')
  };

  constructor(private readonly fileManager: IFileManager) {}

  async execute(args: Record<string, unknown>): Promise<IToolResponse> {
    // Validate arguments using the same schema
    const validatedArgs = z.object(this.inputSchema).parse(args);
    try {
      const files = await this.fileManager.listFiles('sprint');
      const sprintFiles = Array.isArray(files) ? files : [];
      const targetFile = sprintFiles.find((file: any) => 
        file.name.startsWith(validatedArgs.sprintId)
      );

      if (!targetFile) {
        const rightNow = getRightNowTime();
        
        return {
          content: [{
            type: 'text' as const,
            text: `Sprint ${validatedArgs.sprintId} not found. Available sprints:\n${sprintFiles.map((f: any) => f.name).join('\n')}`
          }],
          _meta: {
            tool: this.name,
            sprint_id: validatedArgs.sprintId,
            available_sprints: sprintFiles.length,
            right_now: rightNow
          }
        };
      }

      const rightNow = getRightNowTime();
      const content = await this.fileManager.readFile(targetFile.path || targetFile.name);
      
      return {
        content: [{
          type: 'text' as const,
          text: content
        }],
        _meta: {
          tool: this.name,
          sprint_id: validatedArgs.sprintId,
          file_name: targetFile.name,
          right_now: rightNow
        }
      };
    } catch (error) {
      const rightNow = getRightNowTime();
      
      return {
        content: [{
          type: 'text' as const,
          text: `Error querying sprint: ${error instanceof Error ? error.message : 'Unknown error'}`
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