import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from './AppError.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { status: 'error', message: err.message };
    if (err.details) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: (err as any).errors,
    });
    return;
  }

  const mongoError = err as any;
  if (mongoError.errorLabels?.includes('TransientTransactionError')) {
    res.status(409).json({
      status: 'error',
      message: 'Transaction conflict. Please retry.',
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
