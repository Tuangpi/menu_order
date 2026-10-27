import request from 'supertest';

import { prisma } from '../src/lib/prisma.js';
import { createApp } from '../src/app.js';

const app = createApp();
const OWNER_A = 'menu-owner-a@test.com';
const OWNER_B = 'menu-owner-b@test.com';
const PASSWORD = 'password123';

async function register(email: string): Promise<void> {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'Menu Owner' });
}

async function loginAgent(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  return agent;
}

async function cleanup(): Promise<void> {
  await prisma.menuItem.deleteMany({ where: { restaurant: { name: { startsWith: 'MenuTest' } } } });
  await prisma.menuCategory.deleteMany({ where: { restaurant: { name: { startsWith: 'MenuTest' } } } });
  await prisma.restaurant.deleteMany({ where: { name: { startsWith: 'MenuTest' } } });
  await prisma.user.deleteMany({ where: { email: { in: [OWNER_A, OWNER_B] } } });
}

describe('menu management', () => {
  let restaurantId: string;

  beforeAll(async () => {
    await cleanup();
    await register(OWNER_A);
    await register(OWNER_B);
    const agentA = await loginAgent(OWNER_A);
    const createRes = await agentA.post('/api/restaurants').send({ name: 'MenuTest Restaurant A' });
    restaurantId = createRes.body.data.restaurant.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('creates a category', async () => {
    const agentA = await loginAgent(OWNER_A);
    const res = await agentA
      .post(`/api/restaurants/${restaurantId}/categories`)
      .send({ name: 'Drinks', nameEn: 'Drinks', sortOrder: 1, isPublished: true });
    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('Drinks');
  });

  it('lists categories', async () => {
    const agentA = await loginAgent(OWNER_A);
    const res = await agentA.get(`/api/restaurants/${restaurantId}/categories`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });

  it('creates an item with MMK price', async () => {
    const agentA = await loginAgent(OWNER_A);
    const cats = await agentA.get(`/api/restaurants/${restaurantId}/categories`);
    const categoryId = cats.body.data.categories[0].id;
    const res = await agentA
      .post(`/api/restaurants/${restaurantId}/items`)
      .send({ categoryId, name: 'Tea', nameEn: 'Tea', price: 1500, isAvailable: true });
    expect(res.status).toBe(201);
    expect(res.body.data.item.price).toBe(1500);
  });

  it('updates an item', async () => {
    const agentA = await loginAgent(OWNER_A);
    const items = await agentA.get(`/api/restaurants/${restaurantId}/items`);
    const itemId = items.body.data.items[0].id;
    const res = await agentA
      .patch(`/api/restaurants/${restaurantId}/items/${itemId}`)
      .send({ name: 'Milk Tea', price: 2000 });
    expect(res.status).toBe(200);
    expect(res.body.data.item.name).toBe('Milk Tea');
    expect(res.body.data.item.price).toBe(2000);
  });

  it('toggles availability', async () => {
    const agentA = await loginAgent(OWNER_A);
    const items = await agentA.get(`/api/restaurants/${restaurantId}/items`);
    const itemId = items.body.data.items[0].id;
    const res = await agentA
      .patch(`/api/restaurants/${restaurantId}/items/${itemId}/availability`)
      .send({ isAvailable: false });
    expect(res.status).toBe(200);
    expect(res.body.data.item.isAvailable).toBe(false);
  });

  it('reorders categories', async () => {
    const agentA = await loginAgent(OWNER_A);
    await agentA.post(`/api/restaurants/${restaurantId}/categories`).send({ name: 'Food', sortOrder: 2 });
    const cats = await agentA.get(`/api/restaurants/${restaurantId}/categories`);
    const ids = cats.body.data.categories.map((c: { id: string }) => c.id);
    const res = await agentA
      .patch(`/api/restaurants/${restaurantId}/categories/reorder`)
      .send({ ids: ids.reverse() });
    expect(res.status).toBe(200);
  });

  it('changes publish state', async () => {
    const agentA = await loginAgent(OWNER_A);
    const cats = await agentA.get(`/api/restaurants/${restaurantId}/categories`);
    const categoryId = cats.body.data.categories[0].id;
    const res = await agentA
      .patch(`/api/restaurants/${restaurantId}/categories/${categoryId}`)
      .send({ isPublished: false });
    expect(res.status).toBe(200);
    expect(res.body.data.category.isPublished).toBe(false);
  });

  it('rejects cross-tenant access', async () => {
    const agentA = await loginAgent(OWNER_A);
    const agentB = await loginAgent(OWNER_B);
    const cats = await agentA.get(`/api/restaurants/${restaurantId}/categories`);
    const categoryId = cats.body.data.categories[0].id;
    const res = await agentB.get(`/api/restaurants/${restaurantId}/categories/${categoryId}`);
    expect(res.status).toBe(404);
  });
});
