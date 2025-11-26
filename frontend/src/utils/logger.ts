/**
 * Frontend Logger Utility
 * Provides structured logging for frontend application
 * Replaces raw console.log/error/warn statements
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context,
      data,
    };
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    return `${prefix}${contextStr} ${entry.message}`;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, context?: string, data?: unknown): void {
    if (!this.isDevelopment) return;

    const entry = this.createLogEntry('debug', message, context, data);
    this.addToHistory(entry);

    if (data !== undefined) {
      console.debug(this.formatMessage(entry), data);
    } else {
      console.debug(this.formatMessage(entry));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string, data?: unknown): void {
    const entry = this.createLogEntry('info', message, context, data);
    this.addToHistory(entry);

    if (data !== undefined) {
      console.info(this.formatMessage(entry), data);
    } else {
      console.info(this.formatMessage(entry));
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string, data?: unknown): void {
    const entry = this.createLogEntry('warn', message, context, data);
    this.addToHistory(entry);

    if (data !== undefined) {
      console.warn(this.formatMessage(entry), data);
    } else {
      console.warn(this.formatMessage(entry));
    }
  }

  /**
   * Error level logging
   */
  error(message: string, context?: string, error?: Error | unknown): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.addToHistory(entry);

    if (error instanceof Error) {
      console.error(this.formatMessage(entry), {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    } else if (error !== undefined) {
      console.error(this.formatMessage(entry), error);
    } else {
      console.error(this.formatMessage(entry));
    }
  }

  /**
   * Get recent log history
   */
  getHistory(count?: number): LogEntry[] {
    if (count !== undefined) {
      return this.logHistory.slice(-count);
    }
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
