import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(d => d)) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (otpValue) => {
    const code = otpValue || otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/verify-otp`, { email, otp: code });
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { verified: true } }), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true); setError('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/resend-otp`, { email });
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally { setResending(false); }
  };

  if (success) {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={{ fontSize:"64px", marginBottom:"20px" }}>🎉</div>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:"28px", color:"#1a1207", margin:"0 0 10px" }}>Email Verified!</h2>
          <p style={{ fontSize:"15px", color:"#9c8b78" }}>Redirecting you to sign in...</p>
          <div style={{ marginTop:"20px", width:"200px", height:"4px", background:"#f0ebe4", borderRadius:"10px", overflow:"hidden", margin:"24px auto 0" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg,#f97316,#ea580c)", borderRadius:"10px", animation:"fillBar 2s linear forwards" }} />
          </div>
        </div>
        <style>{`@keyframes fillBar { from { width: 0%; } to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.bgDots} />
        <div style={s.bgGlow} />
        <a href="/" style={s.logo}>MR <em style={{ fontStyle:'italic', color:'#f97316' }}>Bus</em> Portal</a>
        <div style={s.leftContent}>
          <div style={{ fontSize:"56px", marginBottom:"20px" }}>📧</div>
          <h2 style={s.leftTitle}>Check your<br /><em style={{ fontStyle:'italic', color:'#f97316' }}>inbox.</em></h2>
          <p style={s.leftSub}>We sent a 6-digit verification code to:</p>
          <div style={s.emailBadge}>{email || 'your email address'}</div>
          <div style={s.tips}>
            {[
              { icon:"⏱️", text:"Code expires in 10 minutes" },
              { icon:"📬", text:"Check your spam folder too" },
              { icon:"🔒", text:"Never share this code with anyone" },
            ].map((tip, i) => (
              <div key={i} style={s.tipItem}>
                <span style={{ fontSize:"16px" }}>{tip.icon}</span>
                <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.5)" }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <div style={{ textAlign:"center", marginBottom:"32px" }}>
            <div style={{ width:"64px", height:"64px", borderRadius:"20px", background:"linear-gradient(135deg,#fff7ed,#fef3e2)", border:"1.5px solid #fed7aa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", margin:"0 auto 16px" }}>🔐</div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:"26px", color:"#1a1207", margin:"0 0 8px", letterSpacing:"-0.5px" }}>Enter verification code</h1>
            <p style={{ fontSize:"14px", color:"#9c8b78", margin:0 }}>
              Enter the 6-digit code we sent to<br />
              <strong style={{ color:"#f97316" }}>{email}</strong>
            </p>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* OTP input boxes */}
          <div style={{ display:"flex", gap:"10px", justifyContent:"center", marginBottom:"28px" }} onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                style={{
                  width:"52px", height:"60px",
                  textAlign:"center", fontSize:"24px", fontWeight:"800",
                  borderRadius:"14px", border:`2px solid ${digit ? '#f97316' : '#e8e2d9'}`,
                  background: digit ? '#fff7ed' : '#fff',
                  color:"#1a1207", fontFamily:"'Outfit', sans-serif",
                  outline:"none", transition:"all 0.2s",
                  boxShadow: digit ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
                  cursor:"text",
                }}
              />
            ))}
          </div>

          {/* Progress dots */}
          <div style={{ display:"flex", gap:"6px", justifyContent:"center", marginBottom:"24px" }}>
            {otp.map((digit, i) => (
              <div key={i} style={{ width:"8px", height:"8px", borderRadius:"50%", background: digit ? "#f97316" : "#e8e2d9", transition:"background 0.2s" }} />
            ))}
          </div>

          <button
            style={{ width:"100%", padding:"14px", background: otp.every(d=>d) ? "linear-gradient(135deg,#f97316,#ea580c)" : "#f0ebe4", border:"none", borderRadius:"13px", fontSize:"15px", fontWeight:"700", cursor: otp.every(d=>d) ? "pointer" : "not-allowed", color: otp.every(d=>d) ? "#fff" : "#9c8b78", fontFamily:"'Outfit', sans-serif", transition:"all 0.2s", boxShadow: otp.every(d=>d) ? "0 6px 20px rgba(249,115,22,0.35)" : "none", opacity: loading ? 0.7 : 1 }}
            onClick={() => handleSubmit()}
            disabled={loading || !otp.every(d=>d)}>
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                <span style={{ width:"14px", height:"14px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                Verifying...
              </span>
            ) : 'Verify Email →'}
          </button>

          <div style={{ textAlign:"center", marginTop:"20px" }}>
            <p style={{ fontSize:"13px", color:"#9c8b78", marginBottom:"8px" }}>Didn't receive the code?</p>
            <button
              style={{ background:"none", border:"none", color: resendCooldown > 0 ? "#c4b8a8" : "#f97316", fontWeight:"700", fontSize:"14px", cursor: resendCooldown > 0 ? "not-allowed" : "pointer", fontFamily:"'Outfit', sans-serif" }}
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}>
              {resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code →"}
            </button>
          </div>

          <div style={{ textAlign:"center", marginTop:"16px" }}>
            <a href="/signup" style={{ fontSize:"13px", color:"#c4b8a8", textDecoration:"none" }}>← Back to sign up</a>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  page: { minHeight:"100vh", display:"flex", fontFamily:"'Outfit', sans-serif" },
  left: { width:"42%", background:"linear-gradient(155deg,#0e0618 0%,#1a0a02 60%,#0a1008 100%)", padding:"48px", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" },
  bgDots: { position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize:"28px 28px", pointerEvents:"none" },
  bgGlow: { position:"absolute", top:"-80px", right:"-80px", width:"300px", height:"300px", borderRadius:"50%", background:"rgba(249,115,22,0.06)", filter:"blur(60px)", pointerEvents:"none" },
  logo: { fontFamily:"'Playfair Display', serif", fontSize:"22px", fontWeight:"700", color:"#fff", letterSpacing:"-0.3px", textDecoration:"none", marginBottom:"auto" },
  leftContent: { paddingBottom:"40px" },
  leftTitle: { fontFamily:"'Playfair Display', serif", fontSize:"42px", lineHeight:"1.1", letterSpacing:"-1px", color:"#fff", margin:"0 0 14px" },
  leftSub: { fontSize:"14px", color:"rgba(255,255,255,0.45)", lineHeight:"1.7", marginBottom:"16px" },
  emailBadge: { background:"rgba(249,115,22,0.12)", border:"1px solid rgba(249,115,22,0.25)", color:"#fb923c", padding:"10px 16px", borderRadius:"12px", fontSize:"14px", fontWeight:"700", marginBottom:"28px", wordBreak:"break-all" },
  tips: { display:"flex", flexDirection:"column", gap:"14px" },
  tipItem: { display:"flex", alignItems:"center", gap:"10px" },
  right: { flex:1, background:"#faf7f3", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px" },
  card: { width:"100%", maxWidth:"460px" },
  successCard: { margin:"auto", textAlign:"center", padding:"60px 40px", background:"#fff", borderRadius:"24px", maxWidth:"400px", boxShadow:"0 20px 60px rgba(0,0,0,0.1)" },
  errorBox: { display:"flex", alignItems:"center", gap:"10px", background:"#fff1f0", border:"1px solid #fca5a5", color:"#dc2626", padding:"12px 16px", borderRadius:"12px", marginBottom:"20px", fontSize:"13px", fontWeight:"500" },
};