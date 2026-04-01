import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', referral_code: '' });
  const [refStatus, setRefStatus] = useState(null); // null | 'valid' | 'invalid'
  const [refInfo, setRefInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState('');
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    // Auto-fill referral code from URL ?ref=CODE
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setForm(f => ({ ...f, referral_code: refCode.toUpperCase() }));
      validateRefCode(refCode.toUpperCase());
    }
  }, []);

  const validateRefCode = async (code) => {
    if (!code || code.length < 4) { setRefStatus(null); setRefInfo(null); return; }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/referrals/validate/${code}`);
      if (res.data.valid) {
        setRefStatus('valid');
        setRefInfo(res.data);
      } else {
        setRefStatus('invalid');
        setRefInfo(null);
      }
    } catch { setRefStatus('invalid'); setRefInfo(null); }
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (score <= 2) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    if (score <= 3) return { label: 'Good', color: '#3b82f6', width: '75%' };
    return { label: 'Strong', color: '#22c55e', width: '100%' };
  };

  const strength = getPasswordStrength(form.password);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/signup`, { ...form, referral_code: form.referral_code || null });
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Try again.');
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

  const inputStyle = (name) => ({
    ...s.input,
    borderColor: focused === name ? '#f97316' : '#e8e2d9',
    boxShadow: focused === name ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
  });

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={s.page}>

        {/* ── LEFT PANEL ── */}
        <div style={s.left}>
          <div style={s.bgDots} />
          <div style={s.bgGlow1} />
          <div style={s.bgGlow2} />

          <Link to="/" style={s.logoText}>
            MR <em style={{ fontStyle:'italic', color:'#f97316' }}>Bus</em> Portal
          </Link>

          <div style={s.leftContent}>
            <div style={s.badge}>
              <div style={s.badgeDot} />
              <span>Free forever · No hidden fees</span>
            </div>
            <h2 style={s.leftTitle}>
              Join thousands<br />
              <em style={{ fontStyle:'italic', color:'#f97316' }}>of travelers.</em>
            </h2>
            <p style={s.leftSub}>
              Create your free account and start earning loyalty points on your very first booking.
            </p>

            <div style={s.perks}>
              {[
                { icon:'🎁', title:'Free to join', desc:'No fees, no subscriptions ever' },
                { icon:'🏆', title:'Earn from day one', desc:'1 point per $1 spent on bookings' },
                { icon:'🤖', title:'AI travel assistant', desc:'Smart route & seat recommendations' },
                { icon:'📧', title:'Instant confirmations', desc:'Booking receipts sent by email' },
              ].map((p, i) => (
                <div key={i} style={s.perkItem}>
                  <div style={s.perkIcon}>{p.icon}</div>
                  <div>
                    <div style={s.perkTitle}>{p.title}</div>
                    <div style={s.perkDesc}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div style={s.testimonial}>
            <div style={s.testimonialStars}>★★★★★</div>
            <p style={s.testimonialText}>"Booked my first trip in under 2 minutes. The AI seat recommendation is incredible!"</p>
            <div style={s.testimonialAuthor}>— Sarah K., Gold Member 🥇</div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={s.right}>
          <div style={s.card}>

            <div style={s.tabs}>
              <div style={{ ...s.tab, ...s.tabInactive }} onClick={() => navigate('/login')}>
                Sign In
              </div>
              <div style={{ ...s.tab, ...s.tabActive }}>Create Account</div>
            </div>

            <h1 style={s.heading}>Create your account ✨</h1>
            <p style={s.subheading}>Start your journey — it only takes 30 seconds</p>

            {error && (
              <div style={s.errorBox}>
                <span style={{ fontSize:'16px' }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label style={s.label}>FULL NAME</label>
              <input
                style={inputStyle('name')}
                name="name" type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                required
              />

              <label style={s.label}>EMAIL ADDRESS</label>
              <input
                style={inputStyle('email')}
                name="email" type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                required
              />

              <label style={s.label}>PASSWORD</label>
              <div style={{ position:'relative' }}>
                <input
                  style={inputStyle('password')}
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  required
                />
                <button type="button" style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password strength */}
              {form.password && strength && (
                <div style={{ marginTop:'8px' }}>
                  <div style={{ background:'#f0ebe4', borderRadius:'4px', height:'4px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:strength.width, background:strength.color, borderRadius:'4px', transition:'width 0.3s, background 0.3s' }} />
                  </div>
                  <div style={{ fontSize:'11px', color:strength.color, fontWeight:'700', marginTop:'4px' }}>
                    {strength.label} password
                  </div>
                </div>
              )}

              {/* ── REFERRAL CODE ── */}
              <div style={{ marginBottom:"20px" }}>
                <label style={{ fontSize:"11px", fontWeight:"700", color:"#9c8b78", letterSpacing:"1.5px", textTransform:"uppercase", display:"block", marginBottom:"8px" }}>
                  🎁 Referral Code <span style={{ fontWeight:"400", textTransform:"none", letterSpacing:"0" }}>(optional)</span>
                </label>
                <div style={{ position:"relative" }}>
                  <input
                    name="referral_code"
                    value={form.referral_code}
                    onChange={e => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'');
                      setForm({ ...form, referral_code: val });
                      if (val.length >= 6) validateRefCode(val);
                      else { setRefStatus(null); setRefInfo(null); }
                    }}
                    placeholder="e.g. REFERRAL-X7K2"
                    style={{ ...inputStyle('referral_code'), fontFamily:"monospace", letterSpacing:"2px", paddingRight:"40px" }}
                    onFocus={() => setFocused('referral_code')}
                    onBlur={() => setFocused('')}
                    maxLength={12}
                  />
                  {refStatus === 'valid' && <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)" }}>✅</span>}
                  {refStatus === 'invalid' && form.referral_code.length >= 6 && <span style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)" }}>❌</span>}
                </div>
                {refStatus === 'valid' && refInfo && (
                  <div style={{ marginTop:"8px", padding:"10px 14px", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:"10px", fontSize:"13px", color:"#16a34a", fontWeight:"600" }}>
                    🎉 Valid! Referred by <strong>{refInfo.referrer_name}</strong> — you'll get <strong>{refInfo.bonus_points} bonus points</strong> after completing your first trip!
                  </div>
                )}
                {refStatus === 'invalid' && form.referral_code.length >= 6 && (
                  <div style={{ marginTop:"6px", fontSize:"12px", color:"#ef4444" }}>❌ Invalid referral code</div>
                )}
              </div>

              <button
                style={{ ...s.submitBtn, opacity: loading ? 0.75 : 1 }}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                    <span style={s.spinner} /> Creating account...
                  </span>
                ) : 'Create Account →'}
              </button>
            </form>

            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>or continue with</span>
              <div style={s.dividerLine} />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div style={s.googleWrap}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed.')}
                  text="signup_with" shape="rectangular"
                  size="large" width="100%" theme="outline"
                />
              </div>
            ) : (
              <div style={s.googleMissing}>
                ⚙️ Add <code>REACT_APP_GOOGLE_CLIENT_ID</code> to enable Google sign-in
              </div>
            )}

            <p style={s.terms}>
              By creating an account, you agree to our{' '}
              <span style={{ color:'#f97316', cursor:'pointer', fontWeight:'600' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color:'#f97316', cursor:'pointer', fontWeight:'600' }}>Privacy Policy</span>
            </p>

            <p style={s.bottomLink}>
              Already have an account?{' '}
              <Link to="/login" style={{ color:'#f97316', fontWeight:'700', textDecoration:'none' }}>
                Sign in →
              </Link>
            </p>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </GoogleOAuthProvider>
  );
}

