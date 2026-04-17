import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginSuccess } from '../store/authSlice';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, password: form.password });
      dispatch(loginSuccess({ user: data.user, token: data.token }));
      toast.success('Account created! Set up your company.');
      navigate('/setup-company');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">TF</div>
          <h2>Create Account</h2>
          <p>Start managing your business finances</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" name="name" placeholder="Your name"
              value={form.name} onChange={handleChange} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" name="email" placeholder="you@company.com"
              value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" name="password" placeholder="Min 6 characters"
              value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" className="form-input" name="confirmPassword" placeholder="Confirm password"
              value={form.confirmPassword} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
