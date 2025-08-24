# MCP Project Plan Server

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
├── index.ts                    # Server entry point
├── server.ts                   # MCP server core logic  
├── interfaces/                 # TypeScript interfaces
│   └── core-interfaces.ts      # Core abstractions (ITool, IFileManager, etc.)
├── services/                   # Core services
│   ├── logger.ts              # Structured logging service
│   ├── mcp-server.ts          # Enhanced MCP server with DI
│   └── tool-registry.ts       # Tool registration and management
├── tools/                      # MCP tool implementations
│   ├── list-files.ts          # File listing with metadata
│   ├── init-project.ts        # Project initialization
│   ├── show-status.ts         # Status display tools
│   ├── record.ts              # Documentation recording
│   └── query-sprint.ts        # Sprint querying
├── utils/                      # Utilities
│   ├── file-manager.ts        # Secure file operations
│   ├── security-validator.ts  # File security validation
│   └── template-generator.ts  # Document template generation
└── types.ts                   # TypeScript type definitions
```

## Development

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run linting
npm run lint

# Start in development mode
npm run dev
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0

## License

MIT