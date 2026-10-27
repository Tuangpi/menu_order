import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'rep-owner-a@test.com';
const OWNER_B = 'rep-owner-b@test.com';
const PASSWORD = 'password123';

async function register(email: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'Rep Owner' });
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  const restaurants = await prisma.restaurant.findMany({ where: { name: { startsWith: 'RepTest' } }, select: { id: true } });
  const ids = restaurants.map((r) => r.id);
  await prisma.paymentEvent.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.order.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.menuItem.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.menuCategory.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.restaurantTable.deleteMany({ where: { restaurantId: { in: ids } } });
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'RepTest' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B] } } });
}

describe('reports', () => {
  let restaurantA: string;
  let restaurantB: string;
  let itemA: string;
  let agentA: Awaited<ReturnType<typeof loginAgent>>;
  let agentB: Awaited<ReturnType<typeof loginAgent>>;

  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A);
    await register(OWNER_B);
    agentA = await loginAgent(OWNER_A);
    agentB = await loginAgent(OWNER_B);
    restaurantA = (await agentA.post('/api/restaurants').send({ name: 'RepTest Restaurant A' })).body.data.restaurant.id;
    restaurantB = (await agentB.post('/api/restaurants').send({ name: 'RepTest Restaurant B' })).body.data.restaurant.id;

    const catA = (await agentA.post(`/api/restaurants/${restaurantA}/categories`).send({ name: 'Drinks' })).body.data.category.id;
    const resItemA = await agentA.post(`/api/restaurants/${restaurantA}/items`).send({ categoryId: catA, name: 'Tea', price: 1500, isAvailable: true });
    itemA = resItemA.body.data.item.id;

    const catB = (await agentB.post(`/api/restaurants/${restaurantB}/categories`).send({ name: 'Food' })).body.data.category.id;
    await agentB.post(`/api/restaurants/${restaurantB}/items`).send({ categoryId: catB, name: 'Burger', price: 5000, isAvailable: true });

    // create two orders for A
    await request(app).post(`/api/restaurants/${restaurantA}/checkout`).send({ items: [{ menuItemId: itemA, quantity: 2 }] });
    await request(app).post(`/api/restaurants/${restaurantA}/checkout`).send({ items: [{ menuItemId: itemA, quantity: 1 }] });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('totals match underlying orders', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await agentA.get(`/api/restaurants/${restaurantA}/reports/daily?date=${today}`);
    expect(res.status).toBe(200);
    const report = res.body.data;
    expect(report.totalOrders).toBe(2);
    expect(report.totalSales).toBe(1500 * 2 + 1500);
  });

  it('order history returns orders', async () => {
    const res = await agentA.get(`/api/restaurants/${restaurantA}/orders/history`);
    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBe(2);
  });

  it('cross-tenant access is rejected', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await agentB.get(`/api/restaurants/${restaurantA}/reports/daily?date=${today}`);
    expect([401, 403, 404]).toContain(res.status);
  });
});
