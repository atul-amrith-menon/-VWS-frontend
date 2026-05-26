import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.confirm_password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setErrors(data?.errors || [data?.error || 'Registration failed.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vx-auth-page">
      <div className="vx-auth-card glass-card">
        <div className="text-center mb-4">
          <div className="brand-icon mx-auto mb-3"><Shield size={22} /></div>
          <h1 className="h4 fw-bold gradient-text mb-1">Create Account</h1>
          <p className="text-muted small">Join Vultix — scan smarter, stay secure</p>
        </div>

        {errors.length > 0 && (
          <div className="vx-alert vx-alert-danger mb-3">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'username',         label: 'Username',         type: 'text',     placeholder: 'At least 3 characters' },
            { name: 'email',            label: 'Email',            type: 'email',    placeholder: 'you@example.com' },
            { name: 'password',         label: 'Password',         type: 'password', placeholder: 'At least 6 characters' },
            { name: 'confirm_password', label: 'Confirm Password', type: 'password', placeholder: 'Repeat your password' },
          ].map(({ name, label, type, placeholder }) => (
            <div className="mb-3" key={name}>
              <label className="form-label small fw-medium">{label}</label>
              <input
                name={name} value={form[name]} onChange={handleChange}
                type={type} className="glass-input form-control w-100"
                placeholder={placeholder} required
              />
            </div>
          ))}

          <button type="submit" className="btn-scan w-100 d-flex align-items-center justify-content-center gap-2 mt-2" disabled={loading}>
            {loading ? <span className="vx-spinner-sm" /> : <><UserPlus size={16} /> Create Account</>}
          </button>
        </form>

        <p className="text-center mt-4 small text-muted">
          Already have an account?{' '}
          <Link to="/login" className="vx-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
