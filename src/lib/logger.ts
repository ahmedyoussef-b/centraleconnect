// src/lib/logger.ts
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
  }
  
  export class IndustrialLogger {
    private static instance: IndustrialLogger;
    private logs: Array<{ level: LogLevel; message: string; timestamp: string; context?: any }> = [];
    
    private constructor() {}
    
    static getInstance(): IndustrialLogger {
      if (!IndustrialLogger.instance) {
        IndustrialLogger.instance = new IndustrialLogger();
      }
      return IndustrialLogger.instance;
    }
    
    log(level: LogLevel, message: string, context?: any) {
      const timestamp = new Date().toISOString();
      const logEntry = { level, message, timestamp, context };
      
      // Stockage en mémoire
      this.logs.push(logEntry);
      if (this.logs.length > 1000) {
        this.logs.shift(); // Garder seulement les 1000 derniers logs
      }
      
      // Console avec couleurs
      const colors = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Vert
        [LogLevel.WARN]: '\x1b[33m',  // Jaune
        [LogLevel.ERROR]: '\x1b[31m'  // Rouge
      };
      
      console.log(
        `${colors[level]}[${level}] ${timestamp}: ${message}\x1b[0m`,
        context ? context : ''
      );
      
      // Persistance des erreurs en production
      if (process.env.NODE_ENV === 'production' && level === LogLevel.ERROR) {
        this.persistError(logEntry);
      }
    }
    
    private persistError(entry: any) {
      try {
        // Stockage local pour les erreurs critiques
        const errors = JSON.parse(localStorage.getItem('industrial-errors') || '[]');
        errors.push(entry);
        if (errors.length > 50) errors.shift(); // Garder les 50 dernières erreurs
        localStorage.setItem('industrial-errors', JSON.stringify(errors));
      } catch (error) {
        console.error('Failed to persist error:', error);
      }
    }
    
    getLogs(): Array<{ level: LogLevel; message: string; timestamp: string; context?: any }> {
      return [...this.logs];
    }
    
    clearLogs(): void {
      this.logs = [];
      localStorage.removeItem('industrial-errors');
    }
  }