import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getApiError } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY_PLACE = { name: '', address: '', description: '', menu_info: '', email: '' };
const EMPTY_REVIEW = { text: '', mood_impact: 5 };

// ─── Модалка добавления заведения ────────────────────────────────────────────
function PlaceModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PLACE);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/places/', form);
      onSaved(data);
      toast.success('Заведение добавлено и отправлено на верификацию');
      onClose();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Добавить заведение</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Название *</label>
            <input placeholder="Кафе «Уют»" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Адрес</label>
            <input placeholder="ул. Ленина, 10" value={form.address} onChange={set('address')} />
          </div>
          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea rows={2} placeholder="Кратко о заведении..." value={form.description} onChange={set('description')} />
          </div>
          <div className="form-group">
            <label className="form-label">Информация о меню</label>
            <textarea rows={2} placeholder="Основные блюда, кухня..." value={form.menu_info} onChange={set('menu_info')} />
          </div>
          <div className="form-group">
            <label className="form-label">Email заведения (для верификации)</label>
            <input type="email" placeholder="cafe@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Модалка написания отзыва ────────────────────────────────────────────────
function ReviewModal({ place, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_REVIEW, place_id: place.id });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/reviews/', { ...form, mood_impact: Number(form.mood_impact) });
      onSaved(data);
      toast.success('Отзыв добавлен');
      onClose();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Отзыв о «{place.name}»</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Текст отзыва *</label>
            <textarea
              rows={4}
              placeholder="Расскажите о впечатлениях и влиянии еды на настроение..."
              value={form.text} onChange={set('text')} required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Влияние на настроение: {form.mood_impact}/10
            </label>
            <input
              type="range" min="1" max="10" className="mood-slider"
              value={form.mood_impact}
              onChange={e => setForm(f => ({ ...f, mood_impact: e.target.value }))}
            />
            <div className="mood-display">
              <span>1 — Ухудшило</span>
              <span>10 — Улучшило</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Список отзывов заведения ─────────────────────────────────────────────────
