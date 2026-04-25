import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', icon: '🏠', label: 'Главная', exact: true },
  { to: '/meals', icon: '🍽️', label: 'Питание' },
  { to: '/analytics', icon: '📊', label: 'Аналитика' },
  { to: '/feed', icon: '📰', label: 'Лента' },
  { to: '/places', icon: '📍', label: 'Заведения' },
  { to: '/search', icon: '🔍', label: 'Поиск' },
  { to: '/notifications', icon: '🔔', label: 'Уведомления', badge: true },
  { to: '/profile', icon: '👤', label: 'Профиль' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Вы вышли из системы');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Еда<span>Настроение</span></div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon, label, exact, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
            {badge && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
          {user?.username}
        </div>
        <button className="btn btn-ghost btn-sm btn-block" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </aside>
  );
}
