import { ITool, IToolResponse, IFileManager, ITemplateGenerator } from '../interfaces/core-interfaces.js';
import { getRightNowTime } from '../utils/time-helper.js';

export class InitProjectTool implements ITool {
  readonly name = 'init_project_plan';
  readonly description = 'Initialize project plan directory structure with templates';
  readonly inputSchema = {}; // No parameters required

  constructor(
    private readonly fileManager: IFileManager,
    private readonly templateGenerator: ITemplateGenerator
  ) {}

  async execute(_args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      // Create project_plan directory if it doesn't exist
      await this.fileManager.ensureProjectPlanDir();

      // Generate templates
      const templates = this.templateGenerator.generateProjectPlanTemplates();

      // Write files
      const createdFiles: string[] = [];
      for (const [fileName, content] of Object.entries(templates)) {
        await this.fileManager.writeFile(fileName, content);
        createdFiles.push(fileName);
      }

      const rightNow = getRightNowTime();
      
      return {
        content: [{
          type: 'text' as const,
          text: `Project plan structure initialized successfully!\n\nFiles created:\n${createdFiles.map(f => `- ${f}`).join('\n')}\n\nYou can now use show_current and show_plan tools to view the content.`
        }],
        _meta: {
          tool: this.name,
          files_created: createdFiles.length,
          right_now: rightNow
        }
      };
    } catch (error) {
      const rightNow = getRightNowTime();
      
      return {
        content: [{
          type: 'text' as const,
          text: `Error initializing project plan: ${error instanceof Error ? error.message : 'Unknown error'}`
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