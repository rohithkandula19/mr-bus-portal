// frontend/src/pages/CookiesPage.js

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

export default function CookiesPage() {
  const [scrolled, setScrolled] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const savePreferences = () => {
    localStorage.setItem('mr_cookies_accepted', 'true');
    localStorage.setItem('mr_cookie_prefs', JSON.stringify(preferences));
    alert('✅ Cookie preferences saved!');
  };

  const COOKIE_TYPES = [
    {
      type: 'Essential', key: 'essential', icon: '🔒', required: true,
      desc: 'Required for the platform to function. Cannot be disabled.',
      cookies: [
        { name: 'mr_auth_token', purpose: 'Keeps you logged in securely', duration: 'Session / 30 days' },
        { name: 'mr_session', purpose: 'Maintains your booking session', duration: 'Session' },
        { name: 'mr_csrf', purpose: 'Prevents cross-site request forgery', duration: 'Session' },
        { name: 'mr_cookies_accepted', purpose: 'Remembers your cookie consent', duration: '1 year' },
      ]
    },
    {
      type: 'Analytics', key: 'analytics', icon: '📊', required: false,
      desc: 'Help us understand how you use our platform so we can improve it.',
      cookies: [
        { name: 'mr_analytics', purpose: 'Tracks page views and user journeys', duration: '2 years' },
        { name: 'mr_perf', purpose: 'Measures page load performance', duration: '1 year' },
      ]
    },
    {
      type: 'Marketing', key: 'marketing', icon: '📢', required: false,
      desc: 'Used to show you relevant ads and measure campaign effectiveness.',
      cookies: [
        { name: 'mr_ads', purpose: 'Personalized advertising', duration: '90 days' },
        { name: 'mr_referral', purpose: 'Tracks referral source for commissions', duration: '30 days' },
      ]
    },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f7f3ee', fontFamily:"'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');`}</style>

      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'68px', background: scrolled ? 'rgba(8,6,16,0.97)' : 'rgba(8,6,16,0.9)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>MR <em style={{ color:'#f97316', fontStyle:'italic' }}>Bus</em> Portal</Link>
        <div style={{ display:'flex', gap:'16px' }}>
          {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies'],['/refund-policy','Refunds']].map(([to,l]) => (
            <Link key={l} to={to} style={{ fontSize:'12px', color: to==='/cookies' ? '#f97316' : 'rgba(255,255,255,0.35)', textDecoration:'none', fontWeight: to==='/cookies' ? '700' : '400' }}>{l}</Link>
          ))}
        </div>
        <Link to="/" style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', borderRadius:'10px', textDecoration:'none', fontSize:'13px', fontWeight:'700' }}>← Back to App</Link>
      </nav>

      <div style={{ background:'linear-gradient(155deg,#0e0618,#08100f)', padding:'52px 48px 40px', textAlign:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(249,115,22,0.7)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>🍪 Legal</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'42px', color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Cookie Policy</h1>
        <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', margin:0 }}>Last updated: March 17, 2026</p>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 48px 80px', display:'flex', flexDirection:'column', gap:'24px' }}>

        {/* Intro */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 14px' }}>What are cookies?</h2>
          <p style={{ fontSize:'14px', color:'#4a3728', lineHeight:'1.85', margin:0 }}>
            Cookies are small text files stored on your device when you visit a website. They help us remember your preferences, keep you logged in, and understand how you use our platform. We use cookies responsibly and in compliance with GDPR and applicable US privacy laws.
          </p>
        </div>

        {/* Cookie preference manager */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 6px' }}>Manage Your Preferences</h2>
          <p style={{ fontSize:'13px', color:'#9c8b78', margin:'0 0 24px' }}>Choose which cookies you allow. Changes take effect immediately.</p>

          {COOKIE_TYPES.map(ct => (
            <div key={ct.key} style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid #f0ebe4' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'20px' }}>{ct.icon}</span>
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:'700', color:'#1a1207' }}>{ct.type} Cookies</div>
                    <div style={{ fontSize:'12px', color:'#9c8b78' }}>{ct.desc}</div>
                  </div>
                </div>
                {ct.required ? (
                  <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'20px', padding:'4px 14px', fontSize:'12px', fontWeight:'700', color:'#16a34a' }}>Always On</div>
                ) : (
                  <div onClick={() => setPreferences(p => ({ ...p, [ct.key]: !p[ct.key] }))}
                    style={{ width:'48px', height:'26px', borderRadius:'13px', background: preferences[ct.key] ? '#f97316' : '#e8e2d9', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
                    <div style={{ position:'absolute', top:'3px', left: preferences[ct.key] ? '25px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                )}
              </div>

              {/* Cookie table */}
              <div style={{ background:'#faf7f3', borderRadius:'10px', overflow:'hidden', border:'1px solid #e8e2d9' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', padding:'8px 14px', background:'#f0ebe4', gap:'12px' }}>
                  {['Cookie Name', 'Purpose', 'Duration'].map(h => (
                    <div key={h} style={{ fontSize:'10px', fontWeight:'700', color:'#9c8b78', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</div>
                  ))}
                </div>
                {ct.cookies.map((c, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', padding:'10px 14px', gap:'12px', borderTop:'1px solid #e8e2d9' }}>
                    <div style={{ fontSize:'12px', fontFamily:'monospace', color:'#c2410c', fontWeight:'600' }}>{c.name}</div>
                    <div style={{ fontSize:'12px', color:'#6b5744' }}>{c.purpose}</div>
                    <div style={{ fontSize:'11px', color:'#9c8b78', fontWeight:'600' }}>{c.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={savePreferences}
            style={{ padding:'13px 32px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit',sans-serif", boxShadow:'0 4px 16px rgba(249,115,22,0.35)' }}>
            Save Cookie Preferences →
          </button>
        </div>

        {/* How to control */}
        <div style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 14px' }}>Browser Controls</h2>
          <p style={{ fontSize:'14px', color:'#4a3728', lineHeight:'1.85', marginBottom:'14px' }}>
            You can also control cookies through your browser settings. Note that disabling essential cookies may prevent some features from working correctly.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
            {[['Chrome','chrome://settings/cookies'],['Firefox','firefox: Preferences → Privacy'],['Safari','Preferences → Privacy → Cookies']].map(([b,s],i) => (
              <div key={i} style={{ background:'#faf7f3', borderRadius:'10px', padding:'14px', border:'1px solid #e8e2d9' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#1a1207', marginBottom:'4px' }}>{b}</div>
                <div style={{ fontSize:'11px', color:'#9c8b78' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(249,115,22,0.2)' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#c2410c', marginBottom:'14px' }}>📋 Related Documents</div>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {[['/terms','📄 Terms'],['/privacy','🔒 Privacy'],['/refund-policy','💰 Refunds'],['/contact','💬 Contact']].map(([to,l]) => (
              <Link key={l} to={to} style={{ padding:'8px 16px', background:'#fff', border:'1px solid rgba(249,115,22,0.3)', borderRadius:'10px', fontSize:'13px', fontWeight:'600', color:'#c2410c', textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
