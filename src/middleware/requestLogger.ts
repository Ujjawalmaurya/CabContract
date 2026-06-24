import morgan from 'morgan';
import { Request } from 'express';
import { logger } from '../utils/logger';

const stream = {
    write: (message: string) => logger.http(message.trim())
};

const skip = (req: Request) => {
    const url = req.originalUrl || req.url;
    return url === '/api/health' || url === '/';
};

export const requestLogger = morgan(
    ':remote-addr - :method :url :status :res[content-length] - :response-time ms',
    { stream, skip }
);
