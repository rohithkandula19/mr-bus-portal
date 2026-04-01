// frontend/src/components/Footer.js
// Shared footer component — add to any page with <Footer />

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [cookieBanner, setCookieBanner] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('mr_cookies_accepted');
    if (!accepted) setCookieBanner(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('mr_cookies_accepted', 'true');
    setCookieBanner(false);
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      {cookieBanner && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:9999, background:'#1a1207', borderTop:'1px solid rgba(249,115,22,0.3)', padding:'16px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px', flexWrap:'wrap', boxShadow:'0 -8px 32px rgba(0,0,0,0.4)', fontFamily:"'Outfit',sans-serif" }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <span style={{ fontSize:'24px' }}>🍪</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', marginBottom:'3px' }}>We use cookies to improve your experience</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)' }}>
                We use essential cookies for login and optional analytics cookies. See our{' '}
                <Link to="/cookies" style={{ color:'#f97316', textDecoration:'none', fontWeight:'600' }}>Cookie Policy</Link> for details.
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', flexShrink:0 }}>
            <button onClick={() => setCookieBanner(false)}
              style={{ padding:'9px 20px', background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'10px', color:'rgba(255,255,255,0.5)', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
              Essential Only
            </button>
            <button onClick={acceptCookies}
              style={{ padding:'9px 20px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit',sans-serif", boxShadow:'0 4px 12px rgba(249,115,22,0.35)' }}>
              Accept All Cookies
            </button>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <footer style={{ background:'#080610', borderTop:'1px solid rgba(255,255,255,0.06)', fontFamily:"'Outfit',sans-serif", paddingBottom: cookieBanner ? '80px' : '0' }}>

        {/* Top section */}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'60px 48px 40px', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'48px' }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', fontWeight:'700', color:'#fff', marginBottom:'14px' }}>
              MR <em style={{ fontStyle:'italic', color:'#f97316' }}>Bus</em> Portal
            </div>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', lineHeight:'1.8', marginBottom:'20px', maxWidth:'280px' }}>
              America's smartest bus booking platform. Find routes, earn loyalty points, and let AI handle the rest.
            </p>
            {/* Contact */}
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {[
                { icon:'📧', text:'noreplymrbuses@gmail.com' },
                { icon:'📱', text:'+1 (800) MR-BUSES' },
                { icon:'📍', text:'123 Transit Ave, Chicago, IL 60601' },
              ].map((c, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'13px' }}>{c.icon}</span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>{c.text}</span>
                </div>
              ))}
            </div>
            {/* Socials */}
            <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
              {[
                { icon:'𝕏', label:'Twitter/X', url:'https://twitter.com' },
                { icon:'in', label:'LinkedIn', url:'https://linkedin.com' },
                { icon:'f', label:'Facebook', url:'https://facebook.com' },
                { icon:'▶', label:'YouTube', url:'https://youtube.com' },
              ].map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer"
                  style={{ width:'34px', height:'34px', borderRadius:'10px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'rgba(255,255,255,0.5)', textDecoration:'none', transition:'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(249,115,22,0.2)'; e.currentTarget.style.color='#f97316'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'18px' }}>Product</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                ['/', 'Search Routes'],
                ['/my-bookings', 'My Bookings'],
                ['/subscription', 'Bus Pass Plans'],
                ['/transactions', 'Transactions'],
                ['/referral', 'Refer a Friend'],
                ['/reviews', 'Reviews'],
                ['/verify-ticket', 'Verify Ticket'],
              ].map(([to, label]) => (
                <Link key={label} to={to} style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f97316'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.45)'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support Links */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'18px' }}>Support</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                ['/contact', 'Help Center'],
                ['/contact', 'Submit a Ticket'],
                ['/contact', 'Report an Issue'],
                ['/refund-policy', 'Refund Policy'],
                ['/contact', 'Track Your Ticket'],
              ].map(([to, label], i) => (
                <Link key={i} to={to} style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f97316'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.45)'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'18px' }}>Legal</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                ['/terms', 'Terms of Service'],
                ['/privacy', 'Privacy Policy'],
                ['/cookies', 'Cookie Policy'],
                ['/refund-policy', 'Refund Policy'],
              ].map(([to, label]) => (
                <Link key={label} to={to} style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#f97316'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.45)'}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Trust badges */}
            <div style={{ marginTop:'24px' }}>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'12px' }}>Trusted & Secure</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {['🔒 256-bit SSL Encrypted', '✅ PCI DSS Compliant', '🛡️ GDPR Compliant'].map((b, i) => (
                  <div key={i} style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:'6px' }}>{b}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ height:'1px', background:'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Bottom bar */}
        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'20px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)' }}>
            © 2026 Rohith Kandula · MR Bus Portal · All rights reserved. 
          </div>
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
            {[
              ['/terms', 'Terms'],
              ['/privacy', 'Privacy'],
              ['/cookies', 'Cookies'],
              ['/refund-policy', 'Refunds'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <Link key={label} to={to} style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', textDecoration:'none' }}
                onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>
            🇺🇸 English (US) · $ USD
          </div>
        </div>
      </footer>
    </>
  );
}
