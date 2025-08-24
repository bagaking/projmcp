#!/usr/bin/env node

/**
 * Enhanced MCP Server Entry Point
 * Uses dependency injection and clean architecture principles
 */

import { FileManager } from './utils/file-manager.js';
import { TemplateGenerator } from './utils/template-generator.js';
import { ProjectPlanMCPServer } from './services/mcp-server.js';
import { LoggerFactory } from './services/logger.js';

/**
 * Application bootstrap with dependency injection
 */
async function bootstrap(): Promise<void> {
  const logger = LoggerFactory.createLogger();
  
  try {
    // Initialize core services with dependency injection
    const fileManager = new FileManager();
    const templateGenerator = new TemplateGenerator();
    
    // Create and start server
    const server = new ProjectPlanMCPServer(fileManager, templateGenerator);
    
    logger.info('Application bootstrap completed, starting server...');
    
    // Start the MCP server
    await server.start();
    
  } catch (error) {
    logger.error('Failed to bootstrap application', error as Error);
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled promise rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
bootstrap().catch((error) => {
  console.error('💥 Bootstrap failed:', error);
  process.exit(1);
});