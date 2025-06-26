import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (stack) {
      log += `\n${stack}`;
    }

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  }),
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
);

const pairReportLogger = winston.createLogger({
  format: logFormat,
  level: 'verbose',
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: path.join(logDir, 'pairReportBuilder.log'),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => `[${level}]: ${message}`),
      ),
    }),
  ],
});

const backtestLogger = winston.createLogger({
  format: logFormat,
  level: 'verbose',
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: path.join(logDir, 'backtest.log'),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => `[${level}]: ${message}`),
      ),
    }),
  ],
});

export { logger, pairReportLogger, backtestLogger };
