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
declare class Logger {
    private isDevelopment;
    private logHistory;
    private maxHistorySize;
    constructor();
    private formatTimestamp;
    private createLogEntry;
    private addToHistory;
    private formatMessage;
    /**
     * Debug level logging - only in development
     */
    debug(message: string, context?: string, data?: unknown): void;
    /**
     * Info level logging
     */
    info(message: string, context?: string, data?: unknown): void;
    /**
     * Warning level logging
     */
    warn(message: string, context?: string, data?: unknown): void;
    /**
     * Error level logging
     */
    error(message: string, context?: string, error?: Error | unknown): void;
    /**
     * Get recent log history
     */
    getHistory(count?: number): LogEntry[];
    /**
     * Clear log history
     */
    clearHistory(): void;
    /**
     * Export logs as JSON string
     */
    exportLogs(): string;
}
declare const logger: Logger;
export default logger;
