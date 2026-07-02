import { test, expect } from '@playwright/test';

const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@saas-base.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'platform123';

test.describe('Super-admin SaaS', () => {
  test('login, listado, impersonar y volver', async ({ page }) => {
    await page.goto('http://localhost:3001/platform/login');

    await page.getByPlaceholder('Email').fill(PLATFORM_EMAIL);
    await page.getByPlaceholder('Contraseña').fill(PLATFORM_PASSWORD);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByRole('heading', { name: 'Restaurantes en la plataforma' })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText('Bistró Digital')).toBeVisible();

    await page.getByRole('link', { name: 'Bistró Digital' }).click();
    await expect(page.getByRole('heading', { name: 'Bistró Digital' })).toBeVisible();

    await page.getByRole('button', { name: 'Entrar como admin' }).click();

    await expect(page.getByText(/Estás viendo el panel como administrador de/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'Volver a super-admin' }).first().click();

    await expect(page.getByRole('heading', { name: 'Restaurantes en la plataforma' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
