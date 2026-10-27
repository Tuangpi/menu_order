import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'co-owner-a@test.com';
const OWNER_B = 'co-owner-b@test.com';
const PASSWORD = 'password123';

async function register(email: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'CO Owner' });
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  await prisma.menuItem.deleteMany({ where: { restaurant: { name: { startsWith: 'COTest' } } } });
  await prisma.menuCategory.deleteMany({ where: { restaurant: { name: { startsWith: 'COTest' } } } });
  await prisma.restaurantTable.deleteMany({ where: { restaurant: { name: { startsWith: 'COTest' } } } });
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'COTest' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B] } } });
}

describe('cart checkout', () => {
  let restaurantA: string;
  let restaurantB: string;
  let itemA: string;
  let itemB: string;
  let unavailableItem: string;

  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A);
    await register(OWNER_B);
    const agentA = await loginAgent(OWNER_A);
    const agentB = await loginAgent(OWNER_B);
    restaurantA = (await agentA.post('/api/restaurants').send({ name: 'COTest Restaurant A' })).body.data.restaurant.id;
    restaurantB = (await agentB.post('/api/restaurants').send({ name: 'COTest Restaurant B' })).body.data.restaurant.id;

    const catA = (await agentA.post(`/api/restaurants/${restaurantA}/categories`).send({ name: 'Drinks' })).body.data.category.id;
    const resItemA = await agentA.post(`/api/restaurants/${restaurantA}/items`).send({ categoryId: catA, name: 'Tea', price: 1500, isAvailable: true });
    itemA = resItemA.body.data.item.id;

    const unavailRes = await agentA.post(`/api/restaurants/${restaurantA}/items`).send({ categoryId: catA, name: 'Coffee', price: 2000, isAvailable: false });
    unavailableItem = unavailRes.body.data.item.id;

    const catB = (await agentB.post(`/api/restaurants/${restaurantB}/categories`).send({ name: 'Food' })).body.data.category.id;
    const resItemB = await agentB.post(`/api/restaurants/${restaurantB}/items`).send({ categoryId: catB, name: 'Burger', price: 5000, isAvailable: true });
    itemB = resItemB.body.data.item.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('computes total server-side', async () => {
    const res = await request(app).post(`/api/restaurants/${restaurantA}/checkout`).send({
      items: [{ menuItemId: itemA, quantity: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3000);
    expect(res.body.data.totalAmount).toBe(3000);
  });

  it('rejects unavailable items', async () => {
    const res = await request(app).post(`/api/restaurants/${restaurantA}/checkout`).send({
      items: [{ menuItemId: unavailableItem, quantity: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects foreign-restaurant items', async () => {
    const res = await request(app).post(`/api/restaurants/${restaurantA}/checkout`).send({
      items: [{ menuItemId: itemB, quantity: 1 }],
    });
    expect(res.status).toBe(404);
  });

  it('works via qr code', async () => {
    const agentA = await loginAgent(OWNER_A);
    const table = (await agentA.post(`/api/restaurants/${restaurantA}/tables`).send({ name: 'T1' })).body.data.table;
    const res = await request(app).post(`/api/tables/${table.qrCode}/checkout`).send({
      items: [{ id: itemA, qty: 3 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4500);
  });
});

// end
