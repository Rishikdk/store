import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product, Order } from '../database/index.js';
import { AppError } from '../utils/AppError.js';
import { type AuthRequest } from '../middleware/auth.js';
import { createOrderService } from '../services/orderService.js';
import { paginationSchema, buildMeta, buildSkip, buildSort, type PaginationQuery } from '../utils/pagination.js';

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    const order = await createOrderService(user._id, req.body.items);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    const query = paginationSchema.parse(req.query) as PaginationQuery;
    const { status } = req.query;

    const filter: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      filter.user = user._id;
    }
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const allowedSorts = ['createdAt', 'totalAmount', 'status'];
    const sortField = allowedSorts.includes(query.sort) ? query.sort : 'createdAt';

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product', 'name price')
        .sort(buildSort(sortField, query.order))
        .skip(buildSkip(query.page, query.perPage))
        .limit(query.perPage),
      Order.countDocuments(filter),
    ]);

    res.json({
      data: orders,
      meta: buildMeta(query.page, query.perPage, total),
    });
  } catch (err) {
    next(err);
  }
}
