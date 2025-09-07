import { FileManager } from '../utils/file-manager.js';

export class ShowStatusTool {
  constructor(private fileManager: FileManager) {}

  async showCurrent() {
    try {
      const content = await this.fileManager.readFile('CURRENT.md');
      return {
        content: [{
          type: 'text' as const,
          text: content
        }]
      };
    } catch (error) {
      const errorMessage = this.isNotFoundError(error)
        ? 'CURRENT.md not found. Please run init_project_plan first.'
        : `Error reading CURRENT.md: ${error instanceof Error ? error.message : 'Unknown error'}`;

      return {
        content: [{
          type: 'text' as const,
          text: errorMessage
        }]
      };
    }
  }

  async showPlan() {
    try {
      const content = await this.fileManager.readFile('PLAN.md');
      return {
        content: [{
          type: 'text' as const,
          text: content
        }]
      };
    } catch (error) {
      const errorMessage = this.isNotFoundError(error)
        ? 'PLAN.md not found. Please run init_project_plan first.'
        : `Error reading PLAN.md: ${error instanceof Error ? error.message : 'Unknown error'}`;

      return {
        content: [{
          type: 'text' as const,
          text: errorMessage
        }]
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
