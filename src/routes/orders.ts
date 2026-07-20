import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createOrder, getOrders } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);

const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          product: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
  }),
});

router.post('/', authorize('customer', 'admin'), validate(createOrderSchema), createOrder);
router.get('/', getOrders);

export default router;
