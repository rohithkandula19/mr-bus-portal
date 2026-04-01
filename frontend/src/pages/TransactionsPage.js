// frontend/src/pages/TransactionsPage.js
// NEW FILE — Full transactions page showing bookings + subscription payments

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const getUserFromStorage = () => {
  try { const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null; } catch { return null; }
};

const formatDate = (str) => {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return str; }
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const user = getUserFromStorage();

  const [bookings, setBookings]         = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subHistory, setSubHistory]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('all');
  const [scrolled, setScrolled]         = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAll();
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []); // eslint-disable-line

  const fetchAll = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [bRes, sRes, shRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.REACT_APP_API_URL}/subscriptions/my-subscription?token=${token}`),
        fetch(`${process.env.REACT_APP_API_URL}/subscriptions/history?token=${token}`),
      ]);
      const bData  = await bRes.json();
      const sData  = await sRes.json();
      const shData = await shRes.json();
      setBookings(Array.isArray(bData) ? bData : []);
      setSubscription(sData?.subscription || null);
      setSubHistory(Array.isArray(shData) ? shData : []);
    } catch (e) {
      console.error('Fetch error: - TransactionsPage.js:53', e);
    } finally {
      setLoading(false);
    }
  };

  // Build unified transaction list
  const allTransactions = [
    ...bookings.map(b => ({
      id: b.transaction_id,
      type: 'booking',
      icon: '🚌',
      title: `${b.origin?.split(',')[0]} → ${b.destination?.split(',')[0]}`,
      subtitle: `Seat ${b.seat_number} · ${b.bus_name}`,
      amount: b.price,
      status: b.status,
      date: b.created_at || b.departure,
      departure: b.departure,
      color: b.status === 'confirmed' ? '#16a34a' : '#dc2626',
      bgColor: b.status === 'confirmed' ? '#f0fdf4' : '#fef2f2',
      borderColor: b.status === 'confirmed' ? '#bbf7d0' : '#fca5a5',
    })),
    ...subHistory.map(s => ({
      id: s.invoice_number,
      type: 'subscription',
      icon: '🎫',
      title: `${s.plan_name} Plan Subscription`,
      subtitle: `${s.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing · ${s.invoice_number}`,
      amount: s.price_paid,
      status: s.status,
      date: s.started_at,
      color: s.status === 'active' ? '#f97316' : '#9c8b78',
      bgColor: s.status === 'active' ? '#fff7ed' : '#f7f3ee',
      borderColor: s.status === 'active' ? '#fed7aa' : '#e8e2d9',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = activeTab === 'all' ? allTransactions
    : allTransactions.filter(t => t.type === activeTab);

  const totalSpent   = allTransactions.filter(t => t.status !== 'cancelled').reduce((s, t) => s + t.amount, 0);
  const bookingSpent = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.price, 0);
  const subSpent     = subHistory.reduce((s, h) => s + h.price_paid, 0);

  const statusLabel = (t) => {
    if (t.type === 'booking') return t.status === 'confirmed' ? '✅ Confirmed' : '❌ Cancelled';
    return t.status === 'active' ? '🟢 Active' : t.status === 'cancelled' ? '⛔ Cancelled' : t.status;
  };

  return (
    <div style={{ fontFamily:"'Outfit',sans-serif", minHeight:'100vh', background:'#f7f3ee' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');`}</style>

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 52px', height:'68px', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:1000, transition:'all 0.3s', background: scrolled ? 'rgba(8,6,16,0.97)' : 'rgba(8,6,16,0.85)', boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.15)' : 'none' }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'21px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>MR <em style={{ fontStyle:'italic', color:'#f97316' }}>Bus</em> Portal</Link>
        <div style={{ display:'flex', gap:'4px' }}>
          {[['/', '🔍 Routes'], ['/my-bookings', '📋 Bookings'], ['/subscription', '🎫 Plans'], ['/contact', '💬 Support']].map(([to, label]) => (
            <Link key={label} to={to} style={{ padding:'8px 14px', borderRadius:'10px', fontSize:'13px', fontWeight:'500', color:'rgba(255,255,255,0.55)', textDecoration:'none' }}>{label}</Link>
          ))}
          <Link to="/transactions" style={{ padding:'8px 14px', borderRadius:'10px', fontSize:'13px', fontWeight:'700', color:'#fbbf24', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', textDecoration:'none' }}>💳 Transactions</Link>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <Link to="/profile" style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', padding:'5px 14px 5px 6px', borderRadius:'30px', textDecoration:'none' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#fff' }}>{user?.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#fff' }}>{user?.name}</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(249,115,22,0.18) 0%,transparent 60%),linear-gradient(155deg,#0e0618,#08100f)', padding:'52px 52px 36px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        <div style={{ maxWidth:'900px', margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(249,115,22,0.7)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'10px' }}>💳 Financial Summary</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'38px', color:'#fff', margin:'0 0 6px', letterSpacing:'-1px' }}>Transactions</h1>
          <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.35)', margin:'0 0 28px' }}>All your payments — bookings, subscriptions, and refunds in one place.</p>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
            {[
              { icon:'💰', n:`$${totalSpent.toFixed(2)}`, l:'Total Spent' },
              { icon:'🚌', n:`$${bookingSpent.toFixed(2)}`, l:'On Bookings' },
              { icon:'🎫', n:`$${subSpent.toFixed(2)}`, l:'On Subscriptions' },
              { icon:'📄', n:allTransactions.length, l:'Transactions' },
            ].map((s, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px 18px', backdropFilter:'blur(10px)' }}>
                <div style={{ fontSize:'20px', marginBottom:'6px' }}>{s.icon}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', color:'#fff', lineHeight:'1', marginBottom:'3px' }}>{s.n}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'600', letterSpacing:'0.5px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Subscription Banner */}
      {subscription && (
        <div style={{ background:'#fff', borderBottom:'1px solid #f0ebe4' }}>
          <div style={{ maxWidth:'900px', margin:'0 auto', padding:'18px 52px' }}>
            <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', border:'1.5px solid rgba(249,115,22,0.3)', borderRadius:'16px', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>🎫</div>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'800', color:'#c2410c' }}>{subscription.plan_emoji} {subscription.plan_name} Plan — Active</div>
                  <div style={{ fontSize:'12px', color:'#9c8b78', marginTop:'2px' }}>
                    ${subscription.price_paid}/month · Next billing: {formatDate(subscription.next_billing_at)?.split(',')[0]}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                {subscription.rides_remaining !== null && (
                  <div style={{ background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.25)', borderRadius:'20px', padding:'4px 12px', fontSize:'12px', fontWeight:'700', color:'#c2410c' }}>
                    {subscription.rides_remaining - (subscription.rides_used || 0)} rides left
                  </div>
                )}
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'20px', padding:'4px 12px', fontSize:'12px', fontWeight:'700', color:'#16a34a' }}>
                  {subscription.points_multiplier}x points
                </div>
                <div style={{ fontFamily:'monospace', fontSize:'11px', color:'#9c8b78', background:'#f7f3ee', padding:'4px 10px', borderRadius:'8px' }}>{subscription.invoice_number}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'20px 52px 8px' }}>
        <div style={{ display:'flex', background:'#fff', border:'1px solid #e8e2d9', borderRadius:'12px', padding:'3px', gap:'2px', width:'fit-content' }}>
          {[
            { key:'all',          label:`All (${allTransactions.length})` },
            { key:'booking',      label:`🚌 Bookings (${bookings.length})` },
            { key:'subscription', label:`🎫 Subscriptions (${subHistory.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setActiveTab(f.key)}
              style={{ padding:'7px 16px', borderRadius:'9px', border:'none', fontSize:'12px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit',sans-serif", transition:'all 0.2s',
                background: activeTab === f.key ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'transparent',
                color: activeTab === f.key ? '#fff' : '#9c8b78',
                boxShadow: activeTab === f.key ? '0 2px 8px rgba(249,115,22,0.3)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'8px 52px 80px' }}>
        {loading ? (
          <div style={{ background:'#fff', borderRadius:'20px', padding:'60px', textAlign:'center', border:'1px solid #e8e2d9' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>
            <div style={{ fontSize:'15px', color:'#9c8b78', fontWeight:'600' }}>Loading transactions...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:'24px', padding:'60px', textAlign:'center', border:'1px solid #e8e2d9' }}>
            <div style={{ fontSize:'52px', marginBottom:'16px' }}>💳</div>
            <div style={{ fontSize:'20px', fontWeight:'700', color:'#1a1207', marginBottom:'8px', fontFamily:"'Playfair Display',serif" }}>No transactions yet</div>
            <div style={{ color:'#9c8b78', fontSize:'14px', marginBottom:'28px' }}>Your payment history will appear here.</div>
            <Link to="/" style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', padding:'13px 32px', borderRadius:'13px', textDecoration:'none', fontWeight:'700', fontSize:'14px', display:'inline-block', boxShadow:'0 4px 16px rgba(249,115,22,0.35)' }}>
              Book a Trip →
            </Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {filtered.map((tx, idx) => (
              <div key={tx.id + idx}
                style={{ background:'#fff', border:`1px solid ${tx.borderColor}`, borderRadius:'18px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', transition:'transform 0.15s,box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; }}>
                <div style={{ height:'3px', background: tx.type === 'booking' ? 'linear-gradient(90deg,#f97316,#fbbf24)' : 'linear-gradient(90deg,#a78bfa,#60a5fa)' }} />
                <div style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:'16px' }}>

                  {/* Icon */}
                  <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:tx.bgColor, border:`1px solid ${tx.borderColor}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
                    {tx.icon}
                  </div>

                  {/* Details */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'15px', fontWeight:'800', color:'#1a1207', marginBottom:'3px' }}>{tx.title}</div>
                    <div style={{ fontSize:'12px', color:'#9c8b78', marginBottom:'6px' }}>{tx.subtitle}</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'10px', background:'#f7f3ee', border:'1px solid #e8e2d9', color:'#9c8b78', padding:'2px 8px', borderRadius:'6px', fontFamily:'monospace', fontWeight:'600' }}>{tx.id}</span>
                      <span style={{ fontSize:'10px', color:'#9c8b78', padding:'2px 8px', borderRadius:'6px', background:'#f7f3ee', border:'1px solid #e8e2d9' }}>
                        {tx.type === 'booking' ? '🚌 Bus Booking' : '🎫 Subscription'}
                      </span>
                      <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'6px', fontWeight:'600', background:tx.bgColor, color:tx.color, border:`1px solid ${tx.borderColor}` }}>
                        {statusLabel(tx)}
                      </span>
                    </div>
                  </div>

                  {/* Amount + Date */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', color:'#1a1207', lineHeight:'1', marginBottom:'4px' }}>
                      {tx.status === 'cancelled' ? <span style={{ textDecoration:'line-through', color:'#9c8b78' }}>${tx.amount}</span> : `$${tx.amount}`}
                    </div>
                    <div style={{ fontSize:'11px', color:'#9c8b78' }}>{formatDate(tx.date)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}