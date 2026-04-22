import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/helpers';
import { useNotifications } from '../hooks/useNotifications';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  like: '❤️',
  comment: '💬',
  reminder: '⏰',
  recommendation: '💡',
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const { refetch } = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications/', { params: { page } });
      setItems(data.items);
      setTotal(data.total);
      setUnread(data.unread_count);
      setPages(data.pages);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    refetch();
    toast.success('Все уведомления прочитаны');
  };

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    refetch();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Уведомления</h1>
          <p className="page-subtitle">
            {unread > 0 ? `${unread} непрочитанных` : 'Все прочитаны'} · всего {total}
          </p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={markAllRead}>
            ✓ Прочитать все
          </button>
        )}
      </div>

      {loading ? <div className="spinner" /> : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-title">Уведомлений нет</div>
          <div className="empty-state-desc">Здесь появятся лайки, комментарии и напоминания</div>
        </div>
      ) : (
        <div className="feed-list">
          {items.map(n => (
            <div
              key={n.id}
              className="feed-card"
              style={{
                background: n.is_read ? 'var(--color-surface)' : 'var(--color-primary-light)',
                cursor: n.is_read ? 'default' : 'pointer',
                borderLeft: n.is_read ? 'none' : '3px solid var(--color-primary)',
              }}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '1.6rem' }}>{TYPE_ICONS[n.type] || '🔔'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.is_read ? 400 : 600 }}>{n.message}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {formatDate(n.created_at)}
                  </div>
                </div>
                {!n.is_read && <span className="notif-dot" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
          <span style={{ padding: '6px 12px' }}>{page} / {pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
        </div>
      )}
    </div>
  );
}
