#!/usr/bin/env node

/**
 * MCP Project Plan Server Entry Point
 * Command-line interface for the Model Context Protocol server
 */

import { ProjectPlanServer } from './server.js';

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const server = new ProjectPlanServer();
    await server.start();
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}