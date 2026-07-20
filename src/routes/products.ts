import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = Router();

router.use(authenticate);

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    price: z.number().nonnegative().finite(),
    stock: z.number().int().min(0),
    category: z.string().min(1),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    price: z.number().nonnegative().finite().optional(),
    stock: z.number().int().min(0).optional(),
    category: z.string().min(1).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', authorize('admin'), validate(createProductSchema), createProduct);
router.patch('/:id', authorize('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
