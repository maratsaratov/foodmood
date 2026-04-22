import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import api from '../api/client';
import { formatDateShort } from '../utils/helpers';

const PERIOD_OPTIONS = [
  { label: '7 дней', days: 7 },
  { label: '14 дней', days: 14 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

function getDateRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    date_from: from.toISOString(),
    date_to: to.toISOString(),
  };
}

function StatBlock({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color: color || 'var(--color-primary)' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: '1.05rem', fontWeight: 700,
      color: 'var(--color-text-muted)', textTransform: 'uppercase',
      letterSpacing: '0.05em', marginBottom: 16, marginTop: 28,
    }}>{children}</h2>
  );
}

export default function AnalyticsPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = getDateRange(periodDays);
    setLoading(true);
    Promise.all([
      api.get('/analytics/summary', { params }),
      api.get('/analytics/correlation', { params }),
    ]).then(([s, c]) => {
      setSummary(s.data);
      setCorrelation(c.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [periodDays]);

  const corrColor = !correlation?.correlation ? '#999'
    : correlation.correlation > 0.3 ? 'var(--color-success)'
    : correlation.correlation < -0.3 ? 'var(--color-danger)'
    : 'var(--color-warning)';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Аналитика</h1>
          <p className="page-subtitle">Корреляция питания и настроения</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIOD_OPTIONS.map(o => (
            <button
              key={o.days}
              className={`btn btn-sm ${periodDays === o.days ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriodDays(o.days)}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {/* Summary stats */}
          <div className="stats-row">
            <StatBlock label="Приёмов пищи" value={summary?.meals?.count || 0} />
            <StatBlock label="Всего ккал" value={Math.round(summary?.meals?.total_calories || 0)} />
            <StatBlock label="Ср. калорий/приём" value={Math.round(summary?.meals?.avg_calories_per_meal || 0)} />
            <StatBlock label="Записей настроения" value={summary?.moods?.count || 0} />
            <StatBlock
              label="Среднее настроение"
              value={summary?.moods?.average ? summary.moods.average.toFixed(1) + '/10' : '—'}
              color="var(--color-accent)"
            />
          </div>

          {/* Correlation block */}
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: '1.05rem', fontWeight: 700 }}>
              Корреляция Пирсона: калории ↔ настроение
            </h3>
            {!correlation?.enough_data ? (
              <div style={{ color: 'var(--color-text-muted)' }}>
                <p>Недостаточно данных для анализа. Нужно минимум 7 совпадающих дней записей питания и настроения.</p>
                <p style={{ marginTop: 8 }}>
                  Записей питания: {correlation?.meals_count || 0},
                  записей настроения: {correlation?.moods_count || 0}
                </p>
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Общие рекомендации:</div>
                  <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(correlation?.recommendations || []).map((r, i) => (
                      <li key={i} style={{ fontSize: '0.92rem' }}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: corrColor }}>
                      {correlation.correlation > 0 ? '+' : ''}{correlation.correlation}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>коэффициент</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{correlation.interpretation}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      p-value: {correlation.p_value} · {correlation.significant ? '✅ Статистически значимо' : '⚠️ Недостаточно значимо'} · {correlation.data_points} точек
                    </div>
                  </div>
                </div>

                {correlation.chart_data?.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="calories" name="Калории" type="number" label={{ value: 'Калории', position: 'bottom', fontSize: 12 }} />
                      <YAxis dataKey="mood" name="Настроение" domain={[0, 10]} label={{ value: 'Настроение', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(v, n) => [v, n === 'calories' ? 'Калории' : 'Настроение']}
                      />
                      <Scatter data={correlation.chart_data} fill="var(--color-primary)" opacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}

                {correlation.recommendations?.length > 0 && (
                  <div style={{ marginTop: 16, background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 Рекомендации:</div>
                    <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {correlation.recommendations.map((r, i) => (
                        <li key={i} style={{ fontSize: '0.92rem' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mood timeline */}
          {summary?.mood_timeline?.length > 0 && (
            <>
              <SectionTitle>Динамика настроения</SectionTitle>
              <div className="card">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={summary.mood_timeline} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v, 'Настроение']} labelFormatter={formatDateShort} />
                    <Line
                      type="monotone" dataKey="avg_mood" name="Настроение"
                      stroke="var(--color-accent)" strokeWidth={2.5}
                      dot={{ r: 3 }} activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Calories timeline */}
          {summary?.calories_timeline?.length > 0 && (
            <>
              <SectionTitle>Калории по дням</SectionTitle>
              <div className="card">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.calories_timeline} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [v + ' ккал', 'Калории']} labelFormatter={formatDateShort} />
                    <Bar dataKey="calories" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Meal type distribution */}
          {summary?.meals?.by_type && Object.keys(summary.meals.by_type).length > 0 && (
            <>
              <SectionTitle>Типы приёмов пищи</SectionTitle>
              <div className="card">
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {Object.entries(summary.meals.by_type).map(([type, count]) => {
                    const pct = Math.round((count / summary.meals.count) * 100);
                    return (
                      <div key={type} style={{ flex: '1 1 120px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>{count}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{type}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{pct}%</div>
                        <div style={{
                          height: 4, borderRadius: 2, background: 'var(--color-primary)',
                          width: `${pct}%`, margin: '6px auto 0',
                        }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
