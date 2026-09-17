import type { NotificationStatus } from '@mensageria/contracts';

export class DomainError extends Error {}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: NotificationStatus, to: NotificationStatus) {
    super(`transição de estado inválida: '${from}' -> '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class NotificationNotFoundError extends DomainError {
  constructor(id: string) {
    super(`notificação não encontrada: ${id}`);
    this.name = 'NotificationNotFoundError';
  }
}
