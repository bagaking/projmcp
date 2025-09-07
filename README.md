# ProjMCP

[![npm version](https://img.shields.io/npm/v/@bagaking/projmcp.svg)](https://www.npmjs.com/package/@bagaking/projmcp)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP server](https://img.shields.io/badge/MCP-server-5c6bc0.svg)](https://modelcontextprotocol.io/)

Bagaking's MCP server for project planning, project memory, and lightweight
execution tracking. ProjMCP gives AI coding agents a consistent `project_plan/`
workspace with tools for reading the current plan, recording references and
decisions, querying sprint notes, and initializing the standard planning file
layout.

The published npm package is intentionally runtime-focused: it ships the
compiled MCP server in `dist/`, this README, the license, and the changelog.
Source, tests, validation scripts, CI, and local `project_plan/` files are kept
out of the npm artifact by the package manifest and release validator.

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

After Claude Code connects to the server, the project planning tools are available in conversations.

**Claude Desktop config:**

Add this server to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "projmcp": {
      "command": "npx",
      "args": ["-y", "@bagaking/projmcp"],
      "env": {
        "LOG_LEVEL": "error"
      }
    }
  }
}
```

`LOG_LEVEL=error` keeps startup logs away from normal MCP stdio traffic while preserving error diagnostics.

**Installed binary:**

```bash
npx -y @bagaking/projmcp
```

The package exposes the `bagaking-projmcp` binary for global installs.

## MCP Smoke And Integration Check

Use this path when you want to confirm the package, stdio server, and MCP tool
surface are all wired correctly before publishing or adding the server to an
agent client:

```bash
# From a fresh checkout
npm ci
npm test

# Verify the compiled stdio server answers the MCP tools/list request
LOG_LEVEL=error node dist/index.js <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"projmcp-smoke","version":"0.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF

# Check the package that npm would publish
npm run release:dry-run
```

The `tools/list` response should include `list_files`, `show_current`,
`show_plan`, `init_project_plan`, `record`, `query_sprint`, and `right_now` on
stdout. Startup diagnostics should stay on stderr so they do not corrupt MCP
stdio messages.

For an installed-package smoke check, use the same JSON-RPC request with
`npx -y @bagaking/projmcp` instead of `node dist/index.js`. For Claude Desktop
or Claude Code, add the config from Quick Start, restart or reconnect the
client, and confirm that the client can list the ProjMCP tools before invoking
state-changing tools such as `init_project_plan` or `record`.

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

# Validate release readiness
npm run build
npm run validate-release

# Inspect the exact npm package contents
npm pack --dry-run

# Start in development mode
npm run dev
```

`npm run validate-release` checks required package files, build output, lint,
TypeScript compilation, entry points, npm package size, and the dry-run publish
manifest. The package manifest check verifies that the public npm package keeps
the compiled binary and essential docs while excluding source, tests, scripts,
and local project planning files. It expects `dist/` to already exist, so run
`npm run build` first for a direct validation pass.

## Release Preflight

Before publishing, run the same checks used by CI and the release validator:

```bash
npm test
npm run validate-release
npm run release:dry-run
```

`npm run release:dry-run` chains the release validator with `npm publish
--dry-run`, so it is the highest-signal local check for the package that would
be published.

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
