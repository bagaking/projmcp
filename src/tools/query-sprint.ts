import { z } from 'zod';
import { FileManager } from '../utils/file-manager.js';

export const QuerySprintSchema = z.object({
  sprintId: z.string().regex(/^M\d{2}_S\d{2}$/)
});

export type QuerySprintArgs = z.infer<typeof QuerySprintSchema>;

export class QuerySprintTool {
  constructor(private fileManager: FileManager) {}

  async execute(args: QuerySprintArgs) {
    try {
      const files = await this.fileManager.listFiles('sprint');
      const sprintFiles = Array.isArray(files) ? files : [];
      const targetFile = sprintFiles.find((file: any) => 
        file.name.startsWith(args.sprintId)
      );

      if (!targetFile) {
        return {
          content: [{
            type: 'text' as const,
            text: `Sprint ${args.sprintId} not found. Available sprints:\n${sprintFiles.map((f: any) => f.name).join('\n')}`
          }]
        };
      }

      const content = await this.fileManager.readFile(targetFile.path || targetFile.name);
      return {
        content: [{
          type: 'text' as const,
          text: content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error querying sprint: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}