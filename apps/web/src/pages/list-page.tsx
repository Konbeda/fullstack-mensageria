import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { channels, notificationStatuses, type NotificationPage } from '@mensageria/contracts';
import { listNotifications, type ListParams } from '../api/client';
import { StatusBadge } from '../components/status-badge';

export function ListPage() {
  const [data, setData] = useState<NotificationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const params: ListParams = { page };
    if (status) params.status = status;
    if (channel) params.channel = channel;
    try {
      setData(await listNotifications(params));
      setError(null);
    } catch {
      setError('não foi possível carregar as notificações');
    }
  }, [page, status, channel]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => {
      clearInterval(timer);
    };
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          {notificationStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os canais</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="muted">{data ? `${data.total} notificação(ões)` : '...'}</span>
      </div>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Canal</th>
            <th>Destinatário</th>
            <th>Status</th>
            <th>Tentativas</th>
            <th>Criada em</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((n) => (
            <tr key={n.id}>
              <td>{n.channel}</td>
              <td>
                <Link to={`/notifications/${n.id}`}>{n.to}</Link>
              </td>
              <td>
                <StatusBadge status={n.status} />
              </td>
              <td>{n.attempts}</td>
              <td className="muted">{new Date(n.createdAt).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
          {data?.items.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Nenhuma notificação ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <button
          className="btn secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span className="muted">
          Página {page} de {totalPages}
        </span>
        <button
          className="btn secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
