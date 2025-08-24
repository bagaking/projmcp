import { z } from 'zod';
import { FileManager } from '../utils/file-manager.js';
import { TemplateGenerator } from '../utils/template-generator.js';

export const RecordSchema = z.object({
  type: z.enum(['doc', 'code', 'opinion']),
  target: z.string().min(1),
  content: z.string().min(1)
});

export type RecordArgs = z.infer<typeof RecordSchema>;

export class RecordTool {
  constructor(
    private fileManager: FileManager,
    private templateGenerator: TemplateGenerator
  ) {}

  async execute(args: RecordArgs) {
    const fileName = await this.fileManager.generateFileName(args.type, args.target);
    
    // Generate appropriate template
    const templateType = args.type === 'doc' ? 'docref' : 
      args.type === 'code' ? 'coderef' : 'opinions';
    const template = this.templateGenerator.generateTemplate(templateType, {
      target: args.target,
      topic: args.target,
      date: new Date().toISOString().split('T')[0]
    });

    // Combine template with user content
    const fullContent = `${template}\n\n## User Content\n\n${args.content}`;
    
    await this.fileManager.writeFile(fileName, fullContent);
    
    return {
      content: [{
        type: 'text' as const,
        text: `Document recorded successfully as ${fileName}\n\n${fullContent}`
      }]
    };
  }
}