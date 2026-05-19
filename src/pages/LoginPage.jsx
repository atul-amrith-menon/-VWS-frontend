import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '', remember_me: false });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password, form.remember_me);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vx-auth-page">
      <div className="vx-auth-card glass-card">
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3"><Shield size={22} /></div>
          <h1 className="h4 fw-bold gradient-text mb-1">Welcome back</h1>
          <p className="text-muted small">Sign in to your Vultix account</p>
        </div>

        {error && <div className="vx-alert vx-alert-danger mb-3">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-medium">Username or Email</label>
            <input
              name="username" value={form.username} onChange={handleChange}
              className="glass-input form-control" placeholder="Enter username or email"
              required autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label small fw-medium">Password</label>
            <div className="input-group">
              <input
                name="password" value={form.password} onChange={handleChange}
                type={showPwd ? 'text' : 'password'}
                className="glass-input form-control" placeholder="Enter password"
                style={{ borderRadius: '12px 0 0 12px !important' }}
                required
              />
              <button type="button" className="vx-pwd-toggle" onClick={() => setShowPwd(s => !s)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-4 d-flex align-items-center gap-2">
            <input type="checkbox" name="remember_me" id="remember_me"
              checked={form.remember_me} onChange={handleChange}
              className="vx-checkbox"
            />
            <label htmlFor="remember_me" className="small text-muted mb-0 cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          <button type="submit" className="btn-scan w-100 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? <span className="vx-spinner-sm" /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p className="text-center mt-4 small text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="vx-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
