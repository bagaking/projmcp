import { z } from 'zod';
import { ITool, IToolResponse, IFileManager, ITemplateGenerator } from '../interfaces/core-interfaces.js';
import { getRightNowTime } from '../utils/time-helper.js';

// Schema is now defined inline within the tool class

export class RecordTool implements ITool {
  readonly name = 'record';
  readonly description = 'Record structured documentation with proper categorization';
  readonly inputSchema = {
    type: z.enum(['doc', 'code', 'opinion']).describe('Type of document to record'),
    target: z.string().min(1).describe('Target identifier for the document'),
    content: z.string().min(1).describe('Content to record')
  };

  constructor(
    private readonly fileManager: IFileManager,
    private readonly templateGenerator: ITemplateGenerator
  ) {}

  async execute(args: Record<string, unknown>): Promise<IToolResponse> {
    try {
      const rightNow = getRightNowTime();
      
      // Validate arguments using the same schema
      const validatedArgs = z.object(this.inputSchema).parse(args);
      const fileName = await this.fileManager.generateFileName(validatedArgs.type, validatedArgs.target);
      
      // Generate appropriate template
      const templateType = validatedArgs.type === 'doc' ? 'docref' : 
        validatedArgs.type === 'code' ? 'coderef' : 'opinions';
      const template = this.templateGenerator.generateTemplate(templateType, {
        target: validatedArgs.target,
        topic: validatedArgs.target,
        date: new Date().toISOString().split('T')[0]
      });

      // Combine template with user content
      const fullContent = `${template}\n\n## User Content\n\n${validatedArgs.content}`;
      
      await this.fileManager.writeFile(fileName, fullContent);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Document recorded successfully as ${fileName}\n\n${fullContent}`
        }],
        _meta: {
          tool: this.name,
          file_name: fileName,
          content_type: validatedArgs.type,
          right_now: rightNow
        }
      };
      
    } catch (error) {
      const rightNow = getRightNowTime();
      
      return {
        content: [{
          type: 'text' as const,
          text: `Error recording document: ${error instanceof Error ? error.message : 'Unknown error'}`
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