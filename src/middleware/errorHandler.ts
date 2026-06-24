import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400);
    }
}

export class ContractError extends AppError {
    constructor(message = 'Smart contract transaction failed') {
        super(message, 502);
    }
}

export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
) {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorType = 'InternalError';

    // Log the unhandled error
    logger.error(`[ERROR_HANDLER] Unhandled error: ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorType = err.constructor.name;
    } else if (err.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = 400;
        message = err.message;
        errorType = 'ValidationError';
    } else if (err.name === 'CastError') {
        // Mongoose cast error
        statusCode = 400;
        message = `Invalid field: ${(err as any).path}`;
        errorType = 'CastError';
    } else if ((err as any).code === 'CALL_EXCEPTION' || (err as any).code === 'UNPREDICTABLE_GAS_LIMIT') {
        // ethers.js call exception
        statusCode = 502;
        message = (err as any).reason || 'Blockchain transaction execution reverted';
        errorType = 'ContractError';
    } else if ((err as any).statusCode && (err as any).error?.description) {
        // Razorpay API error
        statusCode = (err as any).statusCode;
        message = (err as any).error.description;
        errorType = 'PaymentError';
    }

    const responsePayload: any = {
        error: errorType,
        message
    };

    // Expose stack trace only in non-production environments
    if (env.NODE_ENV !== 'production') {
        responsePayload.stack = err.stack;
    }

    res.status(statusCode).json(responsePayload);
}
