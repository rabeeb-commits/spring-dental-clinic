import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log directory
const LOG_DIR = path.join(process.cwd(), 'logs');

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0 && !meta.stack) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),

  // Daily rotate file for all logs
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: logFormat,
    level: 'info',
  }),

  // Daily rotate file for errors only
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: logFormat,
    level: 'error',
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Request logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id,
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
};

// Activity logger for specific actions
export const logActivity = (action: string, details: Record<string, any>) => {
  logger.info(`Activity: ${action}`, details);
};

// Error logger
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Security event logger
export const logSecurity = (event: string, details: Record<string, any>) => {
  logger.warn(`Security: ${event}`, details);
};

// Database query logger (for debugging)
export const logQuery = (query: string, duration?: number) => {
  logger.debug('Database query', { query, duration: duration ? `${duration}ms` : undefined });
};

export default logger;

