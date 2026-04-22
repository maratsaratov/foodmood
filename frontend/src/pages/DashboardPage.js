import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { moodEmoji, moodLabel, formatDate } from '../utils/helpers';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary').then(({ data }) => {
      setSummary(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const meals = summary?.meals || {};
  const moods = summary?.moods || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Привет, {user?.username}! 👋</h1>
          <p className="page-subtitle">Ваша сводка за последние 30 дней</p>
        </div>
        <Link to="/meals" className="btn btn-primary">+ Добавить приём пищи</Link>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{meals.count || 0}</div>
          <div className="stat-label">Записей питания</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(meals.avg_calories_per_meal || 0)}</div>
          <div className="stat-label">Сред. калорий/приём</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{moods.count || 0}</div>
          <div className="stat-label">Записей настроения</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>{moodEmoji(Math.round(moods.average || 5))}</span>
            <span>{moods.average ? moods.average.toFixed(1) : '—'}</span>
          </div>
          <div className="stat-label">Среднее настроение</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--color-text-muted)' }}>Быстрые действия</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/meals" className="btn btn-secondary">🍽️ Записать приём пищи</Link>
            <Link to="/moods" className="btn btn-secondary">💭 Записать настроение</Link>
            <Link to="/analytics" className="btn btn-secondary">📊 Посмотреть аналитику</Link>
            <Link to="/feed" className="btn btn-secondary">📰 Открыть ленту</Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--color-text-muted)' }}>Распределение питания</h3>
          {Object.keys(meals.by_type || {}).length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div>Пока нет данных</div>
            </div>
          ) : (
            Object.entries(meals.by_type).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span>{type}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 8, borderRadius: 4, background: 'var(--color-primary)',
                    width: `${Math.round((count / (meals.count || 1)) * 100)}px`,
                    minWidth: 8
                  }} />
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {moods.average > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8, fontSize: '1rem', color: 'var(--color-text-muted)' }}>Состояние за период</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '1.2rem' }}>
            <span style={{ fontSize: '2.5rem' }}>{moodEmoji(Math.round(moods.average))}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{moodLabel(Math.round(moods.average))}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Среднее {moods.average?.toFixed(1)}/10 · мин {moods.min} · макс {moods.max}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
