export const CURRENT_TEMPLATE = `---
last_updated: {{DATE}}
description: 项目当前执行状态和核心标准
purpose: 动态跟踪项目执行状态，记录重要决策和进度
---

# {{PROJECT_NAME}} - 当前状态

## 最重要的标准和原则

### 核心原则
{{CORE_PRINCIPLES}}

### 质量标准
{{QUALITY_STANDARDS}}

### 用户体验标准
{{UX_STANDARDS}}

## 需求实现的核心流程

### 1. {{WORKFLOW_1_TITLE}}
\`\`\`
{{WORKFLOW_1_STEPS}}
\`\`\`

### 2. {{WORKFLOW_2_TITLE}}
\`\`\`
{{WORKFLOW_2_STEPS}}
\`\`\`

### 3. {{WORKFLOW_3_TITLE}}
\`\`\`
{{WORKFLOW_3_STEPS}}
\`\`\`

## "组织目录的最佳实践"使用方法

### 核心方法描述
{{METHODOLOGY_DESCRIPTION}}

### 核心目录结构
\`\`\`
{{DIRECTORY_STRUCTURE}}
\`\`\`

### 使用时机和方法
{{USAGE_GUIDELINES}}

## 计划阶段描述和文档引用

### Milestone 1: {{CURRENT_MILESTONE}}
**目标**: {{MILESTONE_OBJECTIVE}}
**文档**: {{MILESTONE_DOCS}}

#### Sprint 1: {{CURRENT_SPRINT}}
{{SPRINT_DESCRIPTION}}

## 当前执行状态

### 已完成
{{COMPLETED_TASKS}}

### 进行中
{{IN_PROGRESS_TASKS}}

### 待开始
{{PENDING_TASKS}}

### 重要变更历史
{{CHANGE_HISTORY}}

### 下一步行动
{{NEXT_ACTIONS}}

## 执行策略要求
{{EXECUTION_STRATEGY}}
`;