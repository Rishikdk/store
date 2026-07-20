import mongoose, { Schema, type Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  stock: number;
  category: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [200, 'Name must be at most 200 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
      validate: {
        validator: (v: number) => Number.isFinite(v),
        message: 'Price must be a valid number',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ name: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ stock: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
