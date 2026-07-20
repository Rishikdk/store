import mongoose from 'mongoose';
import { config } from '../config/env.js';

let retries = 3;

export async function connectDB(): Promise<void> {
  while (retries > 0) {
    try {
      await mongoose.connect(config.DATABASE_URL);
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      retries--;
      console.error(`MongoDB connection failed (${retries} retries left):`, err);
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  process.exit(1);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export { mongoose };
