// frontend/src/pages/ContactPage.js
// Full production contact & support page

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const getUserFromStorage = () => {
  try { const r = localStorage.getItem('user'); return r ? JSON.parse(r) : null; } catch { return null; }
};

const CATEGORIES = [
  { id: 'billing',    label: '💳 Billing & Payments',   desc: 'Charges, refunds, invoices' },
  { id: 'booking',    label: '🎫 Booking Issues',        desc: 'Cancellations, changes, boarding passes' },
  { id: 'complaint',  label: '😔 Complaint',             desc: 'Bad experience, service quality' },
  { id: 'technical',  label: '🔧 Technical Support',     desc: 'App issues, login problems' },
  { id: 'refund',     label: '💰 Refund Request',        desc: 'Request a refund or chargeback' },
  { id: 'general',    label: '💬 General Enquiry',       desc: 'Everything else' },
];

const FAQ_QUICK = [
  { q: 'How do I cancel a booking?', a: 'Go to My Bookings → find your booking → click Cancel. Full refund if within 24h of booking.' },
  { q: 'Where is my refund?', a: 'Refunds take 5–7 business days to appear. Check your original payment method.' },
  { q: 'How do I get my boarding pass?', a: 'My Bookings → your booking → Boarding Pass button. It also comes in your confirmation email.' },
  { q: 'Can I change my seat?', a: 'You can reschedule to a different bus via My Bookings → Reschedule. Seat changes on the same bus are not supported yet.' },
  { q: 'How do loyalty points work?', a: '1 point per $1 spent. 100 points = $1 off. Points are awarded after trip completion.' },
];

