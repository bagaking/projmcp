export const OPINION_TEMPLATE = `---
created_date: {{DATE}}
description: Key decisions and observations about {{TOPIC}}
purpose: Record important project decisions and reasoning
---

# {{TOPIC_TITLE}}

## {{TOPIC_TITLE}} 1

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


## User Content

{{CONTENT}}
`;

export const CODE_TEMPLATE = `---
created_date: {{DATE}}
source: {{SOURCE}}
description: Code reference for {{TOPIC}}
purpose: {{PURPOSE}}
accuracy_level: {{ACCURACY}}
---

# {{TOPIC_TITLE}} - Code Reference

## Overview
{{OVERVIEW}}

## Source Information
**来源**: {{SOURCE_DETAILS}}
**更新时间**: {{SOURCE_DATE}}
**证据程度**: {{EVIDENCE_LEVEL}}
**原始链接**: {{ORIGINAL_LINK}}

## Code Examples

### {{EXAMPLE_1_TITLE}}
\`\`\`{{LANGUAGE}}
{{CODE_EXAMPLE_1}}
\`\`\`

### {{EXAMPLE_2_TITLE}}
\`\`\`{{LANGUAGE}}
{{CODE_EXAMPLE_2}}
\`\`\`

## Key Points
{{KEY_POINTS}}

## Usage Notes
{{USAGE_NOTES}}

## User Content

{{CONTENT}}
`;

export const DOC_TEMPLATE = `---
created_date: {{DATE}}
source: {{SOURCE}}
description: Documentation reference for {{TOPIC}}
purpose: {{PURPOSE}}
---

# {{TOPIC_TITLE}} - Documentation

## Summary
{{SUMMARY}}

## Source Information
**来源**: {{SOURCE_DETAILS}}
**证据程度**: {{EVIDENCE_LEVEL}}
**原始链接**: {{ORIGINAL_LINK}}

## Key Information
{{KEY_INFORMATION}}

## Related Topics
{{RELATED_TOPICS}}

## User Content

{{CONTENT}}
`;