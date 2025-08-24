/**
 * Tool registry service implementing Open/Closed Principle
 * Manages tool registration and discovery for MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ITool, IToolRegistry, ILogger } from '../interfaces/core-interfaces.js';
import { LoggerFactory, LoggerUtils } from './logger.js';

/**
 * Concrete implementation of tool registry
 * Provides centralized tool management with comprehensive logging
 */
export class ToolRegistry implements IToolRegistry {
  private readonly tools = new Map<string, ITool>();
  private readonly logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger();
    this.logger.info('ToolRegistry initialized');
  }

  /**
   * Register a tool for MCP server
   */
  registerTool(tool: ITool): void {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'ToolRegistry', 'registerTool', { 
      toolName: tool.name,
      description: tool.description 
    });

    try {
      // Validate tool implementation
      this.validateTool(tool);

      // Check for duplicate registration
      if (this.tools.has(tool.name)) {
        throw new Error(`Tool with name '${tool.name}' already registered`);
      }

      this.tools.set(tool.name, tool);
      
      this.logger.info('Tool registered successfully', { 
        toolName: tool.name,
        totalTools: this.tools.size
      });

      LoggerUtils.logPerformance(this.logger, 'registerTool', startTime, { toolName: tool.name });

    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'ToolRegistry', 'registerTool', error as Error, { toolName: tool.name });
      throw error;
    }
  }

  /**
   * Get registered tool by name
   */
  getTool(name: string): ITool | undefined {
    LoggerUtils.logMethodEntry(this.logger, 'ToolRegistry', 'getTool', { name });
    
    const tool = this.tools.get(name);
    
    if (tool) {
      this.logger.debug('Tool found', { toolName: name });
    } else {
      this.logger.debug('Tool not found', { toolName: name, availableTools: Array.from(this.tools.keys()) });
    }

    return tool;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ReadonlyMap<string, ITool> {
    LoggerUtils.logMethodEntry(this.logger, 'ToolRegistry', 'getAllTools', { count: this.tools.size });
    return this.tools;
  }

  /**
   * Check if tool is registered
   */
  hasTool(name: string): boolean {
    const exists = this.tools.has(name);
    this.logger.debug('Tool existence check', { toolName: name, exists });
    return exists;
  }

  /**
   * Register all tools with MCP server
   * @param server - MCP server instance
   */
  registerAllToolsWithServer(server: McpServer): void {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'ToolRegistry', 'registerAllToolsWithServer', { 
      toolCount: this.tools.size 
    });

    try {
      let registeredCount = 0;

      for (const [name, tool] of this.tools) {
        try {
          server.registerTool(
            name,
            {
              description: tool.description,
              inputSchema: tool.inputSchema as any, // Type compatibility with MCP SDK
            },
            async (args: Record<string, unknown>) => {
              const executionStartTime = Date.now();
              this.logger.info('Executing tool', { toolName: name, args });
              
              try {
                const result = await tool.execute(args);
                
                LoggerUtils.logPerformance(this.logger, `tool.${name}.execute`, executionStartTime, { 
                  success: true 
                });
                
                return result;
              } catch (error) {
                LoggerUtils.logMethodError(this.logger, 'Tool', name, error as Error, { args });
                throw error;
              }
            }
          );
          
          registeredCount++;
          this.logger.debug('Tool registered with MCP server', { toolName: name });

        } catch (error) {
          this.logger.error(`Failed to register tool '${name}' with MCP server`, error as Error, { toolName: name });
        }
      }

      this.logger.info('Tools registration with MCP server completed', { 
        totalTools: this.tools.size,
        registeredCount,
        failedCount: this.tools.size - registeredCount
      });

      LoggerUtils.logPerformance(this.logger, 'registerAllToolsWithServer', startTime, { 
        toolCount: this.tools.size 
      });

    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'ToolRegistry', 'registerAllToolsWithServer', error as Error);
      throw error;
    }
  }

  /**
   * Get tool registration summary
   */
  getRegistrationSummary(): {
    totalTools: number;
    toolNames: string[];
    toolDescriptions: Record<string, string>;
    } {
    const toolNames = Array.from(this.tools.keys());
    const toolDescriptions = Object.fromEntries(
      Array.from(this.tools.entries()).map(([name, tool]) => [name, tool.description])
    );

    return {
      totalTools: this.tools.size,
      toolNames,
      toolDescriptions
    };
  }

  /**
   * Validate tool implementation
   */
  private validateTool(tool: ITool): void {
    if (!tool.name || typeof tool.name !== 'string' || tool.name.trim().length === 0) {
      throw new Error('Tool must have a non-empty name');
    }

    if (!tool.description || typeof tool.description !== 'string' || tool.description.trim().length === 0) {
      throw new Error('Tool must have a non-empty description');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object' || tool.inputSchema === null) {
      throw new Error('Tool must have a valid input schema');
    }

    if (typeof tool.execute !== 'function') {
      throw new Error('Tool must have an execute function');
    }

    // Validate tool name follows naming conventions
    if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
      throw new Error('Tool name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    }
  }
}