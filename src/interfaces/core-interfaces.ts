/**
 * Core interfaces for MCP Project Plan Server
 * Establishes abstraction layer following Dependency Inversion Principle
 */

import { FileInfo, FileType, TemplateType, ProjectStatus } from '../types.js';
import { z } from 'zod';

/**
 * File management operations interface
 * Abstracts file system operations for better testability and extensibility
 */
export interface IFileManager {
  /**
   * Ensure project plan directory exists
   * @throws Error if directory cannot be created
   */
  ensureProjectPlanDir(): Promise<void>;

  /**
   * Get project plan directory path
   * @returns Absolute path to project plan directory
   */
  getProjectPlanDir(): string;

  /**
   * List files by type with metadata
   * @param type - File type filter
   * @returns Array of file information objects
   */
  listFiles(_type: FileType): Promise<FileInfo[]>;

  /**
   * Read file content securely
   * @param filePath - Path to file (relative to project_plan or absolute)
   * @returns File content as string
   * @throws Error if file doesn't exist or access denied
   */
  readFile(_filePath: string): Promise<string>;

  /**
   * Write file content securely with validation
   * @param fileName - Name of file to write
   * @param content - Content to write
   * @returns Full path to written file
   * @throws Error if validation fails or write operation fails
   */
  writeFile(_fileName: string, _content: string): Promise<string>;

  /**
   * Generate standardized filename based on type and target
   * @param type - Document type
   * @param target - Target identifier
   * @returns Generated filename
   */
  generateFileName(_type: 'doc' | 'code' | 'opinion', _target: string): Promise<string>;

  /**
   * Get project status information
   * @returns Project status with metadata
   */
  getProjectStatus(): Promise<ProjectStatus>;

  /**
   * Check if file exists
   * @param filePath - Path to check
   * @returns True if file exists
   */
  fileExists(_filePath: string): Promise<boolean>;

  /**
   * Validate project plan directory structure
   * @returns True if valid project plan structure exists
   */
  hasValidProjectPlan(): Promise<boolean>;
}

/**
 * Template generation operations interface
 * Abstracts template creation for different document types
 */
export interface ITemplateGenerator {
  /**
   * Generate template content by type and parameters
   * @param type - Template type to generate
   * @param params - Parameters for template customization
   * @returns Generated template content
   * @throws Error if template type not supported
   */
  generateTemplate(_type: TemplateType, _params?: Record<string, unknown>): string;

  /**
   * Generate complete project plan structure templates
   * @param projectName - Name of the project
   * @param params - Additional parameters for customization
   * @returns Map of filename to template content
   */
  generateProjectPlanTemplates(_projectName?: string, _params?: Record<string, unknown>): Record<string, string>;

  /**
   * Generate sprint-specific template
   * @param milestone - Milestone identifier (e.g., "M01")
   * @param sprint - Sprint identifier (e.g., "S01") 
   * @param title - Sprint title/description
   * @param params - Additional parameters
   * @returns Sprint template content
   */
  generateSprintTemplate(_milestone: string, _sprint: string, _title: string, _params?: Record<string, unknown>): string;
}

/**
 * Tool execution response interface
 * Standardizes tool response format across all tools (compatible with MCP SDK)
 */
export interface IToolResponse {
  [x: string]: unknown;
  content: Array<{
    [x: string]: unknown;
    type: 'text';
    text: string;
    _meta?: Record<string, unknown>;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

/**
 * Base tool interface for all MCP tools
 * Ensures consistent tool implementation patterns
 */
export interface ITool {
  /** Tool name for registration */
  readonly name: string;
  
  /** Tool description for client display */
  readonly description: string;
  
  /** Input schema for parameter validation (Zod schema object) */
  readonly inputSchema: z.ZodRawShape;
  
  /**
   * Execute tool with validated parameters
   * @param args - Tool arguments (pre-validated)
   * @returns Tool response
   * @throws Error if execution fails
   */
  execute(_args: Record<string, unknown>): Promise<IToolResponse>;
}

/**
 * Logging service interface
 * Provides structured logging capabilities
 */
export interface ILogger {
  /**
   * Log error message with context
   * @param message - Error message
   * @param error - Optional error object
   * @param context - Additional context
   */
  error(_message: string, _error?: Error, _context?: Record<string, unknown>): void;

  /**
   * Log warning message
   * @param message - Warning message
   * @param context - Additional context
   */
  warn(_message: string, _context?: Record<string, unknown>): void;

  /**
   * Log info message
   * @param message - Info message
   * @param context - Additional context
   */
  info(_message: string, _context?: Record<string, unknown>): void;

  /**
   * Log debug message
   * @param message - Debug message
   * @param context - Additional context
   */
  debug(_message: string, _context?: Record<string, unknown>): void;
}

/**
 * Tool registry interface for managing tool registration
 * Implements Open/Closed Principle for tool extensibility
 */
export interface IToolRegistry {
  /**
   * Register a tool for MCP server
   * @param tool - Tool implementation
   * @throws Error if tool with same name already registered
   */
  registerTool(_tool: ITool): void;

  /**
   * Get registered tool by name
   * @param name - Tool name
   * @returns Tool instance or undefined
   */
  getTool(_name: string): ITool | undefined;

  /**
   * Get all registered tools
   * @returns Map of tool name to tool instance
   */
  getAllTools(): ReadonlyMap<string, ITool>;

  /**
   * Check if tool is registered
   * @param name - Tool name
   * @returns True if tool exists
   */
  hasTool(_name: string): boolean;
}

/**
 * Configuration service interface
 * Manages application configuration with type safety
 */
export interface IConfigService {
  /**
   * Get configuration value by key
   * @param key - Configuration key
   * @returns Configuration value
   */
  get<T = string>(_key: string): T;

  /**
   * Get configuration value with default fallback
   * @param key - Configuration key
   * @param defaultValue - Default value if key not found
   * @returns Configuration value or default
   */
  get<T>(_key: string, _defaultValue: T): T;

  /**
   * Check if configuration key exists
   * @param key - Configuration key
   * @returns True if key exists
   */
  has(_key: string): boolean;

  /**
   * Get all configuration as readonly object
   * @returns Configuration object
   */
  getAll(): Readonly<Record<string, unknown>>;
}