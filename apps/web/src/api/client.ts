import type { CreateNotification, Notification, NotificationPage } from '@mensageria/contracts';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new ApiError(response.status, `requisição falhou (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export interface ListParams {
  page?: number;
  status?: string;
  channel?: string;
}

export function listNotifications(params: ListParams = {}): Promise<NotificationPage> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.status) query.set('status', params.status);
  if (params.channel) query.set('channel', params.channel);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<NotificationPage>(`/notifications${suffix}`);
}

export function getNotification(id: string): Promise<Notification> {
  return request<Notification>(`/notifications/${id}`);
}

export function createNotification(
  data: CreateNotification,
  idempotencyKey?: string,
): Promise<Notification> {
  return request<Notification>('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
  });
}
