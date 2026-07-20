import mongoose from 'mongoose';
import { getTestApp, authHeader } from './helpers/app.js';
import { createTestUser } from './helpers/users.js';
import { createTestProduct } from './helpers/products.js';
import { setupDB, teardownDB, clearCollections } from './helpers/db.js';
import { Product, Order } from '../src/database/index.js';

let adminToken: string;
let customerToken: string;
let customerTwoToken: string;

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await teardownDB();
});

beforeEach(async () => {
  await clearCollections();
  const admin = await createTestUser('admin');
  adminToken = admin.token;
  const c1 = await createTestUser('customer');
  customerToken = c1.token;
  const c2 = await createTestUser('customer');
  customerTwoToken = c2.token;
});

describe('POST /api/v1/orders', () => {
  it('should create an order and decrement stock', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Widget',
      price: 25,
      stock: 10,
      category: 'Gadgets',
    });

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
    expect(res.body.data.items[0].price).toBe(25);
    expect(res.body.data.totalAmount).toBe(75);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct!.stock).toBe(7);
  });

  it('should create an order with multiple items', async () => {
    const p1 = await createTestProduct(adminToken, {
      name: 'Item A', price: 10, stock: 5, category: 'Cat',
    });
    const p2 = await createTestProduct(adminToken, {
      name: 'Item B', price: 20, stock: 5, category: 'Cat',
    });

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({
        items: [
          { product: p1.product._id, quantity: 2 },
          { product: p2.product._id, quantity: 1 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.totalAmount).toBe(40);

    const prod1 = await Product.findById(p1.product._id);
    const prod2 = await Product.findById(p2.product._id);
    expect(prod1!.stock).toBe(3);
    expect(prod2!.stock).toBe(4);
  });

  it('should reject order when stock is insufficient', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Scarce', price: 50, stock: 2, category: 'Rare',
    });

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient stock/i);

    const unchanged = await Product.findById(product._id);
    expect(unchanged!.stock).toBe(2);
  });

  it('should reject order with non-existent product', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: fakeId, quantity: 1 }] });

    expect(res.status).toBe(400);
  });

  it('should reject empty items array', async () => {
    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [] });

    expect(res.status).toBe(400);
  });

  it('should reject non-positive quantity', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Test', price: 10, stock: 10, category: 'Test',
    });

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 0 }] });

    expect(res.status).toBe(400);
  });

  it('should rollback stock on multi-item order if one item fails', async () => {
    const p1 = await createTestProduct(adminToken, {
      name: 'In Stock', price: 10, stock: 10, category: 'Test',
    });
    const p2 = await createTestProduct(adminToken, {
      name: 'Out of Stock', price: 20, stock: 0, category: 'Test',
    });

    const app = getTestApp();
    const res = await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({
        items: [
          { product: p1.product._id, quantity: 3 },
          { product: p2.product._id, quantity: 1 },
        ],
      });

    expect(res.status).toBe(400);

    const prod1 = await Product.findById(p1.product._id);
    expect(prod1!.stock).toBe(10);
  });

  it('concurrency: only 2 of 3 concurrent orders should succeed when stock=2', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Concurrent Item',
      price: 5,
      stock: 2,
      category: 'Race',
    });

    const app = getTestApp();

    const orderPromises = Array.from({ length: 3 }, () =>
      app
        .post('/api/v1/orders')
        .set(authHeader(customerToken))
        .send({ items: [{ product: product._id, quantity: 1 }] }),
    );

    const results = await Promise.allSettled(orderPromises);

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 201,
    );
    const failures = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status >= 400,
    );

    expect(successes.length).toBeLessThanOrEqual(2);
    expect(failures.length + successes.length).toBe(3);

    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stock).toBe(2 - successes.length);
    expect(finalProduct!.stock).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /api/v1/orders', () => {
  it('should return only the customers own orders', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Shared', price: 10, stock: 100, category: 'Test',
    });

    const app = getTestApp();
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerTwoToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });

    const res = await app
      .get('/api/v1/orders')
      .set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('admin should see all orders', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Shared', price: 10, stock: 100, category: 'Test',
    });

    const app = getTestApp();
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerTwoToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });

    const res = await app.get('/api/v1/orders').set(authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('should support pagination', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Paged', price: 10, stock: 100, category: 'Test',
    });

    const app = getTestApp();
    for (let i = 0; i < 5; i++) {
      await app
        .post('/api/v1/orders')
        .set(authHeader(customerToken))
        .send({ items: [{ product: product._id, quantity: 1 }] });
    }

    const res = await app
      .get('/api/v1/orders?page=1&limit=2')
      .set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
  });

  it('should filter by status', async () => {
    const { product } = await createTestProduct(adminToken, {
      name: 'Filter', price: 10, stock: 100, category: 'Test',
    });

    const app = getTestApp();
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });
    await app
      .post('/api/v1/orders')
      .set(authHeader(customerToken))
      .send({ items: [{ product: product._id, quantity: 1 }] });

    await Order.updateOne({}, { status: 'shipped' });

    const res = await app
      .get('/api/v1/orders?status=pending')
      .set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
