import mongoose from 'mongoose';
import { Product, Order } from '../database/index.js';
import { AppError } from '../utils/AppError.js';

interface OrderItemInput {
  product: string;
  quantity: number;
}

export async function createOrderService(userId: string, items: OrderItemInput[]) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const orderItems = [];

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        throw new AppError(`Invalid product ID: ${item.product}`, 400);
      }
    }

    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session, returnDocument: 'after' },
      );

      if (!product) {
        throw new AppError(
          `Insufficient stock or product not found: ${item.product}`,
          400,
        );
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create(
      [
        {
          user: userId,
          items: orderItems,
          totalAmount,
          status: 'pending',
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return order[0];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
