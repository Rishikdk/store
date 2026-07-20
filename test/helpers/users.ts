import supertest from 'supertest';
import { getTestApp } from './app.js';

export async function createTestUser(role: 'admin' | 'customer' = 'customer') {
  const app = getTestApp();
  const res = await app.post('/api/v1/auth/signup').send({
    name: `${role} User`,
    email: `${role}-${Date.now()}@test.com`,
    password: 'password123',
    role,
  });
  return {
    user: res.body.data.user,
    token: res.body.data.accessToken as string,
    refreshToken: res.headers['set-cookie']?.[0] || '',
  };
}
