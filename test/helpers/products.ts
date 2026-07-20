import supertest from 'supertest';
import { getTestApp, authHeader } from './app.js';

export async function createTestProduct(token: string, overrides: Record<string, unknown> = {}) {
  const app = getTestApp();
  const res = await app
    .post('/api/v1/products')
    .set(authHeader(token))
    .send({
      name: 'Test Product',
      price: 10.99,
      stock: 100,
      category: 'Test Category',
      ...overrides,
    });
  return {
    product: res.body.data,
  };
}
