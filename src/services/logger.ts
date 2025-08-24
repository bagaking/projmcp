/**
 * Structured logging service for MCP Project Plan Server
 * Provides contextual logging with bagaking_planmcp identifier
 */

import { ILogger } from '../interfaces/core-interfaces.js';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Console-based logger implementation with structured output
 * Uses bagaking_planmcp service identifier for easy log filtering
 */
export class ConsoleLogger implements ILogger {
  private readonly serviceName = 'bagaking_planmcp';
  private readonly logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    const output = this.formatLogEntry(logEntry);
    
    // Use appropriate console method based on log level
    switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      console.debug(output);
      break;
    default:
      console.log(output);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    return levels[level] <= levels[this.logLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    // In production, you might want JSON format for log aggregation
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    }

    // Human-readable format for development
    const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS
    const level = entry.level.toUpperCase().padEnd(5);
    const service = `[${entry.service}]`;
    
    let output = `${timestamp} ${level} ${service} ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.error) {
      output += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\nStack: ${entry.error.stack}`;
      }
    }
    
    return output;
  }
}

/**
 * Logger factory for consistent logger creation
 */
export class LoggerFactory {
  private static instance: ILogger;

  static createLogger(logLevel?: LogLevel): ILogger {
    if (!this.instance) {
      const level = logLevel || (process.env.LOG_LEVEL as LogLevel) || 'info';
      this.instance = new ConsoleLogger(level);
    }
    return this.instance;
  }

  static getLogger(): ILogger {
    if (!this.instance) {
      this.instance = this.createLogger();
    }
    return this.instance;
  }
}

/**
 * Utility functions for common logging patterns
 */
export class LoggerUtils {
  /**
   * Log method entry with parameters
   */
  static logMethodEntry(logger: ILogger, className: string, methodName: string, params?: Record<string, unknown>): void {
    logger.debug(`${className}.${methodName} - Entry`, params);
  }

  /**
   * Log method exit with result
   */
  static logMethodExit(logger: ILogger, className: string, methodName: string, result?: unknown): void {
    logger.debug(`${className}.${methodName} - Exit`, result ? { result } : undefined);
  }

  /**
   * Log method error with context
   */
  static logMethodError(logger: ILogger, className: string, methodName: string, error: Error, context?: Record<string, unknown>): void {
    logger.error(`${className}.${methodName} - Error`, error, context);
  }

  /**
   * Log performance timing
   */
  static logPerformance(logger: ILogger, operation: string, startTime: number, context?: Record<string, unknown>): void {
    const duration = Date.now() - startTime;
    logger.info(`Performance - ${operation}`, { ...context, durationMs: duration });
  }
}