const s = {
  page: { minHeight:'100vh', display:'flex', flexWrap:'wrap', fontFamily:"'Outfit', sans-serif" },
  left: { width:'42%', background:'linear-gradient(155deg,#0e0618 0%,#1a0a02 60%,#0a1008 100%)', padding:'48px', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' },
  bgDots: { position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' },
  bgGlow1: { position:'absolute', top:'-80px', right:'-80px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(249,115,22,0.06)', filter:'blur(60px)', pointerEvents:'none' },
  bgGlow2: { position:'absolute', bottom:'-60px', left:'-60px', width:'250px', height:'250px', borderRadius:'50%', background:'rgba(139,92,246,0.05)', filter:'blur(50px)', pointerEvents:'none' },
  logoText: { fontFamily:"'Playfair Display', serif", fontSize:'22px', fontWeight:'700', color:'#fff', letterSpacing:'-0.3px', textDecoration:'none', marginBottom:'auto' },
  leftContent: { paddingBottom:'28px' },
  badge: { display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', padding:'5px 14px', borderRadius:'30px', marginBottom:'20px', fontSize:'11px', color:'rgba(74,222,128,0.9)', fontWeight:'600' },
  badgeDot: { width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80' },
  leftTitle: { fontFamily:"'Playfair Display', serif", fontSize:'40px', lineHeight:'1.1', letterSpacing:'-1px', color:'#fff', margin:'0 0 14px' },
  leftSub: { fontSize:'14px', color:'rgba(255,255,255,0.4)', lineHeight:'1.75', marginBottom:'28px', maxWidth:'310px' },
  perks: { display:'flex', flexDirection:'column', gap:'16px' },
  perkItem: { display:'flex', alignItems:'center', gap:'13px' },
  perkIcon: { width:'40px', height:'40px', borderRadius:'11px', background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 },
  perkTitle: { fontSize:'13px', fontWeight:'700', color:'#fff', marginBottom:'1px' },
  perkDesc: { fontSize:'11px', color:'rgba(255,255,255,0.35)' },
  testimonial: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'18px 20px' },
  testimonialStars: { color:'#f97316', fontSize:'14px', marginBottom:'8px', letterSpacing:'2px' },
  testimonialText: { fontSize:'13px', color:'rgba(255,255,255,0.65)', lineHeight:'1.6', margin:'0 0 10px', fontStyle:'italic' },
  testimonialAuthor: { fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'600' },
  right: { flex:1, background:'#faf7f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' },
  card: { width:'100%', maxWidth:'480px' },
  heading: { fontFamily:"'Playfair Display', serif", fontSize:'26px', color:'#1a1207', margin:'0 0 6px', letterSpacing:'-0.5px' },
  subheading: { fontSize:'14px', color:'#9c8b78', marginBottom:'22px' },
  tabs: { display:'flex', background:'#f0ebe4', borderRadius:'14px', padding:'4px', marginBottom:'22px' },
  tab: { flex:1, padding:'11px', textAlign:'center', borderRadius:'11px', fontSize:'14px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' },
  tabActive: { background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', boxShadow:'0 4px 12px rgba(249,115,22,0.3)' },
  tabInactive: { color:'#9c8b78' },
  errorBox: { display:'flex', alignItems:'center', gap:'10px', background:'#fff1f0', border:'1px solid #fca5a5', color:'#dc2626', padding:'12px 16px', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:'500' },
  label: { display:'block', fontSize:'10px', fontWeight:'700', color:'#9c8b78', letterSpacing:'1.5px', marginBottom:'7px', marginTop:'14px' },
  input: { width:'100%', padding:'13px 16px', borderRadius:'12px', border:'1.5px solid #e8e2d9', fontSize:'14px', color:'#1a1207', background:'#fff', fontFamily:"'Outfit', sans-serif", boxSizing:'border-box', outline:'none', transition:'border-color 0.2s, box-shadow 0.2s' },
  eyeBtn: { position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', padding:'0' },
  submitBtn: { width:'100%', padding:'14px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', border:'none', borderRadius:'13px', fontSize:'15px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit', sans-serif", marginTop:'18px', boxShadow:'0 6px 20px rgba(249,115,22,0.35)', letterSpacing:'0.3px' },
  spinner: { width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' },
  divider: { display:'flex', alignItems:'center', gap:'12px', margin:'18px 0' },
  dividerLine: { flex:1, height:'1px', background:'#e8e2d9' },
  dividerText: { fontSize:'11px', color:'#c4b8a8', fontWeight:'600', whiteSpace:'nowrap', letterSpacing:'0.5px' },
  googleWrap: { display:'flex', justifyContent:'center', marginBottom:'4px' },
  googleMissing: { background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', padding:'12px 16px', borderRadius:'12px', fontSize:'12px', textAlign:'center', marginBottom:'4px' },
  terms: { textAlign:'center', fontSize:'12px', color:'#c4b8a8', marginTop:'16px', lineHeight:'1.6' },
  bottomLink: { textAlign:'center', fontSize:'14px', color:'#9c8b78', marginTop:'14px' },
};