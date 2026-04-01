import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [focused, setFocused] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, form);
      localStorage.setItem('token', res.data.access_token);
      const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      localStorage.setItem('user', JSON.stringify({ name: payload.name, email: payload.email, id: payload.sub }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true); setError('');
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/google`, { token: credentialResponse.credential });
      localStorage.setItem('token', res.data.access_token);
      const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
      localStorage.setItem('user', JSON.stringify({ name: payload.name, email: payload.email, id: payload.sub }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in failed. Try again.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/forgot-password`, { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email.');
      setShowForgot(false);
    } finally { setForgotLoading(false); }
  };

  const inp = (name) => ({
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    border: `1.5px solid ${focused === name ? '#f97316' : '#e8e2d9'}`,
    boxShadow: focused === name ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
    fontSize: '14px', color: '#1a1207', background: '#fff',
    fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s',
  });

  const lbl = { display: 'block', fontSize: '10px', fontWeight: '700', color: '#9c8b78', letterSpacing: '1.5px', marginBottom: '7px', marginTop: '16px' };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', fontFamily: "'Outfit', sans-serif" }}>

        {!isMobile && (
          <div style={{ width: '42%', background: 'linear-gradient(155deg,#0e0618,#1a0a02,#0a1008)', padding: '48px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
            <Link to="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700', color: '#fff', textDecoration: 'none', marginBottom: 'auto' }}>
              MR <em style={{ fontStyle: 'italic', color: '#f97316' }}>Bus</em> Portal
            </Link>
            <div style={{ paddingBottom: '32px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', lineHeight: '1.1', color: '#fff', margin: '0 0 14px' }}>
                Travel smarter,<br /><em style={{ color: '#f97316' }}>earn more.</em>
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.75', marginBottom: '32px' }}>
                Sign in to access your bookings, loyalty points, and AI travel features.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {[['🏆','Your loyalty points','Track and redeem rewards'],['📋','All your bookings','View, cancel, reschedule'],['🤖','AI travel assistant','Smart recommendations'],['💳','Secure payments','Stripe-powered checkout']].map(([icon,title,desc],i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px 20px' }}>
              {[['47K+','Travelers'],['98%','On-time'],['4.9★','Rating']].map(([n,l],i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{n}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>{l}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1, background: '#faf7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '40px', minHeight: '100vh' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {isMobile && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Link to="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '700', color: '#1a1207', textDecoration: 'none' }}>
                  MR <em style={{ color: '#f97316' }}>Bus</em> Portal
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', background: '#f0ebe4', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
              <div style={{ flex: 1, padding: '11px', textAlign: 'center', borderRadius: '11px', fontSize: '14px', fontWeight: '700', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff' }}>Sign In</div>
              <div style={{ flex: 1, padding: '11px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#9c8b78', cursor: 'pointer' }} onClick={() => navigate('/signup')}>Create Account</div>
            </div>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '24px' : '28px', color: '#1a1207', margin: '0 0 6px' }}>Welcome back 👋</h1>
            <p style={{ fontSize: '14px', color: '#9c8b78', marginBottom: '24px' }}>Sign in to continue your journey</p>

            {error && <div style={{ display: 'flex', gap: '10px', background: '#fff1f0', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '18px', fontSize: '13px' }}><span>⚠️</span><span>{error}</span></div>}

            <form onSubmit={handleSubmit}>
              <label style={lbl}>EMAIL ADDRESS</label>
              <input style={inp('email')} name="email" type="email" placeholder="you@email.com" value={form.email} onChange={handleChange} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} required />

              <label style={lbl}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input style={inp('password')} name="password" type={showPass ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={handleChange} onFocus={() => setFocused('password')} onBlur={() => setFocused('')} required />
                <button type="button" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }} onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: '#f97316', fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowForgot(true)}>Forgot password?</span>
              </div>

              <button style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '13px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '20px', opacity: loading ? 0.75 : 1 }} type="submit" disabled={loading}>
                {loading ? '⏳ Signing in...' : 'Sign In →'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e8e2d9' }} />
              <span style={{ fontSize: '11px', color: '#c4b8a8', fontWeight: '600' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: '#e8e2d9' }} />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-in failed.')} text="signin_with" shape="rectangular" size="large" width="100%" theme="outline" />
              </div>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px', borderRadius: '12px', fontSize: '12px', textAlign: 'center' }}>⚠️ Google sign-in not configured</div>
            )}

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#9c8b78', marginTop: '20px' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#f97316', fontWeight: '700', textDecoration: 'none' }}>Sign up free →</Link>
            </p>
          </div>
        </div>

        {showForgot && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '20px' }} onClick={e => e.target === e.currentTarget && setShowForgot(false)}>
            <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', maxWidth: '420px', width: '100%' }}>
              {!forgotSent ? (
                <>
                  <div style={{ fontSize: '44px', textAlign: 'center', marginBottom: '16px' }}>🔑</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#1a1207', textAlign: 'center', margin: '0 0 10px' }}>Reset your password</h3>
                  <p style={{ fontSize: '14px', color: '#9c8b78', textAlign: 'center', marginBottom: '20px' }}>Enter your email and we'll send you a reset link.</p>
                  <input style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1.5px solid #e8e2d9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} type="email" placeholder="you@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button style={{ flex: 1, padding: '14px', background: '#faf7f3', border: '1.5px solid #e8e2d9', borderRadius: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowForgot(false)}>Cancel</button>
                    <button style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }} onClick={handleForgotPassword} disabled={forgotLoading}>{forgotLoading ? 'Sending...' : 'Send Reset →'}</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>📬</div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#1a1207', textAlign: 'center', margin: '0 0 10px' }}>Check your inbox!</h3>
                  <p style={{ fontSize: '14px', color: '#9c8b78', textAlign: 'center', marginBottom: '20px' }}>Reset link sent to <strong style={{ color: '#f97316' }}>{forgotEmail}</strong></p>
                  <button style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }} onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}>Back to Sign In</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
