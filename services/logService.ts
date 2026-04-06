
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}

class LogService {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    // Intercept console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    console.log = (...args) => {
      this.addLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalConsole.log.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalConsole.error.apply(console, args);
    };

    console.debug = (...args) => {
      this.addLog('debug', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalConsole.debug.apply(console, args);
    };

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.addLog('error', `Global error: ${event.message} at ${event.filename}:${event.lineno}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', `Unhandled promise rejection: ${event.reason}`);
    });
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notifyListeners();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const logService = new LogService();
export type { LogEntry, LogLevel };
