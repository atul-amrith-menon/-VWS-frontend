import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, History, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('vx-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vx-theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-navbar">
      <div className="container d-flex align-items-center justify-content-between py-1">
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <div className="brand-icon"><Shield size={18} /></div>
          <span className="brand-text">Vultix</span>
        </Link>

        <div className="d-flex align-items-center gap-2">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Scanner
          </Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
            <History size={14} className="me-1" />History
          </Link>
          <button
            className="theme-toggle ms-2"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            <div className="theme-toggle-knob">
              {theme === 'dark' ? <Moon size={10} /> : <Sun size={10} />}
            </div>
          </button>
          {user && (
            <button onClick={handleLogout} className="btn-icon ms-1" title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
