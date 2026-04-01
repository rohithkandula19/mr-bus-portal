// frontend/src/pages/SubscriptionPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const getUserFromStorage = () => {
  try { const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null; } catch { return null; }
};

const PLANS = [
  {
    id: 'starter', name: 'Starter', emoji: '🥉', price: 49,
    color: '#cd7f32', colorBg: 'rgba(205,127,50,0.1)', colorBorder: 'rgba(205,127,50,0.25)',
    tagline: 'Perfect for occasional travelers', rides: 4,
    features: ['4 rides on any route', '10% off additional rides', '2x loyalty points on all trips', 'Email support', 'Standard seat selection'],
    notIncluded: ['Priority boarding', 'Free luggage pre-check', 'Dedicated support'],
  },
  {
    id: 'commuter', name: 'Commuter', emoji: '🥈', price: 99, popular: true,
    color: '#60a5fa', colorBg: 'rgba(96,165,250,0.1)', colorBorder: 'rgba(96,165,250,0.3)',
    tagline: 'Best for regular commuters', rides: 10,
    features: ['10 rides on any route', '20% off additional rides', '3x loyalty points', 'Priority boarding', 'Free seat selection', 'Priority email support', '1 free luggage pre-check/month'],
    notIncluded: ['Unlimited rides', 'Dedicated account manager'],
  },
  {
    id: 'unlimited', name: 'Unlimited', emoji: '🥇', price: 199,
    color: '#f97316', colorBg: 'rgba(249,115,22,0.1)', colorBorder: 'rgba(249,115,22,0.3)',
    tagline: 'For the ultimate frequent traveler', rides: null,
    features: ['Unlimited rides on ALL routes', '5x loyalty points on every trip', 'Priority boarding — always first', 'Reserved premium seat every time', 'Free luggage pre-check — unlimited', '24/7 priority phone & chat support', 'Monthly bonus: 500 extra points', 'Free cancellation — no fees ever'],
    notIncluded: [],
  },
  {
    id: 'corporate', name: 'Corporate', emoji: '💎', price: null,
    color: '#a78bfa', colorBg: 'rgba(167,139,250,0.1)', colorBorder: 'rgba(167,139,250,0.3)',
    tagline: 'For teams and businesses', rides: 'Custom',
    features: ['Multiple employee accounts', 'Centralized billing & invoicing', 'Custom route & volume discounts', 'Dedicated account manager', 'Monthly usage reports', 'API access for expense systems', 'Onboarding & training included'],
    notIncluded: [],
  },
];

