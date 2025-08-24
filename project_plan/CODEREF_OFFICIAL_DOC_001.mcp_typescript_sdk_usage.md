---
created_date: 2025-01-24
description: MCP TypeScript SDK官方文档的核心用法参考，用于指导项目实现
purpose: 提供经过验证的官方实现方式，确保按照最佳实践开发MCP服务器
source_type: OFFICIAL_DOC
evidence_level: 高 (官方文档，权威可信)
reference_purpose: 核心实现参考，用于M01_S01和M01_S02阶段的开发指导
---

# MCP TypeScript SDK 官方用法参考

## 文档来源信息
**来源**: Context7 - ModelContextProtocol TypeScript SDK官方仓库  
**调研时间**: 2025-01-24  
**工具调用**: mcp__context7__get-library-docs (Context7CompatibleLibraryID: /modelcontextprotocol/typescript-sdk)  
**证据程度**: 高 - 来自官方GitHub仓库的最新文档，具有权威性  
**原始链接**: https://github.com/modelcontextprotocol/typescript-sdk

## 引用目的
本文档用于M01_S01和M01_S02阶段的开发指导，提供：
1. MCP服务器基础架构的标准实现方式
2. 工具注册和处理的最佳实践
3. TypeScript项目结构和配置标准
4. 关键API调用方式和参数验证方法

## 核心代码参考

### 1. 基础服务器初始化
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 创建MCP服务器实例
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});

// 启动stdio传输并连接
const transport = new StdioServerTransport();
await server.connect(transport);
```

**用途**: 用于src/index.ts和src/server.ts的基础结构实现  
**关键点**: 
- 使用McpServer而非低级Server类
- StdioServerTransport适合命令行集成
- 版本号必须遵循语义版本

### 2. 工具注册标准方式
```typescript
server.registerTool(
  "list-files",
  {
    title: "List Files",
    description: "List project files",
    inputSchema: { pattern: z.string() }
  },
  async ({ pattern }) => ({
    content: [
      { type: "text", text: `Found files matching "${pattern}":` },
      // ResourceLinks让工具返回引用而不是文件内容
      {
        type: "resource_link", 
        uri: "file:///project/README.md",
        name: "README.md",
        mimeType: "text/markdown",
        description: 'A README file'
      }
    ]
  })
);
```

**用途**: 用于src/tools/目录下各个工具的实现参考  
**关键点**:
- 使用registerTool而非旧的tool()方法
- inputSchema用zod进行参数验证
- 返回格式支持text和resource_link类型
- 优先使用resource_link减少token传输

### 3. 资源注册方式
```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

server.registerResource(
  "config",
  "config://app",
  {
    title: "Application Config",
    description: "Application configuration data",
    mimeType: "text/plain"
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "App configuration here"
    }]
  })
);
```

**用途**: 可选功能，用于暴露项目配置或状态信息  
**关键点**: 
- 静态资源用固定URI  
- 动态资源用ResourceTemplate
- mimeType帮助客户端正确解析内容

### 4. 错误处理方式
```typescript  
server.registerTool(
  "query",
  {
    title: "SQL Query", 
    description: "Execute SQL queries on the database",
    inputSchema: { sql: z.string() }
  },
  async ({ sql }) => {
    try {
      const results = await db.all(sql);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        content: [{
          type: "text", 
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);
```

**用途**: 用于所有工具实现中的错误处理标准  
**关键点**:
- try-catch包裹异步操作
- 返回isError: true标识错误状态
- 错误信息要清晰明确

## 项目结构参考

### 标准目录组织
```
src/
├── index.ts          # 服务器入口
├── server.ts         # 服务器核心逻辑  
├── tools/            # 工具实现
├── utils/            # 工具类
└── templates/        # 模板文件
```

### package.json配置要点
```json
{
  "name": "mcp-project-plan-server",
  "version": "1.0.0", 
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "npm run build",
    "lint": "npm run lint", 
    "test": "npm test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3.x"
  }
}
```

### TypeScript配置参考
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext", 
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 关键API调用模式

### 工具调用响应格式
```typescript
// 文本响应
return {
  content: [{ type: "text", text: "响应内容" }]
};

// 资源链接响应(推荐)
return {
  content: [
    { type: "text", text: "描述信息" },
    {
      type: "resource_link",
      uri: "file:///path/to/file", 
      name: "文件名",
      description: "文件描述"
    }
  ]
};

// 错误响应
return {
  content: [{ type: "text", text: `Error: ${error.message}` }],
  isError: true
};
```

### 参数验证模式
```typescript
import { z } from "zod";

// 简单验证
inputSchema: { name: z.string() }

// 枚举验证  
inputSchema: { type: z.enum(["all", "sprint", "doc"]) }

// 复杂对象验证
inputSchema: {
  target: z.string(),
  content: z.string(),
  type: z.enum(["doc", "code", "opinion"])
}
```

## 最佳实践要点

### 性能优化
1. 使用resource_link而非直接返回大量文本
2. 实现debounce机制减少频繁通知
3. 异步操作正确使用async/await

### 安全考虑  
1. 输入验证使用zod严格校验
2. 文件操作限制在项目目录内
3. 错误信息不暴露敏感路径

### 用户体验
1. 错误信息要具体和可操作
2. 工具描述要清晰简洁
3. 支持增量更新避免重复操作

## 与项目的对应关系
- **M01_S01阶段**: 使用基础服务器初始化和项目结构参考
- **M01_S02阶段**: 使用工具注册和API响应格式参考  
- **质量控制**: 使用错误处理和最佳实践标准
- **长期维护**: 遵循官方更新，保持API兼容性