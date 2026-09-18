import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Notification } from '@mensageria/contracts';
import { getNotification } from '../api/client';
import { StatusBadge } from '../components/status-badge';

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setNotification(await getNotification(id));
      setError(null);
    } catch {
      setError('notificação não encontrada');
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 2000);
    return () => {
      clearInterval(timer);
    };
  }, [load]);

  return (
    <section>
      <p>
        <Link to="/">← voltar</Link>
      </p>
      {error && <p className="error">{error}</p>}
      {notification && (
        <div className="card">
          <div className="row-between">
            <h2 style={{ margin: 0 }}>{notification.channel}</h2>
            <StatusBadge status={notification.status} />
          </div>
          <dl>
            <Field label="ID" value={notification.id} />
            <Field label="Destinatário" value={notification.to} />
            <Field label="Tentativas" value={String(notification.attempts)} />
            <Field
              label="Criada em"
              value={new Date(notification.createdAt).toLocaleString('pt-BR')}
            />
            <Field
              label="Atualizada em"
              value={new Date(notification.updatedAt).toLocaleString('pt-BR')}
            />
          </dl>
          <p className="muted">Atualizando automaticamente enquanto o worker processa.</p>
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0' }}>
      <dt className="muted" style={{ width: 120 }}>
        {label}
      </dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}
