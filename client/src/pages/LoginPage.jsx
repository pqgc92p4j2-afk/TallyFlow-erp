import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { loginSuccess } from '../store/authSlice';
import { toggleTheme } from '../store/uiSlice';
import { FiSun, FiMoon } from 'react-icons/fi';
import { setActiveCompany, setCompanies } from '../store/companySlice';
import { authAPI, companyAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState('user'); // 'user' or 'admin' 
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme } = useSelector((state) => state.ui);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      
      const isAdminLogin = loginMode === 'admin';
      dispatch(loginSuccess({ user: data.user, token: data.token, isAdminMode: isAdminLogin }));
      
      if (isAdminLogin) {
        navigate('/admin');
        toast.success('Admin Access Granted!');
        return;
      }

      // Fetch companies
      try {
        const compRes = await companyAPI.getAll();
        dispatch(setCompanies(compRes.data.data));
        if (compRes.data.data.length > 0) {
          dispatch(setActiveCompany(compRes.data.data[0]));
          navigate('/');
        } else {
          navigate('/setup-company');
        }
      } catch { navigate('/setup-company'); }
      
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: 20, right: 30 }}>
        <button className="btn btn-ghost theme-toggle-btn" onClick={() => dispatch(toggleTheme())} title="Toggle Theme" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
          <FiSun size={18} className={`theme-icon-sun ${theme === 'dark' ? 'icon-hidden' : ''}`} />
          <FiMoon size={18} className={`theme-icon-moon ${theme === 'light' ? 'icon-hidden' : ''}`} />
        </button>
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">TF</div>
          <h2>TallyFlow</h2>
          <p>{loginMode === 'admin' ? 'Administrative Control' : 'Enterprise Accounting System'}</p>
        </div>

        {/* Login Mode Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <button type="button" 
            className={`btn btn-sm ${loginMode === 'user' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: '8px' }}
            onClick={() => setLoginMode('user')}>User Login</button>
          <button type="button" 
            className={`btn btn-sm ${loginMode === 'admin' ? 'btn-danger' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: '8px' }}
            onClick={() => setLoginMode('admin')}>Admin Login</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Enter password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
