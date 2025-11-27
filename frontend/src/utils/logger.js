/**
 * Frontend Logger Utility
 * Provides structured logging for frontend application
 * Replaces raw console.log/error/warn statements
 */
class Logger {
    constructor() {
        Object.defineProperty(this, "isDevelopment", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logHistory", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "maxHistorySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 100
        });
        this.isDevelopment = import.meta.env.MODE === 'development';
    }
    formatTimestamp() {
        return new Date().toISOString();
    }
    createLogEntry(level, message, context, data) {
        return {
            timestamp: this.formatTimestamp(),
            level,
            message,
            context,
            data,
        };
    }
    addToHistory(entry) {
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }
    formatMessage(entry) {
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
        const contextStr = entry.context ? ` [${entry.context}]` : '';
        return `${prefix}${contextStr} ${entry.message}`;
    }
    /**
     * Debug level logging - only in development
     */
    debug(message, context, data) {
        if (!this.isDevelopment)
            return;
        const entry = this.createLogEntry('debug', message, context, data);
        this.addToHistory(entry);
        if (data !== undefined) {
            console.debug(this.formatMessage(entry), data);
        }
        else {
            console.debug(this.formatMessage(entry));
        }
    }
    /**
     * Info level logging
     */
    info(message, context, data) {
        const entry = this.createLogEntry('info', message, context, data);
        this.addToHistory(entry);
        if (data !== undefined) {
            console.info(this.formatMessage(entry), data);
        }
        else {
            console.info(this.formatMessage(entry));
        }
    }
    /**
     * Warning level logging
     */
    warn(message, context, data) {
        const entry = this.createLogEntry('warn', message, context, data);
        this.addToHistory(entry);
        if (data !== undefined) {
            console.warn(this.formatMessage(entry), data);
        }
        else {
            console.warn(this.formatMessage(entry));
        }
    }
    /**
     * Error level logging
     */
    error(message, context, error) {
        const entry = this.createLogEntry('error', message, context, error);
        this.addToHistory(entry);
        if (error instanceof Error) {
            console.error(this.formatMessage(entry), {
                message: error.message,
                stack: error.stack,
                name: error.name,
            });
        }
        else if (error !== undefined) {
            console.error(this.formatMessage(entry), error);
        }
        else {
            console.error(this.formatMessage(entry));
        }
    }
    /**
     * Get recent log history
     */
    getHistory(count) {
        if (count !== undefined) {
            return this.logHistory.slice(-count);
        }
        return [...this.logHistory];
    }
    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
    }
    /**
     * Export logs as JSON string
     */
    exportLogs() {
        return JSON.stringify(this.logHistory, null, 2);
    }
}
// Create singleton instance
const logger = new Logger();
export default logger;