const FAQS = [
  { q: 'Can I cancel my plan anytime?', a: 'Yes! Cancel anytime — no fees. Your plan stays active until the end of the billing period.' },
  { q: 'Do unused rides roll over?', a: 'Rides on Starter and Commuter plans do not roll over. Unlimited users never worry about this.' },
  { q: 'Can I upgrade or downgrade?', a: 'Absolutely — upgrades take effect immediately, downgrades at next billing cycle.' },
  { q: 'How do loyalty points work with a pass?', a: 'Points multiply based on your plan (2x, 3x, or 5x). Points are added after each completed trip.' },
  { q: 'Is there a free trial?', a: 'Yes! All new subscribers get first month 20% off with code MRPASS20 at checkout.' },
  { q: 'What routes are included?', a: 'All plans cover every MR Bus Portal route across the USA. No hidden restrictions.' },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const user = getUserFromStorage();

  const [billing, setBilling]                   = useState('monthly');
  const [openFaq, setOpenFaq]                   = useState(null);
  const [toast, setToast]                       = useState(null);
  const [toastType, setToastType]               = useState('success');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan]         = useState(null);
  const [paymentStep, setPaymentStep]           = useState(1);
  const [cardData, setCardData]                 = useState({ number:'', expiry:'', cvv:'', name:'' });
  const [paymentLoading, setPaymentLoading]     = useState(false);
  const [activeSub, setActiveSub]               = useState(null);
  const [subLoading, setSubLoading]             = useState(true);
  const [purchaseResult, setPurchaseResult]     = useState(null);
  const [promoInput, setPromoInput]             = useState('');
  const [promoApplied, setPromoApplied]         = useState(null);
  const [cancelLoading, setCancelLoading]       = useState(false);

  useEffect(() => { fetchActiveSub(); }, []);

  const fetchActiveSub = async () => {
    if (!user) { setSubLoading(false); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/subscriptions/my-subscription?token=${token}`);
      const data = await res.json();
      setActiveSub(data?.subscription || null);
    } catch { /* silent */ }
    finally { setSubLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectPlan = (plan) => {
    if (!user) { navigate('/login'); return; }
    if (plan.price === null) { showToast('Our sales team will contact you within 24 hours! 📧'); return; }
    if (activeSub?.plan_id === plan.id) { showToast('You already have this plan active! 🎉'); return; }
    setSelectedPlan(plan);
    setPaymentStep(1);
    setCardData({ number:'', expiry:'', cvv:'', name:'' });
    setPromoInput('');
    setPromoApplied(null);
    setShowPaymentModal(true);
  };

  const closeModal = () => {
    setShowPaymentModal(false); setSelectedPlan(null);
    setPaymentStep(1); setPurchaseResult(null);
  };

  const applyPromo = async () => {
    if (!promoInput.trim() || !selectedPlan) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/subscriptions/validate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: selectedPlan.id, billing, promo_code: promoInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setPromoApplied(data);
        showToast(`✅ ${data.message}`);
      } else {
        showToast('Invalid promo code', 'error');
      }
    } catch { showToast('Could not validate promo', 'error'); }
  };

  const handlePay = async () => {
    // ✅ FIXED: Validate all fields first
    if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
      showToast('Please fill in all card details', 'error');
      return;
    }

    // ✅ FIXED: Validate expiry date using showToast (not setError which doesn't exist here)
    if (cardData.expiry.length === 5) {
      const parts = cardData.expiry.split('/');
      const expMonth = parseInt(parts[0], 10);
      const expYear = parseInt(parts[1], 10);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;

      if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
        showToast('Invalid expiry month. Use MM/YY format.', 'error');
        return;
      }
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        showToast('Your card has expired. Please use a valid card.', 'error');
        return;
      }
    } else {
      showToast('Please enter a valid expiry date (MM/YY)', 'error');
      return;
    }

    setPaymentLoading(true);
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2000));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/subscriptions/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          plan_id: selectedPlan.id,
          billing,
          promo_code: promoApplied ? promoInput.trim() : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setPurchaseResult(data.subscription);
        setPaymentStep(3);
        fetchActiveSub();
      } else {
        showToast(data.detail || 'Purchase failed. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelSub = async () => {
    if (!window.confirm('Cancel your subscription? Your plan stays active until the next billing date.')) return;
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: 'User requested cancellation' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`${data.message}`);
        fetchActiveSub();
      } else {
        showToast(data.detail || 'Cancellation failed', 'error');
      }
    } catch { showToast('Error cancelling. Please try again.', 'error'); }
    finally { setCancelLoading(false); }
  };

  const getPrice = (plan) => {
    if (!plan?.price) return null;
    const base = billing === 'annual' ? Math.floor(plan.price * 0.8) : plan.price;
    if (promoApplied && selectedPlan?.id === plan.id) return promoApplied.final_price;
    return base;
  };

  const plan = selectedPlan;
  const displayPrice = plan ? getPrice(plan) : 0;

  const formatBillingDate = (str) => {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
    catch { return str; }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080810', fontFamily:"'Outfit',sans-serif", color:'#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        * { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        input::placeholder { color:rgba(255,255,255,0.25); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:'20px', right:'20px', zIndex:99999, background: toastType === 'error' ? '#dc2626' : '#16a34a', color:'#fff', padding:'13px 20px', borderRadius:'12px', fontSize:'14px', fontWeight:'600', boxShadow:'0 8px 24px rgba(0,0,0,0.35)', animation:'fadeUp 0.3s ease', maxWidth:'360px' }}>
          {toastType === 'error' ? '❌ ' : '✅ '}{toast}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && plan && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.88)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(12px)' }}>
          <div style={{ background:'#0e0e1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'24px', width:'100%', maxWidth:'480px', overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,0.6)', fontFamily:"'Outfit',sans-serif", maxHeight:'90vh', overflowY:'auto' }}>

            {/* Modal Header */}
            <div style={{ background:`linear-gradient(135deg,${plan.color}30,${plan.color}10)`, borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10, backdropFilter:'blur(20px)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ fontSize:'28px' }}>{plan.emoji}</div>
                <div>
                  <div style={{ fontSize:'16px', fontWeight:'800', color:'#fff' }}>{plan.name} Plan</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.35)' }}>
                    {paymentStep === 3 ? '✅ Payment successful' : '🔒 256-bit SSL secured checkout'}
                  </div>
                </div>
              </div>
              {paymentStep !== 3 && (
                <button onClick={closeModal} style={{ background:'rgba(255,255,255,0.08)', border:'none', color:'rgba(255,255,255,0.5)', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              )}
            </div>

            {/* Success Screen */}
            {paymentStep === 3 && purchaseResult ? (
              <div style={{ padding:'40px 32px', textAlign:'center' }}>
                <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'rgba(74,222,128,0.15)', border:'2px solid #4ade80', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', margin:'0 auto 20px' }}>🎉</div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'26px', color:'#fff', margin:'0 0 8px' }}>You're subscribed!</h2>
                <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.45)', marginBottom:'6px' }}>Welcome to the {plan.name} Plan</p>
                <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', marginBottom:'28px' }}>
                  📧 Confirmation sent to <strong style={{ color:'rgba(255,255,255,0.5)' }}>{user?.email}</strong>
                </p>
                <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'18px 20px', marginBottom:'20px', textAlign:'left' }}>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>Invoice Summary</div>
                  {[
                    ['Invoice #', purchaseResult.invoice_number],
                    ['Plan', `${purchaseResult.plan_name} (${purchaseResult.billing_cycle})`],
                    ['Amount charged', `$${purchaseResult.price_paid}/month`],
                    ['Bonus points', `+${purchaseResult.bonus_points_awarded?.toLocaleString()} pts added!`],
                    ['Next billing', formatBillingDate(purchaseResult.next_billing_at)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', fontWeight:'500' }}>{k}</span>
                      <span style={{ fontSize:'13px', color: k === 'Bonus points' ? '#4ade80' : k === 'Amount charged' ? plan.color : '#fff', fontWeight:'700', fontFamily: k === 'Invoice #' ? 'monospace' : "'Outfit',sans-serif" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <button onClick={() => { closeModal(); navigate('/transactions'); }}
                    style={{ padding:'13px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', color:'rgba(255,255,255,0.7)', fontWeight:'600', fontSize:'13px', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                    💳 View Transactions
                  </button>
                  <button onClick={() => { closeModal(); navigate('/my-bookings'); }}
                    style={{ padding:'13px', background:`linear-gradient(135deg,${plan.color},${plan.color}bb)`, border:'none', borderRadius:'12px', color:'#fff', fontWeight:'800', fontSize:'13px', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                    Book Now →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding:'24px' }}>
                {/* Order Summary */}
                <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', marginBottom:'18px' }}>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px' }}>Order Summary</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)' }}>{plan.name} ({billing === 'annual' ? 'Annual' : 'Monthly'})</span>
                    <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', textDecoration: promoApplied ? 'line-through' : 'none' }}>
                      ${billing === 'annual' ? Math.floor(plan.price * 0.8) : plan.price}/mo
                    </span>
                  </div>
                  {promoApplied && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', color:'#4ade80', fontWeight:'600' }}>🎁 Promo: {promoInput.toUpperCase()} (-{promoApplied.discount_pct}%)</span>
                      <span style={{ fontSize:'12px', color:'#4ade80', fontWeight:'700' }}>-${promoApplied.discount_amount}</span>
                    </div>
                  )}
                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>Total today</span>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'24px', color:plan.color }}>${displayPrice}/mo</span>
                  </div>
                </div>

                {/* Promo Code */}
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>Promo Code</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="e.g. MRPASS20"
                      style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${promoApplied ? '#4ade80' : 'rgba(255,255,255,0.1)'}`, borderRadius:'10px', color:'#fff', fontSize:'14px', fontFamily:'monospace', outline:'none' }} />
                    <button onClick={applyPromo}
                      style={{ padding:'10px 16px', background: promoApplied ? '#4ade8022' : 'rgba(249,115,22,0.15)', border:`1px solid ${promoApplied ? '#4ade80' : 'rgba(249,115,22,0.3)'}`, borderRadius:'10px', color: promoApplied ? '#4ade80' : '#f97316', fontWeight:'700', fontSize:'13px', cursor:'pointer', fontFamily:"'Outfit',sans-serif", whiteSpace:'nowrap' }}>
                      {promoApplied ? '✓ Applied' : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* Card Form */}
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'18px' }}>
                  <div>
                    <label style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>Cardholder Name</label>
                    <input value={cardData.name} onChange={e => setCardData({...cardData, name:e.target.value})}
                      placeholder="John Smith"
                      style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', fontSize:'14px', fontFamily:"'Outfit',sans-serif", outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>Card Number</label>
                    <input value={cardData.number} maxLength={19}
                      onChange={e => { const v=e.target.value.replace(/\D/g,'').replace(/(\d{4})(?=\d)/g,'$1 '); setCardData({...cardData,number:v}); }}
                      placeholder="1234 5678 9012 3456"
                      style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', fontSize:'14px', fontFamily:'monospace', outline:'none', letterSpacing:'1px' }} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                    <div>
                      <label style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>Expiry</label>
                      <input value={cardData.expiry} maxLength={5}
                        onChange={e => { let v=e.target.value.replace(/\D/g,''); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); setCardData({...cardData,expiry:v}); }}
                        placeholder="MM/YY"
                        style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', fontSize:'14px', fontFamily:'monospace', outline:'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'6px' }}>CVV</label>
                      <input value={cardData.cvv} maxLength={4} type="password"
                        onChange={e => setCardData({...cardData,cvv:e.target.value.replace(/\D/g,'')})}
                        placeholder="•••"
                        style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#fff', fontSize:'14px', fontFamily:'monospace', outline:'none' }} />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', textAlign:'center', marginBottom:'16px' }}>
                  🔒 256-bit SSL · Cancel anytime · Charges appear as "MR Bus Portal"
                </div>

                <button onClick={handlePay} disabled={paymentLoading}
                  style={{ width:'100%', padding:'14px', background:paymentLoading?'rgba(255,255,255,0.06)':`linear-gradient(135deg,${plan.color},${plan.color}bb)`, border:'none', color:paymentLoading?'rgba(255,255,255,0.3)':'#fff', borderRadius:'13px', fontSize:'15px', fontWeight:'800', cursor:paymentLoading?'not-allowed':'pointer', fontFamily:"'Outfit',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.2s', boxShadow:paymentLoading?'none':`0 4px 20px ${plan.color}44` }}>
                  {paymentLoading
                    ? <><div style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />Processing payment...</>
                    : `Pay $${displayPrice} → Activate ${plan.name} Plan`
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'64px', background:'rgba(8,8,16,0.95)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>
          MR <em style={{ color:'#f97316', fontStyle:'italic' }}>Bus</em> Portal
        </Link>
        <div style={{ display:'flex', gap:'2px' }}>
          {[['/', '🔍 Routes'], ['/my-bookings', '📋 Bookings'], ['/transactions', '💳 Transactions'], ['/referral', '🎁 Referrals'], ['/contact', '💬 Support']].map(([to, label]) => (
            <Link key={label} to={to} style={{ padding:'7px 13px', borderRadius:'10px', fontSize:'12px', fontWeight:'500', color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>{label}</Link>
          ))}
          <Link to="/subscription" style={{ padding:'7px 13px', borderRadius:'10px', fontSize:'12px', fontWeight:'700', color:'#fbbf24', textDecoration:'none', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)' }}>🎫 Plans</Link>
        </div>
        {user ? (
          <Link to="/profile" style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', padding:'5px 14px 5px 6px', borderRadius:'30px', textDecoration:'none' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#fff' }}>{user.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize:'12px', fontWeight:'600', color:'#fff' }}>{user.name}</span>
          </Link>
        ) : (
          <Link to="/login" style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', borderRadius:'10px', textDecoration:'none', fontSize:'13px', fontWeight:'700' }}>Sign In</Link>
        )}
      </nav>

      {/* Active Plan Banner */}
      {!subLoading && activeSub && (
        <div style={{ background:'linear-gradient(135deg,rgba(249,115,22,0.15),rgba(234,88,12,0.08))', borderBottom:'1px solid rgba(249,115,22,0.2)', padding:'14px 48px' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ fontSize:'24px' }}>{activeSub.plan_emoji}</div>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'800', color:'#fb923c' }}>
                  {activeSub.plan_name} Plan Active
                  <span style={{ marginLeft:'10px', fontSize:'11px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', padding:'2px 8px', borderRadius:'20px', fontWeight:'700' }}>🟢 Active</span>
                </div>
                <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>
                  ${activeSub.price_paid}/month · Next billing: {new Date(activeSub.next_billing_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})} · {activeSub.points_multiplier}x loyalty points
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <Link to="/transactions" style={{ padding:'7px 14px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', color:'rgba(255,255,255,0.7)', textDecoration:'none', fontSize:'12px', fontWeight:'600' }}>💳 View Invoice</Link>
              <button onClick={handleCancelSub} disabled={cancelLoading}
                style={{ padding:'7px 14px', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:'10px', color:'#f87171', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                {cancelLoading ? 'Cancelling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ textAlign:'center', padding:'72px 20px 48px', background:'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.15) 0%, transparent 70%)' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', padding:'5px 16px', borderRadius:'30px', marginBottom:'20px' }}>
          <span style={{ fontSize:'10px', fontWeight:'700', color:'#fbbf24', letterSpacing:'2px', textTransform:'uppercase' }}>✨ Save up to 20% with annual billing</span>
        </div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'52px', color:'#fff', margin:'0 0 16px', letterSpacing:'-1.5px', lineHeight:1.05 }}>
          Travel more,<br /><em style={{ color:'#f97316', fontStyle:'italic' }}>pay less.</em>
        </h1>
        <p style={{ fontSize:'16px', color:'rgba(255,255,255,0.4)', maxWidth:'500px', margin:'0 auto 36px', lineHeight:'1.8' }}>
          Choose a plan that fits your travel style. Cancel anytime, upgrade anytime.
        </p>
        <div style={{ display:'inline-flex', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px', padding:'4px', gap:'4px' }}>
          {['monthly', 'annual'].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              style={{ padding:'9px 22px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'700', fontFamily:"'Outfit',sans-serif", transition:'all 0.2s', background:billing===b?'linear-gradient(135deg,#f97316,#ea580c)':'transparent', color:billing===b?'#fff':'rgba(255,255,255,0.4)', boxShadow:billing===b?'0 4px 14px rgba(249,115,22,0.35)':'none' }}>
              {b==='monthly'?'Monthly':'Annual'}{b==='annual'&&<span style={{ fontSize:'10px', background:'rgba(255,255,255,0.2)', padding:'1px 6px', borderRadius:'10px', marginLeft:'6px' }}>-20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px' }}>
        {PLANS.map((p, i) => {
          const pr = billing === 'annual' ? Math.floor((p.price || 0) * 0.8) : p.price;
          const isActive = activeSub?.plan_id === p.id;
          return (
            <div key={p.id} style={{ background: p.popular ? 'linear-gradient(160deg,rgba(96,165,250,0.06),rgba(249,115,22,0.04))' : 'rgba(255,255,255,0.03)', border:`1.5px solid ${isActive ? '#f97316' : p.popular ? 'rgba(96,165,250,0.35)' : p.colorBorder}`, borderRadius:'22px', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative', animation:`fadeUp 0.4s ease ${i*0.08}s both` }}>
              {isActive && <div style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', padding:'7px', textAlign:'center', fontSize:'11px', fontWeight:'800', color:'#fff', letterSpacing:'1px', textTransform:'uppercase' }}>✅ Your Current Plan</div>}
              {p.popular && !isActive && <div style={{ background:'linear-gradient(135deg,#60a5fa,#3b82f6)', padding:'7px', textAlign:'center', fontSize:'11px', fontWeight:'800', color:'#fff', letterSpacing:'1px', textTransform:'uppercase' }}>⭐ Most Popular</div>}
              <div style={{ padding:'24px 22px', flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:p.colorBg, border:`1px solid ${p.colorBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{p.emoji}</div>
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:'800', color:'#fff' }}>{p.name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'1px' }}>{p.tagline}</div>
                  </div>
                </div>
                <div style={{ marginBottom:'20px' }}>
                  {p.price !== null ? (
                    <>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:'38px', color:p.color, lineHeight:1 }}>${pr}</span>
                        <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.3)' }}>/month</span>
                      </div>
                      {billing==='annual' && <div style={{ fontSize:'11px', color:'#4ade80', fontWeight:'700', marginTop:'4px' }}>Save ${Math.floor(p.price * 12 * 0.2)}/year</div>}
                    </>
                  ) : (
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:p.color, lineHeight:1 }}>Custom</div>
                  )}
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'6px' }}>
                    {p.rides === null ? 'Unlimited rides' : p.rides === 'Custom' ? 'Custom rides' : `${p.rides} rides/month`}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px' }}>
                  {p.features.map((f,fi) => (
                    <div key={fi} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                      <span style={{ color:p.color, fontSize:'13px', flexShrink:0, marginTop:'1px' }}>✓</span>
                      <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)', lineHeight:'1.5' }}>{f}</span>
                    </div>
                  ))}
                  {p.notIncluded.map((f,fi) => (
                    <div key={fi} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                      <span style={{ color:'rgba(255,255,255,0.15)', fontSize:'13px', flexShrink:0, marginTop:'1px' }}>✕</span>
                      <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)', lineHeight:'1.5' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:'0 22px 22px' }}>
                <button onClick={() => handleSelectPlan(p)}
                  disabled={isActive}
                  style={{ width:'100%', padding:'13px', background: isActive ? 'rgba(249,115,22,0.15)' : p.popular ? 'linear-gradient(135deg,#60a5fa,#3b82f6)' : p.price ? `linear-gradient(135deg,${p.color},${p.color}cc)` : 'rgba(167,139,250,0.15)', border: isActive ? '1px solid rgba(249,115,22,0.3)' : p.price ? 'none' : `1px solid ${p.colorBorder}`, color: isActive ? '#fb923c' : '#fff', borderRadius:'12px', fontSize:'13px', fontWeight:'800', cursor: isActive ? 'default' : 'pointer', fontFamily:"'Outfit',sans-serif", boxShadow: isActive || !p.price ? 'none' : p.popular ? '0 4px 20px rgba(96,165,250,0.35)' : 'none', transition:'all 0.2s' }}>
                  {isActive ? '✅ Current Plan' : p.price === null ? '📧 Contact Sales' : `Get ${p.name} →`}
                </button>
                {p.price && !isActive && <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', textAlign:'center', marginTop:'8px' }}>Cancel anytime · No hidden fees</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Banner */}
      <div style={{ maxWidth:'800px', margin:'0 auto 72px', padding:'0 24px' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(234,88,12,0.06))', border:'1px solid rgba(249,115,22,0.2)', borderRadius:'20px', padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:'18px', fontWeight:'800', color:'#fff', marginBottom:'6px' }}>🎁 First month 20% off</div>
            <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.45)' }}>Use code <span style={{ color:'#f97316', fontWeight:'800', fontFamily:'monospace', letterSpacing:'1px' }}>MRPASS20</span> at checkout</div>
          </div>
          <div style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.3)', borderRadius:'12px', padding:'10px 20px', textAlign:'center' }}>
            <div style={{ fontSize:'11px', color:'rgba(249,115,22,0.6)', fontWeight:'700', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'2px' }}>Promo Code</div>
            <div style={{ fontFamily:'monospace', fontSize:'20px', color:'#f97316', fontWeight:'900', letterSpacing:'2px' }}>MRPASS20</div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ maxWidth:'900px', margin:'0 auto 72px', padding:'0 24px' }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:'#fff', textAlign:'center', marginBottom:'32px', letterSpacing:'-0.5px' }}>Compare Plans</h2>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'18px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ padding:'16px 20px', textAlign:'left', fontSize:'12px', fontWeight:'700', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'1px' }}>Feature</th>
                {PLANS.map(p => <th key={p.id} style={{ padding:'16px 14px', textAlign:'center', fontSize:'13px', fontWeight:'800', color:p.color }}>{p.emoji} {p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Monthly rides', '4', '10', '∞', 'Custom'],
                ['Loyalty points', '2x', '3x', '5x', '5x'],
                ['Priority boarding', '✕', '✓', '✓', '✓'],
                ['Free seat selection', '✕', '✓', '✓', '✓'],
                ['Luggage pre-check', '✕', '1/month', 'Unlimited', 'Unlimited'],
                ['Free cancellation', '✕', '✕', '✓', '✓'],
                ['24/7 Support', '✕', 'Email', 'Phone+Chat', 'Dedicated'],
                ['Monthly bonus pts', '—', '—', '500 pts', '1000 pts'],
              ].map(([feature, ...values], i) => (
                <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding:'13px 20px', fontSize:'13px', color:'rgba(255,255,255,0.55)', fontWeight:'500' }}>{feature}</td>
                  {values.map((v, vi) => <td key={vi} style={{ padding:'13px 14px', textAlign:'center', fontSize:'12px', fontWeight:'700', color:v==='✕'?'rgba(255,255,255,0.15)':v==='✓'?'#4ade80':'rgba(255,255,255,0.7)' }}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth:'700px', margin:'0 auto 80px', padding:'0 24px' }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:'#fff', textAlign:'center', marginBottom:'32px', letterSpacing:'-0.5px' }}>Frequently Asked Questions</h2>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${openFaq===i?'rgba(249,115,22,0.25)':'rgba(255,255,255,0.06)'}`, borderRadius:'14px', overflow:'hidden', transition:'border-color 0.2s' }}>
              <button onClick={() => setOpenFaq(openFaq===i?null:i)} style={{ width:'100%', padding:'16px 20px', background:'none', border:'none', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
                <span style={{ fontSize:'14px', fontWeight:'600', color:openFaq===i?'#f97316':'#fff', textAlign:'left' }}>{faq.q}</span>
                <span style={{ fontSize:'18px', color:openFaq===i?'#f97316':'rgba(255,255,255,0.3)', transform:openFaq===i?'rotate(45deg)':'rotate(0)', transition:'transform 0.2s', flexShrink:0, marginLeft:'12px' }}>+</span>
              </button>
              {openFaq===i && <div style={{ padding:'0 20px 16px', fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7' }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign:'center', padding:'60px 24px 80px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize:'32px', marginBottom:'16px' }}>🚌</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'28px', color:'#fff', marginBottom:'10px' }}>Ready to travel smarter?</h2>
        <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.35)', marginBottom:'28px' }}>Join thousands of travelers saving money with MR Bus Pass plans.</p>
        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => handleSelectPlan(PLANS[1])} style={{ padding:'14px 32px', background:'linear-gradient(135deg,#f97316,#ea580c)', border:'none', color:'#fff', borderRadius:'13px', fontSize:'14px', fontWeight:'800', cursor:'pointer', fontFamily:"'Outfit',sans-serif", boxShadow:'0 6px 22px rgba(249,115,22,0.4)' }}>
            Get Started — from $49/mo →
          </button>
          <Link to="/" style={{ padding:'14px 28px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:'13px', fontSize:'14px', fontWeight:'600', textDecoration:'none', fontFamily:"'Outfit',sans-serif" }}>
            Search routes first
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background:'rgba(0,0,0,0.4)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'24px 48px', textAlign:'center' }}>
        <div style={{ display:'flex', gap:'24px', justifyContent:'center', flexWrap:'wrap', marginBottom:'12px' }}>
          {[['/terms','Terms of Service'],['/privacy','Privacy Policy'],['/contact','Support Center'],['/transactions','My Transactions']].map(([to,label]) => (
            <Link key={label} to={to} style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)', margin:0 }}>© 2026 Rohith Kandula · MR Bus Portal · All rights reserved.</p>
      </footer>
    </div>
  );
}