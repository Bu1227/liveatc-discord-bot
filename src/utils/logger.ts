import winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
            return `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

export class Logger {
    static info(message: string, ...args: any[]) {
        logger.info(message, ...args);
    }

    static error(message: string, ...args: any[]) {
        logger.error(message, ...args);
    }

    static warn(message: string, ...args: any[]) {
        logger.warn(message, ...args);
    }

    static debug(message: string, ...args: any[]) {
        logger.debug(message, ...args);
    }
} 