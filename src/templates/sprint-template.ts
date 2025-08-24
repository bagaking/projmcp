export const SPRINT_TEMPLATE = `---
milestone: {{MILESTONE}}
sprint: {{SPRINT}}
created_date: {{DATE}}
description: {{DESCRIPTION}}
purpose: {{PURPOSE}}
---

# {{MILESTONE}}_{{SPRINT}}: {{TITLE}}

## OKR

### Objective
{{OBJECTIVE}}

### Key Results
{{KEY_RESULTS}}

## 执行检查清单

### 阶段1: {{PHASE_1_TITLE}}
{{PHASE_1_CHECKLIST}}

### 阶段2: {{PHASE_2_TITLE}}
{{PHASE_2_CHECKLIST}}

### 阶段3: {{PHASE_3_TITLE}}
{{PHASE_3_CHECKLIST}}

## 关键知识

### {{KNOWLEDGE_TOPIC_1}}
{{KNOWLEDGE_CONTENT_1}}

### {{KNOWLEDGE_TOPIC_2}}
{{KNOWLEDGE_CONTENT_2}}

## 验收标准

### 功能验收
{{FUNCTIONAL_ACCEPTANCE}}

### 代码质量验收
{{QUALITY_ACCEPTANCE}}

### 集成验收
{{INTEGRATION_ACCEPTANCE}}

## 风险和依赖
{{RISKS_AND_DEPENDENCIES}}

## 预期工作量
{{ESTIMATED_EFFORT}}
`;