import { test, expect } from '@playwright/test';
import { DEMO_TENANT, getDemoContext } from './helpers/api';

test.describe('Flujo pedido web → cocina', () => {
  let tableId: string;

  test.beforeAll(async () => {
    const ctx = await getDemoContext();
    tableId = ctx.tableId;
  });

  test('cliente hace pedido y cocina lo recibe', async ({ page, browser }) => {
    await page.goto(`/menu?table=${tableId}&tenant=${DEMO_TENANT}&lng=es`);

    const addButton = page.getByRole('button', { name: /Agregar|Add/i }).first();
    await expect(addButton).toBeVisible({ timeout: 20_000 });
    await addButton.click();

    await page.getByRole('link', { name: /Ver carrito|View cart/i }).click();

    const confirmButton = page.getByRole('button', { name: /Confirmar pedido|Place order/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(page.getByRole('paragraph').filter({ hasText: /Pedido recibido/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const orderHeading = page.getByText(/#B-\d{4}/);
    await expect(orderHeading).toBeVisible();
    const orderNumber = (await orderHeading.textContent())?.trim() ?? '';

    const kitchenPage = await browser.newPage({ locale: 'es-AR' });
    await kitchenPage.goto('http://localhost:3002/login');
    await kitchenPage.getByRole('button', { name: 'Ingresar' }).click();

    await expect(kitchenPage.getByText('Tablero de cocina')).toBeVisible({ timeout: 15_000 });
    await expect(kitchenPage.getByText(orderNumber, { exact: true })).toBeVisible({ timeout: 20_000 });

    await kitchenPage.close();
  });
});
