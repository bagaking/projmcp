import { FileManager } from '../utils/file-manager.js';
import { TemplateGenerator } from '../utils/template-generator.js';

export class InitProjectTool {
  constructor(
    private fileManager: FileManager,
    private templateGenerator: TemplateGenerator
  ) {}

  async execute() {
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

      return {
        content: [{
          type: 'text' as const,
          text: `Project plan structure initialized successfully!\n\nFiles created:\n${createdFiles.map(f => `- ${f}`).join('\n')}\n\nYou can now use show_current and show_plan tools to view the content.`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error initializing project plan: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}