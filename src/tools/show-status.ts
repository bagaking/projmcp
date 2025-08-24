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
      return {
        content: [{
          type: 'text' as const,
          text: 'CURRENT.md not found. Please run init_project_plan first.'
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
      return {
        content: [{
          type: 'text' as const,
          text: 'PLAN.md not found. Please run init_project_plan first.'
        }]
      };
    }
  }
}