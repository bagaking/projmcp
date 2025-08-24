/**
 * 直接使用MCP SDK的简化服务器
 * 用于测试是否是抽象层导致的问题
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const server = new McpServer({
  name: "direct-test-server",
  version: "1.0.0"
});

// 直接使用官方API格式注册工具
server.registerTool(
  "list_files",
  {
    description: "List files in project_plan directory",
    inputSchema: {
      type: z.enum(['all', 'sprint', 'doc', 'code', 'opinion'])
    }
  },
  async ({ type }) => {
    try {
      const projectPlanDir = join(process.cwd(), 'project_plan');
      const files = await readdir(projectPlanDir);
      
      const filteredFiles = files.filter(file => {
        if (type === 'all') return true;
        if (type === 'sprint') return file.match(/^M\d{2}_S\d{2}/);
        if (type === 'doc') return file.startsWith('DOCREF_');
        if (type === 'code') return file.startsWith('CODEREF_');
        if (type === 'opinion') return file.startsWith('OPINIONS_');
        return false;
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            files: filteredFiles,
            count: filteredFiles.length,
            type: type
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text", 
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

server.registerTool(
  "show_current",
  {
    description: "Show current project status",
    inputSchema: {}
  },
  async () => {
    try {
      const content = await readFile(join(process.cwd(), 'project_plan', 'CURRENT.md'), 'utf-8');
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: 'CURRENT.md not found. Please run init_project_plan first.'
        }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🧪 Direct MCP test server started with 2 tools: list_files, show_current');
}

main().catch(console.error);