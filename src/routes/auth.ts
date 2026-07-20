import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { signup, login, refreshToken, logout } from '../controllers/authController.js';

const router = Router();

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'customer']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
