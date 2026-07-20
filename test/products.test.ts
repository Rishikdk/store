import { getTestApp, authHeader } from './helpers/app.js';
import { createTestUser } from './helpers/users.js';
import { setupDB, teardownDB, clearCollections } from './helpers/db.js';

let adminToken: string;
let customerToken: string;

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
  const customer = await createTestUser('customer');
  customerToken = customer.token;
});

describe('GET /api/v1/products', () => {
  it('should return empty list when no products exist', async () => {
    const app = getTestApp();
    const res = await app.get('/api/v1/products').set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.total).toBe(0);
  });

  it('should return paginated products', async () => {
    const app = getTestApp();
    for (let i = 0; i < 15; i++) {
      await app.post('/api/v1/products').set(authHeader(adminToken)).send({
        name: `Product ${i}`,
        price: 10 + i,
        stock: 100,
        category: i % 2 === 0 ? 'A' : 'B',
      });
    }

    const res = await app
      .get('/api/v1/products?page=2&perPage=5')
      .set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.page).toBe(2);
    expect(res.body.meta.total).toBe(15);
    expect(res.body.meta.totalPages).toBe(3);
  });

  it('should filter by category', async () => {
    const app = getTestApp();
    await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'Product A', price: 10, stock: 50, category: 'Electronics',
    });
    await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'Product B', price: 20, stock: 30, category: 'Books',
    });

    const res = await app
      .get('/api/v1/products?category=Electronics')
      .set(authHeader(customerToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('Electronics');
  });
});

describe('GET /api/v1/products/:id', () => {
  it('should return a single product', async () => {
    const app = getTestApp();
    const created = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'Test Product', price: 25, stock: 10, category: 'Test',
    });
    const id = created.body.data._id;

    const res = await app.get(`/api/v1/products/${id}`).set(authHeader(customerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Product');
  });

  it('should return 404 for non-existent product', async () => {
    const app = getTestApp();
    const res = await app
      .get('/api/v1/products/507f1f77bcf86cd799439011')
      .set(authHeader(customerToken));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/products', () => {
  it('should allow admin to create a product', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'New Product', price: 99.99, stock: 50, category: 'Electronics',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Product');
    expect(res.body.data.stock).toBe(50);
  });

  it('should reject customer from creating a product', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/products').set(authHeader(customerToken)).send({
      name: 'New Product', price: 99.99, stock: 50, category: 'Electronics',
    });

    expect(res.status).toBe(403);
  });

  it('should validate required fields', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: '',
    });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/products/:id', () => {
  it('should allow admin to update a product', async () => {
    const app = getTestApp();
    const created = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'Original', price: 10, stock: 20, category: 'Test',
    });
    const id = created.body.data._id;

    const res = await app
      .patch(`/api/v1/products/${id}`)
      .set(authHeader(adminToken))
      .send({ price: 15, stock: 25 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(15);
    expect(res.body.data.stock).toBe(25);
  });

  it('should reject customer from updating', async () => {
    const app = getTestApp();
    const created = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'Original', price: 10, stock: 20, category: 'Test',
    });

    const res = await app
      .patch(`/api/v1/products/${created.body.data._id}`)
      .set(authHeader(customerToken))
      .send({ price: 5 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/v1/products/:id', () => {
  it('should allow admin to delete a product', async () => {
    const app = getTestApp();
    const created = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'To Delete', price: 10, stock: 20, category: 'Test',
    });

    const res = await app
      .delete(`/api/v1/products/${created.body.data._id}`)
      .set(authHeader(adminToken));

    expect(res.status).toBe(200);

    const getRes = await app
      .get(`/api/v1/products/${created.body.data._id}`)
      .set(authHeader(adminToken));
    expect(getRes.status).toBe(404);
  });

  it('should reject customer from deleting', async () => {
    const app = getTestApp();
    const created = await app.post('/api/v1/products').set(authHeader(adminToken)).send({
      name: 'To Delete', price: 10, stock: 20, category: 'Test',
    });

    const res = await app
      .delete(`/api/v1/products/${created.body.data._id}`)
      .set(authHeader(customerToken));

    expect(res.status).toBe(403);
  });
});
