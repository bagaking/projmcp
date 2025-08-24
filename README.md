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

## Usage

### As MCP Server (Recommended)
```bash
# Direct run
npm run start

# Development mode with auto-reload
npm run dev
```

### Integration with Claude Code
Add this server to your Claude Code configuration:
```json
{
  "mcpServers": {
    "project-plan": {
      "command": "npx",
      "args": ["@bagaking/projmcp"]
    }
  }
}
```

## MCP Tools

The server provides these tools for AI agents:

- `list_files` - List files by type with metadata
- `show_current` - Display current project status
- `show_plan` - Display project plan
- `record` - Record documentation with proper categorization
- `init_project_plan` - Initialize project plan directory structure
- `query_sprint` - Query specific sprint information

## Project Structure

```
src/
├── index.ts          # Server entry point
├── server.ts         # MCP server core logic
├── tools/            # Tool implementations
├── utils/            # Utility functions
└── templates/        # Document templates
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