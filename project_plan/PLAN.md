---
created_date: 2025-01-24
description: MCP项目最佳实践服务器的完整规划文档，包含用户需求、技术调研、架构设计等
purpose: 记录项目从构思到实施的完整规划过程，确保决策可追溯
---

# MCP项目最佳实践服务器 - 项目规划

## 用户原始诉求

### 原话记录
用户表达了以下核心需求：

> "我想创建一个项目, 当前就在其目录下, 是一个空的 git 仓库
> 这个项目是一个 mcp 服务器, 可以 npm 一行命令执行, 更好的帮助 agent 使用这套最佳实践"

> "主要是给 agent 提供目录管理能力, 比如 list 某种类型显示文件和行数, 查询某个 srpint, 工程化方式按这套规范生成目录等"

> "list(all|sprint|doc|code|opinion)
> record(doc|code|option, target, content)
> show_current
> show_plan
> ...
> 不用去识别内容, 可以提供创建模版, 主要还是帮 agent 降低看文档做事儿的成本, 通过 api 规范一些行为, 并节省 token"

### 需求分析解读
1. **核心目标**: 创建一个MCP服务器来帮助AI agent更好地使用"项目组织最佳实践"
2. **用户价值**: 降低agent操作成本，节省token，规范行为
3. **技术要求**: npm一行命令执行，提供API接口
4. **功能范围**: 目录管理、文档查询、模板生成
5. **目标用户**: 主要面向Claude等AI agent

## 沟通确认结果

### 功能模块确认
经过深度沟通，确认以下功能模块：

#### 1. 目录管理能力
- `list(all|sprint|doc|code|opinion)` - 按类型列出文件和行数
- 支持文件类型分类和筛选
- 提供文件基本统计信息

#### 2. 文档记录功能  
- `record(doc|code|option, target, content)` - 记录各类文档内容
- 支持DOCREF、CODEREF、OPINIONS三种类型
- 自动化文件命名和组织

#### 3. 核心文档查询
- `show_current` - 显示CURRENT.md内容
- `show_plan` - 显示PLAN.md内容
- 快速获取项目核心状态

#### 4. 工程化支持
- 初始化project_plan目录结构
- 提供标准模板生成
- 按规范创建新文档

### 技术边界确认
- **不需要内容识别**: 专注于文件操作和模板生成
- **API优先**: 通过规范的API降低agent使用成本
- **Token优化**: 简化响应格式，减少无关信息输出
- **集成方式**: 主要面向Claude，通过MCP协议集成

## 技术调研结果

### MCP协议调研
**调研来源**: Context7 - ModelContextProtocol TypeScript SDK
**调研时间**: 2025-01-24
**证据程度**: 官方文档，高可信度

#### 核心发现
1. **MCP TypeScript SDK**: 成熟的官方SDK，提供完整的server/client实现
2. **StdioServerTransport**: 适合命令行工具集成的传输方式
3. **工具注册机制**: 支持registerTool方式注册自定义工具
4. **项目结构**: src目录组织，支持ESM和CJS构建
5. **开发流程**: npm install -> npm run build -> npm test

#### 关键实现模式
```typescript
const server = new McpServer({
  name: "project-plan-server", 
  version: "1.0.0"
});

server.registerTool(
  "list_files",
  {
    title: "List Project Files",
    description: "List files by type with line counts",
    inputSchema: { type: z.enum(["all", "sprint", "doc", "code", "opinion"]) }
  },
  async ({ type }) => ({
    content: [{ type: "text", text: JSON.stringify(fileList) }]
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Node.js项目结构调研
**调研来源**: MCP SDK项目结构和最佳实践
**关键标准**:
- TypeScript严格模式，ES模块
- 小写连字符文件命名
- 测试文件co-locate (.test.ts后缀)
- 2空格缩进，单引号优先
- JSDoc注释用于公共API

## 技术选型和依赖

### 核心技术栈
1. **开发语言**: TypeScript (严格模式)
2. **MCP SDK**: @modelcontextprotocol/sdk (官方SDK)
3. **运行时**: Node.js v18+
4. **构建工具**: npm scripts
5. **代码规范**: ESLint + TypeScript strict
6. **包管理**: npm

### 主要依赖
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3.x" 
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "tsx": "^4.x"
  }
}
```

### 架构设计
- **单一入口**: src/index.ts作为服务器入口
- **工具模块**: src/tools/目录组织各个工具实现  
- **模板系统**: src/templates/目录存放文档模板
- **工具类**: src/utils/提供文件系统操作工具

## 项目介绍

### 项目概述
本项目是一个专门为AI agent设计的MCP (Model Context Protocol) 服务器，旨在帮助agent更好地使用"项目组织最佳实践"这套项目管理方法。通过提供标准化的API接口，显著降低agent在项目管理过程中的操作成本和token消耗。

### 核心价值
1. **降低操作成本**: 通过API规范化常用操作，减少agent重复性工作
2. **节省Token**: 精简响应格式，避免无关信息传输
3. **规范行为**: 通过工具约束确保符合最佳实践标准
4. **提升效率**: 一行命令启动，即插即用的集成体验

### 技术特色
- 基于官方MCP协议实现，兼容性强
- TypeScript严格模式开发，类型安全
- stdio传输方式，完美适配命令行环境
- 模板化文档生成，确保规范一致性
- 轻量级设计，专注核心功能

### 目标场景
主要服务于使用Claude等AI agent进行项目管理的场景，特别是需要遵循"项目组织最佳实践"进行规范化项目管理的团队和个人。

## 与后续决策的关系
本规划文档为后续所有开发决策提供依据：
1. **技术选型决策**: 基于调研结果确定的技术栈不变
2. **功能边界控制**: 严格按照用户确认的功能范围实现
3. **API设计原则**: 遵循简化响应、降低token消耗的原则
4. **项目结构**: 按照MCP SDK最佳实践组织代码
5. **质量标准**: 按照TypeScript严格模式和官方规范执行

任何重大变更都应该更新本规划文档并在CURRENT.md中体现。