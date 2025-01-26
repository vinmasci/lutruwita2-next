import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/server.log',
      level: 'info'
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logging initialized at debug level');
}