function PlaceReviews({ place, currentUser, onReviewDeleted }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews/', { params: { place_id: place.id } })
      .then(({ data }) => setReviews(data.items))
      .catch(() => toast.error('Ошибка загрузки отзывов'))
      .finally(() => setLoading(false));
  }, [place.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      onReviewDeleted();
      toast.success('Отзыв удалён');
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const moodColor = (score) => {
    if (score >= 7) return 'var(--color-success)';
    if (score >= 4) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  if (loading) return <div style={{ padding: '12px 0' }}><div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 2 }} /></div>;

  if (reviews.length === 0) return (
    <div style={{ padding: '12px 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
      Пока нет отзывов. Будьте первым!
    </div>
  );

  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reviews.map(r => (
        <div key={r.id} style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>@{r.username}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {formatDate(r.created_at)}
                </span>
                {r.mood_impact && (
                  <span style={{
                    background: moodColor(r.mood_impact) + '22',
                    color: moodColor(r.mood_impact),
                    borderRadius: 100, padding: '1px 10px',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}>
                    настроение {r.mood_impact}/10
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>{r.text}</div>
            </div>
            {(r.user_id === currentUser?.id || currentUser?.is_admin) && (
              <button
                className="action-btn"
                style={{ color: 'var(--color-danger)', flexShrink: 0 }}
                onClick={() => handleDelete(r.id)}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Карточка заведения ───────────────────────────────────────────────────────
function PlaceCard({ place, currentUser, onReview, onVerify, onReviewAdded }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewCount, setReviewCount] = useState(place.reviews_count);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(place.is_verified);
  const [avgMood, setAvgMood] = useState(place.average_mood_impact);

  const avg = avgMood;
  const avgColor = !avg ? '#999'
    : avg >= 7 ? 'var(--color-success)'
    : avg >= 4 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await api.post(`/places/${place.id}/verify`);
      setIsVerified(true);
      toast.success('Заведение верифицировано');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleReviewAdded = () => {
    setReviewCount(c => c + 1);
    onReviewAdded?.();
    // Обновляем средний рейтинг
    api.get(`/places/${place.id}`).then(({ data }) => {
      setAvgMood(data.average_mood_impact);
    }).catch(() => {});
  };

  return (
    <div className="feed-card">
      {/* Шапка карточки */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{place.name}</h3>
            {isVerified && (
              <span className="tag" style={{ background: '#e8f5ec', color: '#27ae60' }}>✅ Верифицировано</span>
            )}
            {!isVerified && currentUser?.is_admin && (
              <span className="tag" style={{ background: '#fef3e2', color: '#e07b3a' }}>⏳ Не верифицировано</span>
            )}
          </div>
          {place.address && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 {place.address}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {avg && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: avgColor, lineHeight: 1 }}>{avg}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>настр. /10</div>
            </div>
          )}
          {/* Кнопка верификации для администратора */}
          {currentUser?.is_admin && !isVerified && (
            <button
              className="btn btn-sm"
              style={{ background: '#27ae60', color: '#fff', padding: '5px 12px' }}
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? '...' : '✓ Верифицировать'}
            </button>
          )}
        </div>
      </div>

      {place.description && (
        <p style={{ marginTop: 8, fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>{place.description}</p>
      )}

      {place.menu_info && (
        <p style={{ marginTop: 4, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
          🍴 {place.menu_info}
        </p>
      )}

      {/* Действия */}
      <div className="feed-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
        <button
          className="action-btn"
          onClick={() => setExpanded(e => !e)}
          style={{ fontWeight: 600 }}
        >
          💬 {reviewCount} {reviewCount === 1 ? 'отзыв' : reviewCount >= 2 && reviewCount <= 4 ? 'отзыва' : 'отзывов'}
          {' '}{expanded ? '▲' : '▼'}
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onReview(place, handleReviewAdded)}
        >
          + Написать отзыв
        </button>
      </div>

      {/* Раскрывающийся блок отзывов */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <PlaceReviews
            place={place}
            currentUser={currentUser}
            onReviewDeleted={() => setReviewCount(c => Math.max(0, c - 1))}
          />
        </div>
      )}
    </div>
  );
}

// ─── Основная страница ────────────────────────────────────────────────────────
export default function PlacesPage() {
  const { user } = useAuth();
  const [places, setPlaces] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterUnverified, setFilterUnverified] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { place, onAdded }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/places/', { params: { page, search } });
      setPlaces(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const visiblePlaces = filterUnverified
    ? places.filter(p => !p.is_verified)
    : places;

  return (
    <div>
      {addModal && (
        <PlaceModal
          onClose={() => setAddModal(false)}
          onSaved={p => { setPlaces(prev => [p, ...prev]); setTotal(t => t + 1); }}
        />
      )}
      {reviewTarget && (
        <ReviewModal
          place={reviewTarget.place}
          onClose={() => setReviewTarget(null)}
          onSaved={() => { reviewTarget.onAdded?.(); setReviewTarget(null); }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Заведения</h1>
          <p className="page-subtitle">Рейтинг по влиянию на настроение · {total} заведений</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Добавить заведение</button>
      </div>

      {/* Поиск + фильтр для админа */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            placeholder="Поиск по названию..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>Найти</button>
          {search && (
            <button type="button" className="btn btn-ghost" style={{ flexShrink: 0 }}
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
              Сбросить
            </button>
          )}
        </form>

        {/* Панель администратора */}
        {user?.is_admin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fef3e2', borderRadius: 'var(--radius-sm)',
            padding: '8px 14px', border: '1px solid #f4a261',
          }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e07b3a' }}>👑 Режим администратора</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={filterUnverified}
                onChange={e => setFilterUnverified(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Показать только неверифицированные
            </label>
          </div>
        )}
      </div>

      {loading ? <div className="spinner" /> : visiblePlaces.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📍</div>
          <div className="empty-state-title">
            {filterUnverified ? 'Все заведения верифицированы!' : 'Заведения не найдены'}
          </div>
          <div className="empty-state-desc">
            {filterUnverified ? 'Отличная работа.' : 'Добавьте первое заведение'}
          </div>
        </div>
      ) : (
        <div className="feed-list">
          {visiblePlaces.map(place => (
            <PlaceCard
              key={place.id}
              place={place}
              currentUser={user}
              onReview={(p, onAdded) => setReviewTarget({ place: p, onAdded })}
              onVerify={() => {}}
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