export default function ContactPage() {
  const user = getUserFromStorage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    category: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [ticketLookup, setTicketLookup] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [myTickets, setMyTickets] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState(null);

  useEffect(() => {
    if (user) fetchMyTickets();
  }, []); // eslint-disable-line

  const fetchMyTickets = async (keepExpanded) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/my-tickets?token=${token}`);
      const data = await res.json();
      setMyTickets(Array.isArray(data) ? data.slice(0, 5) : []);
      if (keepExpanded) setExpandedTicket(keepExpanded);
    } catch { /* silent */ }
  };

  const sendReply = async (ticketId) => {
    const msg = (replyText[ticketId] || '').trim();
    if (msg.length < 5) { alert('Please write at least 5 characters'); return; }
    setReplying(ticketId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/ticket/${ticketId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user?.name || 'User', email: user?.email || '', category: 'general', subject: 'Reply', message: msg, token: token || null }),
      });
      if (res.ok) {
        const sentMsg = msg;
        const now = new Date().toISOString();
        setReplyText(p => ({ ...p, [ticketId]: '' }));
        // Update ticket locally WITHOUT collapsing the list
        setMyTickets(prev => prev.map(t => {
          if (t.ticket_id !== ticketId) return t;
          return { ...t, message: (t.message || '') + '\n\n---USER REPLY [' + now + ']---\n' + sentMsg };
        }));
        setExpandedTicket(ticketId);
        // ✅ FIXED: pass ticketId so ticket stays expanded after background sync
        fetchMyTickets(ticketId).catch(() => {});
      }
      else { alert('Failed. Please try again.'); }
    } catch { alert('Network error.'); }
    finally { setReplying(null); }
  };

  const handleSubmit = async () => {
    if (!form.category) { setError('Please select a category'); return; }
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return; }
    if (!form.subject.trim()) { setError('Please enter a subject'); return; }
    if (form.message.trim().length < 20) { setError('Message must be at least 20 characters'); return; }
    setError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token: token || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(data);
        fetchMyTickets();
      } else {
        setError(data.detail || 'Submission failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!ticketLookup.trim()) return;
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/ticket/${ticketLookup.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok) setLookupResult(data);
      else setLookupError('Ticket not found. Please check the ID.');
    } catch {
      setLookupError('Lookup failed. Please try again.');
    }
  };

  const statusColor = (s) => ({ open: '#f97316', in_progress: '#3b82f6', resolved: '#16a34a', closed: '#9c8b78' }[s] || '#9c8b78');
  const statusBg = (s) => ({ open: '#fff7ed', in_progress: '#eff6ff', resolved: '#f0fdf4', closed: '#f7f3ee' }[s] || '#f7f3ee');
  const priorityColor = (p) => ({ high: '#dc2626', urgent: '#9b1c1c', normal: '#f97316', low: '#9c8b78' }[p] || '#9c8b78');

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ee', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');`}</style>

      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: '68px', background: 'rgba(8,6,16,0.95)', backdropFilter: 'blur(32px)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ fontFamily: "'Playfair Display',serif", fontSize: '20px', fontWeight: '700', color: '#fff', textDecoration: 'none' }}>
          MR <em style={{ color: '#f97316', fontStyle: 'italic' }}>Bus</em> Portal
        </Link>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['/', '🔍 Routes'], ['/my-bookings', '📋 Bookings'], ['/subscription', '🎫 Plans']].map(([to, label]) => (
            <Link key={label} to={to} style={{ padding: '7px 13px', borderRadius: '10px', fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{label}</Link>
          ))}
          <Link to="/contact" style={{ padding: '7px 13px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', textDecoration: 'none' }}>💬 Support</Link>
        </div>
        {user ? (
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 14px 5px 6px', borderRadius: '30px', textDecoration: 'none' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#fff' }}>{user.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{user.name}</span>
          </Link>
        ) : (
          <Link to="/login" style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}>Sign In</Link>
        )}
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(155deg,#0e0618,#08100f)', padding: '52px 48px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(249,115,22,0.7)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '12px' }}>💬 Support Center</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '42px', color: '#fff', margin: '0 0 12px', letterSpacing: '-1px' }}>How can we help?</h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', maxWidth: '500px', margin: '0 auto 32px' }}>We typically respond within 4 hours for urgent issues and 24 hours for general enquiries.</p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: '🔥 Urgent', time: '< 2 hours', color: '#ef4444' },
            { label: '⚡ Billing', time: '< 4 hours', color: '#f97316' },
            { label: '📋 Booking', time: '< 12 hours', color: '#3b82f6' },
            { label: '💬 General', time: '< 24 hours', color: '#9c8b78' },
          ].map(b => (
            <div key={b.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: b.color, fontWeight: '700' }}>{b.label}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{b.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>

        {/* ── LEFT: Contact Form ── */}
        <div>
          {submitted ? (
            <div style={{ background: '#fff', borderRadius: '24px', padding: '48px', textAlign: 'center', border: '1px solid #e8e2d9', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px' }}>✅</div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '26px', color: '#1a1207', margin: '0 0 8px' }}>Ticket Submitted!</h2>
              <p style={{ fontSize: '14px', color: '#9c8b78', marginBottom: '24px' }}>Check your inbox at <strong>{form.email}</strong> for confirmation.</p>
              <div style={{ background: '#f7f3ee', borderRadius: '14px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#9c8b78', fontWeight: '600' }}>Ticket ID</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#f97316', fontFamily: 'monospace' }}>{submitted.ticket_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: '#9c8b78', fontWeight: '600' }}>Priority</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: priorityColor(submitted.priority), background: '#fff', padding: '2px 10px', borderRadius: '20px', border: `1px solid ${priorityColor(submitted.priority)}44` }}>{submitted.priority?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#9c8b78', fontWeight: '600' }}>Expected Response</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1207' }}>{submitted.expected_response}</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#9c8b78', marginBottom: '20px' }}>Save your ticket ID — you'll need it to track progress.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => { setSubmitted(null); setForm({ name: user?.name || '', email: user?.email || '', category: '', subject: '', message: '' }); }}
                  style={{ padding: '11px 24px', background: '#f7f3ee', border: '1.5px solid #e8e2d9', borderRadius: '12px', color: '#6b5744', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  New Ticket
                </button>
                <button onClick={() => navigate('/')}
                  style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '24px', padding: '36px', border: '1px solid #e8e2d9', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '24px', color: '#1a1207', margin: '0 0 6px' }}>Submit a Support Request</h2>
              <p style={{ fontSize: '13px', color: '#9c8b78', marginBottom: '28px' }}>Fill in the details below and we'll get back to you ASAP.</p>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Category *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {CATEGORIES.map(cat => (
                    <div key={cat.id}
                      onClick={() => setForm({ ...form, category: cat.id })}
                      style={{ padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', border: `2px solid ${form.category === cat.id ? '#f97316' : '#e8e2d9'}`, background: form.category === cat.id ? '#fff7ed' : '#faf7f3', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1207', marginBottom: '2px' }}>{cat.label}</div>
                      <div style={{ fontSize: '11px', color: '#9c8b78' }}>{cat.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '14px', color: '#1a1207', fontFamily: "'Outfit',sans-serif", outline: 'none', boxSizing: 'border-box', background: '#faf7f3' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" type="email"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '14px', color: '#1a1207', fontFamily: "'Outfit',sans-serif", outline: 'none', boxSizing: 'border-box', background: '#faf7f3' }} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Subject *</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief description of your issue"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '14px', color: '#1a1207', fontFamily: "'Outfit',sans-serif", outline: 'none', boxSizing: 'border-box', background: '#faf7f3' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Message * <span style={{ color: '#c4b8a8', fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>({form.message.length}/2000)</span></label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value.slice(0, 2000) })}
                  placeholder="Please describe your issue in detail. Include booking IDs, dates, and any other relevant information."
                  rows={6}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '14px', color: '#1a1207', fontFamily: "'Outfit',sans-serif", outline: 'none', boxSizing: 'border-box', background: '#faf7f3', resize: 'vertical', lineHeight: '1.6' }} />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: '100%', padding: '14px', background: submitting ? '#e8e2d9' : 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '13px', color: submitting ? '#9c8b78' : '#fff', fontWeight: '800', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Outfit',sans-serif", boxShadow: submitting ? 'none' : '0 4px 16px rgba(249,115,22,0.35)', transition: 'all 0.2s' }}>
                {submitting ? '⏳ Submitting...' : 'Submit Support Request →'}
              </button>

              <p style={{ fontSize: '11px', color: '#b0a090', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
                By submitting you agree to our <Link to="/privacy" style={{ color: '#f97316', textDecoration: 'none' }}>Privacy Policy</Link>. We never share your data.
              </p>
            </div>
          )}

          {/* My Tickets */}
          {user && myTickets.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', border: '1px solid #e8e2d9', marginTop: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#1a1207', margin: '0 0 18px' }}>📋 Your Recent Tickets</h3>
              {myTickets.map(t => (
                <div key={t.ticket_id} style={{ borderBottom: '1px solid #f0ebe4', cursor: 'pointer' }}
                  onClick={() => setExpandedTicket(expandedTicket === t.ticket_id ? null : t.ticket_id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#f97316', marginBottom: '3px' }}>{t.ticket_id}</div>
                      <div style={{ fontSize: '13px', color: '#1a1207', fontWeight: '600', marginBottom: '2px' }}>{t.subject}</div>
                      <div style={{ fontSize: '11px', color: '#9c8b78', textTransform: 'capitalize' }}>{t.category} · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: statusBg(t.status), color: statusColor(t.status), border: `1px solid ${statusColor(t.status)}33`, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '16px', color: '#9c8b78', transform: expandedTicket === t.ticket_id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
                    </div>
                  </div>

                  {expandedTicket === t.ticket_id && (
                    <div style={{ padding: '16px', background: '#faf7f3', borderTop: '1px solid #f0ebe4' }}
                      onClick={e => e.stopPropagation()}>

                      {/* Threaded messages */}
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Conversation</div>
                        {(t.message || '').split('\n\n---USER REPLY [').map((part, i) => {
                          if (i === 0) return (
                            <div key={i} style={{ background: '#fff', borderLeft: '3px solid #f97316', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', color: '#f97316', fontWeight: '700', marginBottom: '4px' }}>
                                Your original message · {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <p style={{ margin: 0, fontSize: '13px', color: '#4a3728', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{part.trim() || '(No message text stored)'}</p>
                            </div>
                          );
                          const br = part.indexOf(']---\n');
                          const tm = br !== -1 ? part.slice(0, br) : '';
                          const tx = br !== -1 ? part.slice(br + 5) : part;
                          return (
                            <div key={i} style={{ background: '#fffbf5', borderLeft: '3px solid #fb923c', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', color: '#ea580c', fontWeight: '700', marginBottom: '4px' }}>
                                Your follow-up · {tm ? new Date(tm).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unknown time'}
                              </div>
                              <p style={{ margin: 0, fontSize: '13px', color: '#4a3728', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{tx.trim()}</p>
                            </div>
                          );
                        })}

                        {/* Admin reply */}
                        {t.admin_notes && (
                          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginTop: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ✅ Support Reply from MR Bus Portal
                            </div>
                            <p style={{ fontSize: '13px', color: '#14532d', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>
                              {t.admin_notes.replace(/\n\n✅ Refund issued by support team\.?/g, '').trim()}
                            </p>
                          </div>
                        )}
                        {!t.admin_notes && (
                          <div style={{ fontSize: '12px', color: '#9c8b78', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
                            ⏳ Awaiting response — expected within 4 hours
                          </div>
                        )}
                      </div>

                      {/* Reply box */}
                      {t.status !== 'closed' && t.status !== 'resolved' && (
                        <div style={{ borderTop: '1px solid #e8e2d9', paddingTop: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#9c8b78', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            💬 Add a follow-up message
                          </div>
                          <textarea
                            value={replyText[t.ticket_id] || ''}
                            onChange={e => setReplyText(p => ({ ...p, [t.ticket_id]: e.target.value }))}
                            placeholder="Provide more details, share booking IDs, or ask a follow-up question..."
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", outline: 'none', background: '#fff', color: '#1a1207', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box' }}
                          />
                          <button
                            onClick={() => sendReply(t.ticket_id)}
                            disabled={replying === t.ticket_id || !(replyText[t.ticket_id] || '').trim()}
                            style={{ marginTop: '8px', padding: '9px 20px', background: (replying === t.ticket_id || !(replyText[t.ticket_id] || '').trim()) ? '#e8e2d9' : 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: '10px', color: (replying === t.ticket_id || !(replyText[t.ticket_id] || '').trim()) ? '#9c8b78' : '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                            {replying === t.ticket_id ? '⏳ Sending...' : '📤 Send Follow-up'}
                          </button>
                        </div>
                      )}

                      {(t.status === 'resolved' || t.status === 'closed') && (
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', padding: '8px 0', borderTop: '1px solid #e8e2d9' }}>
                          ✅ This ticket has been {t.status}. Open a new ticket if you need further help.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Ticket Lookup */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e8e2d9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', color: '#1a1207', margin: '0 0 14px' }}>🔍 Track a Ticket</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={ticketLookup} onChange={e => setTicketLookup(e.target.value.toUpperCase())}
                placeholder="MR-2026-00042"
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e8e2d9', borderRadius: '10px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', background: '#faf7f3', color: '#1a1207' }} />
              <button onClick={handleLookup}
                style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                Search
              </button>
            </div>
            {lookupError && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{lookupError}</p>}
            {lookupResult && (
              <div style={{ background: '#f7f3ee', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#9c8b78', fontWeight: '600' }}>Ticket</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#f97316', fontFamily: 'monospace' }}>{lookupResult.ticket_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#9c8b78', fontWeight: '600' }}>Status</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: statusColor(lookupResult.status), background: statusBg(lookupResult.status), padding: '2px 10px', borderRadius: '20px', textTransform: 'capitalize' }}>{lookupResult.status?.replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#9c8b78', fontWeight: '600' }}>Subject</span>
                  <span style={{ fontSize: '12px', color: '#1a1207', fontWeight: '600', maxWidth: '160px', textAlign: 'right' }}>{lookupResult.subject}</span>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e8e2d9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', color: '#1a1207', margin: '0 0 16px' }}>📞 Other Ways to Reach Us</h3>
            {[
              { icon: '📧', label: 'Email', value: 'noreplymrbuses@gmail.com', sub: 'Response within 24h' },
              { icon: '💬', label: 'Live Chat', value: 'Available in-app', sub: 'Mon–Fri, 9am–6pm EST' },
              { icon: '📱', label: 'Phone', value: '+1 (800) MR-BUSES', sub: 'Urgent issues only' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0ebe4' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a1207' }}>{c.value}</div>
                  <div style={{ fontSize: '11px', color: '#9c8b78' }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick FAQ */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e8e2d9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', color: '#1a1207', margin: '0 0 16px' }}>❓ Quick Answers</h3>
            {FAQ_QUICK.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f0ebe4' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: openFaq === i ? '#f97316' : '#1a1207', textAlign: 'left', flex: 1, paddingRight: '8px' }}>{faq.q}</span>
                  <span style={{ fontSize: '16px', color: openFaq === i ? '#f97316' : '#9c8b78', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
                </button>
                {openFaq === i && <p style={{ fontSize: '12px', color: '#6b5744', lineHeight: '1.6', margin: '0 0 10px', paddingRight: '24px' }}>{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: 'rgba(8,6,16,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '32px 48px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[['/terms', 'Terms of Service'], ['/privacy', 'Privacy Policy'], ['/cookies', 'Cookie Policy'], ['/refund-policy', 'Refund Policy'], ['/contact', 'Support']].map(([to, label]) => (
            <Link key={label} to={to} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontWeight: '500' }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026 Rohith Kandula · MR Bus Portal · All rights reserved. · noreplymrbuses@gmail.com</p>
      </footer>
    </div>
  );
}