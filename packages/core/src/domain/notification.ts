import type { Channel, CreateNotification, NotificationStatus } from '@mensageria/contracts';
import { InvalidStateTransitionError } from './errors.js';

export interface NotificationContent {
  subject?: string;
  title?: string;
  body: string;
}

export interface NotificationSnapshot {
  id: string;
  channel: Channel;
  to: string;
  content: NotificationContent;
  status: NotificationStatus;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const allowedTransitions: Record<NotificationStatus, readonly NotificationStatus[]> = {
  queued: ['processing'],
  processing: ['delivered', 'failed'],
  failed: ['processing', 'dead_lettered'],
  delivered: [],
  dead_lettered: [],
};

function contentFrom(input: CreateNotification): NotificationContent {
  switch (input.channel) {
    case 'email':
      return { subject: input.subject, body: input.body };
    case 'sms':
      return { body: input.body };
    case 'push':
      return { title: input.title, body: input.body };
  }
}

export class Notification {
  private constructor(private props: NotificationSnapshot) {}

  static create(input: { id: string; data: CreateNotification; now: Date }): Notification {
    return new Notification({
      id: input.id,
      channel: input.data.channel,
      to: input.data.to,
      content: contentFrom(input.data),
      status: 'queued',
      attempts: 0,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(snapshot: NotificationSnapshot): Notification {
    return new Notification({ ...snapshot });
  }

  get id(): string {
    return this.props.id;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get status(): NotificationStatus {
    return this.props.status;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  private transitionTo(next: NotificationStatus, now: Date): void {
    if (!allowedTransitions[this.props.status].includes(next)) {
      throw new InvalidStateTransitionError(this.props.status, next);
    }
    this.props.status = next;
    this.props.updatedAt = now;
  }

  markProcessing(now: Date): void {
    this.transitionTo('processing', now);
  }

  markDelivered(now: Date): void {
    this.transitionTo('delivered', now);
  }

  markFailed(now: Date): void {
    this.transitionTo('failed', now);
  }

  deadLetter(now: Date): void {
    this.transitionTo('dead_lettered', now);
  }

  recordAttempt(): void {
    this.props.attempts += 1;
  }

  toSnapshot(): NotificationSnapshot {
    return { ...this.props, content: { ...this.props.content } };
  }
}
