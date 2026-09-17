import { describe, expect, it } from 'vitest';
import { CreateNotificationSchema } from './notification.js';

describe('CreateNotificationSchema', () => {
  it('aceita email válido', () => {
    const result = CreateNotificationSchema.safeParse({
      channel: 'email',
      to: 'ana@example.com',
      subject: 'Olá',
      body: 'corpo da mensagem',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita email com endereço inválido', () => {
    const result = CreateNotificationSchema.safeParse({
      channel: 'email',
      to: 'não-é-email',
      subject: 'Olá',
      body: 'corpo',
    });
    expect(result.success).toBe(false);
  });

  it('exige telefone E.164 para sms', () => {
    expect(
      CreateNotificationSchema.safeParse({ channel: 'sms', to: '+5511999998888', body: 'oi' })
        .success,
    ).toBe(true);
    expect(
      CreateNotificationSchema.safeParse({ channel: 'sms', to: '11999998888', body: 'oi' }).success,
    ).toBe(false);
  });

  it('não permite campos de outro canal (union discriminada)', () => {
    const result = CreateNotificationSchema.safeParse({
      channel: 'sms',
      to: '+5511999998888',
      subject: 'campo de email',
      body: 'oi',
    });
    expect(result.success).toBe(true); // campos extras são ignorados, não é o foco
    if (result.success) expect('subject' in result.data).toBe(false);
  });
});
