export const PLAN_TEMPLATE = `---
created_date: {{DATE}}
description: 项目完整规划和技术调研结果
purpose: 记录项目原始需求、技术选型和实施roadmap
---

# {{PROJECT_NAME}} - 项目规划

## 用户原始诉求

### 核心需求
用户希望创建一个MCP服务器项目，提供以下功能：

{{USER_REQUIREMENTS}}

### 分析解读
{{REQUIREMENTS_ANALYSIS}}

## 沟通情况

### 需求确认
{{COMMUNICATION_LOG}}

### 功能边界
{{SCOPE_DEFINITION}}

## 调研结果

### 技术调研
{{TECHNICAL_RESEARCH}}

### 最佳实践调研  
{{BEST_PRACTICES}}

## 技术选型和依赖

### 核心技术栈
- **运行时**: Node.js (≥18)
- **语言**: TypeScript (严格模式)
- **协议**: MCP (Model Context Protocol)
- **传输**: StdioServerTransport
- **验证**: Zod schema validation

### 主要依赖
{{DEPENDENCIES}}

### 架构决策
{{ARCHITECTURE_DECISIONS}}

## 最佳实践要求

### 代码规范
{{CODE_STANDARDS}}

### 项目结构
{{PROJECT_STRUCTURE}}

### 文档要求
{{DOCUMENTATION_REQUIREMENTS}}

## 项目介绍

### 项目概述
{{PROJECT_OVERVIEW}}

### 核心价值
{{CORE_VALUE}}

### 目标用户
{{TARGET_USERS}}

## Roadmap

### Milestone 1: {{M1_TITLE}}
{{M1_DESCRIPTION}}

#### Sprint 1.1: {{S1_1_TITLE}}
{{S1_1_DESCRIPTION}}

#### Sprint 1.2: {{S1_2_TITLE}}  
{{S1_2_DESCRIPTION}}

### Milestone 2: {{M2_TITLE}}
{{M2_DESCRIPTION}}

#### Sprint 2.1: {{S2_1_TITLE}}
{{S2_1_DESCRIPTION}}

## 风险评估

### 技术风险
{{TECHNICAL_RISKS}}

### 时间风险
{{TIME_RISKS}}

### 依赖风险
{{DEPENDENCY_RISKS}}
`;