import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'owner-a@test.com';
const OWNER_B = 'owner-b@test.com';
const STAFF = 'staff@test.com';
const PASSWORD = 'password123';

async function register(email: string, name: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name });
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'Test' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B, STAFF] } } });
}

describe('restaurants and tenancy', () => {
  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A, 'Owner A');
    await register(OWNER_B, 'Owner B');
    await register(STAFF, 'Staff User');
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(401);
  });

  it('creates a restaurant and lists only the caller restaurants', async () => {
    const agentA = await loginAgent(OWNER_A);
    const createRes = await agentA
      .post('/api/restaurants')
      .send({ name: 'Test Restaurant A' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.restaurant.name).toBe('Test Restaurant A');

    const listRes = await agentA.get('/api/restaurants');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.restaurants.length).toBe(1);

    const agentB = await loginAgent(OWNER_B);
    const listB = await agentB.get('/api/restaurants');
    expect(listB.status).toBe(200);
    expect(listB.body.data.restaurants.length).toBe(0);
  });

  it('rejects cross-tenant reads and writes', async () => {
    const agentA = await loginAgent(OWNER_A);
    const listA = await agentA.get('/api/restaurants');
    const restaurantId = listA.body.data.restaurants[0].id;

    const agentB = await loginAgent(OWNER_B);
    const getRes = await agentB.get(`/api/restaurants/${restaurantId}`);
    expect(getRes.status).toBe(404);

    const patchRes = await agentB
      .patch(`/api/restaurants/${restaurantId}`)
      .send({ name: 'Hacked' });
    expect(patchRes.status).toBe(404);

    const memberRes = await agentB
      .post(`/api/restaurants/${restaurantId}/memberships`)
      .send({ email: STAFF, role: 'STAFF' });
    expect(memberRes.status).toBe(404);
  });

  it('enforces owner-only updates', async () => {
    const agentA = await loginAgent(OWNER_A);
    const listA = await agentA.get('/api/restaurants');
    const restaurantId = listA.body.data.restaurants[0].id;

    // Add staff as a member
    await agentA
      .post(`/api/restaurants/${restaurantId}/memberships`)
      .send({ email: STAFF, role: 'STAFF' });

    const staffAgent = await loginAgent(STAFF);
    const patchRes = await staffAgent
      .patch(`/api/restaurants/${restaurantId}`)
      .send({ name: 'Staff Rename' });
    expect(patchRes.status).toBe(403);
  });

  it('manages memberships', async () => {
    const agentA = await loginAgent(OWNER_A);
    const listA = await agentA.get('/api/restaurants');
    const restaurantId = listA.body.data.restaurants[0].id;

    const listMembers = await agentA.get(`/api/restaurants/${restaurantId}/memberships`);
    expect(listMembers.status).toBe(200);
    const staffMembership = listMembers.body.data.memberships.find(
      (m: { user: { email: string } }) => m.user.email === STAFF,
    );
    expect(staffMembership).toBeDefined();

    const updateRes = await agentA
      .patch(`/api/restaurants/${restaurantId}/memberships/${staffMembership.id}`)
      .send({ role: 'MANAGER' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.membership.role).toBe('MANAGER');

    const deleteRes = await agentA.delete(
      `/api/restaurants/${restaurantId}/memberships/${staffMembership.id}`,
    );
    expect(deleteRes.status).toBe(204);
  });

  it('prevents removing the last owner', async () => {
    const agentA = await loginAgent(OWNER_A);
    const listA = await agentA.get('/api/restaurants');
    const restaurantId = listA.body.data.restaurants[0].id;

    const listMembers = await agentA.get(`/api/restaurants/${restaurantId}/memberships`);
    const ownerMembership = listMembers.body.data.memberships.find(
      (m: { role: string }) => m.role === 'OWNER',
    );

    const res = await agentA.delete(
      `/api/restaurants/${restaurantId}/memberships/${ownerMembership.id}`,
    );
    expect(res.status).toBe(409);
  });
});
