import winston from 'winston';
import { setLog } from './log';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Route the generator's logging through winston.
setLog(logger);

export default logger;
