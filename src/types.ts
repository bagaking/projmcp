/**
 * Core type definitions for the MCP Project Plan Server
 */

import { z } from 'zod';

/**
 * File types supported by the server
 */
export const FILE_TYPES = ['all', 'sprint', 'doc', 'code', 'opinion'] as const;
export type FileType = typeof FILE_TYPES[number];

/**
 * Document recording types
 */
export const RECORD_TYPES = ['doc', 'code', 'opinion'] as const;
export type RecordType = typeof RECORD_TYPES[number];

/**
 * File information structure
 */
export interface FileInfo {
  name: string;
  path: string;
  type: FileType;
  lineCount: number;
  lastModified: string;
  size: number;
}

/**
 * Project status information
 */
export interface ProjectStatus {
  hasProjectPlan: boolean;
  totalFiles: number;
  filesByType: Record<FileType, number>;
  lastUpdated: string;
}

/**
 * Zod schemas for input validation
 */
export const ListFilesInputSchema = z.object({
  type: z.enum(FILE_TYPES),
});

export const RecordInputSchema = z.object({
  type: z.enum(RECORD_TYPES),
  target: z.string().min(1, 'Target must not be empty'),
  content: z.string().min(1, 'Content must not be empty'),
});

export const QuerySprintInputSchema = z.object({
  sprintId: z.string().regex(/^M\d{2}_S\d{2}$/, 'Sprint ID must match pattern M##_S##'),
});

export const CreateDocumentInputSchema = z.object({
  type: z.enum(RECORD_TYPES),
  name: z.string().min(1, 'Name must not be empty'),
  template: z.string().optional(),
});

/**
 * Tool response content types - aligned with MCP SDK
 */
export interface ToolTextContent {
  [x: string]: unknown;
  type: 'text';
  text: string;
}

export interface ToolResourceContent {
  [x: string]: unknown;
  type: 'resource';
  uri: string;
  text?: string;
  mimeType?: string;
}

export type ToolContent = ToolTextContent | ToolResourceContent;

/**
 * Standard tool response structure - aligned with MCP SDK
 */
export interface ToolResponse {
  [x: string]: unknown;
  content: ToolContent[];
  isError?: boolean;
}

/**
 * Constants for file patterns and templates
 */
export const FILE_PATTERNS = {
  sprint: /^M\d{2}_S\d{2}\..+\.md$/,
  doc: /^DOCREF_\d{3}\..+\.md$/,
  code: /^CODEREF_.+\.md$/,
  opinion: /^OPINIONS_\d{3}\..+\.md$/,
  core: /^(PLAN|CURRENT)\.md$/,
} as const;

/**
 * Template types for document generation
 */
export const TEMPLATE_TYPES = {
  sprint: 'sprint',
  docref: 'docref',
  coderef: 'coderef',
  opinions: 'opinions',
} as const;

export type TemplateType = keyof typeof TEMPLATE_TYPES;