import { expect, test } from '@playwright/test';

test('cria uma notificação pela UI e ela é entregue', async ({ page }) => {
  await page.goto('/new');

  await page.getByLabel('E-mail').fill('ana@example.com');
  await page.getByLabel('Assunto').fill('Bem-vinda');
  await page.getByLabel('Mensagem').fill('Olá!');
  await page.getByRole('button', { name: 'Enfileirar notificação' }).click();

  await expect(page.getByText('entregue')).toBeVisible();
});
