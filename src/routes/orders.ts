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

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place a new order (atomically decrements stock via MongoDB transaction)
 *     description: |
 *       Creates an order with one or more products. Stock is validated and decremented atomically
 *       using `findOneAndUpdate` with a conditional filter `{ stock: { $gte: quantity } }` inside
 *       a multi-document transaction. If any item fails validation, the entire transaction rolls back.
 *       Concurrent orders for the same product are protected by the conditional update — only one will win.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [product, quantity]
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: MongoDB ObjectId of the product
 *                       example: 683b23f4b1e8a8e2f1a2b3c4
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 2
 *           example:
 *             items:
 *               - product: 683b23f4b1e8a8e2f1a2b3c4
 *                 quantity: 2
 *               - product: 683b23f4b1e8a8e2f1a2b3c5
 *                 quantity: 1
 *     responses:
 *       201:
 *         description: Order created, stock decremented
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     user: { type: string }
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product: { type: string }
 *                           quantity: { type: integer }
 *                           price: { type: number }
 *                     status: { type: string, enum: [pending, confirmed, shipped, delivered, cancelled] }
 *                     totalAmount: { type: number }
 *                     createdAt: { type: string, format: date-time }
 *       400:
 *         description: |
 *           - Insufficient stock or product not found
 *           - Invalid product ID
 *           - Invalid quantity (must be positive integer)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Customer or admin role required
 *       409:
 *         description: Transaction conflict due to concurrent order — retry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', authorize('customer', 'admin'), validate(createOrderSchema), createOrder);

/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders with pagination and filters
 *     description: Customers see only their own orders. Admins see all orders.
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
 *         schema: { type: string, enum: [createdAt, totalAmount, status], default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, confirmed, shipped, delivered, cancelled] }
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Paginated order list
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
 *                       user: { type: string }
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             product:
 *                               type: object
 *                               properties:
 *                                 _id: { type: string }
 *                                 name: { type: string }
 *                                 price: { type: number }
 *                             quantity: { type: integer }
 *                             price: { type: number }
 *                       status: { type: string }
 *                       totalAmount: { type: number }
 *                       createdAt: { type: string, format: date-time }
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Authentication required
 */
router.get('/', getOrders);

export default router;
