import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { formatDate, moodEmoji, moodLabel, getApiError } from '../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  mood_score: 5,
  description: '',
  logged_at: new Date().toISOString().slice(0, 16),
};

function MoodModal({ mood, onClose, onSaved }) {
  const [form, setForm] = useState(mood ? {
    mood_score: mood.mood_score,
    description: mood.description,
    logged_at: mood.logged_at?.slice(0, 16),
  } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setScore = (v) => setForm(f => ({ ...f, mood_score: Number(v) }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mood) {
        const { data } = await api.put(`/moods/${mood.id}`, form);
        onSaved(data, 'edit');
        toast.success('Запись обновлена');
      } else {
        const { data } = await api.post('/moods/', form);
        onSaved(data, 'create');
        toast.success('Настроение записано');
      }
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
        <h2 className="modal-title">{mood ? 'Редактировать настроение' : 'Записать настроение'}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">
              Настроение: {moodEmoji(form.mood_score)} {form.mood_score}/10 — {moodLabel(form.mood_score)}
            </label>
            <input
              type="range" min="1" max="10" step="1"
              className="mood-slider"
              value={form.mood_score}
              onChange={e => setScore(e.target.value)}
            />
            <div className="mood-display">
              <span>1 — Ужасно</span>
              <span>10 — Отлично</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Описание (необязательно)</label>
            <textarea
              rows={3}
              placeholder="Что повлияло на настроение? Съели что-то особенное?"
              value={form.description}
              onChange={set('description')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Время</label>
            <input type="datetime-local" value={form.logged_at} onChange={set('logged_at')} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoodCard({ mood, onEdit, onDelete }) {
  const scoreColor = mood.mood_score >= 7 ? 'var(--color-success)'
    : mood.mood_score >= 4 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="feed-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: scoreColor + '22',
          border: `3px solid ${scoreColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '1.6rem' }}>{moodEmoji(mood.mood_score)}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {moodLabel(mood.mood_score)}{' '}
            <span style={{ color: scoreColor }}>{mood.mood_score}/10</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {formatDate(mood.logged_at)}
          </div>
          {mood.description && (
            <p style={{ marginTop: 6, fontSize: '0.92rem' }}>{mood.description}</p>
          )}
        </div>
      </div>
      <div className="feed-actions">
        <button className="action-btn" onClick={() => onEdit(mood)}>✏️ Редактировать</button>
        <button className="action-btn" onClick={() => onDelete(mood.id)}>🗑️ Удалить</button>
      </div>
    </div>
  );
}

export default function MoodsPage() {
  const [moods, setMoods] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/moods/', { params: { page } });
      setMoods(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (item, mode) => {
    if (mode === 'create') setMoods(prev => [item, ...prev]);
    else setMoods(prev => prev.map(m => m.id === item.id ? item : m));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/moods/${id}`);
      setMoods(prev => prev.filter(m => m.id !== id));
      toast.success('Удалено');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div>
      {modal !== null && (
        <MoodModal
          mood={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Дневник настроения</h1>
          <p className="page-subtitle">Всего записей: {total}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Записать настроение</button>
      </div>

      {loading ? <div className="spinner" /> : moods.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💭</div>
          <div className="empty-state-title">Нет записей настроения</div>
          <div className="empty-state-desc">Начните отслеживать своё эмоциональное состояние</div>
        </div>
      ) : (
        <div className="feed-list">
          {moods.map(mood => (
            <MoodCard
              key={mood.id}
              mood={mood}
              onEdit={setModal}
              onDelete={handleDelete}
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
