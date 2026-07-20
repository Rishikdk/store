import { getTestApp } from './helpers/app.js';
import { createTestUser } from './helpers/users.js';
import { setupDB, teardownDB, clearCollections } from './helpers/db.js';

beforeAll(async () => {
  await setupDB();
});

afterAll(async () => {
  await teardownDB();
});

beforeEach(async () => {
  await clearCollections();
});

describe('POST /api/v1/auth/signup', () => {
  it('should create a new user and return access token + refresh cookie', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toHaveProperty('_id');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('should reject duplicate email', async () => {
    const app = getTestApp();
    const payload = { name: 'Test', email: 'dup@example.com', password: 'password123' };

    await app.post('/api/v1/auth/signup').send(payload);
    const res = await app.post('/api/v1/auth/signup').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already registered');
  });

  it('should reject invalid input', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/auth/signup').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should login and return access token + refresh cookie', async () => {
    const user = await createTestUser('customer');
    const app = getTestApp();

    const res = await app.post('/api/v1/auth/login').send({
      email: user.user.email,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
  });

  it('should reject wrong password', async () => {
    const user = await createTestUser('customer');
    const app = getTestApp();

    const res = await app.post('/api/v1/auth/login').send({
      email: user.user.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent email', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('should return a new access token using refresh cookie', async () => {
    const user = await createTestUser('customer');
    const app = getTestApp();

    const loginRes = await app.post('/api/v1/auth/login').send({
      email: user.user.email,
      password: 'password123',
    });

    const cookie = loginRes.headers['set-cookie'][0];

    const refreshRes = await app
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.user.email).toBe(user.user.email);
  });

  it('should reject without refresh cookie', async () => {
    const app = getTestApp();
    const res = await app.post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('should revoke refresh token and clear cookie', async () => {
    const user = await createTestUser('customer');
    const app = getTestApp();

    const loginRes = await app.post('/api/v1/auth/login').send({
      email: user.user.email,
      password: 'password123',
    });

    const cookie = loginRes.headers['set-cookie'][0];

    const logoutRes = await app
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.message).toBe('Logged out');

    const refreshRes = await app
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie);

    expect(refreshRes.status).toBe(401);
  });
});
