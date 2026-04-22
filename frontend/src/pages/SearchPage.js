import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const search = async (e) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      toast.error('Введите минимум 2 символа');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/search/', { params: { q: query, type } });
      setResults(data);
    } catch {
      toast.error('Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const totalFound = (results?.places?.length || 0) + (results?.products?.length || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Поиск</h1>
          <p className="page-subtitle">Поиск по заведениям и продуктам</p>
        </div>
      </div>

      <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Введите название блюда или заведения..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={type} onChange={e => setType(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">Всё</option>
          <option value="places">Только заведения</option>
          <option value="products">Только продукты</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Поиск...' : '🔍 Найти'}
        </button>
      </form>

      {results && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Найдено: {totalFound} результатов
          </div>

          {results.places?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📍 Заведения
              </h2>
              <div className="feed-list" style={{ marginBottom: 24 }}>
                {results.places.map(p => (
                  <div key={p.id} className="feed-card" style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/places')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.address && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>📍 {p.address}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {p.average_mood_impact && (
                          <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            {p.average_mood_impact}/10
                          </div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {p.reviews_count} отзывов
                        </div>
                        {p.is_verified && <span className="tag" style={{ marginTop: 4 }}>✅</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {results.products?.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🍽️ Продукты
              </h2>
              <div className="feed-list">
                {results.products.map((p, i) => (
                  <div key={i} className="feed-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{p.food_name}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                        🔥 {Math.round(p.avg_calories)} ккал
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalFound === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Ничего не найдено</div>
              <div className="empty-state-desc">Попробуйте изменить запрос</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
