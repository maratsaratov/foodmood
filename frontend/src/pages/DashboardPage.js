import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { moodEmoji, moodLabel } from '../utils/helpers';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary').then(({ data }) => setSummary(data))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;

  const meals = summary?.meals || {};
  const moods = summary?.moods || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Привет, {user?.username}! 👋</h1>
          <p className="page-subtitle">Сводка за последние 30 дней</p>
        </div>
        <Link to="/meals" className="btn btn-primary">+ Добавить приём пищи</Link>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{meals.count || 0}</div>
          <div className="stat-label">Приёмов пищи</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(meals.avg_calories_per_meal || 0)}</div>
          <div className="stat-label">Ср. ккал / приём</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{moods.count || 0}</div>
          <div className="stat-label">С отметкой настроения</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {moods.average
              ? <><span>{moodEmoji(Math.round(moods.average))}</span><span>{moods.average.toFixed(1)}</span></>
              : <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>—</span>
            }
          </div>
          <div className="stat-label">Среднее настроение</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--color-text-muted)' }}>Быстрые действия</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/meals" className="btn btn-secondary">🍽️ Записать приём пищи</Link>
            <Link to="/analytics" className="btn btn-secondary">📊 Посмотреть аналитику</Link>
            <Link to="/feed" className="btn btn-secondary">📰 Открыть ленту</Link>
            <Link to="/places" className="btn btn-secondary">📍 Заведения</Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1rem', color: 'var(--color-text-muted)' }}>Распределение питания</h3>
          {Object.keys(meals.by_type || {}).length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
              Пока нет данных
            </div>
          ) : (
            Object.entries(meals.by_type).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span>{type}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 8, borderRadius: 4, background: 'var(--color-primary)',
                    width: `${Math.max(8, Math.round((count / (meals.count || 1)) * 80))}px`,
                  }} />
                  <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {moods.average > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 10, fontSize: '1rem', color: 'var(--color-text-muted)' }}>
            Настроение за период
            <span style={{ fontSize: '0.8rem', fontWeight: 400, marginLeft: 8 }}>
              (из приёмов пищи с отметкой)
            </span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '2.5rem' }}>{moodEmoji(Math.round(moods.average))}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{moodLabel(Math.round(moods.average))}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Среднее {moods.average.toFixed(1)}/10 · мин {moods.min} · макс {moods.max} · записей {moods.count}
              </div>
            </div>
          </div>
        </div>
      )}

      {moods.count === 0 && meals.count > 0 && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--color-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <div>
              <div style={{ fontWeight: 600 }}>Добавьте настроение к приёмам пищи</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                При добавлении еды можно указать настроение — это поможет найти связь между питанием и самочувствием.
              </div>
            </div>
            <Link to="/meals" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
              Перейти
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
