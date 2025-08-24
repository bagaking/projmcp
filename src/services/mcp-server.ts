/**
 * Enhanced MCP Project Plan Server with dependency injection and tool registry
 * Implements clean architecture principles with comprehensive logging
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { IFileManager, ITemplateGenerator, ILogger, ITool } from '../interfaces/core-interfaces.js';
import { LoggerFactory, LoggerUtils } from './logger.js';

// Tool implementations
import { ListFilesTool } from '../tools/list-files.js';
import { ShowCurrentTool } from '../tools/show-current.js';
import { ShowPlanTool } from '../tools/show-plan.js';
import { InitProjectTool } from '../tools/init-project.js';
import { RecordTool } from '../tools/record.js';
import { QuerySprintTool } from '../tools/query-sprint.js';
import { RightNowTool } from '../tools/right-now.js';

/**
 * Main MCP server with dependency injection and modular architecture
 * Follows SOLID principles and implements comprehensive error handling
 */
export class ProjectPlanMCPServer {
  private readonly server: McpServer;
  private readonly logger: ILogger;
  private readonly tools: ITool[];
  
  constructor(
    private readonly fileManager: IFileManager,
    private readonly templateGenerator: ITemplateGenerator
  ) {
    this.logger = LoggerFactory.getLogger();
    this.server = new McpServer({
      name: 'mcp-project-plan-server',
      version: '0.3.10',
    });
    
    // Initialize all tool instances
    this.tools = [
      new ListFilesTool(this.fileManager),
      new ShowCurrentTool(this.fileManager),
      new ShowPlanTool(this.fileManager),
      new InitProjectTool(this.fileManager, this.templateGenerator),
      new RecordTool(this.fileManager, this.templateGenerator),
      new QuerySprintTool(this.fileManager),
      new RightNowTool(this.fileManager)
    ];
    
    this.logger.info('ProjectPlanMCPServer initialized', {
      serverName: 'mcp-project-plan-server',
      version: '0.3.10',
      toolCount: this.tools.length
    });
    
    this.registerAllTools();
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'ProjectPlanMCPServer', 'start');

    try {
      // Create and connect transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      const toolNames = ['list_files', 'show_current', 'show_plan', 'init_project_plan', 'record', 'query_sprint', 'right_now'];
      
      this.logger.info('MCP Project Plan Server started successfully', {
        projectPlanDir: this.fileManager.getProjectPlanDir(),
        totalTools: toolNames.length,
        toolNames
      });
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      LoggerUtils.logPerformance(this.logger, 'server.start', startTime);
      
      // Log startup success to stderr for visibility
      console.error('🚀 MCP Project Plan Server started successfully');
      console.error(`📁 Project plan directory: ${this.fileManager.getProjectPlanDir()}`);
      console.error(`🔧 Registered ${toolNames.length} tools: ${toolNames.join(', ')}`);
      
    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'ProjectPlanMCPServer', 'start', error as Error);
      console.error('❌ Failed to start MCP server:', error);
      process.exit(1);
    }
  }

  /**
   * Get server status and health information
   */
  getStatus(): {
    isRunning: boolean;
    toolCount: number;
    toolNames: string[];
    projectPlanDir: string;
    startTime: string;
    } {
    const toolNames = this.tools.map(tool => tool.name);
    
    return {
      isRunning: true,
      toolCount: toolNames.length,
      toolNames,
      projectPlanDir: this.fileManager.getProjectPlanDir(),
      startTime: new Date().toISOString()
    };
  }

  /**
   * Register all available tools directly with MCP server (bypassing registry)
   */
  private registerAllTools(): void {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'ProjectPlanMCPServer', 'registerAllTools');

    try {
      // Register all tools dynamically using their own schemas
      for (const tool of this.tools) {
        this.server.registerTool(
          tool.name,
          {
            description: tool.description,
            inputSchema: tool.inputSchema
          },
          async (args) => {
            return await tool.execute(args);
          }
        );
      }

      const toolNames = this.tools.map(tool => tool.name);
      
      this.logger.info('All tools registered directly with MCP server', { 
        toolCount: toolNames.length,
        toolNames
      });

      LoggerUtils.logPerformance(this.logger, 'registerAllTools', startTime, { 
        toolCount: toolNames.length 
      });

    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'ProjectPlanMCPServer', 'registerAllTools', error as Error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      this.logger.info(`Received ${signal} signal, shutting down gracefully...`);
      console.error(`\n🛑 Received ${signal} signal, shutting down gracefully...`);
      
      // Perform cleanup tasks here if needed
      this.logger.info('Server shutdown completed');
      console.error('✅ Server shutdown completed');
      
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', error);
      console.error('💥 Uncaught exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection', new Error(String(reason)), { promise });
      console.error('💥 Unhandled promise rejection:', reason);
      process.exit(1);
    });
  }
}