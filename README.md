# ProjMCP

[![npm version](https://img.shields.io/npm/v/@bagaking/projmcp.svg)](https://www.npmjs.com/package/@bagaking/projmcp)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP server](https://img.shields.io/badge/MCP-server-5c6bc0.svg)](https://modelcontextprotocol.io/)

ProjMCP is a stdio MCP server for one local workspace convention:
`project_plan/`. It gives MCP clients tools to initialize the planning
directory, read `PLAN.md` and `CURRENT.md`, list planning files, record
reference notes, query sprint notes, and ask for current time metadata.

It is not a hosted service and it does not manage external project systems. The
server runs in the client-selected working directory and reads or writes only
the local `project_plan/` directory under that working directory.

## Runtime Contract

- Transport: MCP over stdio, implemented with the TypeScript MCP SDK.
- Package entry point: `dist/index.js`.
- Binary name: `bagaking-projmcp`.
- Node runtime: `>=18.0.0`.
- Workspace state: `<client cwd>/project_plan/`.
- Protocol channel: JSON-RPC messages use stdout; application diagnostics use
  stderr.
- Public package API: root package import metadata only. The supported runtime
  surface is the MCP stdio server and `bagaking-projmcp` binary; `dist/...`
  subpath imports are internal build output and are not a compatibility
  contract.
- Published package: the compiled `dist/` tree, `README.md`, `LICENSE`, and
  `CHANGELOG.md`. Source, tests, scripts, CI files, and local `project_plan/`
  files are release-validator exclusions.

Set `LOG_LEVEL=error` in client configs when you want only error diagnostics on
stderr. The test suite also checks that startup logs do not write non-protocol
text to stdout.

## Install

```bash
npm install -g @bagaking/projmcp
```

You can also run it without a global install:

```bash
npx -y @bagaking/projmcp
```

## Client Integration

### Claude Code

```bash
claude mcp add projmcp -- npx -y @bagaking/projmcp
```

After reconnecting Claude Code, list the ProjMCP tools before invoking
state-changing tools.

### Claude Desktop

Add the server to the Claude Desktop MCP configuration:

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

Restart or reconnect the client after changing the config. This README does not
claim support for other clients beyond standard stdio MCP compatibility.

## JSON-RPC Smoke

Use this when checking the compiled server or debugging client integration:

```bash
npm ci
npm run build

LOG_LEVEL=error node dist/index.js <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"projmcp-smoke","version":"0.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF
```

Expected result:

- stdout contains MCP JSON-RPC responses, including a `tools/list` response.
- the tool names include `list_files`, `show_current`, `show_plan`,
  `init_project_plan`, `record`, `query_sprint`, and `right_now`.
- stderr may contain startup diagnostics.
- stdout must not contain human-readable application logs outside JSON-RPC
  messages.

For the published package path, replace `node dist/index.js` with
`npx -y @bagaking/projmcp`.

## Tool Contract

All tools return MCP text content. Several tools also attach `_meta` with the
tool name, execution time, file counts, or `right_now` time metadata. Tool
errors are returned as MCP tool responses with `isError: true`; transport-level
startup failures exit the process.

| Tool | Inputs | Reads | Writes | Output |
| --- | --- | --- | --- | --- |
| `list_files` | `type`: `all`, `sprint`, `doc`, `code`, or `opinion` | `project_plan/*.md` | No | JSON text with `summary` and `files` metadata |
| `show_current` | none | `project_plan/CURRENT.md` | No | `CURRENT.md` text |
| `show_plan` | none | `project_plan/PLAN.md` | No | `PLAN.md` text |
| `init_project_plan` | none | template strings | Yes | creates or overwrites the standard planning files |
| `record` | `type`: `doc`, `code`, or `opinion`; `target`; `content` | existing files for numbering | Yes | creates a structured reference file and returns its content |
| `query_sprint` | `sprintId` matching `M##_S##` | matching sprint file | No | matching sprint Markdown text, or available sprint names |
| `right_now` | none | No project files | No | JSON text with UTC, local, and Unix time formats |

### File Naming

`init_project_plan` creates the core planning layout:

```text
project_plan/
+-- PLAN.md
+-- CURRENT.md
`-- M01_S01.initial_setup.md
```

`record` creates files by type:

- `doc` -> `DOCREF_###.<target>.md`
- `code` -> `CODEREF_<target>.md`
- `opinion` -> `OPINIONS_###.<target>.md`

`query_sprint` looks for sprint files whose names start with the requested
`M##_S##` id.

## State-Changing Tools

Only two tools mutate workspace state:

- `init_project_plan`
- `record`

Both write under `<client cwd>/project_plan/`. `init_project_plan` writes the
standard files from bundled templates. Existing files are handled by the file
manager write path, which creates a temporary backup before overwriting and
removes it after a successful write.

Recommended client policy:

- run `list_files`, `show_current`, or `show_plan` first to inspect current
  state.
- call `init_project_plan` only when the target workspace should receive or
  refresh the standard planning files.
- call `record` only when the client has explicit content to persist.
- keep the MCP server working directory scoped to the repository whose
  `project_plan/` should be read or changed.

## Security Model

ProjMCP is a local file-writing MCP server. Treat write-capable tools as
workspace mutations.

Implemented file boundary:

- all project file operations are rooted at `<client cwd>/project_plan/`.
- file operations accept top-level filenames only; nested paths are rejected.
- path traversal, `~`, unsafe filename characters, and unsupported extensions
  are rejected.
- allowed extensions are `.md`, `.json`, and `.txt`; the current tools operate
  on Markdown planning files.
- content is capped by length and byte size.
- obvious active-content patterns such as script tags, `javascript:`, iframes,
  event-handler attributes, and `eval(` are rejected.
- reads and writes use `O_NOFOLLOW` where available and reject symlink targets.
- the `project_plan/` root itself is rejected when it is a symlink.
- directory listings skip symlink and non-file entries.

This does not make arbitrary user-provided Markdown trustworthy. Clients should
still review content before invoking `record`, and users should run the server
only in workspaces where local `project_plan/` writes are acceptable.

## Release Gate

Before publishing or changing the MCP surface, run:

```bash
npm test
npm run release:dry-run
git diff --check
git diff --cached --check
```

`npm test` runs the TypeScript build and Node built-in tests. Current smoke
coverage includes tool initialization, `project_plan` inspection, traversal and
symlink rejection, content validation, package version reporting, and the
stdout/stderr MCP boundary.

`npm run release:dry-run` runs `scripts/validate-release.js` and then
`npm publish --dry-run`. The release validator checks required files, package
metadata, build output, ESLint, TypeScript compilation, smoke tests, entry
points, root-only public exports, installed-package TypeScript resolution, npm
package size, and the packed file manifest.

## Development

```bash
npm ci
npm run build
npm test
npm run lint
npm run validate-release
npm pack --dry-run
npm run dev
```

Repository shape:

```text
src/
+-- index.ts
+-- services/
|   +-- logger.ts
|   +-- mcp-server.ts
|   `-- tool-registry.ts
+-- tools/
|   +-- init-project.ts
|   +-- list-files.ts
|   +-- query-sprint.ts
|   +-- record.ts
|   +-- right-now.ts
|   +-- show-current.ts
|   `-- show-plan.ts
+-- templates/
`-- utils/
    +-- file-manager.ts
    +-- package-metadata.ts
    +-- security-validator.ts
    +-- template-generator.ts
    `-- time-helper.ts
```

## Status

ProjMCP is usable for local `project_plan/` workflows and has a small automated
smoke suite. Treat it as an active TypeScript MCP package: add focused tests for
any changed tool behavior, file boundary, protocol boundary, or release package
surface.

## License

MIT
