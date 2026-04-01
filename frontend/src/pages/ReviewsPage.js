import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch { return null; }
};

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 28, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '2px', cursor: readonly ? 'default' : 'pointer' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star}
          style={{ fontSize: size, color: star <= (hovered || value) ? '#f97316' : 'rgba(255,255,255,0.15)', transition: 'color 0.1s', userSelect: 'none', lineHeight: 1 }}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange && onChange(star)}
        >★</span>
      ))}
    </div>
  );
}

// ── Rating Breakdown ──────────────────────────────────────────────────────────
function RatingBreakdown({ breakdown, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[5, 4, 3, 2, 1].map(star => {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const barColor = star >= 4 ? '#4ade80' : star === 3 ? '#f97316' : '#ef4444';
        return (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', width: '8px', fontWeight: '600' }}>{star}</span>
            <span style={{ fontSize: '14px', color: '#f97316', lineHeight: 1 }}>★</span>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '6px', transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', width: '20px', textAlign: 'right', fontWeight: '600' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────
function ReviewCard({ review, onDelete, isOwn = false }) {
  const date = new Date(review.created_at);
  const dateStr = isNaN(date) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const tagColorMap = {
    clean: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
    punctual: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    friendly: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    comfortable: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
    fast: { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    smooth: { bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
    value: { bg: 'rgba(244,114,182,0.12)', color: '#f472b6' },
    reliable: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  };
  const ratingColor = review.rating >= 4 ? '#4ade80' : review.rating === 3 ? '#f97316' : '#ef4444';
  const ratingLabel = { 1: 'Terrible', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent' };
  const avatarColors = ['linear-gradient(135deg,#f97316,#ea580c)', 'linear-gradient(135deg,#8b5cf6,#7c3aed)', 'linear-gradient(135deg,#0891b2,#0e7490)', 'linear-gradient(135deg,#059669,#047857)', 'linear-gradient(135deg,#d97706,#b45309)', 'linear-gradient(135deg,#dc2626,#b91c1c)'];
  const ci = (review.user_name || 'T').charCodeAt(0) % avatarColors.length;

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '22px 24px', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColors[ci], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '17px', flexShrink: 0 }}>
            {(review.user_name || 'T')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#fff' }}>{review.user_name || 'Traveler'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{dateStr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StarRating value={review.rating} readonly size={16} />
            <span style={{ background: ratingColor, color: '#000', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>{ratingLabel[review.rating]}</span>
          </div>
          {review.bus_name && (
            <div style={{ fontSize: '12px', color: '#f97316', fontWeight: '600' }}>
              🚌 {review.bus_name}
              {review.origin && review.destination && <span style={{ color: 'rgba(255,255,255,0.25)' }}> · {review.origin} → {review.destination}</span>}
            </div>
          )}
        </div>
      </div>
      {review.title && <div style={{ fontWeight: '700', fontSize: '16px', color: '#fff', marginBottom: '8px' }}>{review.title}</div>}
      {review.review_text && <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', marginBottom: '14px' }}>{review.review_text}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        {review.tags && review.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {review.tags.filter(t => t && t.trim()).map(tag => {
              const tc = tagColorMap[tag.toLowerCase().trim()] || { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' };
              return <span key={tag} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: tc.bg, color: tc.color, border: `1px solid ${tc.color}33` }}>{tag.trim()}</span>;
            })}
          </div>
        )}
        {isOwn && onDelete && (
          <button style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: "'Outfit', sans-serif" }} onClick={() => onDelete(review.id)}>
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ── Write Review Modal ────────────────────────────────────────────────────────
function WriteReviewModal({ onClose, onSubmit }) {
  const [busName, setBusName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const ALL_TAGS = ['Clean', 'Punctual', 'Friendly', 'Comfortable', 'Fast', 'Smooth', 'Value', 'Reliable'];
  const ratingLabels = { 1: '😞 Terrible', 2: '😕 Poor', 3: '😐 Average', 4: '😊 Good', 5: '🤩 Excellent!' };
  const toggleTag = tag => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    if (!busName.trim()) { setError('Please enter the bus name'); return; }
    if (rating === 0) { setError('Please select a star rating'); return; }
    setSubmitting(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/reviews/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bus_name: busName.trim(), origin: origin.trim() || null, destination: destination.trim() || null, rating, title: title.trim() || null, review_text: text.trim() || null, tags: selectedTags.length > 0 ? selectedTags.map(t => t.toLowerCase()).join(',') : null })
      });
      const data = await res.json();
      if (res.ok) { onSubmit(); } else { setError(data.detail || 'Failed to submit. Try again.'); }
    } catch { setError('Connection error. Is the backend running?'); }
    finally { setSubmitting(false); }
  };

  const iS = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '14px', color: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: "'Outfit', sans-serif" };
  const lS = { display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)', fontFamily: "'Outfit', sans-serif" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'linear-gradient(158deg,#0c0518,#120a24)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '24px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>✍️ Write a Review</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', marginTop: '4px' }}>Share your experience to help other travelers</div>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '10px', padding: '6px 13px', cursor: 'pointer', fontSize: '16px', fontFamily: "'Outfit', sans-serif" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '18px' }}>
            <label style={lS}>Bus Name *</label>
            <input style={iS} placeholder="e.g. MR Express, Greyhound..." value={busName} onChange={e => setBusName(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
            <div style={{ flex: 1 }}><label style={lS}>From (optional)</label><input style={iS} placeholder="e.g. Chicago" value={origin} onChange={e => setOrigin(e.target.value)} /></div>
            <div style={{ flex: 1 }}><label style={lS}>To (optional)</label><input style={iS} placeholder="e.g. Atlanta" value={destination} onChange={e => setDestination(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={lS}>Your Rating *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <StarRating value={rating} onChange={setRating} size={40} />
              {rating > 0 && <span style={{ fontSize: '15px', fontWeight: '700', color: rating >= 4 ? '#4ade80' : rating === 3 ? '#f97316' : '#ef4444' }}>{ratingLabels[rating]}</span>}
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={lS}>What stood out? (optional)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_TAGS.map(tag => (
                <button key={tag} type="button" style={{ padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', border: '1.5px solid', borderColor: selectedTags.includes(tag) ? '#f97316' : 'rgba(255,255,255,0.1)', background: selectedTags.includes(tag) ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)', color: selectedTags.includes(tag) ? '#f97316' : 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }} onClick={() => toggleTag(tag)}>
                  {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={lS}>Review Title (optional)</label>
            <input style={iS} placeholder="e.g. Great ride, very comfortable!" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={lS}>Your Experience (optional)</label>
            <textarea style={{ ...iS, height: '110px', resize: 'vertical', lineHeight: '1.6' }} placeholder="Tell others about your journey — comfort, driver, punctuality, any tips?" value={text} onChange={e => setText(e.target.value)} maxLength={600} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginTop: '4px' }}>{text.length}/600</div>
          </div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }} onClick={onClose}>Cancel</button>
            <button style={{ flex: 2, padding: '13px', background: rating === 0 || !busName.trim() || submitting ? 'rgba(249,115,22,0.25)' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '12px', cursor: rating === 0 || !busName.trim() || submitting ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '14px', fontFamily: "'Outfit', sans-serif", boxShadow: rating > 0 && busName.trim() ? '0 4px 16px rgba(249,115,22,0.35)' : 'none' }} onClick={handleSubmit} disabled={submitting || rating === 0 || !busName.trim()}>
              {submitting ? '⏳ Submitting...' : '⭐ Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Reviews Page ─────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const navigate = useNavigate();
  const [allReviews, setAllReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [breakdown, setBreakdown] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [successMsg, setSuccessMsg] = useState('');
  const user = getUserFromStorage();

  useEffect(() => {
    fetchAllReviews();
    if (user) fetchMyReviews();
  }, []); // eslint-disable-line

  const fetchAllReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/reviews/all?limit=100`);
      const data = await res.json();
      setAllReviews(data.reviews || []); setOverallRating(data.overall_rating || 0);
      setTotalReviews(data.total || 0); setBreakdown(data.breakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchMyReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/reviews/my-reviews`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMyReviews(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/reviews/${reviewId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setMyReviews(prev => prev.filter(r => r.id !== reviewId)); fetchAllReviews(); }
    } catch { alert('Failed to delete.'); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/'); };

  const handleReviewSubmit = () => {
    setShowWriteModal(false); fetchAllReviews(); if (user) fetchMyReviews();
    setSuccessMsg('Your review has been posted! Thank you 🙏');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  let displayReviews = filterRating > 0 ? allReviews.filter(r => r.rating === filterRating) : allReviews;
  if (sortBy === 'highest') displayReviews = [...displayReviews].sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'lowest') displayReviews = [...displayReviews].sort((a, b) => a.rating - b.rating);
  const positivePercent = allReviews.length > 0 ? Math.round((allReviews.filter(r => r.rating >= 4).length / allReviews.length) * 100) : 0;

  const nlS = { padding: '8px 13px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' };
  const emptyBox = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '60px 20px', textAlign: 'center' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(158deg,#0c0518 0%,#070f0d 55%,#040816 100%)', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── NAVBAR — matches your app exactly ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: '68px', background: 'rgba(10,6,18,0.85)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Link to="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: '21px', fontWeight: '700', color: '#fff', textDecoration: 'none', letterSpacing: '-0.3px' }}>
          MR <em style={{ fontStyle: 'italic', color: '#f97316' }}>Bus</em> Portal
        </Link>
        <div style={{ display: 'flex', gap: '2px' }}>
          {user && <>
            <Link to="/" style={nlS}>🔍 Routes</Link>
            <Link to="/my-bookings" style={nlS}>📋 Bookings</Link>
            <Link to="/my-bookings" style={nlS}>🏆 Rewards</Link>
            <Link to="/referral" style={nlS}>🎁 Referrals</Link>
            <Link to="/reviews" style={{ ...nlS, color: '#f97316', background: 'rgba(249,115,22,0.1)', borderRadius: '10px' }}>⭐ Reviews</Link>
          </>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', padding: '5px 14px 5px 6px', borderRadius: '30px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#fff' }}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{user.name}</span>
              </div>
              <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.65)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={nlS}>Sign In</Link>
              <Link to="/reviews" style={{ ...nlS, color: '#f97316' }}>Reviews</Link>
              <Link to="/signup" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', padding: '9px 20px', borderRadius: '11px', textDecoration: 'none', fontSize: '13px', fontWeight: '700', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ paddingTop: '68px', textAlign: 'center', padding: '130px 20px 60px', background: 'radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.1) 0%, transparent 60%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)', padding: '5px 16px', borderRadius: '30px', marginBottom: '20px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#fb923c', letterSpacing: '2px', textTransform: 'uppercase' }}>Verified Traveler Reviews</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '52px', color: '#fff', margin: '0 0 14px', letterSpacing: '-1.5px', lineHeight: 1.05 }}>⭐ Traveler Reviews</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', marginBottom: '32px' }}>Honest experiences from real MR Bus passengers</p>

        {totalReviews > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px 40px', gap: '0', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { num: overallRating, sub: 'OVERALL RATING', extra: <StarRating value={Math.round(overallRating)} readonly size={18} /> },
              { num: totalReviews, sub: 'TOTAL REVIEWS' },
              { num: `${positivePercent}%`, sub: 'POSITIVE', color: '#4ade80' },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.07)' }} />}
                <div style={{ textAlign: 'center', padding: '0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '38px', color: s.color || '#fff', lineHeight: 1 }}>{s.num}</span>
                  {s.extra}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: '700', letterSpacing: '1px' }}>{s.sub}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        <button style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '14px', padding: '15px 36px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 28px rgba(249,115,22,0.4)', fontFamily: "'Outfit', sans-serif" }}
          onClick={() => { if (!user) { navigate('/login'); return; } setShowWriteModal(true); }}>
          ✍️ Write a Review
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {successMsg && (
          <div style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: '600', fontSize: '15px' }}>✅ {successMsg}</div>
        )}

        {/* Tabs + sort */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[{ id: 'all', label: '🌟 All Reviews', count: totalReviews }, ...(user ? [{ id: 'mine', label: '📋 My Reviews', count: myReviews.length }] : [])].map(tab => (
              <button key={tab.id} style={{ padding: '10px 20px', borderRadius: '12px', border: '1.5px solid', borderColor: activeTab === tab.id ? '#f97316' : 'rgba(255,255,255,0.08)', background: activeTab === tab.id ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.03)', color: activeTab === tab.id ? '#f97316' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: '700', fontSize: '13px', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
                <span style={{ background: activeTab === tab.id ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)', color: activeTab === tab.id ? '#f97316' : 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: '800' }}>{tab.count}</span>
              </button>
            ))}
          </div>
          {activeTab === 'all' && (
            <select style={{ padding: '9px 14px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: "'Outfit', sans-serif", cursor: 'pointer', outline: 'none' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          )}
        </div>

        {/* All reviews — two column layout */}
        {activeTab === 'all' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Sidebar */}
            <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '22px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '56px', color: '#fff', lineHeight: 1, marginBottom: '6px' }}>{overallRating || '—'}</div>
                <StarRating value={Math.round(overallRating)} readonly size={22} />
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '10px 0 20px', fontWeight: '600' }}>{totalReviews} review{totalReviews !== 1 ? 's' : ''}</div>
                <RatingBreakdown breakdown={breakdown} total={totalReviews} />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Filter by Stars</div>
                {[{ label: `All (${totalReviews})`, val: 0 }, { label: '★★★★★', val: 5 }, { label: '★★★★', val: 4 }, { label: '★★★', val: 3 }, { label: '★★', val: 2 }, { label: '★', val: 1 }].map(f => (
                  <button key={f.val} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', marginBottom: '4px', borderRadius: '9px', border: '1px solid', borderColor: filterRating === f.val ? '#f97316' : 'transparent', background: filterRating === f.val ? 'rgba(249,115,22,0.1)' : 'transparent', color: filterRating === f.val ? '#f97316' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '13px', fontFamily: "'Outfit', sans-serif", fontWeight: filterRating === f.val ? '700' : '500', transition: 'all 0.15s' }} onClick={() => setFilterRating(filterRating === f.val ? 0 : f.val)}>
                    <span style={{ color: f.val > 0 ? '#f97316' : 'inherit' }}>{f.label}</span>
                    {f.val > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>({breakdown[f.val] || 0})</span>}
                  </button>
                ))}
              </div>

              <div style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(234,88,12,0.06))', border: '1px solid rgba(249,115,22,0.18)', borderRadius: '18px', padding: '22px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#fff', marginBottom: '6px' }}>Traveled with us?</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Help other travelers with your review!</div>
                <button style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', width: '100%', fontFamily: "'Outfit', sans-serif" }} onClick={() => { if (!user) { navigate('/login'); return; } setShowWriteModal(true); }}>✍️ Write Review</button>
              </div>
            </div>

            {/* Reviews list */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <div style={emptyBox}><div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div><div style={{ color: 'rgba(255,255,255,0.35)' }}>Loading reviews...</div></div>
              ) : displayReviews.length === 0 ? (
                <div style={emptyBox}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>⭐</div>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#fff', marginBottom: '8px' }}>{totalReviews === 0 ? 'No reviews yet' : 'No reviews match this filter'}</div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>{totalReviews === 0 ? 'Be the first to share your experience!' : 'Try a different star filter'}</p>
                  {totalReviews === 0 && <button style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }} onClick={() => { if (!user) { navigate('/login'); return; } setShowWriteModal(true); }}>✍️ Be the First to Review</button>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filterRating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.15)', padding: '10px 16px', borderRadius: '10px' }}>
                      Showing {displayReviews.length} review{displayReviews.length !== 1 ? 's' : ''} with {filterRating} star{filterRating !== 1 ? 's' : ''}
                      <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontWeight: '700', fontSize: '13px', fontFamily: "'Outfit', sans-serif" }} onClick={() => setFilterRating(0)}>✕ Clear</button>
                    </div>
                  )}
                  {displayReviews.map(review => <ReviewCard key={review.id} review={review} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Reviews */}
        {activeTab === 'mine' && user && (
          myReviews.length === 0 ? (
            <div style={emptyBox}>
              <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#fff', marginBottom: '8px' }}>No reviews yet</div>
              <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>Share your experience after your next trip!</p>
              <button style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }} onClick={() => setShowWriteModal(true)}>✍️ Write Your First Review</button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '20px', fontSize: '14px' }}>You've written <strong style={{ color: '#fff' }}>{myReviews.length}</strong> review{myReviews.length !== 1 ? 's' : ''}.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myReviews.map(review => <ReviewCard key={review.id} review={review} isOwn={true} onDelete={handleDelete} />)}
              </div>
            </div>
          )
        )}
      </div>

      {showWriteModal && <WriteReviewModal onClose={() => setShowWriteModal(false)} onSubmit={handleReviewSubmit} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2) !important; }
        select option { background: #0c0518; color: #fff; }
      `}</style>
    </div>
  );
}