import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product, Order } from '../database/index.js';
import { AppError } from '../utils/AppError.js';
import { type AuthRequest } from '../middleware/auth.js';
import { createOrderService } from '../services/orderService.js';

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    const order = await createOrderService(user._id, req.body.items);
    res.status(201).json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    const { page = '1', limit = '10', status } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (user.role !== 'admin') {
      filter.user = user._id;
    }
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.json({
      status: 'success',
      data: orders,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
}
