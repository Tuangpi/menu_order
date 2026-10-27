import request from 'supertest';

import { createApp } from '../src/app.js';

const app = createApp();

describe('health', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'api' });
  });

  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('echo (zod-validated)', () => {
  it('returns 200 for valid input', async () => {
    const res = await request(app).post('/api/echo').send({ message: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { message: 'hi' } });
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app).post('/api/echo').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});