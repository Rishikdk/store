import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
      }) as { body: Record<string, unknown>; params: Record<string, unknown> };

      req.body = result.body as any;
      req.params = result.params as any;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError('Validation error', 400, err.issues));
        return;
      }
      next(err);
    }
  };
}
