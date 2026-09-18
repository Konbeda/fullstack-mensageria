import type { Clock } from '@mensageria/core';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
