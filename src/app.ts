import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { notFoundHandler, errorHandler } from './utils/errorHandler.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

export function createApp() {
  const app = express();

  app.use(morgan('dev'));
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { status: 'error', message: 'Too many requests from this IP' },
  });

  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
