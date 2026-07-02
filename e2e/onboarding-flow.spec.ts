import { test, expect } from '@playwright/test';

test.describe('Onboarding → primer pedido', () => {
  test('registra restaurante y el cliente puede pedir', async ({ page }) => {
    const slug = `e2e-${Date.now()}`;
    const email = `admin-${slug}@e2e.test`;

    await page.goto('http://localhost:3001/onboarding');

    await page.getByPlaceholder('Ej: Parrilla del Puerto').fill(`Resto E2E ${slug}`);
    await page.locator('input.font-mono').fill(slug);
    await expect(page.getByText(/disponible/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page.getByRole('heading', { name: 'Cuenta de administrador' })).toBeVisible();
    await page.getByRole('textbox').nth(0).fill('Admin E2E');
    await page.getByRole('textbox').nth(1).fill(email);
    await page.locator('input[type="password"]').fill('e2e123456');

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Crear restaurante' }).click();

    await expect(page.getByText(/está listo/i)).toBeVisible({ timeout: 30_000 });

    const menuUrl = await page
      .locator('label')
      .filter({ hasText: 'Menú QR' })
      .locator('..')
      .locator('input')
      .inputValue();

    expect(menuUrl).toContain(`tenant=${slug}`);
    await page.goto(menuUrl);

    const addButton = page.getByRole('button', { name: /Agregar|Add/i }).first();
    await expect(addButton).toBeVisible({ timeout: 20_000 });
    await addButton.click();

    await page.getByRole('link', { name: /Ver carrito|View cart/i }).click();
    await page.getByRole('button', { name: /Confirmar pedido|Place order/i }).click();

    await expect(
      page.getByRole('paragraph').filter({ hasText: /Pedido recibido/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
