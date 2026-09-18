import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { channels, type Channel, type CreateNotification } from '@mensageria/contracts';
import { ApiError, createNotification } from '../api/client';

export function CreatePage() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel>('email');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function buildPayload(): CreateNotification {
    if (channel === 'email') return { channel, to, subject, body };
    if (channel === 'sms') return { channel, to, body };
    return { channel: 'push', to, title, body };
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createNotification(buildPayload());
      await navigate(`/notifications/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 422
          ? 'dados inválidos para este canal'
          : 'falha ao criar a notificação',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Nova notificação</h2>
      <form onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label htmlFor="channel">Canal</label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="to">
            {channel === 'email'
              ? 'E-mail'
              : channel === 'sms'
                ? 'Telefone (E.164)'
                : 'Device token'}
          </label>
          <input
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={channel === 'sms' ? '+5511999998888' : ''}
          />
        </div>

        {channel === 'email' && (
          <div className="field">
            <label htmlFor="subject">Assunto</label>
            <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}

        {channel === 'push' && (
          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label htmlFor="body">Mensagem</label>
          <textarea id="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enfileirar notificação'}
        </button>
      </form>
    </section>
  );
}
