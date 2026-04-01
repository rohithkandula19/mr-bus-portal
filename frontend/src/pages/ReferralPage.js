import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
const API = `${process.env.REACT_APP_API_URL}`;
export default function ReferralPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const user = (() => { try { const r = localStorage.getItem("user"); return r ? JSON.parse(r) : null; } catch { return null; } })();
  const token = localStorage.getItem("token");
  useEffect(() => { if (!user || !token) { navigate('/login'); return; } loadData(); }, []); // eslint-disable-line
  const loadData = async () => {
    try {
      const [codeRes, listRes] = await Promise.all([
        fetch(`${API}/referrals/my-code`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/referrals/my-referrals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData(await codeRes.json());
      const listData = await listRes.json();
      setReferrals(Array.isArray(listData) ? listData : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const copyCode = () => { navigator.clipboard.writeText(data?.referral_code || ""); setCopied(true); showToast("✅ Code copied!"); setTimeout(() => setCopied(false), 2000); };
  const copyLink = () => { navigator.clipboard.writeText(data?.referral_link || ""); showToast("✅ Link copied!"); };
  const copyMsg = () => { navigator.clipboard.writeText(data?.share_text || ""); showToast("✅ Message copied!"); };
  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", minHeight:"100vh", background:"#faf7f3" }}>
      {toast && <div style={{ position:"fixed", top:"20px", right:"20px", zIndex:9999, background:"#16a34a", color:"#fff", padding:"12px 20px", borderRadius:"12px", fontSize:"14px", fontWeight:"600" }}>{toast}</div>}
      <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 52px", height:"68px", background:"rgba(8,6,16,0.72)", backdropFilter:"blur(28px)", borderBottom:"1px solid rgba(255,255,255,0.07)", position:"sticky", top:0, zIndex:1000 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:"21px", fontWeight:"700", color:"#fff", textDecoration:"none" }}>MR <em style={{ fontStyle:"italic", color:"#f97316" }}>Bus</em> Portal</Link>
        <div style={{ display:"flex", gap:"2px" }}>
          <Link to="/" style={{ padding:"8px 14px", borderRadius:"10px", fontSize:"13px", fontWeight:"500", color:"rgba(255,255,255,0.55)", textDecoration:"none" }}>Routes</Link>
          <Link to="/my-bookings" style={{ padding:"8px 14px", borderRadius:"10px", fontSize:"13px", fontWeight:"500", color:"rgba(255,255,255,0.55)", textDecoration:"none" }}>Bookings</Link>
          <Link to="/referral" style={{ padding:"8px 14px", borderRadius:"10px", fontSize:"13px", fontWeight:"500", color:"#fb923c", textDecoration:"none" }}>🎁 Referrals</Link>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", padding:"5px 14px 5px 6px", borderRadius:"30px" }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:"#fff" }}>{initials}</div>
            <span style={{ fontSize:"13px", fontWeight:"600", color:"#fff" }}>{user?.name}</span>
          </div>
          <button style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", padding:"8px 16px", borderRadius:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer" }} onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); navigate("/login"); }}>Logout</button>
        </div>
      </nav>
      <div style={{ background:`radial-gradient(ellipse at 20% 50%,rgba(249,115,22,0.15) 0%,transparent 60%),linear-gradient(155deg,#0e0618,#08100f)`, padding:"44px 52px 32px" }}>
        <div style={{ fontSize:"11px", fontWeight:"700", color:"rgba(249,115,22,0.7)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Earn Together</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"34px", color:"#fff", margin:"0 0 6px" }}>Referral Program</h1>
        <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)" }}>Share your code · Earn {data?.referrer_bonus||500} pts per referral · Friend gets {data?.referee_bonus||250} pts</p>
      </div>
      {loading ? <div style={{ textAlign:"center", padding:"80px", color:"#9c8b78" }}>Loading...</div> : (
        <div style={{ maxWidth:"820px", margin:"0 auto", padding:"32px 52px" }}>
          <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:"20px", padding:"24px", marginBottom:"20px" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"20px", color:"#1a1207", margin:"0 0 18px" }}>How it works</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
              {[{ n:"1", icon:"📤", t:"Share your code", d:`Share code ${data?.referral_code} with friends` },{ n:"2", icon:"✅", t:"Friend signs up", d:"They join using your referral code" },{ n:"3", icon:"🏆", t:"Both earn points", d:`You +${data?.referrer_bonus||500}pts · Friend +${data?.referee_bonus||250}pts` }].map((s,i) => (
                <div key={i} style={{ textAlign:"center", padding:"20px 16px", background:"#fff7ed", borderRadius:"16px", border:"1px solid #fed7aa" }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", fontWeight:"900", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>{s.n}</div>
                  <div style={{ fontSize:"22px", marginBottom:"6px" }}>{s.icon}</div>
                  <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1207", marginBottom:"4px" }}>{s.t}</div>
                  <div style={{ fontSize:"11px", color:"#9c8b78", lineHeight:"1.5" }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"linear-gradient(135deg,#1c0e04,#3d1f06)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:"20px", padding:"28px", marginBottom:"20px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:"rgba(255,255,255,0.35)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Your Referral Code</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"44px", color:"#f97316", letterSpacing:"6px", marginBottom:"8px" }}>{data?.referral_code}</div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", marginBottom:"20px" }}>Share this with friends to earn bonus points</div>
            <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
              <button onClick={copyCode} style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", color:"#fff", padding:"10px 18px", borderRadius:"11px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>{copied?"✅ Copied!":"📋 Copy Code"}</button>
              <button onClick={copyLink} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", padding:"10px 18px", borderRadius:"11px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>🔗 Copy Link</button>
              <button onClick={copyMsg} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", padding:"10px 18px", borderRadius:"11px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>💬 Copy Message</button>
            </div>
            <div style={{ marginTop:"16px", background:"rgba(255,255,255,0.05)", borderRadius:"10px", padding:"12px 14px", fontSize:"12px", color:"rgba(255,255,255,0.45)", fontStyle:"italic", lineHeight:"1.6" }}>"{data?.share_text}"</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"20px" }}>
            {[{ icon:"👥", l:"Total Referrals", v:data?.total_referrals||0, c:"#3b82f6" },{ icon:"⏳", l:"Pending", v:data?.pending_referrals||0, c:"#f97316" },{ icon:"🏆", l:"Bonus Earned", v:`${(data?.total_bonus_earned||0).toLocaleString()} pts`, c:"#16a34a" }].map((st,i) => (
              <div key={i} style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:"16px", padding:"18px", display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ width:"40px", height:"40px", borderRadius:"12px", background:st.c+"18", color:st.c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>{st.icon}</div>
                <div>
                  <div style={{ fontSize:"10px", color:"#9c8b78", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"3px" }}>{st.l}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"22px", color:"#1a1207", lineHeight:"1" }}>{st.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:"20px", padding:"24px" }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"20px", color:"#1a1207", margin:"0 0 16px" }}>👥 People You've Referred</h2>
            {referrals.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:"40px", marginBottom:"12px" }}>📤</div>
                <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1207", marginBottom:"6px" }}>No referrals yet</div>
                <div style={{ fontSize:"13px", color:"#9c8b78" }}>Share your code above and start earning!</div>
              </div>
            ) : referrals.map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#faf7f3", borderRadius:"12px", border:"1px solid #f0ebe4", marginBottom:"8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:"800", color:"#fff" }}>{r.referred_name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1207" }}>{r.referred_name}</div>
                    <div style={{ fontSize:"11px", color:"#9c8b78" }}>{r.referred_email} · {r.joined?.split('T')[0]}</div>
                  </div>
                </div>
                <span style={{ fontSize:"12px", fontWeight:"700", padding:"4px 12px", borderRadius:"20px", ...(r.status==="completed"?{ color:"#16a34a", background:"#f0fdf4", border:"1px solid #bbf7d0" }:{ color:"#f97316", background:"#fff7ed", border:"1px solid #fed7aa" }) }}>
                  {r.status==="completed"?`+${r.bonus_points} pts ✅`:"⏳ Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
