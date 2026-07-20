import { type Request, type Response, type NextFunction } from 'express';
import { User, RefreshToken } from '../database/index.js';
import { AppError } from '../utils/AppError.js';
import { type AuthRequest } from '../middleware/auth.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiresAt,
} from '../utils/token.js';

const REFRESH_COOKIE_NAME = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60,
};

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email: email });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({ name, email, password, role });

    const accessToken = signAccessToken({ _id: user._id.toString(), role: user.role });

    const rawRefreshToken = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: refreshTokenExpiresAt(),
    });

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      status: 'success',
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = signAccessToken({ _id: user._id.toString(), role: user.role });

    const rawRefreshToken = generateRefreshToken();
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: refreshTokenExpiresAt(),
    });

    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS);

    res.json({
      status: 'success',
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME];

    if (!rawToken) {
      throw new AppError('Unauthorized', 401);
    }

    const tokenHash = hashToken(rawToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: COOKIE_OPTIONS.path });
      throw new AppError('Unauthorized', 401);
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      throw new AppError('Unauthorized', 401);
    }

    const newExpiresAt = refreshTokenExpiresAt();

    await RefreshToken.updateOne({ _id: stored._id }, { expiresAt: newExpiresAt });

    res.cookie(REFRESH_COOKIE_NAME, rawToken, {
      ...COOKIE_OPTIONS,
      maxAge: Math.floor((newExpiresAt.getTime() - Date.now()) / 1000),
    });

    const accessToken = signAccessToken({ _id: user._id.toString(), role: user.role });

    res.json({
      status: 'success',
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME];

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.updateOne(
        { tokenHash },
        { revokedAt: new Date() },
      ).catch(() => null);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: COOKIE_OPTIONS.path });
    res.json({ status: 'success', data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
}
