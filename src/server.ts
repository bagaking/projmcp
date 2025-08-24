/**
 * MCP Project Plan Server Core
 * Implements the Model Context Protocol server for project management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListFilesInputSchema,
  RecordInputSchema, 
  QuerySprintInputSchema,
  CreateDocumentInputSchema,
} from './types.js';
import { FileManager } from './utils/file-manager.js';
import { TemplateGenerator } from './utils/template-generator.js';
import {
  ListFilesTool,
  ShowStatusTool,
  RecordTool,
  InitProjectTool,
  QuerySprintTool
} from './tools/index.js';

/**
 * Main MCP server class following architectural best practices
 */
export class ProjectPlanServer {
  private server: McpServer;
  private fileManager: FileManager;
  private templateGenerator: TemplateGenerator;
  private listFilesTool: ListFilesTool;
  private showStatusTool: ShowStatusTool;
  private recordTool: RecordTool;
  private initProjectTool: InitProjectTool;
  private querySprintTool: QuerySprintTool;

  constructor() {
    this.server = new McpServer({
      name: 'mcp-project-plan-server',
      version: '1.0.0',
    });

    this.fileManager = new FileManager();
    this.templateGenerator = new TemplateGenerator();
    
    // Initialize tools
    this.listFilesTool = new ListFilesTool(this.fileManager);
    this.showStatusTool = new ShowStatusTool(this.fileManager);
    this.recordTool = new RecordTool(this.fileManager, this.templateGenerator);
    this.initProjectTool = new InitProjectTool(this.fileManager, this.templateGenerator);
    this.querySprintTool = new QuerySprintTool(this.fileManager);
    
    this.registerTools();
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('MCP Project Plan Server started successfully');
      console.error(`Project plan directory: ${this.fileManager.getProjectPlanDir()}`);
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.error('Server shutting down gracefully...');
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }

  /**
   * Register all available tools
   */
  private registerTools(): void {
    this.registerListFilesTool();
    this.registerShowCurrentTool();
    this.registerShowPlanTool();
    this.registerRecordTool();
    this.registerInitProjectPlanTool();
    this.registerQuerySprintTool();
  }

  /**
   * Register list_files tool
   */
  private registerListFilesTool(): void {
    this.server.registerTool(
      'list_files',
      {
        description: 'List files in project_plan directory with metadata',
        inputSchema: ListFilesInputSchema.shape,
      },
      async (args) => {
        try {
          return await this.listFilesTool.execute(args);
        } catch (error) {
          return this.createErrorResponse(`Failed to list files: ${error}`);
        }
      }
    );
  }

  /**
   * Register show_current tool
   */
  private registerShowCurrentTool(): void {
    this.server.registerTool(
      'show_current',
      {
        description: 'Display current project status from CURRENT.md',
        inputSchema: {},
      },
      async () => {
        try {
          return await this.showStatusTool.showCurrent();
        } catch (error) {
          return this.createErrorResponse(`Failed to read CURRENT.md: ${error}`);
        }
      }
    );
  }

  /**
   * Register show_plan tool
   */
  private registerShowPlanTool(): void {
    this.server.registerTool(
      'show_plan',
      {
        description: 'Display project plan from PLAN.md',
        inputSchema: {},
      },
      async () => {
        try {
          return await this.showStatusTool.showPlan();
        } catch (error) {
          return this.createErrorResponse(`Failed to read PLAN.md: ${error}`);
        }
      }
    );
  }

  /**
   * Register record tool
   */
  private registerRecordTool(): void {
    this.server.registerTool(
      'record',
      {
        description: 'Record documentation with proper categorization',
        inputSchema: RecordInputSchema.shape,
      },
      async (args) => {
        try {
          return await this.recordTool.execute(args);
        } catch (error) {
          return this.createErrorResponse(`Failed to record document: ${error}`);
        }
      }
    );
  }

  /**
   * Register init_project_plan tool
   */
  private registerInitProjectPlanTool(): void {
    this.server.registerTool(
      'init_project_plan',
      {
        description: 'Initialize project_plan directory with standard structure',
        inputSchema: {},
      },
      async () => {
        try {
          return await this.initProjectTool.execute();
        } catch (error) {
          return this.createErrorResponse(`Failed to initialize project plan: ${error}`);
        }
      }
    );
  }

  /**
   * Register query_sprint tool
   */
  private registerQuerySprintTool(): void {
    this.server.registerTool(
      'query_sprint',
      {
        description: 'Query specific sprint information',
        inputSchema: QuerySprintInputSchema.shape,
      },
      async (args) => {
        try {
          return await this.querySprintTool.execute(args);
        } catch (error) {
          return this.createErrorResponse(`Failed to query sprint: ${error}`);
        }
      }
    );
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(message: string) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
}