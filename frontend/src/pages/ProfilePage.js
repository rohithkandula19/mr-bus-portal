import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const TIER_CONFIG = {
  Bronze:   { emoji: '🥉', color: '#cd7f32', next: 500,   nextName: 'Silver',   bg: 'rgba(205,127,50,0.12)',   border: 'rgba(205,127,50,0.25)' },
  Silver:   { emoji: '🥈', color: '#c0c0c0', next: 1500,  nextName: 'Gold',     bg: 'rgba(192,192,192,0.1)',   border: 'rgba(192,192,192,0.2)' },
  Gold:     { emoji: '🥇', color: '#ffd700', next: 5000,  nextName: 'Platinum', bg: 'rgba(255,215,0,0.1)',     border: 'rgba(255,215,0,0.25)' },
  Platinum: { emoji: '💎', color: '#e5e4e2', next: 99999, nextName: 'Max',      bg: 'rgba(229,228,226,0.08)',  border: 'rgba(229,228,226,0.15)' },
};

// Animated input component
function Field({ label, value, onChange, type = 'text', hint, readOnly, icon }) {
  const [focused, setFocused] = useState(false);
  const [changed, setChanged] = useState(false);

  const handleChange = (e) => {
    onChange(e.target.value);
    setChanged(true);
    setTimeout(() => setChanged(false), 1500);
  };

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
        {icon && <span style={{ fontSize: '12px' }}>{icon}</span>}
        <label style={{ fontSize: '10px', fontWeight: '700', color: focused ? '#f97316' : 'rgba(255,255,255,0.28)', letterSpacing: '1.5px', textTransform: 'uppercase', transition: 'color 0.2s' }}>{label}</label>
        {changed && <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700', animation: 'fadeIn 0.3s ease', marginLeft: 'auto' }}>✓ Updated</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          style={{
            width: '100%', padding: '13px 16px',
            background: focused ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${focused ? 'rgba(249,115,22,0.45)' : changed ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '12px', fontSize: '14px', color: readOnly ? 'rgba(255,255,255,0.3)' : '#fff',
            boxSizing: 'border-box', outline: 'none',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s ease',
            cursor: readOnly ? 'not-allowed' : 'text',
          }}
        />
        {focused && !readOnly && (
          <div style={{ position: 'absolute', bottom: '-1px', left: '12px', right: '12px', height: '2px', background: 'linear-gradient(90deg,#f97316,#fbbf24)', borderRadius: '0 0 4px 4px', animation: 'slideIn 0.2s ease' }} />
        )}
      </div>
      {hint && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '5px' }}>{hint}</div>}
    </div>
  );
}

