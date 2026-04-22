import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { formatDate, mealTypeLabel, getInitials, getApiError } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

function CommentSection({ mealId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`/social/comments/meal/${mealId}`);
    setComments(data);
  }, [mealId]);

  const toggle = () => {
    if (!open) load();
    setOpen(o => !o);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/social/comments', {
        target_type: 'meal', target_id: mealId, text,
      });
      setComments(prev => [...prev, data]);
      setText('');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    await api.delete(`/social/comments/${id}`);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button className="action-btn" onClick={toggle}>
        💬 {open ? 'Скрыть' : 'Комментарии'}
      </button>
      {open && (
        <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid var(--color-border)' }}>
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 10, fontSize: '0.9rem' }}>
              <span style={{ fontWeight: 600 }}>{c.username}:</span>{' '}
              {c.text}
              {c.user_id === currentUser?.id && (
                <button
                  onClick={() => del(c.id)}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                >✕</button>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>Нет комментариев</div>
          )}
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              placeholder="Написать комментарий..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? '...' : 'Отправить'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function FeedCard({ meal, currentUser, onLikeToggle }) {
  const handleLike = async () => {
    try {
      const { data } = await api.post('/social/like', { target_type: 'meal', target_id: meal.id });
      onLikeToggle(meal.id, data.liked, data.count);
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  return (
    <div className="feed-card">
      <div className="feed-meta">
        <div className="avatar">{getInitials(meal.username)}</div>
        <div>
          <div style={{ fontWeight: 600 }}>{meal.username}</div>
          <div style={{ fontSize: '0.8rem' }}>{formatDate(meal.meal_time)}</div>
        </div>
        <span className="tag" style={{ marginLeft: 'auto' }}>{mealTypeLabel(meal.meal_type)}</span>
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>{meal.food_name}</div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>🔥 {meal.calories} ккал</span>
        {meal.proteins > 0 && <span>Б: {meal.proteins}г</span>}
        {meal.fats > 0 && <span>Ж: {meal.fats}г</span>}
        {meal.carbs > 0 && <span>У: {meal.carbs}г</span>}
      </div>
      {meal.notes && <p style={{ marginTop: 8, fontSize: '0.92rem' }}>{meal.notes}</p>}

      <div className="feed-actions">
        <button
          className={`action-btn ${meal.liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {meal.liked ? '❤️' : '🤍'} {meal.likes_count}
        </button>
        <CommentSection mealId={meal.id} currentUser={currentUser} />
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/meals/feed', { params: { page } });
      setMeals(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Ошибка загрузки ленты');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleLikeToggle = (mealId, liked, count) => {
    setMeals(prev => prev.map(m =>
      m.id === mealId ? { ...m, liked, likes_count: count } : m
    ));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Лента</h1>
          <p className="page-subtitle">Публичные записи сообщества · {total} записей</p>
        </div>
      </div>

      {loading ? <div className="spinner" /> : meals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📰</div>
          <div className="empty-state-title">Лента пуста</div>
          <div className="empty-state-desc">
            Сделайте свои записи питания публичными, чтобы они появились здесь
          </div>
        </div>
      ) : (
        <div className="feed-list">
          {meals.map(meal => (
            <FeedCard
              key={meal.id}
              meal={meal}
              currentUser={user}
              onLikeToggle={handleLikeToggle}
            />
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
