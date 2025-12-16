// Logging system for QuickCut application
// Replaces console.log with structured, configurable logging

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  categories: string[];
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: process.env.NODE_ENV === 'development',
      maxStorageEntries: 1000,
      categories: ['app', 'video', 'timeline', 'export', 'store', 'ui'],
      ...config
    };
  }

  private shouldLog(level: LogLevel, category: string): boolean {
    return (
      level >= this.config.level &&
      this.config.categories.includes(category) &&
      level !== LogLevel.SILENT
    );
  }

  private createLogEntry(level: LogLevel, category: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private storeLog(entry: LogEntry): void {
    if (!this.config.enableStorage) return;

    this.logs.push(entry);
    
    // Keep only the most recent entries
    if (this.logs.length > this.config.maxStorageEntries) {
      this.logs = this.logs.slice(-this.config.maxStorageEntries);
    }

    // Store in localStorage for persistence
    try {
      const serializedLogs = JSON.stringify(this.logs.slice(-100)); // Keep last 100 in localStorage
      localStorage.setItem('quickcut_logs', serializedLogs);
    } catch (error) {
      // Avoid infinite loops by not logging storage errors
      console.warn('Failed to store logs:', error);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.category.toUpperCase()}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data, entry.stack);
        break;
    }
  }

  private log(level: LogLevel, category: string, message: string, data?: any): void {
    if (!this.shouldLog(level, category)) return;

    const entry = this.createLogEntry(level, category, message, data);
    this.storeLog(entry);
    this.outputToConsole(entry);
  }

  // Public logging methods
  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  // Utility methods
  video(message: string, data?: any): void {
    this.debug('video', message, data);
  }

  timeline(message: string, data?: any): void {
    this.debug('timeline', message, data);
  }

  export(message: string, data?: any): void {
    this.info('export', message, data);
  }

  store(message: string, data?: any): void {
    this.debug('store', message, data);
  }

  ui(message: string, data?: any): void {
    this.debug('ui', message, data);
  }

  app(message: string, data?: any): void {
    this.info('app', message, data);
  }

  // Configuration methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setCategoryEnabled(category: string, enabled: boolean): void {
    if (enabled && !this.config.categories.includes(category)) {
      this.config.categories.push(category);
    } else if (!enabled) {
      this.config.categories = this.config.categories.filter(c => c !== category);
    }
  }

  // Log retrieval
  getLogs(category?: string, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    return filteredLogs;
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('quickcut_logs');
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Load persisted logs from localStorage
  loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem('quickcut_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  // Performance logging
  time(category: string, label: string): () => void {
    const start = performance.now();
    this.debug(category, `Timer started: ${label}`);
    
    return () => {
      const duration = performance.now() - start;
      this.debug(category, `Timer ended: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  // Error boundary logging
  logError(error: Error, errorInfo?: any, category: string = 'app'): void {
    this.error(category, error.message, {
      name: error.name,
      stack: error.stack,
      errorInfo
    });
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export convenience functions for common usage
export const log = {
  debug: (category: string, message: string, data?: any) => logger.debug(category, message, data),
  info: (category: string, message: string, data?: any) => logger.info(category, message, data),
  warn: (category: string, message: string, data?: any) => logger.warn(category, message, data),
  error: (category: string, message: string, data?: any) => logger.error(category, message, data),
  video: (message: string, data?: any) => logger.video(message, data),
  timeline: (message: string, data?: any) => logger.timeline(message, data),
  export: (message: string, data?: any) => logger.export(message, data),
  store: (message: string, data?: any) => logger.store(message, data),
  ui: (message: string, data?: any) => logger.ui(message, data),
  app: (message: string, data?: any) => logger.app(message, data),
  time: (category: string, label: string) => logger.time(category, label),
  errorBoundary: (error: Error, errorInfo?: any) => logger.logError(error, errorInfo)
};

// Initialize persisted logs
logger.loadPersistedLogs();

export default logger;
