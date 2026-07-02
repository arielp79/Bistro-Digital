import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../create-app.js';

const app = createApp();

describe('API docs routes', () => {
  it('GET /api/v1/openapi.json devuelve spec válida', async () => {
    const res = await request(app).get('/api/v1/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/api/v1/auth/login']).toBeDefined();
  });

  it('GET /api/docs sirve Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
