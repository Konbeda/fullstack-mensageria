import { expect, test } from '@playwright/test';

// Destinatário "fail..." força o provider a falhar sempre (ver FakeNotificationProvider).
test('notificação que sempre falha termina em dead-letter', async ({ page }) => {
  await page.goto('/new');

  await page.getByLabel('E-mail').fill('fail@example.com');
  await page.getByLabel('Assunto').fill('vai falhar');
  await page.getByLabel('Mensagem').fill('mensagem venenosa');
  await page.getByRole('button', { name: 'Enfileirar notificação' }).click();

  await expect(page.getByText('dead-letter')).toBeVisible();
});
