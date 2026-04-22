import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import { getApiError } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    notifications_enabled: user?.notifications_enabled ?? true,
  });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const setP = (k) => (e) => setProfileForm(f => ({
    ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));
  const setPw = (k) => (e) => setPwForm(f => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', profileForm);
      updateUser(data);
      toast.success('Профиль обновлён');
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      toast.success('Пароль изменён');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.username || '?').slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Профиль</h1>
          <p className="page-subtitle">{user?.email}</p>
        </div>
      </div>

      {/* Avatar block */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--color-primary-light)',
          border: '3px solid var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)',
          flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.username}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{user?.email}</div>
          {user?.bio && <div style={{ marginTop: 4, fontSize: '0.92rem' }}>{user?.bio}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          Профиль
        </button>
        <button className={`tab ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
          Безопасность
        </button>
        <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          Настройки
        </button>
      </div>

      {tab === 'profile' && (
        <div className="card">
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label className="form-label">Имя пользователя</label>
              <input value={profileForm.username} onChange={setP('username')} required />
            </div>
            <div className="form-group">
              <label className="form-label">О себе</label>
              <textarea rows={3} placeholder="Расскажите о себе..." value={profileForm.bio} onChange={setP('bio')} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card">
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Смена пароля</h3>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label className="form-label">Текущий пароль</label>
              <input type="password" value={pwForm.old_password} onChange={setPw('old_password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Новый пароль</label>
              <input type="password" minLength={6} value={pwForm.new_password} onChange={setPw('new_password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Подтвердите новый пароль</label>
              <input type="password" minLength={6} value={pwForm.confirm} onChange={setPw('confirm')} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Изменение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Настройки уведомлений</h3>
          <form onSubmit={saveProfile}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="notif"
                checked={profileForm.notifications_enabled}
                onChange={setP('notifications_enabled')}
                style={{ width: 'auto', cursor: 'pointer', width: 18, height: 18 }}
              />
              <label htmlFor="notif" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.95rem', cursor: 'pointer' }}>
                Получать уведомления о лайках, комментариях и рекомендациях
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </form>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ marginBottom: 12, fontWeight: 700, color: 'var(--color-danger)' }}>Выход из аккаунта</h3>
            <button className="btn btn-danger" onClick={logout}>Выйти из аккаунта</button>
          </div>
        </div>
      )}
    </div>
  );
}
