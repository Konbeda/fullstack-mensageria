import { ChannelSchema } from '@mensageria/contracts';
import { z } from 'zod';

export const NotificationQueuedEventSchema = z.object({
  notificationId: z.string().uuid(),
  channel: ChannelSchema,
});