// Toggle switch
function Toggle({ value, onChange, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', marginBottom: '10px' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '3px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
      </div>
      <div onClick={() => onChange(!value)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: value ? '#f97316' : 'rgba(255,255,255,0.1)', border: `1px solid ${value ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.12)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.25s ease', flexShrink: 0, boxShadow: value ? '0 0 12px rgba(249,115,22,0.3)' : 'none' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: value ? '22px' : '2px', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getUserFromStorage();
  const avatarRef = useRef(null);

  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('profile');
  const [saving, setSaving]           = useState(false);
  const [saveState, setSaveState]     = useState('idle'); // idle | saving | success | error
  const [errorMsg, setErrorMsg]       = useState('');
  const [avatarColor, setAvatarColor] = useState('#f97316');
  const [avatarEmoji, setAvatarEmoji] = useState(null);

  const [editName, setEditName]   = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio]     = useState('');

  const [curPwd, setCurPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);

  const [notifBooking, setNotifBooking]   = useState(true);
  const [notifPromo, setNotifPromo]       = useState(false);
  const [notifLoyalty, setNotifLoyalty]   = useState(true);
  const [notifReminder, setNotifReminder] = useState(true);

  const token = localStorage.getItem('token');

  const AVATAR_COLORS = ['#f97316','#8b5cf6','#06b6d4','#10b981','#f43f5e','#fbbf24','#3b82f6','#ec4899'];
  const AVATAR_EMOJIS = ['🚌','🌟','🎯','🚀','⚡','🎸','🏆','🌊'];

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProfile();
  }, []); // eslint-disable-line

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || '');
      setEditEmail(data.email || '');
      setEditBio(data.bio || '');
    } catch (e) {
      // Use user data from localStorage if API fails
      setProfile({ name: user.name, email: user.email, stats: null });
      setEditName(user.name || '');
      setEditEmail(user.email || '');
    } finally { setLoading(false); }
  };

  const calcPwdStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setPwdStrength(score);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setErrorMsg('Name cannot be empty'); return; }
    setSaveState('saving');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/profile/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        const stored = getUserFromStorage();
        if (stored) { stored.name = data.name; stored.email = data.email; localStorage.setItem('user', JSON.stringify(stored)); }
        setProfile(prev => ({ ...prev, name: data.name, email: data.email }));
        setSaveState('success');
        setTimeout(() => setSaveState('idle'), 2500);
      } else {
        setErrorMsg(data.detail || 'Update failed');
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2000);
    }
  };

  const handleChangePassword = async () => {
    if (!curPwd || !newPwd || !confPwd) { setErrorMsg('Fill in all fields'); return; }
    if (newPwd !== confPwd) { setErrorMsg("Passwords don't match"); return; }
    if (newPwd.length < 6) { setErrorMsg('Min 6 characters'); return; }
    setSaveState('saving');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/profile/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPwd, new_password: newPwd })
      });
      if (res.ok) {
        setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdStrength(0);
        setSaveState('success');
        setTimeout(() => setSaveState('idle'), 2500);
      } else {
        const d = await res.json();
        setErrorMsg(d.detail || 'Failed');
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    } catch { setSaveState('error'); setTimeout(() => setSaveState('idle'), 2000); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  const tier    = profile?.stats?.loyalty_tier || 'Bronze';
  const tierCfg = TIER_CONFIG[tier];
  const pts     = profile?.stats?.loyalty_points || 0;
  const earned  = profile?.stats?.total_earned || 0;
  const pct     = Math.min(100, (earned / tierCfg.next) * 100);
  const initials = (editName || user?.name || '?')[0].toUpperCase();

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['', '#ef4444', '#f97316', '#fbbf24', '#4ade80', '#22c55e'];

  const saveBtn = {
    idle:    { bg: 'linear-gradient(135deg,#f97316,#ea580c)', text: 'Save Changes', icon: '💾' },
    saving:  { bg: 'rgba(249,115,22,0.3)',                    text: 'Saving...',    icon: '⏳' },
    success: { bg: 'linear-gradient(135deg,#4ade80,#16a34a)', text: 'Saved!',       icon: '✓' },
    error:   { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', text: 'Failed',       icon: '✕' },
  }[saveState];

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        *{box-sizing:border-box;}
        input::placeholder{color:rgba(255,255,255,0.18)!important;}
        textarea::placeholder{color:rgba(255,255,255,0.18)!important;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes successPop{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
      `}</style>

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'64px', background:'rgba(8,8,16,0.9)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'fixed', top:0, left:0, right:0, zIndex:1000 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>
          MR <em style={{ fontStyle:'italic', color:'#f97316' }}>Bus</em> Portal
        </Link>
        <div style={{ display:'flex', gap:'2px' }}>
          {[['/', '🔍 Routes'], ['/my-bookings','📋 Bookings'], ['/my-bookings','🏆 Rewards']].map(([to,label]) => (
            <Link key={label} to={to} style={{ padding:'7px 13px', borderRadius:'10px', fontSize:'13px', fontWeight:'500', color:'rgba(255,255,255,0.45)', textDecoration:'none' }}>{label}</Link>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', padding:'5px 14px 5px 6px', borderRadius:'30px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`linear-gradient(135deg,${avatarColor},${avatarColor}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#fff' }}>
              {avatarEmoji || initials}
            </div>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{editName || user.name}</span>
          </div>
          <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', padding:'8px 16px', borderRadius:'10px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>Logout</button>
        </div>
      </nav>

      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', minHeight:'100vh', paddingTop:'64px' }}>

        {/* ── LEFT: LIVE PROFILE CARD ──────────────────────────── */}
        <div style={{ background:'rgba(255,255,255,0.015)', borderRight:'1px solid rgba(255,255,255,0.05)', padding:'32px 24px', position:'sticky', top:'64px', height:'calc(100vh - 64px)', overflowY:'auto' }}>

          {/* Avatar */}
          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <div style={{ position:'relative', display:'inline-block' }}>
              <div style={{ width:'96px', height:'96px', borderRadius:'50%', background:`linear-gradient(135deg,${avatarColor},${avatarColor}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: avatarEmoji ? '42px' : '36px', fontWeight:'900', color:'#fff', margin:'0 auto', boxShadow:`0 12px 36px ${avatarColor}44`, border:`3px solid ${avatarColor}44`, transition:'all 0.3s ease' }}>
                {avatarEmoji || initials}
              </div>
              {/* Edit overlay */}
              <div style={{ position:'absolute', bottom:'2px', right:'2px', width:'28px', height:'28px', borderRadius:'50%', background:'#f97316', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid #080810', fontSize:'13px' }}
                onClick={() => avatarRef.current?.click()}>✏️</div>
            </div>

            {/* Color picker */}
            <div style={{ display:'flex', gap:'6px', justifyContent:'center', marginTop:'14px', flexWrap:'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <div key={c} onClick={() => { setAvatarColor(c); setAvatarEmoji(null); }}
                  style={{ width:'20px', height:'20px', borderRadius:'50%', background:c, cursor:'pointer', border:`2px solid ${avatarColor===c&&!avatarEmoji?'#fff':'transparent'}`, transition:'all 0.15s', transform:avatarColor===c&&!avatarEmoji?'scale(1.2)':'scale(1)' }} />
              ))}
            </div>
            {/* Emoji picker */}
            <div style={{ display:'flex', gap:'5px', justifyContent:'center', marginTop:'8px', flexWrap:'wrap' }}>
              {AVATAR_EMOJIS.map(e => (
                <div key={e} onClick={() => setAvatarEmoji(avatarEmoji===e?null:e)}
                  style={{ fontSize:'18px', cursor:'pointer', padding:'3px', borderRadius:'8px', background:avatarEmoji===e?'rgba(249,115,22,0.15)':'transparent', border:`1px solid ${avatarEmoji===e?'rgba(249,115,22,0.3)':'transparent'}`, transition:'all 0.15s' }}>{e}</div>
              ))}
            </div>

            {/* Name + email live preview */}
            <div style={{ marginTop:'16px' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#fff', letterSpacing:'-0.3px', transition:'all 0.2s' }}>{editName || '—'}</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>{editEmail || '—'}</div>
              {editBio && <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'8px', fontStyle:'italic', lineHeight:'1.5', padding:'0 8px' }}>"{editBio}"</div>}
            </div>
          </div>

          {/* Tier badge */}
          <div style={{ background:tierCfg.bg, border:`1px solid ${tierCfg.border}`, borderRadius:'14px', padding:'14px 16px', marginBottom:'16px', textAlign:'center' }}>
            <div style={{ fontSize:'28px', marginBottom:'4px' }}>{tierCfg.emoji}</div>
            <div style={{ fontSize:'14px', fontWeight:'800', color:tierCfg.color }}>{tier} Member</div>
            {tierCfg.next < 99999 && (
              <>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'4px' }}>{Math.max(0,tierCfg.next-earned).toLocaleString()} pts to {tierCfg.nextName}</div>
                <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'10px', overflow:'hidden', margin:'8px 0 0' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${tierCfg.color},${tierCfg.color}88)`, borderRadius:'10px', transition:'width 0.6s ease' }} />
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
            {[
              { label:'Trips', value: profile?.stats?.total_bookings ?? '—', icon:'🚌' },
              { label:'Spent', value: profile?.stats?.total_spent ? `$${profile.stats.total_spent}` : '—', icon:'💰' },
              { label:'Points', value: pts.toLocaleString(), icon:'⭐' },
              { label:'Value', value: `$${(pts/100).toFixed(2)}`, icon:'🎁' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'16px', marginBottom:'3px' }}>{s.icon}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'18px', color:'#fff', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'1px', marginTop:'3px', fontWeight:'700' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Member since */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px 14px', fontSize:'12px', color:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'16px' }}>📅</span>
            Member since {profile?.member_since ? new Date(profile.member_since).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}
          </div>
        </div>

        {/* ── RIGHT: EDIT PANEL ────────────────────────────────── */}
        <div style={{ padding:'36px 48px', overflowY:'auto' }}>

          {/* Page title */}
          <div style={{ marginBottom:'32px' }}>
            <div style={{ fontSize:'10px', fontWeight:'700', color:'rgba(255,255,255,0.2)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'8px' }}>Account Settings</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:'#fff', margin:'0', letterSpacing:'-0.5px' }}>Your Profile</h1>
          </div>

          {/* Alert */}
          {errorMsg && (
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', padding:'12px 16px', borderRadius:'12px', marginBottom:'20px', fontSize:'13px', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px' }}>
              ❌ {errorMsg}
              <button onClick={() => setErrorMsg('')} style={{ marginLeft:'auto', background:'none', border:'none', color:'rgba(248,113,113,0.5)', cursor:'pointer', fontSize:'16px' }}>✕</button>
            </div>
          )}

          {/* Tab pills */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'32px', background:'rgba(255,255,255,0.03)', padding:'5px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.05)', width:'fit-content' }}>
            {[
              { id:'profile', label:'Profile', icon:'👤' },
              { id:'password', label:'Password', icon:'🔒' },
              { id:'notifications', label:'Alerts', icon:'🔔' },
              { id:'danger', label:'Danger', icon:'⚠️' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding:'9px 18px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'700', fontSize:'12px', fontFamily:"'Outfit',sans-serif", transition:'all 0.2s', background: activeTab===tab.id ? 'rgba(249,115,22,0.15)' : 'transparent', color: activeTab===tab.id ? '#f97316' : 'rgba(255,255,255,0.35)', outline: activeTab===tab.id ? '1px solid rgba(249,115,22,0.3)' : 'none' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div style={{ animation:'fadeIn 0.25s ease' }}>
              <Field label="Full Name" value={editName} onChange={setEditName} icon="✏️" />
              <Field label="Email Address" value={editEmail} onChange={setEditEmail} type="email" icon="📧" hint="Changing email requires re-login next session." />

              {/* Bio */}
              <div style={{ marginBottom:'28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'7px' }}>
                  <span style={{ fontSize:'12px' }}>💬</span>
                  <label style={{ fontSize:'10px', fontWeight:'700', color:'rgba(255,255,255,0.28)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Bio <span style={{ color:'rgba(255,255,255,0.12)', fontWeight:'400' }}>(optional)</span></label>
                </div>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  maxLength={120}
                  placeholder="A short bio about yourself..."
                  rows={3}
                  style={{ width:'100%', padding:'13px 16px', background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:'12px', fontSize:'14px', color:'#fff', boxSizing:'border-box', outline:'none', fontFamily:"'Outfit',sans-serif", resize:'none', lineHeight:'1.6' }}
                />
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)', textAlign:'right', marginTop:'3px' }}>{editBio.length}/120</div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={saveState !== 'idle'}
                style={{
                  padding:'14px 32px', background:saveBtn.bg, border:'none', color:'#fff',
                  borderRadius:'13px', fontSize:'14px', fontWeight:'800', cursor: saveState!=='idle'?'not-allowed':'pointer',
                  fontFamily:"'Outfit',sans-serif", boxShadow: saveState==='success'?'0 4px 20px rgba(74,222,128,0.35)':'0 4px 20px rgba(249,115,22,0.3)',
                  transition:'all 0.3s ease', letterSpacing:'-0.2px', minWidth:'160px',
                  animation: saveState==='success'?'successPop 0.4s ease':'none',
                }}>
                {saveState === 'saving' ? (
                  <span style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center' }}>
                    <span style={{ display:'inline-block', width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    Saving...
                  </span>
                ) : `${saveBtn.icon} ${saveBtn.text}`}
              </button>
            </div>
          )}

          {/* ── PASSWORD TAB ── */}
          {activeTab === 'password' && (
            <div style={{ animation:'fadeIn 0.25s ease', maxWidth:'480px' }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'24px', marginBottom:'24px' }}>
                <Field label="Current Password" value={curPwd} onChange={setCurPwd} type={showPwd?'text':'password'} icon="🔑" />

                <Field label="New Password" value={newPwd} onChange={v => { setNewPwd(v); calcPwdStrength(v); }} type={showPwd?'text':'password'} icon="🔒" />

                {/* Password strength */}
                {newPwd && (
                  <div style={{ marginBottom:'18px', marginTop:'-10px' }}>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'5px' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex:1, height:'3px', borderRadius:'10px', background: i<=pwdStrength ? strengthColors[pwdStrength] : 'rgba(255,255,255,0.06)', transition:'all 0.3s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize:'11px', color:strengthColors[pwdStrength], fontWeight:'600' }}>{strengthLabels[pwdStrength]}</div>
                  </div>
                )}

                <Field label="Confirm New Password" value={confPwd} onChange={setConfPwd} type={showPwd?'text':'password'} icon={confPwd&&confPwd===newPwd?'✅':'🔒'}
                  hint={confPwd && confPwd!==newPwd ? "❌ Passwords don't match" : confPwd && confPwd===newPwd ? "✅ Passwords match" : ''} />

                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px' }}>
                  <div onClick={() => setShowPwd(p=>!p)} style={{ width:'18px', height:'18px', borderRadius:'4px', border:`1.5px solid ${showPwd?'#f97316':'rgba(255,255,255,0.15)'}`, background:showPwd?'rgba(249,115,22,0.15)':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', transition:'all 0.15s' }}>
                    {showPwd && '✓'}
                  </div>
                  <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', cursor:'pointer' }} onClick={() => setShowPwd(p=>!p)}>Show passwords</span>
                </div>

                <button onClick={handleChangePassword} disabled={saveState!=='idle'} style={{ padding:'13px 28px', background:saveBtn.bg, border:'none', color:'#fff', borderRadius:'12px', fontSize:'13px', fontWeight:'800', cursor:saveState!=='idle'?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif", minWidth:'160px', transition:'all 0.3s' }}>
                  {saveState==='saving'?'Changing...':saveState==='success'?'✓ Changed!':'🔒 Change Password'}
                </button>
              </div>

              {/* Tips */}
              <div style={{ background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.1)', borderRadius:'14px', padding:'16px 18px' }}>
                <div style={{ fontSize:'12px', fontWeight:'700', color:'rgba(249,115,22,0.6)', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px' }}>💡 Strong Password Tips</div>
                {['At least 8 characters','Mix uppercase & lowercase letters','Include numbers and symbols','Avoid common words or birthdays'].map((tip,i) => (
                  <div key={i} style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', display:'flex', gap:'8px', marginBottom:'5px' }}>
                    <span style={{ color:'rgba(249,115,22,0.4)' }}>→</span> {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div style={{ animation:'fadeIn 0.25s ease', maxWidth:'520px' }}>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', marginBottom:'20px', lineHeight:'1.7' }}>
                Choose which email notifications you want to receive. These are sent to <strong style={{ color:'rgba(255,255,255,0.5)' }}>{editEmail}</strong>
              </div>
              <Toggle value={notifBooking} onChange={setNotifBooking} label="Booking Confirmations" desc="Receipt email immediately after booking" />
              <Toggle value={notifReminder} onChange={setNotifReminder} label="Departure Reminders" desc="24 hours before your bus departs" />
              <Toggle value={notifLoyalty} onChange={setNotifLoyalty} label="Loyalty Milestones" desc="When you reach Bronze → Silver → Gold → Platinum" />
              <Toggle value={notifPromo} onChange={setNotifPromo} label="Price Drop Alerts" desc="When prices drop on your saved routes" />

              <button onClick={() => { setSaveState('success'); setTimeout(() => setSaveState('idle'), 2000); }} style={{ marginTop:'20px', padding:'13px 28px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', color:'#fff', borderRadius:'12px', fontSize:'13px', fontWeight:'800', cursor:'pointer', fontFamily:"'Outfit',sans-serif", boxShadow:'0 4px 16px rgba(249,115,22,0.3)', transition:'all 0.3s' }}>
                {saveState==='success'?'✓ Saved!':'💾 Save Preferences'}
              </button>
            </div>
          )}

          {/* ── DANGER TAB ── */}
          {activeTab === 'danger' && (
            <div style={{ animation:'fadeIn 0.25s ease', maxWidth:'520px' }}>
              {/* Sign out */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'22px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'4px' }}>Sign Out</div>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Sign out from this device</div>
                </div>
                <button onClick={handleLogout} style={{ padding:'10px 20px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'13px', fontFamily:"'Outfit',sans-serif" }}>
                  🚪 Sign Out
                </button>
              </div>

              {/* Download data */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'22px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'700', color:'#fff', marginBottom:'4px' }}>Download My Data</div>
                  <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>Get a copy of your bookings and account data</div>
                </div>
                <button onClick={() => navigate('/my-bookings')} style={{ padding:'10px 20px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'13px', fontFamily:"'Outfit',sans-serif" }}>
                  📥 Export
                </button>
              </div>

              {/* Delete account */}
              <div style={{ background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'16px', padding:'22px' }}>
                <div style={{ fontSize:'15px', fontWeight:'700', color:'#ef4444', marginBottom:'6px' }}>🗑️ Delete Account</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)', lineHeight:'1.7', marginBottom:'18px' }}>
                  Permanently delete your account and all data — bookings, points, reviews. <strong style={{ color:'rgba(255,100,100,0.7)' }}>This cannot be undone.</strong>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete account? This cannot be undone.')) return;
                    if (!window.confirm('Final confirmation — all data will be deleted.')) return;
                    try {
                      const res = await fetch(`${process.env.REACT_APP_API_URL}/profile/delete-account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                      if (res.ok) { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); }
                    } catch {}
                  }}
                  style={{ padding:'11px 22px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#ef4444', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'13px', fontFamily:"'Outfit',sans-serif" }}>
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}