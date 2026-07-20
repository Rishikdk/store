import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../database/index.js';
import { AppError } from '../utils/AppError.js';
import { paginationSchema, buildMeta, buildSkip, buildSort, type PaginationQuery } from '../utils/pagination.js';

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = paginationSchema.parse(req.query) as PaginationQuery;
    const { search, category } = req.query;

    const filter: Record<string, unknown> = {};
    if (category && typeof category === 'string') {
      filter.category = category;
    }
    if (search && typeof search === 'string') {
      filter.name = { $regex: search, $options: 'i' };
    }

    const allowedSorts = ['name', 'price', 'stock', 'createdAt'];
    const sortField = allowedSorts.includes(query.sort) ? query.sort : 'createdAt';

    const [products, total] = await Promise.all([
      Product.find(filter).sort(buildSort(sortField, query.order)).skip(buildSkip(query.page, query.perPage)).limit(query.perPage),
      Product.countDocuments(filter),
    ]);

    res.json({
      meta: buildMeta(query.page, query.perPage, total),
      data: products,
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
    res.json({ data: product });
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
    res.json({ data: product });
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
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
}
