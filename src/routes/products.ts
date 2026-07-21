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

/**
 * @openapi
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: List products with pagination, search, and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, default: 15, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [name, price, stock, createdAt], default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *         description: Search by product name (case-insensitive)
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       name: { type: string, example: Wireless Bluetooth Headphones }
 *                       price: { type: number, example: 79.99 }
 *                       stock: { type: integer, example: 150 }
 *                       category: { type: string, example: Electronics }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', getProducts);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     name: { type: string }
 *                     price: { type: number }
 *                     stock: { type: integer }
 *                     category: { type: string }
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getProduct);

/**
 * @openapi
 * /api/v1/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, stock, category]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: Wireless Bluetooth Headphones
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 79.99
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 150
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 example: Electronics
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     name: { type: string }
 *                     price: { type: number }
 *                     stock: { type: integer }
 *                     category: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 */
router.post('/', authorize('admin'), validate(createProductSchema), createProduct);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 200 }
 *               price: { type: number, minimum: 0 }
 *               stock: { type: integer, minimum: 0 }
 *               category: { type: string, minLength: 1 }
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Product not found
 */
router.patch('/:id', authorize('admin'), validate(updateProductSchema), updateProduct);

/**
 * @openapi
 * /api/v1/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Product not found
 */
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
