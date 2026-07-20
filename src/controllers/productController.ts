import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../database/index.js';
import { AppError } from '../utils/AppError.js';

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '10', category } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (category && typeof category === 'string') {
      filter.category = category;
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({
      status: 'success',
      data: products,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    res.json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    const product = await Product.findByIdAndUpdate(id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    res.json({ status: 'success', data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    res.json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
}
