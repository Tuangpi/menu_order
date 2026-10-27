import { expect, test } from '@playwright/test';

test('customer to staff workflow', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@test.com`;
  const password = 'password123';

  // Register via API (no registration UI in MVP)
  await request.post('/api/auth/register', {
    data: { email, password, name: 'E2E Owner' },
  });

  // Login via UI
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Create restaurant via UI
  await page.getByPlaceholder("New restaurant name").fill("E2E Restaurant");
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('E2E Restaurant')).toBeVisible();

  // Open menu management
  await page.getByRole('link', { name: 'E2E Restaurant' }).click();
  // dashboard link goes to menu; ensure URL
  await page.waitForURL(/menu/);

  // Create category
  await page.getByPlaceholder('New category name').fill('Drinks');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Drinks').first()).toBeVisible();

  // Create item
  await page.getByPlaceholder('Item name').fill('Tea');
  await page.getByPlaceholder('Price (MMK)').fill('1500');
  // select first category
  await page.locator('select').first().selectOption({ label: 'Drinks' });
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Tea')).toBeVisible();

  // Generate table via API using session cookies from page context
  const restaurantId = page.url().match(/restaurants\/([^/]+)/)?.[1];
  expect(restaurantId).toBeTruthy();
  const tableRes = await request.post(`/api/restaurants/${restaurantId}/tables`, {
    data: { name: 'Table 1' },
  });
  expect(tableRes.ok()).toBeTruthy();
  const tableJson = await tableRes.json();
  const qrCode = tableJson.data.table.qrCode ?? tableJson.data.restaurantTable.qrCode;
  expect(qrCode).toBeTruthy();

  // Customer places order via public menu
  const customerPage = await page.context().newPage();
  await customerPage.goto(`/menu/${qrCode}`);
  await customerPage.getByRole('button', { name: 'Add' }).first().click();
  await customerPage.getByRole('button', { name: /place order/i }).click();
  await expect(customerPage.getByText('Order placed')).toBeVisible();

  // Staff updates order status
  await page.goto(`/dashboard/restaurants/${restaurantId}/orders`);
  await expect(page.getByText('PENDING')).toBeVisible();
  await page.getByRole('button', { name: /move to/i }).first().click();
  await expect(page.getByText('CONFIRMED')).toBeVisible();

  // Record cash payment via UI
  await page.goto(`/dashboard/restaurants/${restaurantId}/payments`);
  // select first order in dropdown
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: /record payment/i }).click();
  await expect(page.getByText('CONFIRMED').first()).toBeVisible();

  // View report
  await page.goto(`/dashboard/restaurants/${restaurantId}/reports`);
  await expect(page.getByText('Total sales')).toBeVisible();
});
