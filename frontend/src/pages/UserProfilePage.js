import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import {
  formatDate, mealTypeLabel, getInitials,
  moodEmoji, moodLabel, getApiError,
} from '../utils/helpers';
import toast from 'react-hot-toast';

function MealCard({ meal, currentUserId, onLikeToggle }) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{formatDate(meal.meal_time)}</div>
        <span className="tag">{mealTypeLabel(meal.meal_type)}</span>
      </div>

      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>{meal.food_name}</div>

      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>🔥 {meal.calories} ккал</span>
        {meal.proteins > 0 && <span>Б: {meal.proteins}г</span>}
        {meal.fats > 0 && <span>Ж: {meal.fats}г</span>}
        {meal.carbs > 0 && <span>У: {meal.carbs}г</span>}
      </div>

      {meal.mood_score != null && (
        <div style={{
          marginTop: 10,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--color-primary-light)',
          borderRadius: 'var(--radius-sm)', padding: '5px 12px', fontSize: '0.9rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}>{moodEmoji(meal.mood_score)}</span>
          <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            {moodLabel(meal.mood_score)} · {meal.mood_score}/10
          </span>
        </div>
      )}

      {meal.notes && <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{meal.notes}</p>}

      <div className="feed-actions">
        <button
          className={`action-btn ${meal.liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {meal.liked ? '❤️' : '🤍'} {meal.likes_count}
        </button>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(true);

  // Если это собственный профиль — редиректим на /profile
  useEffect(() => {
    if (currentUser?.username === username) {
      navigate('/profile', { replace: true });
    }
  }, [currentUser, username, navigate]);

  // Загрузка профиля
  useEffect(() => {
    setLoadingProfile(true);
    api.get(`/auth/users/${username}`)
      .then(({ data }) => setProfile(data))
      .catch(() => {
        toast.error('Пользователь не найден');
        navigate('/feed');
      })
      .finally(() => setLoadingProfile(false));
  }, [username, navigate]);

  // Загрузка публичных записей
  const loadMeals = useCallback(async () => {
    setLoadingMeals(true);
    try {
      const { data } = await api.get(`/auth/users/${username}/meals`, { params: { page } });
      setMeals(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Ошибка загрузки записей');
    } finally {
      setLoadingMeals(false);
    }
  }, [username, page]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  const handleLikeToggle = (mealId, liked, count) => {
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, liked, likes_count: count } : m));
  };

  if (loadingProfile) return <div className="spinner" />;
  if (!profile) return null;

  const initials = getInitials(profile.username);
  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : '';

  return (
    <div>
      {/* Шапка профиля */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: 'var(--color-primary-light)',
            border: '3px solid var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)',
          }}>
            {profile.avatar_url
              ? <img src={`/static/${profile.avatar_url}`} alt={profile.username}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>@{profile.username}</div>
            {profile.bio && (
              <div style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: '0.95rem' }}>
                {profile.bio}
              </div>
            )}
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginTop: 6 }}>
              На сервисе с {joinedYear} · {total} публичных записей
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            ← Назад
          </button>
        </div>
      </div>

      {/* Публичные записи */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Публичные записи питания</h2>
        <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{total} записей</span>
      </div>

      {loadingMeals ? <div className="spinner" /> : meals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-title">Нет публичных записей</div>
          <div className="empty-state-desc">Пользователь пока не поделился ни одним приёмом пищи</div>
        </div>
      ) : (
        <div className="feed-list">
          {meals.map(meal => (
            <MealCard
              key={meal.id}
              meal={meal}
              currentUserId={currentUser?.id}
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
