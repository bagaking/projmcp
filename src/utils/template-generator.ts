/**
 * Template generation utilities for creating standardized project documents
 * Follows SRP: Single responsibility for template operations
 * Implements comprehensive template generation with modular design
 */

import { TemplateType } from '../types.js';
import { ITemplateGenerator, ILogger } from '../interfaces/core-interfaces.js';
import { LoggerFactory, LoggerUtils } from '../services/logger.js';

/**
 * Template generator class for creating standardized documents
 * Implements ITemplateGenerator interface with comprehensive logging and modular design
 */
export class TemplateGenerator implements ITemplateGenerator {
  private readonly logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger();
    this.logger.info('TemplateGenerator initialized');
  }
  
  /**
   * Generate template content based on type and parameters
   */
  generateTemplate(
    type: TemplateType, 
    params: Record<string, unknown> = {}
  ): string {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'TemplateGenerator', 'generateTemplate', { type, params });

    try {
      let template: string;
      
      switch (type) {
      case 'sprint':
        template = this.generateSprintTemplateInternal(params);
        break;
      case 'docref':
        template = this.generateDocrefTemplateInternal(params);
        break;
      case 'coderef':
        template = this.generateCoderefTemplateInternal(params);
        break;
      case 'opinions':
        template = this.generateOpinionsTemplateInternal(params);
        break;
      default:
        throw new Error(`Unknown template type: ${type}`);
      }

      this.logger.info('Template generated successfully', { 
        type, 
        templateLength: template.length 
      });
      
      LoggerUtils.logPerformance(this.logger, 'generateTemplate', startTime, { type });
      return template;
      
    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'TemplateGenerator', 'generateTemplate', error as Error, { type });
      throw error;
    }
  }

  /**
   * Generate complete project plan structure templates
   */
  generateProjectPlanTemplates(projectName?: string, params: Record<string, unknown> = {}): Record<string, string> {
    const startTime = Date.now();
    LoggerUtils.logMethodEntry(this.logger, 'TemplateGenerator', 'generateProjectPlanTemplates', { projectName, params });

    try {
      const now = new Date().toISOString().split('T')[0];
      const templateParams = {
        date: now,
        projectName: projectName || 'MCP Project Plan Server',
        ...params
      };
      
      const templates = {
        'PLAN.md': this.generatePlanTemplateInternal(templateParams),
        'CURRENT.md': this.generateCurrentTemplateInternal(templateParams),
        'M01_S01.initial_setup.md': this.generateSprintTemplateInternal({
          milestone: 'M01',
          sprint: 'S01',
          title: 'initial_setup',
          ...templateParams,
        }),
      };

      this.logger.info('Project plan templates generated', { 
        templateCount: Object.keys(templates).length,
        projectName 
      });

      LoggerUtils.logPerformance(this.logger, 'generateProjectPlanTemplates', startTime, { projectName });
      return templates;
      
    } catch (error) {
      LoggerUtils.logMethodError(this.logger, 'TemplateGenerator', 'generateProjectPlanTemplates', error as Error, { projectName });
      throw error;
    }
  }

  /**
   * Generate sprint template with specific parameters
   */
  generateSprintTemplate(milestone: string, sprint: string, title: string, params: Record<string, unknown> = {}): string {
    const templateParams = {
      milestone,
      sprint,
      title,
      date: new Date().toISOString().split('T')[0],
      ...params
    };
    
    return this.generateSprintTemplateInternal(templateParams);
  }

  /**
   * Internal sprint template generation - modularized approach
   */
  private generateSprintTemplateInternal(params: Record<string, unknown>): string {
    const {
      milestone = 'M01',
      sprint = 'S01',
      title = 'task_name',
      date = new Date().toISOString().split('T')[0],
    } = params;

    const sections = [
      this.generateSprintHeader(milestone as string, sprint as string, title as string, date as string),
      this.generateSprintOKRSection(),
      this.generateSprintChecklistSection(),
      this.generateSprintKnowledgeSection(),
      this.generateSprintAcceptanceSection(),
      this.generateSprintRisksSection(),
      this.generateSprintEffortSection()
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate sprint template header with metadata
   */
  private generateSprintHeader(milestone: string, sprint: string, title: string, date: string): string {
    const titleFormatted = title.replace(/_/g, ' ');
    const titleCapitalized = titleFormatted.replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    return `---
milestone: ${milestone}
sprint: ${sprint}
created_date: ${date}
description: ${titleFormatted} execution plan
purpose: Detailed implementation plan for ${titleFormatted}
---

# ${milestone}_${sprint}: ${titleCapitalized}`;
  }

  /**
   * Generate OKR section for sprint template
   */
  private generateSprintOKRSection(): string {
    return `## OKR

### Objective
Define the main objective for this sprint.

### Key Results
1. **KR1**: First measurable result
2. **KR2**: Second measurable result  
3. **KR3**: Third measurable result`;
  }

  /**
   * Generate execution checklist section
   */
  private generateSprintChecklistSection(): string {
    return `## 执行检查清单

### 阶段1: Preparation
- [ ] Task 1
- [ ] Task 2

### 阶段2: Implementation  
- [ ] Task 3
- [ ] Task 4

### 阶段3: Validation
- [ ] Task 5
- [ ] Task 6`;
  }

  /**
   * Generate key knowledge section
   */
  private generateSprintKnowledgeSection(): string {
    return `## 关键知识

### Key Knowledge Point 1
Explanation of important concepts or techniques needed for this sprint.

### Key Knowledge Point 2
Additional context or background information.`;
  }

  /**
   * Generate acceptance criteria section
   */
  private generateSprintAcceptanceSection(): string {
    return `## 验收标准

### 功能验收
1. ✅ **Criterion 1**: Specific acceptance criteria
2. ✅ **Criterion 2**: Another verification point
3. ✅ **Criterion 3**: Final validation requirement

### 质量验收
- Code quality standards met
- Documentation updated
- Tests passing`;
  }

  /**
   * Generate risks and dependencies section
   */
  private generateSprintRisksSection(): string {
    return `## 风险和依赖
- **Risk 1**: Potential issue and mitigation
- **Dependency 1**: External requirement`;
  }

  /**
   * Generate effort estimation section
   */
  private generateSprintEffortSection(): string {
    return `## 预期工作量
- **Development**: X hours
- **Testing**: Y hours
- **Documentation**: Z hours`;
  }

  /**
   * Generate document reference template
   */
  private generateDocrefTemplateInternal(params: Record<string, unknown>): string {
    const {
      target = 'document_name',
      date = new Date().toISOString().split('T')[0],
    } = params;

    return `---
created_date: ${date}
description: Reference documentation for ${target as string}
purpose: Important reference material for project development
source_type: EXTERNAL_DOC
evidence_level: Medium (specify actual evidence level)
reference_purpose: Specify how this will be used in the project
---

# ${(target as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Reference

## 文档来源信息
**来源**: Specify the source  
**调研时间**: ${date}  
**工具调用**: Specify tool or method used  
**证据程度**: Specify evidence level and reasoning  
**原始链接**: Provide original URL if available

## 引用目的
Explain why this document is important and how it will be used.

## 核心内容

### Key Section 1
Important information from the source.

### Key Section 2
Additional relevant details.

## 与项目的对应关系
- **Phase X**: How this relates to specific project phases
- **Component Y**: Relevance to particular components
- **Decision Z**: How this influences project decisions
`;
  }

  /**
   * Generate code reference template  
   */
  private generateCoderefTemplateInternal(params: Record<string, unknown>): string {
    const {
      target = 'code_component',
      date = new Date().toISOString().split('T')[0],
    } = params;

    return `---
created_date: ${date}
description: Code reference for ${target as string}
purpose: Code examples and implementation patterns
source_type: OFFICIAL_DOC
evidence_level: High (specify actual level)
reference_purpose: Implementation guidance for project development
---

# ${(target as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Code Reference

## 文档来源信息
**来源**: Official documentation or repository  
**调研时间**: ${date}  
**工具调用**: Context7 or other tool used  
**证据程度**: High - from official source (adjust as needed)  
**原始链接**: https://example.com/docs

## 引用目的
This code reference provides implementation patterns for:
1. Core functionality development
2. Best practice guidance
3. API usage examples

## 核心代码参考

### Basic Implementation
\`\`\`typescript
// Example code here
export class ExampleClass {
  // Implementation
}
\`\`\`

### Advanced Usage
\`\`\`typescript  
// Advanced example
\`\`\`

## 关键实现要点
1. **Pattern 1**: Description and rationale
2. **Pattern 2**: Another important pattern
3. **Best Practice**: Key considerations

## 与项目的对应关系
- **Component A**: How this code relates to specific components
- **Phase B**: Relevance to development phases
- **Standard C**: Alignment with coding standards
`;
  }

  /**
   * Generate opinions/decisions template
   */
  private generateOpinionsTemplateInternal(params: Record<string, unknown>): string {
    const {
      topic = 'decision_topic',
      date = new Date().toISOString().split('T')[0],
    } = params;

    return `---
created_date: ${date}
description: Key decisions and observations about ${topic as string}
purpose: Record important project decisions and reasoning
---

# ${(topic as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}

## Decision Topic 1

### 决策: Brief decision statement
**观察**: What was observed that led to this decision  
**决策依据**:
1. Reason 1
2. Reason 2  
3. Reason 3

**影响**: How this decision affects the project

### 决策: Another decision
**观察**: Relevant observations  
**决策依据**:
- Supporting evidence
- Technical considerations
- User requirements

**影响**: Project implications

## Key Observations

### 观察: Important insight
**影响**: What this means for the project  
**应对策略**:
1. Action item 1
2. Action item 2

## Future Considerations

### Long-term Impact
How these decisions will affect future development.

### Recommended Reviews
When and how to review these decisions.
`;
  }

  /**
   * Generate PLAN.md template
   */
  private generatePlanTemplateInternal(params: Record<string, unknown>): string {
    const { date } = params;

    return `---
created_date: ${date}
description: Complete project planning document
purpose: Record project from conception to implementation planning
---

# Project Name - Project Planning

## 用户原始诉求

### 原话记录
Record exact user requirements here.

### 需求分析解读
Analysis and interpretation of user needs.

## 沟通确认结果

### 功能模块确认
Confirmed functionality modules.

### 技术边界确认
Technical boundaries and constraints.

## 技术调研结果

### Research Topic 1
**调研来源**: Source information  
**调研时间**: ${date}  
**证据程度**: Evidence level

#### 核心发现
Key findings from research.

## 技术选型和依赖

### 核心技术栈
Selected technologies and rationale.

### 主要依赖
Key dependencies and versions.

## 项目介绍

### 项目概述
High-level project description.

### 核心价值
Value proposition and benefits.

### 技术特色
Technical highlights and innovations.

## 与后续决策的关系
How this plan guides future decisions.
`;
  }

  /**
   * Generate CURRENT.md template
   */
  private generateCurrentTemplateInternal(params: Record<string, unknown>): string {
    const { date } = params;

    return `---
last_updated: ${date}
description: Current execution status and core standards
purpose: Dynamic tracking of project execution status
---

# Project Name - Current Status

## 最重要的标准和原则

### 核心原则
1. **Principle 1**: Description
2. **Principle 2**: Description

### 质量标准
Quality requirements and metrics.

### 用户体验标准
User experience requirements.

## 需求实现的核心流程

### Core Workflow
Step-by-step process description.

## 当前执行状态

### 已完成
✅ Completed tasks

### 进行中  
🚧 In progress tasks

### 待开始
⏳ Pending tasks

### 重要变更历史
- ${date}: Project initiated

### 下一步行动
Immediate next steps.

## 执行策略要求
Guidelines for project execution.
`;
  }
}