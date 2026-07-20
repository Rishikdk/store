import supertest from 'supertest';
import { createApp } from '../../src/app.js';

export function getTestApp() {
  const app = createApp();
  return supertest(app);
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
