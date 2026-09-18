import type { NotificationStatus } from '@mensageria/contracts';

const labels: Record<NotificationStatus, string> = {
  queued: 'enfileirada',
  processing: 'processando',
  delivered: 'entregue',
  failed: 'falhou',
  dead_lettered: 'dead-letter',
};

export function StatusBadge({ status }: { status: NotificationStatus }) {
  return <span className={`badge ${status}`}>{labels[status]}</span>;
}
