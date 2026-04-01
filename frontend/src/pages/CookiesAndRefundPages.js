// frontend/src/pages/CookiesPage.js

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

export function CookiesPage() {
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


// ─── REFUND POLICY PAGE ────────────────────────────────────────────────────────

export function RefundPolicyPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const SCENARIOS = [
    { icon:'✅', title:'Full Refund', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', conditions:['Cancel within 24 hours of booking','Bus cancelled by MR Bus Portal','Bus delayed more than 3 hours','Service not as described'] },
    { icon:'⚠️', title:'Partial Refund (75%)', color:'#f97316', bg:'#fff7ed', border:'#fed7aa', conditions:['Cancel more than 24 hours after booking','Cancel more than 2 hours before departure','Passenger misses bus due to late arrival'] },
    { icon:'❌', title:'No Refund', color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', conditions:['No-show without prior cancellation','Cancel less than 2 hours before departure','Banned account due to Terms violation','Fraudulent booking detected'] },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f7f3ee', fontFamily:"'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');`}</style>

      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'68px', background: scrolled ? 'rgba(8,6,16,0.97)' : 'rgba(8,6,16,0.9)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>MR <em style={{ color:'#f97316', fontStyle:'italic' }}>Bus</em> Portal</Link>
        <div style={{ display:'flex', gap:'16px' }}>
          {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies'],['/refund-policy','Refunds']].map(([to,l]) => (
            <Link key={l} to={to} style={{ fontSize:'12px', color: to==='/refund-policy' ? '#f97316' : 'rgba(255,255,255,0.35)', textDecoration:'none', fontWeight: to==='/refund-policy' ? '700' : '400' }}>{l}</Link>
          ))}
        </div>
        <Link to="/" style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', borderRadius:'10px', textDecoration:'none', fontSize:'13px', fontWeight:'700' }}>← Back to App</Link>
      </nav>

      <div style={{ background:'linear-gradient(155deg,#0e0618,#08100f)', padding:'52px 48px 40px', textAlign:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(249,115,22,0.7)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>💰 Legal</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'42px', color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Refund Policy</h1>
        <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', margin:0 }}>Last updated: March 17, 2026 · Refunds processed within 5–7 business days</p>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 48px 80px', display:'flex', flexDirection:'column', gap:'24px' }}>

        {/* Quick summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px' }}>
          {SCENARIOS.map((s, i) => (
            <div key={i} style={{ background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:'16px', padding:'20px' }}>
              <div style={{ fontSize:'28px', marginBottom:'10px' }}>{s.icon}</div>
              <div style={{ fontSize:'15px', fontWeight:'800', color:s.color, marginBottom:'12px' }}>{s.title}</div>
              <ul style={{ margin:0, padding:'0 0 0 16px' }}>
                {s.conditions.map((c, ci) => (
                  <li key={ci} style={{ fontSize:'12px', color:'#4a3728', lineHeight:'1.7', marginBottom:'4px' }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Detailed policy */}
        {[
          {
            title:'How to Request a Refund',
            content:`To cancel a booking and request a refund:

1. Go to My Bookings in your account
2. Find the booking you want to cancel
3. Click "Cancel Booking"
4. Confirm the cancellation

Alternatively, you can contact our support team at support@mrbusportal.com or use our AI chat assistant (type "cancel my booking").

Refunds are processed automatically to your original payment method within 5–7 business days. Processing times may vary depending on your bank.`
          },
          {
            title:'Cancellation Fees',
            content:`No cancellation fee: If you cancel within 24 hours of making the booking (provided the departure is more than 2 hours away), you receive a full refund.

25% cancellation fee: If you cancel more than 24 hours after booking, a 25% fee is deducted from the refund amount. This fee covers administrative costs and compensates the bus operator for the reserved seat.

Example: Booking of $100 cancelled 3 days after purchase → Refund of $75 (25% fee of $25 applied).`
          },
          {
            title:'Special Circumstances',
            content:`We understand that unexpected situations arise. In the following circumstances, we may offer a full refund or refund waiver at our discretion:

• Medical emergency (documentation required)
• Death of a passenger or immediate family member (documentation required)
• Government travel restrictions or border closures
• Natural disasters or severe weather making travel unsafe
• Bus breakdown or significant mechanical failure

To request a special circumstances refund, contact support@mrbusportal.com with relevant documentation. These requests are reviewed within 3 business days.`
          },
          {
            title:'Bus Pass & Subscription Refunds',
            content:`Bus Pass subscriptions are billed in advance for the billing period. We do not offer partial refunds for unused days in a billing period when you cancel a subscription.

If you cancel your subscription, you retain access to all subscription benefits until the end of the current billing period.

Exception: If you experience a billing error or were charged incorrectly, contact us within 30 days and we will issue a full refund for the erroneous charge.`
          },
          {
            title:'Contact for Refund Issues',
            content:`If your refund hasn't appeared after 7 business days, please:

1. Check your bank statement for a pending credit
2. Contact your bank to inquire about the incoming credit
3. If still not resolved, email refunds@mrbusportal.com with your booking transaction ID

Our refunds team responds within 2 business days.

Email: refunds@mrbusportal.com
Phone: +1 (800) MR-BUSES (Mon–Fri, 9am–6pm EST)`
          },
        ].map((s, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9' }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 16px', paddingBottom:'12px', borderBottom:'1px solid #f0ebe4' }}>{s.title}</h2>
            {s.content.split('\n\n').map((para, pi) => (
              <p key={pi} style={{ fontSize:'14px', color:'#4a3728', lineHeight:'1.85', margin:'0 0 12px' }}>{para}</p>
            ))}
          </div>
        ))}

        {/* CTA */}
        <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', borderRadius:'16px', padding:'28px 32px', border:'1px solid rgba(249,115,22,0.2)', textAlign:'center' }}>
          <div style={{ fontSize:'28px', marginBottom:'12px' }}>💬</div>
          <div style={{ fontSize:'18px', fontWeight:'700', color:'#c2410c', marginBottom:'8px', fontFamily:"'Playfair Display',serif" }}>Need help with a refund?</div>
          <p style={{ fontSize:'14px', color:'#9c8b78', marginBottom:'20px' }}>Our support team is here to help. Average response time is under 4 hours.</p>
          <Link to="/contact" style={{ padding:'12px 28px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', borderRadius:'12px', textDecoration:'none', fontSize:'14px', fontWeight:'700', display:'inline-block', boxShadow:'0 4px 16px rgba(249,115,22,0.35)' }}>
            Contact Support →
          </Link>
        </div>

        <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(249,115,22,0.2)' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', color:'#c2410c', marginBottom:'14px' }}>📋 Related Documents</div>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {[['/terms','📄 Terms'],['/privacy','🔒 Privacy'],['/cookies','🍪 Cookies'],['/contact','💬 Contact']].map(([to,l]) => (
              <Link key={l} to={to} style={{ padding:'8px 16px', background:'#fff', border:'1px solid rgba(249,115,22,0.3)', borderRadius:'10px', fontSize:'13px', fontWeight:'600', color:'#c2410c', textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
