import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MealsPage from './pages/MealsPage';
import MoodsPage from './pages/MoodsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FeedPage from './pages/FeedPage';
import PlacesPage from './pages/PlacesPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: 100 }} />;
  return user ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
      <Route path="/meals" element={<PrivateRoute><AppLayout><MealsPage /></AppLayout></PrivateRoute>} />
      <Route path="/moods" element={<PrivateRoute><AppLayout><MoodsPage /></AppLayout></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><AppLayout><AnalyticsPage /></AppLayout></PrivateRoute>} />
      <Route path="/feed" element={<PrivateRoute><AppLayout><FeedPage /></AppLayout></PrivateRoute>} />
      <Route path="/places" element={<PrivateRoute><AppLayout><PlacesPage /></AppLayout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><AppLayout><NotificationsPage /></AppLayout></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><AppLayout><SearchPage /></AppLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'inherit', borderRadius: '10px' }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
