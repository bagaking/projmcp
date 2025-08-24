/**
 * Security validation utilities for file operations
 * Provides comprehensive security checks for file paths, content, and sizes
 */

import { resolve, normalize, basename } from 'path';

export interface SecurityConfig {
  readonly maxFileSize: number;
  readonly maxContentLength: number; 
  readonly allowedFileExtensions: readonly string[];
  readonly forbiddenPatterns: readonly RegExp[];
  readonly maxFilenameLength: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFileSize: 1048576, // 1MB
  maxContentLength: 524288, // 512KB text content
  allowedFileExtensions: ['.md', '.json', '.txt'],
  forbiddenPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /<iframe\b[^>]*>/gi, // Iframe tags
    /on\w+\s*=/gi, // Event handlers like onclick=
    /eval\s*\(/gi, // eval function calls
  ],
  maxFilenameLength: 200
} as const;

/**
 * Comprehensive security validator for file operations
 * Implements defense-in-depth security principles
 */
export class SecurityValidator {
  constructor(
    private readonly _config: SecurityConfig = DEFAULT_SECURITY_CONFIG,
    private readonly _trustedBasePath: string
  ) {}

  /**
   * Validates file path for security compliance
   * @param filePath - Path to validate
   * @throws Error if path is invalid or potentially dangerous
   */
  validateFilePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('SecurityValidation: File path must be a non-empty string');
    }

    if (filePath.length > this._config.maxFilenameLength) {
      throw new Error(`SecurityValidation: File path exceeds maximum length of ${this._config.maxFilenameLength}`);
    }

    // Normalize and resolve path to prevent path traversal
    const normalizedPath = normalize(filePath);
    const resolvedPath = resolve(this._trustedBasePath, normalizedPath);

    // Ensure path stays within trusted base directory
    if (!resolvedPath.startsWith(resolve(this._trustedBasePath))) {
      throw new Error('SecurityValidation: Path traversal detected - access denied');
    }

    // Check for potentially dangerous path patterns  
    if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
      throw new Error('SecurityValidation: Dangerous path patterns detected');
    }

    // Validate filename contains only safe characters
    const filename = basename(resolvedPath);
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new Error('SecurityValidation: Invalid filename - only alphanumeric, dots, underscores, and hyphens allowed');
    }

    // Validate file extension
    const hasValidExtension = this._config.allowedFileExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext.toLowerCase())
    );
    
    if (!hasValidExtension) {
      throw new Error(
        `SecurityValidation: File extension not allowed. Permitted extensions: ${this._config.allowedFileExtensions.join(', ')}`
      );
    }

    return resolvedPath;
  }

  /**
   * Validates file content for security threats
   * @param content - Content to validate
   * @param context - Optional context for error messages
   * @throws Error if content contains potentially malicious patterns
   */
  validateFileContent(content: string, context?: string): void {
    if (typeof content !== 'string') {
      throw new Error('SecurityValidation: Content must be a string');
    }

    if (content.length > this._config.maxContentLength) {
      throw new Error(
        `SecurityValidation: Content exceeds maximum length of ${this._config.maxContentLength} characters`
      );
    }

    // Check for malicious patterns
    for (const pattern of this._config.forbiddenPatterns) {
      if (pattern.test(content)) {
        const contextMsg = context ? ` in ${context}` : '';
        throw new Error(`SecurityValidation: Potentially malicious content detected${contextMsg}`);
      }
    }

    // Check for suspicious binary content (null bytes)
    if (content.includes('\0')) {
      throw new Error('SecurityValidation: Binary content not allowed in text files');
    }
  }

  /**
   * Validates file size against configured limits
   * @param sizeInBytes - Size to validate
   * @param context - Optional context for error messages
   * @throws Error if size exceeds limits
   */
  validateFileSize(sizeInBytes: number, context?: string): void {
    if (sizeInBytes < 0 || !Number.isInteger(sizeInBytes)) {
      throw new Error('SecurityValidation: File size must be a non-negative integer');
    }

    if (sizeInBytes > this._config.maxFileSize) {
      const contextMsg = context ? ` for ${context}` : '';
      throw new Error(
        `SecurityValidation: File size ${sizeInBytes} bytes exceeds maximum allowed ${this._config.maxFileSize} bytes${contextMsg}`
      );
    }
  }

  /**
   * Comprehensive validation combining all security checks
   * @param filePath - Path to validate
   * @param content - Content to validate
   * @param context - Optional context for error messages
   * @returns Validated and sanitized file path
   */
  validateFileOperation(filePath: string, content: string, context?: string): string {
    const validatedPath = this.validateFilePath(filePath);
    this.validateFileContent(content, context);
    this.validateFileSize(Buffer.byteLength(content, 'utf8'), context);
    
    return validatedPath;
  }
}