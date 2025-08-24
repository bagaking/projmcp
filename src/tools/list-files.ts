import { z } from 'zod';
import { FileManager } from '../utils/file-manager.js';

export const ListFilesSchema = z.object({
  type: z.enum(['all', 'sprint', 'doc', 'code', 'opinion'])
});

export type ListFilesArgs = z.infer<typeof ListFilesSchema>;

export class ListFilesTool {
  constructor(private fileManager: FileManager) {}

  async execute(args: ListFilesArgs) {
    try {
      const files = await this.fileManager.listFiles(args.type);
      const status = await this.fileManager.getProjectStatus();

      const summary = {
        total: Array.isArray(files) ? files.length : 0,
        type_filter: args.type,
        has_project_plan: status.hasProjectPlan,
      };

      const fileList = Array.isArray(files) ? files.map((file: any) => ({
        name: file.name,
        type: file.type,
        lines: file.lineCount,
        modified: file.lastModified.split('T')[0],
        size_kb: Math.round(file.size / 1024 * 100) / 100,
      })) : [];

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ summary, files: fileList }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error listing files: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}