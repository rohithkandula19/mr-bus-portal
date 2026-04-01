import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token, email]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/reset-password`, {
        token,
        new_password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {success ? (
          <div style={s.successWrap}>
            <div style={s.successIcon}>✅</div>
            <h2 style={s.title}>Password Reset!</h2>
            <p style={s.sub}>Your password has been changed successfully. You can now sign in with your new password.</p>
            <button style={s.btn} onClick={() => navigate('/login')}>
              Back to Sign In →
            </button>
          </div>
        ) : (
          <>
            <div style={s.ico}>🔐</div>
            <h2 style={s.title}>Set new password</h2>
            <p style={s.sub}>
              {email ? `Setting new password for ${email}` : 'Enter your new password below.'}
            </p>

            {error && <div style={s.errorBox}>{error}</div>}

            {!error.includes('Invalid reset link') && (
              <form onSubmit={handleSubmit}>
                <div style={s.field}>
                  <label style={s.label}>New Password</label>
                  <div style={s.pwWrap}>
                    <input
                      style={s.input}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {form.password && (
                    <div style={s.strengthBar}>
                      <div style={{
                        ...s.strengthFill,
                        width: form.password.length >= 12 ? '100%' : form.password.length >= 8 ? '66%' : '33%',
                        background: form.password.length >= 12 ? '#16a34a' : form.password.length >= 8 ? '#f97316' : '#ef4444',
                      }} />
                      <span style={s.strengthLabel}>
                        {form.password.length >= 12 ? 'Strong' : form.password.length >= 8 ? 'Good' : 'Weak'}
                      </span>
                    </div>
                  )}
                </div>

                <div style={s.field}>
                  <label style={s.label}>Confirm Password</label>
                  <input
                    style={{
                      ...s.input,
                      borderColor: form.confirm && form.confirm !== form.password ? '#ef4444' : '#e8e2d9',
                    }}
                    type="password"
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    required
                  />
                  {form.confirm && form.confirm !== form.password && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>
                      Passwords don't match
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password →'}
                </button>
              </form>
            )}

            <p style={s.backLink}>
              <Link to="/login" style={{ color: '#f97316', fontWeight: '600', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: "'Outfit', sans-serif",
    background: `
      radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.12) 0%, transparent 60%),
      linear-gradient(155deg, #0e0618, #08100f)
    `,
    padding: '24px',
  },
  card: {
    background: '#fff', borderRadius: '24px', padding: '44px',
    maxWidth: '440px', width: '100%',
    boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
  },
  ico: {
    width: '56px', height: '56px', borderRadius: '18px',
    background: 'linear-gradient(135deg,#fff7ed,#ffedd5)',
    border: '1px solid #fed7aa',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '26px', marginBottom: '22px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '28px', color: '#1a1207', marginBottom: '10px',
  },
  sub: { fontSize: '14px', color: '#9c8b78', lineHeight: '1.65', marginBottom: '28px' },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fca5a5',
    color: '#dc2626', padding: '12px 16px', borderRadius: '12px',
    marginBottom: '20px', fontSize: '14px',
  },
  field: { marginBottom: '18px' },
  label: {
    display: 'block', fontSize: '11px', fontWeight: '700',
    color: '#9c8b78', marginBottom: '7px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  input: {
    width: '100%', background: '#faf7f3', border: '1.5px solid #e8e2d9',
    borderRadius: '12px', padding: '13px 16px', color: '#1a1207',
    fontSize: '14px', fontFamily: "'Outfit', sans-serif", outline: 'none',
    boxSizing: 'border-box',
  },
  pwWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
  },
  strengthBar: {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
  },
  strengthFill: {
    height: '4px', borderRadius: '4px', transition: 'all 0.3s', flex: 'none',
  },
  strengthLabel: { fontSize: '11px', color: '#9c8b78', fontWeight: '600' },
  btn: {
    width: '100%',
    background: 'linear-gradient(135deg,#f97316,#ea580c)',
    border: 'none', color: '#fff', padding: '14px',
    borderRadius: '13px', fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 4px 24px rgba(249,115,22,0.3)',
    boxSizing: 'border-box',
  },
  backLink: { textAlign: 'center', marginTop: '20px', fontSize: '14px' },
  successWrap: { textAlign: 'center' },
  successIcon: { fontSize: '48px', marginBottom: '16px' },
};