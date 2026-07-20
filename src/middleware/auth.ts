import { type Request, type Response, type NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';

export interface AuthRequest extends Request {
  user: {
    _id: string;
    role: string;
  };
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const token = header.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    (req as AuthRequest).user = { _id: decoded._id, role: decoded.role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!roles.includes(user.role)) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }
    next();
  };
}
