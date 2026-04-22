import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getApiError } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY_PLACE = { name: '', address: '', description: '', menu_info: '', email: '' };
const EMPTY_REVIEW = { text: '', mood_impact: 5 };

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
            <textarea rows={4} placeholder="Расскажите о впечатлениях и влиянии еды на настроение..." value={form.text} onChange={set('text')} required />
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
            <div className="mood-display"><span>1 — Ухудшило</span><span>10 — Улучшило</span></div>
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

function PlaceCard({ place, onReview }) {
  const avg = place.average_mood_impact;
  const avgColor = !avg ? '#999'
    : avg >= 7 ? 'var(--color-success)'
    : avg >= 4 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  return (
    <div className="feed-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{place.name}</h3>
            {place.is_verified && <span className="tag">✅ Верифицировано</span>}
          </div>
          {place.address && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 {place.address}</div>
          )}
        </div>
        {avg && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: avgColor }}>{avg}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>настр. /10</div>
          </div>
        )}
      </div>
      {place.description && <p style={{ marginTop: 8, fontSize: '0.92rem', color: 'var(--color-text-muted)' }}>{place.description}</p>}
      <div className="feed-actions">
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          💬 {place.reviews_count} отзывов
        </span>
        <button className="btn btn-sm btn-secondary" onClick={() => onReview(place)}>
          + Написать отзыв
        </button>
      </div>
    </div>
  );
}

export default function PlacesPage() {
  const [places, setPlaces] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);

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

  return (
    <div>
      {addModal && (
        <PlaceModal
          onClose={() => setAddModal(false)}
          onSaved={p => setPlaces(prev => [p, ...prev])}
        />
      )}
      {reviewModal && (
        <ReviewModal
          place={reviewModal}
          onClose={() => setReviewModal(null)}
          onSaved={() => load()}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Заведения</h1>
          <p className="page-subtitle">Рейтинг по влиянию на настроение · {total} заведений</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>+ Добавить заведение</button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Поиск по названию..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <button type="submit" className="btn btn-secondary">Найти</button>
        {search && (
          <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
            Сбросить
          </button>
        )}
      </form>

      {loading ? <div className="spinner" /> : places.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📍</div>
          <div className="empty-state-title">Заведения не найдены</div>
          <div className="empty-state-desc">Добавьте первое заведение</div>
        </div>
      ) : (
        <div className="feed-list">
          {places.map(place => (
            <PlaceCard key={place.id} place={place} onReview={setReviewModal} />
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
