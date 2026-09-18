import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@mensageria/core';

export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
