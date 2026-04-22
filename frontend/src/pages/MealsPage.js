import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { formatDate, mealTypeLabel, getInitials, getApiError } from '../utils/helpers';
import toast from 'react-hot-toast';

const MEAL_TYPES = ['завтрак', 'обед', 'ужин', 'перекус'];
const EMPTY_FORM = {
  food_name: '', calories: '', proteins: '', fats: '', carbs: '',
  meal_type: 'обед', notes: '', is_public: false,
  meal_time: new Date().toISOString().slice(0, 16)
};

function MealModal({ meal, onClose, onSaved }) {
  const [form, setForm] = useState(meal ? {
    ...meal,
    meal_time: meal.meal_time?.slice(0, 16)
  } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (meal) {
        const { data } = await api.put(`/meals/${meal.id}`, form);
        onSaved(data, 'edit');
        toast.success('Запись обновлена');
      } else {
        const { data } = await api.post('/meals/', form);
        onSaved(data, 'create');
        toast.success('Приём пищи записан');
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
        <h2 className="modal-title">{meal ? 'Редактировать запись' : 'Новый приём пищи'}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Блюдо / продукт *</label>
            <input placeholder="Например: гречка с курицей" value={form.food_name} onChange={set('food_name')} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Калории (ккал) *</label>
              <input type="number" min="1" placeholder="350" value={form.calories} onChange={set('calories')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Тип приёма</label>
              <select value={form.meal_type} onChange={set('meal_type')}>
                {MEAL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Белки (г)</label>
              <input type="number" min="0" placeholder="0" value={form.proteins} onChange={set('proteins')} />
            </div>
            <div className="form-group">
              <label className="form-label">Жиры (г)</label>
              <input type="number" min="0" placeholder="0" value={form.fats} onChange={set('fats')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Углеводы (г)</label>
              <input type="number" min="0" placeholder="0" value={form.carbs} onChange={set('carbs')} />
            </div>
            <div className="form-group">
              <label className="form-label">Время приёма</label>
              <input type="datetime-local" value={form.meal_time} onChange={set('meal_time')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Заметки</label>
            <textarea rows={2} placeholder="Ресторан, ощущения..." value={form.notes} onChange={set('notes')} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="is_public" checked={form.is_public} onChange={set('is_public')} style={{ width: 'auto' }} />
            <label htmlFor="is_public" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.95rem' }}>
              Показать в ленте
            </label>
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

export default function MealsPage() {
  const [meals, setMeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | meal object
  const [filterType, setFilterType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filterType) params.meal_type = filterType;
      const { data } = await api.get('/meals/', { params });
      setMeals(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(false); }
  }, [page, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (item, mode) => {
    if (mode === 'create') setMeals(prev => [item, ...prev]);
    else setMeals(prev => prev.map(m => m.id === item.id ? item : m));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await api.delete(`/meals/${id}`);
      setMeals(prev => prev.filter(m => m.id !== id));
      toast.success('Удалено');
    } catch { toast.error('Ошибка удаления'); }
  };

  return (
    <div>
      {modal !== null && (
        <MealModal
          meal={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Дневник питания</h1>
          <p className="page-subtitle">Всего записей: {total}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>+ Добавить</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', ...MEAL_TYPES].map(t => (
          <button key={t} className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setFilterType(t); setPage(1); }}>
            {t || 'Все'}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : meals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-title">Нет записей</div>
          <div className="empty-state-desc">Добавьте первый приём пищи</div>
        </div>
      ) : (
        <div className="feed-list">
          {meals.map(meal => (
            <div className="feed-card" key={meal.id}>
              <div className="feed-meta">
                <div className="avatar">{getInitials(meal.username)}</div>
                <span>{meal.username}</span>
                <span>·</span>
                <span>{formatDate(meal.meal_time)}</span>
                <span className="tag" style={{ marginLeft: 'auto' }}>{mealTypeLabel(meal.meal_type)}</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>{meal.food_name}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', gap: 16 }}>
                <span>🔥 {meal.calories} ккал</span>
                {meal.proteins > 0 && <span>Б: {meal.proteins}г</span>}
                {meal.fats > 0 && <span>Ж: {meal.fats}г</span>}
                {meal.carbs > 0 && <span>У: {meal.carbs}г</span>}
              </div>
              {meal.notes && <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{meal.notes}</p>}
              {meal.is_public && <span className="tag" style={{ marginTop: 8 }}>Публичная</span>}
              <div className="feed-actions">
                <button className="action-btn" onClick={() => setModal(meal)}>✏️ Редактировать</button>
                <button className="action-btn" onClick={() => handleDelete(meal.id)}>🗑️ Удалить</button>
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

