import { z } from 'zod';

export const channels = ['email', 'sms', 'push'] as const;
export const ChannelSchema = z.enum(channels);
export type Channel = z.infer<typeof ChannelSchema>;

export const notificationStatuses = [
  'queued',
  'processing',
  'delivered',
  'failed',
  'dead_lettered',
] as const;
export const NotificationStatusSchema = z.enum(notificationStatuses);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

// E.164: '+' seguido de até 15 dígitos, primeiro dígito não-zero.
const phoneE164 = z.string().regex(/^\+[1-9]\d{1,14}$/, 'telefone deve estar no formato E.164');

const metadata = z.record(z.string(), z.string()).optional();

export const CreateNotificationSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(10_000),
    metadata,
  }),
  z.object({
    channel: z.literal('sms'),
    to: phoneE164,
    body: z.string().min(1).max(1_600),
    metadata,
  }),
  z.object({
    channel: z.literal('push'),
    to: z.string().min(1, 'device token é obrigatório'),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(4_000),
    metadata,
  }),
]);
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  status: NotificationStatusSchema,
  channel: ChannelSchema,
  to: z.string(),
  attempts: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;
