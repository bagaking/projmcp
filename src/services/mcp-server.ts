/**
 * Enhanced MCP Project Plan Server with dependency injection and tool registry
 * Implements clean architecture principles with comprehensive logging
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { IFileManager, ITemplateGenerator, ILogger, ITool } from '../interfaces/core-interfaces.js';
import { ToolRegistry } from './tool-registry.js';
import { LoggerFactory, LoggerUtils } from './logger.js';

// Tool implementations
import { ListFilesTool } from '../tools/list-files.js';
// We'll add more tools as we convert them

/**
 * Main MCP server with dependency injection and modular architecture
 * Follows SOLID principles and implements comprehensive error handling
 */
export class ProjectPlanMCPServer {
  private readonly server: McpServer;
  private readonly toolRegistry: ToolRegistry;
  private readonly logger: ILogger;
  
  constructor(
    private readonly fileManager: IFileManager,
    private readonly templateGenerator: ITemplateGenerator
  ) {
    this.logger = LoggerFactory.getLogger();
    this.server = new McpServer({
      name: 'mcp-project-plan-server',
      version: '1.0.0',
    });
    
    this.toolRegistry = new ToolRegistry();
    
    this.logger.info('ProjectPlanMCPServer initialized', {
      serverName: 'mcp-project-plan-server',
      version: '1.0.0'
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
      // Register all tools with the MCP server
      this.toolRegistry.registerAllToolsWithServer(this.server);
      
      // Create and connect transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      const registrationSummary = this.toolRegistry.getRegistrationSummary();
      
      this.logger.info('MCP Project Plan Server started successfully', {
        projectPlanDir: this.fileManager.getProjectPlanDir(),
        ...registrationSummary
      });
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      LoggerUtils.logPerformance(this.logger, 'server.start', startTime);
      
      // Log startup success to stderr for visibility
      console.error('🚀 MCP Project Plan Server started successfully');
      console.error(`📁 Project plan directory: ${this.fileManager.getProjectPlanDir()}`);
      console.error(`🔧 Registered ${registrationSummary.totalTools} tools: ${registrationSummary.toolNames.join(', ')}`);
      
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
    const registrationSummary = this.toolRegistry.getRegistrationSummary();
    
    return {
      isRunning: true,
      toolCount: registrationSummary.totalTools,
      toolNames: registrationSummary.toolNames,
      projectPlanDir: this.fileManager.getProjectPlanDir(),
      startTime: new Date().toISOString()
    };
  }

  /**
   * Register all available tools with the registry
   */
  private registerAllTools(): void {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'ProjectPlanMCPServer', 'registerAllTools');

    try {
      // Register core tools
      const tools: ITool[] = [
        new ListFilesTool(this.fileManager),
        // TODO: Convert other tools to ITool interface
        // new ShowStatusTool(this.fileManager),
        // new RecordTool(this.fileManager, this.templateGenerator),
        // new InitProjectTool(this.fileManager, this.templateGenerator),
        // new QuerySprintTool(this.fileManager)
      ];

      for (const tool of tools) {
        this.toolRegistry.registerTool(tool);
      }

      this.logger.info('All tools registered', { 
        toolCount: tools.length,
        toolNames: tools.map(t => t.name)
      });

      LoggerUtils.logPerformance(this.logger, 'registerAllTools', startTime, { 
        toolCount: tools.length 
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