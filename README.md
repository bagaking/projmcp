# MCP Project Plan Server

[![npm version](https://img.shields.io/npm/v/@bagaking/projmcp.svg)](https://www.npmjs.com/package/@bagaking/projmcp)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP server](https://img.shields.io/badge/MCP-server-5c6bc0.svg)](https://modelcontextprotocol.io/)

A Model Context Protocol (MCP) server designed to help AI agents better utilize project organization best practices. This server provides standardized APIs for project management, documentation organization, and workflow automation.

## Features

- **File Management**: List and organize project files by type (sprint, doc, code, opinion)
- **Document Operations**: Record and retrieve documentation with proper categorization
- **Project Status**: Quick access to current project state and planning documents
- **Template Generation**: Initialize project structures following best practices
- **Token Efficient**: Optimized responses to minimize AI agent token consumption

## Installation

```bash
npm install -g @bagaking/projmcp
```

## Quick Start

**One-command setup:**
```bash
claude mcp add projmcp -- npx -y @bagaking/projmcp
```

That's it! All tools are now available in Claude Code conversations.

**Claude Desktop config:**

Add this server to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "projmcp": {
      "command": "npx",
      "args": ["-y", "@bagaking/projmcp"]
    }
  }
}
```

## MCP Tools

The server provides these tools for AI agents:

### Available Tools

- **`list_files`** - List and analyze project files by type (all/sprint/doc/code/opinion)
- **`show_current`** - Display current project status from CURRENT.md  
- **`show_plan`** - Display project plan from PLAN.md
- **`init_project_plan`** - Initialize complete project structure
- **`record`** - Record structured documentation (doc/code/opinion types)
- **`query_sprint`** - Query specific sprint information by ID
- **`right_now`** - Get current time in multiple formats

**Usage:** Just call tools directly in conversations or use `/mcp tool_name` syntax.

### Response Format

All tools return structured JSON with:
- **Content**: Main response data
- **Metadata**: Statistics and context  
- **Timestamps**: Right-now time information

## Project Directory Structure

After running `init_project_plan`, your project will have this structure:

```
project_plan/
├── PLAN.md                           # Master project planning document
├── CURRENT.md                        # Current execution status
├── M01_S01.initial_setup.md         # Sprint execution plans
├── DOCREF_001.topic.md               # External documentation references
├── CODEREF_001.topic.md              # Code implementation references
└── OPINIONS_001.topic.md             # Key decisions and observations
```

### Best Practices Methodology

This server implements the "项目组织的最佳实践" (Project Organization Best Practices):

1. **Structured Planning**: Separate planning (PLAN.md) from execution tracking (CURRENT.md)
2. **Sprint Organization**: Each milestone/sprint gets dedicated planning documents
3. **Documentation Types**: 
   - `DOCREF`: External documentation and research
   - `CODEREF`: Implementation patterns and code examples
   - `OPINIONS`: Decision records and key observations
4. **Metadata Tracking**: All documents include creation dates, purposes, and evidence levels
5. **Flat File Structure**: All files in single directory with semantic naming

## Source Code Structure

```
src/
├── index.ts                    # Package binary entry point
├── direct-mcp-server.ts        # Direct SDK diagnostic server
├── interfaces/                 # TypeScript interfaces
│   └── core-interfaces.ts      # Core abstractions (ITool, IFileManager, etc.)
├── services/                   # Core services
│   ├── logger.ts              # Structured logging service
│   ├── mcp-server.ts          # Enhanced MCP server with DI
│   └── tool-registry.ts       # Tool registration and management
├── tools/                      # MCP tool implementations
│   ├── list-files.ts          # File listing with metadata
│   ├── init-project.ts        # Project initialization
│   ├── show-current.ts        # CURRENT.md display tool
│   ├── show-plan.ts           # PLAN.md display tool
│   ├── show-status.ts         # Legacy status helper
│   ├── record.ts              # Documentation recording
│   ├── query-sprint.ts        # Sprint querying
│   └── right-now.ts           # Time metadata tool
├── templates/                  # Static document template strings
├── utils/                      # Utilities
│   ├── file-manager.ts        # Secure file operations
│   ├── security-validator.ts  # File security validation
│   ├── template-generator.ts  # Document template generation
│   └── time-helper.ts         # Time formatting helpers
└── types.ts                   # TypeScript type definitions
```

## Development

This repository currently builds a TypeScript MCP `project_plan` server. The
published binary runs `dist/index.js`, compiled from `src/index.ts`, and wires
the file manager, template generator, and MCP tool implementations into a stdio
MCP server.

```bash
# Install dependencies
npm ci

# Build project
npm run build

# Run smoke tests against the compiled dist output
npm test

# Run linting only
npm run lint

# Validate release readiness after a build
npm run validate-release

# Start in development mode
npm run dev
```

`npm run validate-release` checks required package files, build output, lint,
TypeScript compilation, entry points, and npm package contents. It expects
`dist/` to already exist, so run `npm run build` first for a direct validation
pass.

## Status

The project is usable as an MCP server for `project_plan` file workflows, but it
should be treated as an active TypeScript package rather than a broadly hardened
stable platform. Current automated coverage is intentionally small: build,
lint, release validation, and Node built-in smoke tests for the compiled tool
path. Add focused tests around changed tool behavior before widening the API or
release surface.

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0

## License

MIT
