import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'iso-a@test.com';
const OWNER_B = 'iso-b@test.com';
const PASSWORD = 'password123';

async function register(email: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: email });
}

async function login(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'Iso' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B] } } });
}

describe('tenant isolation', () => {
  let restaurantAId: string;
  let restaurantBId: string;
  let ownerA: ReturnType<typeof request.agent>;
  let ownerB: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A);
    await register(OWNER_B);
    ownerA = await login(OWNER_A);
    ownerB = await login(OWNER_B);

    const resA = await ownerA.post('/api/restaurants').send({ name: 'Iso Restaurant A' });
    restaurantAId = resA.body.data.restaurant.id;
    const resB = await ownerB.post('/api/restaurants').send({ name: 'Iso Restaurant B' });
    restaurantBId = resB.body.data.restaurant.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('does not leak foreign restaurants in list responses', async () => {
    const listA = await ownerA.get('/api/restaurants');
    const idsA = listA.body.data.restaurants.map((r: { id: string }) => r.id);
    expect(idsA).toContain(restaurantAId);
    expect(idsA).not.toContain(restaurantBId);

    const listB = await ownerB.get('/api/restaurants');
    const idsB = listB.body.data.restaurants.map((r: { id: string }) => r.id);
    expect(idsB).toContain(restaurantBId);
    expect(idsB).not.toContain(restaurantAId);
  });

  it('rejects cross-tenant restaurant reads', async () => {
    const res = await ownerB.get(`/api/restaurants/${restaurantAId}`);
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant restaurant updates', async () => {
    const res = await ownerB.patch(`/api/restaurants/${restaurantAId}`).send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant restaurant deletes', async () => {
    const res = await ownerB.delete(`/api/restaurants/${restaurantAId}`);
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant membership lists', async () => {
    const res = await ownerB.get(`/api/restaurants/${restaurantAId}/memberships`);
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant membership creation', async () => {
    const res = await ownerB
      .post(`/api/restaurants/${restaurantAId}/memberships`)
      .send({ email: OWNER_B, role: 'STAFF' });
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant membership updates', async () => {
    const list = await ownerA.get(`/api/restaurants/${restaurantAId}/memberships`);
    const membership = list.body.data.memberships[0];

    const res = await ownerB
      .patch(`/api/restaurants/${restaurantAId}/memberships/${membership.id}`)
      .send({ role: 'MANAGER' });
    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant membership deletes', async () => {
    const list = await ownerA.get(`/api/restaurants/${restaurantAId}/memberships`);
    const membership = list.body.data.memberships[0];

    const res = await ownerB.delete(
      `/api/restaurants/${restaurantAId}/memberships/${membership.id}`,
    );
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated access to tenant-owned routes', async () => {
    const res = await request(app).get(`/api/restaurants/${restaurantAId}`);
    expect(res.status).toBe(401);
  });
});
