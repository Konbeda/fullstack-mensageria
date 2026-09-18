import { connect, type ConfirmChannel } from 'amqplib';
import { assertTopology } from './topology.js';

export interface RabbitConnection {
  channel: ConfirmChannel;
  close(): Promise<void>;
}

export async function createRabbit(url: string): Promise<RabbitConnection> {
  const connection = await connect(url);
  const channel = await connection.createConfirmChannel();
  await assertTopology(channel);
  return {
    channel,
    close: async () => {
      await channel.close();
      await connection.close();
    },
  };
}
