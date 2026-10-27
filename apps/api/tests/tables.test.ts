import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'table-owner-a@test.com';
const OWNER_B = 'table-owner-b@test.com';
const PASSWORD = 'password123';

async function register(email: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'Table Owner' });
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  await prisma.restaurantTable.deleteMany({ where: { restaurant: { name: { startsWith: 'TableTest' } } } });
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'TableTest' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B] } } });
}

describe('tables and qr', () => {
  let restaurantA: string;
  let restaurantB: string;

  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A);
    await register(OWNER_B);
    const agentA = await loginAgent(OWNER_A);
    const agentB = await loginAgent(OWNER_B);
    restaurantA = (await agentA.post('/api/restaurants').send({ name: 'TableTest Restaurant A' })).body.data.restaurant.id;
    restaurantB = (await agentB.post('/api/restaurants').send({ name: 'TableTest Restaurant B' })).body.data.restaurant.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('creates a table with unique qrCode', async () => {
    const agentA = await loginAgent(OWNER_A);
    const res = await agentA.post(`/api/restaurants/${restaurantA}/tables`).send({ name: 'Table 1' });
    expect(res.status).toBe(201);
    expect(res.body.data.table.name).toBe('Table 1');
    expect(typeof res.body.data.table.qrCode).toBe('string');
  });

  it('lists tables', async () => {
    const agentA = await loginAgent(OWNER_A);
    const res = await agentA.get(`/api/restaurants/${restaurantA}/tables`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.tables)).toBe(true);
  });

  it('resolves qr to correct table and restaurant', async () => {
    const agentA = await loginAgent(OWNER_A);
    const createRes = await agentA.post(`/api/restaurants/${restaurantA}/tables`).send({ name: 'Table 2' });
    const qrCode = createRes.body.data.table.qrCode;
    const res = await request(app).get(`/api/tables/${qrCode}`);
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.id).toBe(restaurantA);
    expect(res.body.data.table.qrCode).toBe(qrCode);
  });

  it('token from one restaurant cannot resolve as another', async () => {
    const agentA = await loginAgent(OWNER_A);
    const agentB = await loginAgent(OWNER_B);
    const createA = await agentA.post(`/api/restaurants/${restaurantA}/tables`).send({ name: 'A Table' });
    const qrA = createA.body.data.table.qrCode;
    const createB = await agentB.post(`/api/restaurants/${restaurantB}/tables`).send({ name: 'B Table' });
    const qrB = createB.body.data.table.qrCode;
    expect(qrA).not.toBe(qrB);
    const resA = await request(app).get(`/api/public/tables/${qrA}`);
    const resB = await request(app).get(`/api/public/tables/${qrB}`);
    expect(resA.body.data.restaurant.id).toBe(restaurantA);
    expect(resB.body.data.restaurant.id).toBe(restaurantB);
  });

  it('updates and deletes a table', async () => {
    const agentA = await loginAgent(OWNER_A);
    const createRes = await agentA.post(`/api/restaurants/${restaurantA}/tables`).send({ name: 'Temp' });
    const tableId = createRes.body.data.table.id;
    const patchRes = await agentA.patch(`/api/restaurants/${restaurantA}/tables/${tableId}`).send({ name: 'Renamed', isActive: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.table.name).toBe('Renamed');
    expect(patchRes.body.data.table.isActive).toBe(false);
    const delRes = await agentA.delete(`/api/restaurants/${restaurantA}/tables/${tableId}`);
    expect(delRes.status).toBe(204);
  });

  it('rejects cross-tenant management', async () => {
    const agentA = await loginAgent(OWNER_A);
    const agentB = await loginAgent(OWNER_B);
    const listA = await agentA.get(`/api/restaurants/${restaurantA}/tables`);
    const tableId = listA.body.data.tables[0].id;
    const res = await agentB.get(`/api/restaurants/${restaurantA}/tables/${tableId}`);
    expect(res.status).toBe(404);
  });
});
