import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_API_URL}`;

const _gf = document.createElement('link');
_gf.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&display=swap';
_gf.rel = 'stylesheet';
document.head.appendChild(_gf);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', to: 'all' });
  const [busModal, setBusModal] = useState(null);
  const [tickets, setTickets] = React.useState([]);
  const [ticketStats, setTicketStats] = React.useState(null);
  const [ticketFilter, setTicketFilter] = React.useState('all');
  const [subRevenue, setSubRevenue] = React.useState(null);
  const [ticketNotes, setTicketNotes] = React.useState({});
  const [updatingTicket, setUpdatingTicket] = React.useState(null);
  const [replyDraft, setReplyDraft] = React.useState({});
  const [sendingReply, setSendingReply] = React.useState(null);
  const [openCount, setOpenCount] = React.useState(0); // null | 'create' | bus object
  const [busForm, setBusForm] = useState({ bus: '', origin: '', destination: '', departure: '', arrival: '', duration: '', price: '', seats_total: 32, amenities: 'WiFi,USB,AC' });
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    loadAll();
  }, []); // eslint-disable-line

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadBookings(), loadUsers(), loadBuses()]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers: authHeaders });
      if (res.status === 403) { navigate('/'); return; }
      const d = await res.json();
      setStats(d);
    } catch (e) { console.error(e); }
  };

  const loadBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 50, offset: 0 });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`${API}/admin/bookings?${params}`, { headers: authHeaders });
      const d = await res.json();
      setBookings(d.bookings || []);
      setBookingsTotal(d.total || 0);
    } catch (e) { console.error(e); }
  }, [search, statusFilter]); // eslint-disable-line

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API}/admin/users?limit=100`, { headers: authHeaders });
      const d = await res.json();
      setUsers(d.users || []);
      setUsersTotal(d.total || 0);
    } catch (e) { console.error(e); }
  };

  const loadBuses = async () => {
    try {
      const res = await fetch(`${API}/admin/buses`, { headers: authHeaders });
      const d = await res.json();
      setBuses(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (!loading) loadBookings(); }, [search, statusFilter]); // eslint-disable-line

  const cancelBooking = async (txId) => {
    if (!window.confirm(`Cancel booking ${txId}?`)) return;
    await fetch(`${API}/admin/bookings/${txId}/cancel`, { method: 'POST', headers: authHeaders });
    showToast('Booking cancelled');
    loadBookings(); loadStats();
  };

  const toggleAdmin = async (userId) => {
    await fetch(`${API}/admin/users/${userId}/toggle-admin`, { method: 'POST', headers: authHeaders });
    showToast('Admin status updated');
    loadUsers();
  };

  const sendEmail = async () => {
    const payload = { subject: emailForm.subject, body: emailForm.body };
    if (emailForm.to !== 'all') payload.user_ids = [parseInt(emailForm.to)];
    const res = await fetch(`${API}/admin/email-users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    const d = await res.json();
    showToast(`Sent to ${d.sent} users`);
    setEmailModal(false);
    setEmailForm({ subject: '', body: '', to: 'all' });
  };

  const saveBus = async () => {
    const isEdit = busModal && busModal !== 'create';
    const url = isEdit ? `${API}/admin/buses/${busModal.id}` : `${API}/admin/buses`;
    const method = isEdit ? 'PUT' : 'POST';
    const payload = { ...busForm, price: parseInt(busForm.price), seats_total: parseInt(busForm.seats_total) };
    if (isEdit) payload.is_active = busModal.is_active ?? true;
    await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
    showToast(isEdit ? 'Bus updated' : 'Bus created');
    setBusModal(null);
    loadBuses();
  };

  const deleteBus = async (id) => {
    if (!window.confirm('Delete this bus?')) return;
    await fetch(`${API}/admin/buses/${id}`, { method: 'DELETE', headers: authHeaders });
    showToast('Bus deleted', 'error');
    loadBuses();
  };

  const openBusEdit = (bus) => {
    setBusForm({ bus: bus.bus, origin: bus.origin, destination: bus.destination, departure: bus.departure, arrival: bus.arrival || '', duration: bus.duration || '', price: bus.price, seats_total: bus.seats_total, amenities: bus.amenities || 'WiFi,USB,AC' });
    setBusModal(bus);
  };

  const TABS = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'tickets', icon: '🎫', label: 'Support Tickets', badge: true },
    { key: 'revenue', icon: '💰', label: 'Subscription Revenue' },
    { key: 'bookings', icon: '🎫', label: 'Bookings' },
    { key: 'users', icon: '👥', label: 'Users' },
    { key: 'buses', icon: '🚌', label: 'Buses' },
    { key: 'gmail', icon: '📬', label: 'Gmail Inbox' },
    { key: 'email', icon: '📧', label: 'Email Users' },
    { key: 'referrals', icon: '🎁', label: 'Referrals' },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0e0618', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚌</div>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>Loading admin dashboard...</div>
      </div>
    </div>
  );


  const sendAdminReply = async (ticketId, status, priority) => {
    const reply = replyDraft[ticketId];
    if (!reply || !reply.trim()) { alert('Please write a reply message first'); return; }
    setSendingReply(ticketId);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/admin/ticket/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reply: reply.trim(), status, priority }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Reply sent to user! Email delivered.`);
        setReplyDraft(p => ({ ...p, [ticketId]: '' }));
        fetchTickets(token);
      } else {
        showToast(data.detail || 'Failed to send reply', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSendingReply(null); }
  };

  const sendRefund = async (ticketId, userEmail, userName) => {
    if (!window.confirm(`Issue a refund to ${userName} (${userEmail})?\nThis will mark the ticket as resolved.`)) return;
    try {
      const res = await fetch(`${API}/support/admin/refund?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, email: userEmail, name: userName })
      });
      const d = await res.json();
      if (res.ok) {
        showToast('✅ Refund issued & user notified by email!');
        fetchTickets(token);
      } else {
        showToast(d.detail || 'Refund failed', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const fetchTickets = async (tok) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/admin/tickets?token=${tok}`);
      const data = await res.json();
      if (res.ok) { setTickets(data.tickets || []); setTicketStats(data.stats || null); }
    } catch (e) { console.error(e); }
  };

  const fetchReferrals = async (tok) => {
    try {
      const res = await fetch(`${API}/referrals/admin/all?token=${tok}`);
      const data = await res.json();
      setReferralData(Array.isArray(data) ? data : []);
    } catch { setReferralData([]); }
  };

  const fetchSubRevenue = async (tok) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/subscriptions/admin/all?token=${tok}`);
      const data = await res.json();
      if (res.ok) setSubRevenue(data);
    } catch (e) { console.error(e); }
  };

  const updateTicket = async (ticketId, status, priority, notes) => {
    setUpdatingTicket(ticketId);
    const tok = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/support/admin/ticket/${ticketId}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({token: tok, status, priority, admin_notes: notes}),
      });
      if (res.ok) { alert('✅ Ticket updated!'); fetchTickets(tok); }
    } catch (e) { alert('Update failed'); }
    finally { setUpdatingTicket(null); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', fontFamily: "'Outfit', sans-serif", display: 'flex' }}>

      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <Link to="/" style={s.sidebarLogo}>
          MR <em style={{ fontStyle: 'italic', color: '#f97316' }}>Bus</em>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'block', fontStyle: 'normal', marginTop: '2px', letterSpacing: '2px' }}>ADMIN</span>
        </Link>

        <nav style={{ flex: 1 }}>
          {TABS.map(t => (
            <div key={t.key} style={{ ...s.navItem, ...(activeTab === t.key ? s.navItemActive : {}), position: 'relative' }}
              onClick={() => {
                setActiveTab(t.key);
                if (t.key === 'tickets') fetchTickets(token);
                if (t.key === 'revenue') fetchSubRevenue(token);
      if (t.key === 'referrals') fetchReferrals(token);
              }}>
              {t.badge && openCount > 0 && (
                <span style={{ position: 'absolute', top: '6px', right: '8px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>{openCount}</span>
              )}
              <span style={{ fontSize: '16px' }}>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Logged in as admin</div>
          <button style={s.logoutBtn} onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}>
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={s.main}>

        {/* Toast */}
        {toast && (
          <div style={{ ...s.toast, background: toast.type === 'error' ? '#dc2626' : '#16a34a' }}>
            {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Dashboard Overview</div>
              <div style={s.pageSubtitle}>Real-time platform stats</div>
            </div>

            {/* Stat cards */}
            <div style={s.statsGrid}>
              {[
                { icon: '👥', label: 'Total Users', value: stats.total_users, sub: `+${stats.new_users_month} this month`, color: '#3b82f6' },
                { icon: '🎫', label: 'Total Bookings', value: stats.total_bookings, sub: `${stats.confirmed_bookings} confirmed`, color: '#16a34a' },
                { icon: '💰', label: 'Total Revenue', value: `$${stats.total_revenue?.toLocaleString()}`, sub: `Avg fare $${stats.avg_fare}`, color: '#f97316' },
                { icon: '❌', label: 'Cancellation Rate', value: `${stats.cancellation_rate}%`, sub: `${stats.cancelled_bookings} cancelled`, color: '#dc2626' },
              ].map((st, i) => (
                <div key={i} style={s.statCard}>
                  <div style={{ ...s.statIcon, background: st.color + '18', color: st.color }}>{st.icon}</div>
                  <div>
                    <div style={s.statLabel}>{st.label}</div>
                    <div style={s.statValue}>{st.value}</div>
                    <div style={s.statSub}>{st.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
              {/* Top Routes */}
              <div style={s.card}>
                <div style={s.cardTitle}>🗺️ Top Routes</div>
                {stats.top_routes?.map((r, i) => (
                  <div key={i} style={s.tableRow}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{r.route}</div>
                      <div style={{ fontSize: '12px', color: '#9c8b78' }}>{r.bookings} bookings</div>
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#f97316' }}>${r.revenue}</div>
                  </div>
                ))}
              </div>

              {/* Daily Stats */}
              <div style={s.card}>
                <div style={s.cardTitle}>📅 Daily Revenue (Last 7 Days)</div>
                {stats.daily_stats?.map((d, i) => {
                  const maxRev = Math.max(...(stats.daily_stats.map(x => x.revenue)));
                  const pct = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#9c8b78' }}>{d.date}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>${d.revenue} · {d.bookings} bookings</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#f97316,#fbbf24)', borderRadius: '6px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {activeTab === 'bookings' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>All Bookings</div>
              <div style={s.pageSubtitle}>{bookingsTotal} total bookings</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input style={s.searchInput} placeholder="Search by name, email, route, transaction ID..."
                value={search} onChange={e => setSearch(e.target.value)} />
              {['all', 'confirmed', 'cancelled'].map(f => (
                <button key={f} style={{ ...s.filterBtn, ...(statusFilter === f ? s.filterBtnActive : {}) }}
                  onClick={() => setStatusFilter(f)}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div style={s.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Transaction', 'Passenger', 'Route', 'Departure', 'Seat', 'Price', 'Status', 'Action'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={s.td}><span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f97316' }}>{b.transaction_id}</span></td>
                      <td style={s.td}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{b.user_name}</div>
                        <div style={{ fontSize: '11px', color: '#9c8b78' }}>{b.user_email}</div>
                      </td>
                      <td style={s.td}><span style={{ fontSize: '13px', color: '#fff' }}>{b.origin?.split(',')[0]} → {b.destination?.split(',')[0]}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{b.departure}</span></td>
                      <td style={s.td}><span style={{ fontWeight: '700', color: '#f97316' }}>{b.seat_number}</span></td>
                      <td style={s.td}><span style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#fff' }}>${b.price}</span></td>
                      <td style={s.td}>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: '700', background: b.status === 'confirmed' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)', color: b.status === 'confirmed' ? '#4ade80' : '#f87171' }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={s.td}>
                        {b.status === 'confirmed' && (
                          <><button style={{...s.secondaryBtn, marginRight:'4px'}} onClick={async () => {
                            const newDep = prompt(`Reschedule ${b.transaction_id}\nCurrent: ${b.departure}\n\nEnter new departure (MM-DD-YYYY HH:MM):`);
                            if (!newDep) return;
                            try {
                              const res = await fetch(`${API}/admin/bookings/${b.transaction_id}/reschedule?new_bus_id=${b.bus_id || 1}&new_departure=${encodeURIComponent(newDep)}&new_arrival=${encodeURIComponent(b.arrival || '')}&new_duration=${encodeURIComponent(b.duration || '')}&new_price=${b.price}`, {
                                method: 'POST', headers: authHeaders
                              });
                              const data = await res.json();
                              if (data.status === 'rescheduled') {
                                showToast(`✅ Rescheduled! Email sent to user.`);
                                loadBookings();
                              } else {
                                showToast(`❌ ${data.detail || 'Failed'}`);
                              }
                            } catch { showToast('Reschedule failed'); }
                          }}>🔄 Reschedule</button>
                          <button style={s.dangerBtn} onClick={() => cancelBooking(b.transaction_id)}>Cancel</button></>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#9c8b78' }}>No bookings found</div>}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>All Users</div>
              <div style={s.pageSubtitle}>{usersTotal} registered users</div>
            </div>
            <div style={s.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['User', 'Email', 'Joined', 'Bookings', 'Spent', 'Tier', 'Points', 'Admin', 'Action'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{u.email}</span></td>
                      <td style={s.td}><span style={{ fontSize: '11px', color: '#9c8b78' }}>{u.joined?.split('T')[0]}</span></td>
                      <td style={s.td}><span style={{ fontWeight: '700', color: '#fff' }}>{u.total_bookings}</span></td>
                      <td style={s.td}><span style={{ color: '#f97316', fontWeight: '700' }}>${u.total_spent}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#fbbf24' }}>{u.loyalty_tier}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{u.loyalty_points?.toLocaleString()}</span></td>
                      <td style={s.td}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: u.is_admin ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)', color: u.is_admin ? '#fb923c' : '#6b5744', fontWeight: '600' }}>
                          {u.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button style={{ ...s.actionBtn, color: u.is_admin ? '#f87171' : '#4ade80' }}
                          onClick={() => toggleAdmin(u.id)}>
                          {u.is_admin ? 'Revoke' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BUSES ── */}
        {activeTab === 'buses' && (
          <div>
            <div style={{ ...s.pageHeader, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={s.pageTitle}>Bus Management</div>
                <div style={s.pageSubtitle}>{buses.length} buses in system</div>
              </div>
              <button style={s.primaryBtn} onClick={() => { setBusForm({ bus: '', origin: '', destination: '', departure: '', arrival: '', duration: '', price: '', seats_total: 32, amenities: 'WiFi,USB,AC' }); setBusModal('create'); }}>
                + Add Bus
              </button>
            </div>
            <div style={s.card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Bus Name', 'Route', 'Departure', 'Duration', 'Price', 'Seats', 'Status', 'Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buses.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={s.td}><span style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{b.bus}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{b.origin?.split(',')[0]} → {b.destination?.split(',')[0]}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{b.departure}</span></td>
                      <td style={s.td}><span style={{ fontSize: '12px', color: '#9c8b78' }}>{b.duration || '—'}</span></td>
                      <td style={s.td}><span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#f97316' }}>${b.price}</span></td>
                      <td style={s.td}><span style={{ fontSize: '13px', color: '#fff' }}>{b.seats_total}</span></td>
                      <td style={s.td}>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: b.is_active ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)', color: b.is_active ? '#4ade80' : '#f87171', fontWeight: '600' }}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={s.actionBtn} onClick={() => openBusEdit(b)}>Edit</button>
                          <button style={{ ...s.actionBtn, color: '#f87171' }} onClick={() => deleteBus(b.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {buses.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#9c8b78' }}>No buses yet — add one above</div>}
            </div>
          </div>
        )}

        {/* ── EMAIL ── */}
        {activeTab === 'email' && (
          <div>
            <div style={s.pageHeader}>
              <div style={s.pageTitle}>Email Users</div>
              <div style={s.pageSubtitle}>Send messages to all or specific users</div>
            </div>
            <div style={{ ...s.card, maxWidth: '600px' }}>
              <div style={s.formGroup}>
                <label style={s.label}>Send To</label>
                <select style={s.input} value={emailForm.to} onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}>
                  <option value="all">All verified users ({users.length})</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Subject</label>
                <input style={s.input} placeholder="Email subject..." value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Message</label>
                <textarea style={{ ...s.input, minHeight: '180px', resize: 'vertical' }} placeholder="Write your message here..." value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <button style={{ ...s.primaryBtn, width: '100%', padding: '14px' }}
                onClick={sendEmail}
                disabled={!emailForm.subject || !emailForm.body}>
                📧 Send Email
              </button>
            </div>
          </div>
        )}

            {activeTab === 'tickets' && (
        <div style={{fontFamily:"'Outfit',sans-serif"}}>
          {/* Stats */}
          {ticketStats && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
              {[{icon:'📋',label:'Total',value:ticketStats.total,color:'#1a1207'},{icon:'🔴',label:'Open',value:ticketStats.open,color:'#f97316'},{icon:'🔵',label:'In Progress',value:ticketStats.in_progress,color:'#3b82f6'},{icon:'✅',label:'Resolved',value:ticketStats.resolved,color:'#16a34a'}].map((s,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e8e2d9',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>{s.icon}</div>
                  <div style={{fontSize:'32px',fontWeight:'800',color:s.color,lineHeight:'1'}}>{s.value}</div>
                  <div style={{fontSize:'12px',color:'#9c8b78',fontWeight:'600',marginTop:'4px',textTransform:'uppercase'}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {/* Filter tabs */}
          <div style={{display:'flex',background:'#fff',border:'1px solid #e8e2d9',borderRadius:'12px',padding:'3px',gap:'2px',marginBottom:'16px',width:'fit-content'}}>
            {[['all','All'],['open','🔴 Open'],['in_progress','🔵 In Progress'],['resolved','✅ Resolved']].map(([k,l])=>(
              <button key={k} onClick={()=>setTicketFilter(k)} style={{padding:'7px 16px',borderRadius:'9px',border:'none',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",background:ticketFilter===k?'linear-gradient(135deg,#f97316,#ea580c)':'transparent',color:ticketFilter===k?'#fff':'#9c8b78'}}>
                {l} ({k==='all'?tickets.length:tickets.filter(t=>t.status===k).length})
              </button>
            ))}
          </div>
          {/* Ticket list */}
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            {(ticketFilter==='all'?tickets:tickets.filter(t=>t.status===ticketFilter)).map(t=>(
              <div key={t.ticket_id} style={{background:'#fff',borderRadius:'16px',border:`1.5px solid ${t.status==='open'?'rgba(249,115,22,0.3)':t.status==='in_progress'?'rgba(59,130,246,0.3)':'#e8e2d9'}`,overflow:'hidden'}}>
                {/* Ticket header */}
                <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',borderBottom:'1px solid #f0ebe4',background:t.status==='open'?'#fff7ed':t.status==='in_progress'?'#eff6ff':'#fafafa'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1,minWidth:0}}>
                    <div style={{fontFamily:'monospace',fontSize:'13px',fontWeight:'700',color:'#f97316',flexShrink:0}}>{t.ticket_id}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'#1a1207',marginBottom:'2px'}}>{t.subject}</div>
                      <div style={{fontSize:'12px',color:'#9c8b78'}}>{t.name} · <a href={`mailto:${t.email}`} style={{color:'#f97316',textDecoration:'none'}}>{t.email}</a> · {new Date(t.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.status==='open'?'#fff7ed':t.status==='in_progress'?'#eff6ff':t.status==='resolved'?'#f0fdf4':'#f7f3ee',color:t.status==='open'?'#f97316':t.status==='in_progress'?'#3b82f6':t.status==='resolved'?'#16a34a':'#9c8b78',border:`1px solid ${t.status==='open'?'#fed7aa':t.status==='in_progress'?'#bfdbfe':t.status==='resolved'?'#bbf7d0':'#e8e2d9'}`}}>{t.status.replace('_',' ')}</span>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.priority==='high'?'#fef2f2':'#f7f3ee',color:t.priority==='high'?'#dc2626':'#9c8b78',border:`1px solid ${t.priority==='high'?'#fca5a5':'#e8e2d9'}`}}>{t.priority}</span>
                    <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#f7f3ee',color:'#9c8b78',border:'1px solid #e8e2d9'}}>{t.category}</span>
                    {/* Gmail button */}
                    <a href={`https://mail.google.com/mail/?view=cm&to=${t.email}&su=[${t.ticket_id}] Re: ${encodeURIComponent(t.subject)}&body=Hi ${encodeURIComponent(t.name)},%0A%0A`} target="_blank" rel="noreferrer"
                      style={{fontSize:'11px',fontWeight:'700',padding:'4px 12px',borderRadius:'20px',background:'#fff',border:'1px solid #e8e2d9',color:'#6b5744',textDecoration:'none',display:'flex',alignItems:'center',gap:'4px'}}>
                      📧 Gmail
                    </a>
                  </div>
                </div>
                {/* User message */}
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f0ebe4'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>User Message</div>
                  {(t.message||'').split('\n\n---USER REPLY [').reduce((acc,part,i)=>{
                    if(i===0){acc.push({text:part,label:'Original',time:new Date(t.created_at).toLocaleDateString()});}
                    else{const br=part.indexOf(']---\n');const tm=part.slice(0,br);const tx=part.slice(br+5);acc.push({text:tx,label:'Follow-up',time:tm});}
                    return acc;
                  },[]).map((m,mi)=>(
                    <div key={mi} style={{background:'#faf7f3',borderLeft:'3px solid #f97316',borderRadius:'8px',padding:'10px 14px',marginBottom:'8px'}}>
                      <div style={{fontSize:'10px',color:'#f97316',fontWeight:'700',marginBottom:'4px'}}>{m.label} · {m.time}</div>
                      <p style={{margin:0,fontSize:'13px',color:'#4a3728',lineHeight:'1.7'}}>{m.text.trim()}</p>
                    </div>
                  ))}
                  {t.admin_notes && (
                    <div style={{background:'#eff6ff',borderLeft:'3px solid #3b82f6',borderRadius:'8px',padding:'10px 14px',marginTop:'8px'}}>
                      <div style={{fontSize:'10px',color:'#3b82f6',fontWeight:'700',marginBottom:'4px'}}>🛟 Your Previous Reply</div>
                      <p style={{margin:0,fontSize:'13px',color:'#1e3a5f',lineHeight:'1.7'}}>{t.admin_notes}</p>
                    </div>
                  )}
                </div>
                {/* Admin reply box */}
                <div style={{padding:'16px 20px',background:'#fafafa'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>📤 Reply to {t.name}</div>
                  <textarea
                    value={replyDraft[t.ticket_id]||''}
                    onChange={e=>setReplyDraft(p=>({...p,[t.ticket_id]:e.target.value}))}
                    placeholder={`Type your response to ${t.name}... This will be emailed to ${t.email}`}
                    rows={3}
                    style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e8e2d9',borderRadius:'10px',fontSize:'13px',fontFamily:"'Outfit',sans-serif",outline:'none',background:'#fff',color:'#1a1207',resize:'vertical',lineHeight:'1.6',boxSizing:'border-box'}}/>
                  <div style={{display:'flex',gap:'10px',marginTop:'10px',flexWrap:'wrap',alignItems:'center'}}>
                    <select onChange={e=>updateTicket(t.ticket_id,e.target.value,t.priority,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.status}
                      style={{padding:'8px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#fff',cursor:'pointer',outline:'none'}}>
                      <option value="open">🔴 Open</option>
                      <option value="in_progress">🔵 In Progress</option>
                      <option value="resolved">✅ Resolved</option>
                      <option value="closed">⚫ Closed</option>
                    </select>
                    <select onChange={e=>updateTicket(t.ticket_id,t.status,e.target.value,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.priority}
                      style={{padding:'8px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#fff',cursor:'pointer',outline:'none'}}>
                      <option value="low">🟢 Low</option>
                      <option value="normal">🟡 Normal</option>
                      <option value="high">🔴 High</option>
                      <option value="urgent">🚨 Urgent</option>
                    </select>
                    <button onClick={()=>sendAdminReply(t.ticket_id,t.status,t.priority)}
                      disabled={sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()}
                      style={{padding:'9px 20px',background:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'#e8e2d9':'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'#9c8b78':'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",boxShadow:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'none':'0 4px 12px rgba(249,115,22,0.3)'}}>
                      {sendingReply===t.ticket_id?'⏳ Sending...':'📤 Send Reply & Email User'}
                    </button>
                    <button onClick={()=>sendRefund(t.ticket_id,t.email,t.name)}
                      style={{padding:'9px 16px',background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:'10px',color:'#dc2626',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",display:'flex',alignItems:'center',gap:'6px'}}>
                      💸 Issue Refund
                    </button>
                    <a href={`https://mail.google.com/mail/?view=cm&to=${t.email}&su=[${t.ticket_id}] Re: ${encodeURIComponent(t.subject)}&body=${encodeURIComponent(`Hi ${t.name},

`)}`}
                      target="_blank" rel="noreferrer"
                      style={{padding:'9px 16px',background:'#fff',border:'1px solid #e8e2d9',borderRadius:'10px',color:'#6b5744',fontSize:'13px',fontWeight:'600',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                      📧 Open in Gmail
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {(ticketFilter==='all'?tickets:tickets.filter(t=>t.status===ticketFilter)).length===0 && (
              <div style={{background:'#fff',borderRadius:'16px',padding:'48px',textAlign:'center',border:'1px solid #e8e2d9'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>🎫</div>
                <div style={{fontSize:'16px',color:'#9c8b78',fontWeight:'600'}}>No tickets in this category</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div style={{fontFamily:"'Outfit',sans-serif"}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
            {[{icon:'💰',label:'Monthly Revenue',value:`$${(subRevenue?.monthly_revenue||0).toFixed(2)}`,color:'#16a34a'},{icon:'🟢',label:'Active Plans',value:subRevenue?.active_subscriptions||0,color:'#f97316'},{icon:'📋',label:'Total Subscriptions',value:subRevenue?.total_subscriptions||0,color:'#3b82f6'},{icon:'📈',label:'Annual Projection',value:`$${((subRevenue?.monthly_revenue||0)*12).toFixed(0)}`,color:'#a78bfa'}].map((s,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e8e2d9',textAlign:'center'}}>
                <div style={{fontSize:'24px',marginBottom:'8px'}}>{s.icon}</div>
                <div style={{fontSize:'28px',fontWeight:'800',color:s.color,lineHeight:'1',marginBottom:'4px'}}>{s.value}</div>
                <div style={{fontSize:'11px',color:'#9c8b78',fontWeight:'600',textTransform:'uppercase'}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:'16px',border:'1px solid #e8e2d9',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f0ebe4',fontSize:'14px',fontWeight:'700',color:'#1a1207'}}>📋 All Subscriptions</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#faf7f3'}}>
                    {['Invoice','Plan','Billing','Amount','Status','Rides Left','Started'].map(h=>(
                      <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',borderBottom:'1px solid #e8e2d9'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(subRevenue?.subscriptions||[]).map((s,i)=>(
                    <tr key={s.id} style={{borderBottom:'1px solid #f0ebe4',background:i%2===0?'#fff':'#faf7f3'}}>
                      <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:'12px',color:'#f97316',fontWeight:'600'}}>{s.invoice_number}</td>
                      <td style={{padding:'12px 16px',fontWeight:'700',color:'#1a1207'}}>{s.plan_name}</td>
                      <td style={{padding:'12px 16px',color:'#9c8b78',textTransform:'capitalize'}}>{s.billing_cycle}</td>
                      <td style={{padding:'12px 16px',fontWeight:'700',color:'#16a34a'}}>${s.price_paid}</td>
                      <td style={{padding:'12px 16px'}}><span style={{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',background:s.status==='active'?'#f0fdf4':'#fef2f2',color:s.status==='active'?'#16a34a':'#dc2626'}}>{s.status==='active'?'🟢 Active':'⛔ Cancelled'}</span></td>
                      <td style={{padding:'12px 16px',color:'#9c8b78'}}>{s.rides_remaining===null?'∞':s.rides_remaining}</td>
                      <td style={{padding:'12px 16px',color:'#9c8b78',fontSize:'12px'}}>{new Date(s.started_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === 'referrals' && (
        <div style={{background:'#fff',borderRadius:'20px',border:'1px solid #e8e2d9',overflow:'hidden'}}>
          <div style={{padding:'24px 28px',borderBottom:'1px solid #f0ebe4',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <h2 style={{fontSize:'20px',fontWeight:'800',color:'#1a1207',margin:0,fontFamily:"'Outfit',sans-serif"}}>🎁 Referral Tracking</h2>
              <p style={{margin:'4px 0 0',fontSize:'13px',color:'#9c8b78'}}>See who referred whom and track referral rewards</p>
            </div>
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'12px',padding:'10px 18px',textAlign:'center'}}>
              <div style={{fontSize:'22px',fontWeight:'900',color:'#f97316'}}>{referralData.length}</div>
              <div style={{fontSize:'11px',color:'#9c8b78',fontWeight:'600'}}>Total Referrals</div>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            {referralData.length === 0 ? (
              <div style={{padding:'48px',textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>🎁</div>
                <div style={{fontSize:'16px',fontWeight:'700',color:'#1a1207',marginBottom:'6px'}}>No referrals yet</div>
                <div style={{fontSize:'13px',color:'#9c8b78'}}>When users refer friends, they'll appear here</div>
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f7f3ee'}}>
                    {['Referrer','Referrer Email','Referred User','Referred Email','Date','Reward'].map(h => (
                      <th key={h} style={{padding:'12px 20px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referralData.map((r,i) => (
                    <tr key={i} style={{borderBottom:'1px solid #f0ebe4',background:i%2===0?'#fff':'#faf7f3'}}>
                      <td style={{padding:'14px 20px',fontSize:'13px',fontWeight:'700',color:'#1a1207'}}>{r.referrer_name || 'Unknown'}</td>
                      <td style={{padding:'14px 20px',fontSize:'12px',color:'#6b5744'}}>{r.referrer_email || '—'}</td>
                      <td style={{padding:'14px 20px',fontSize:'13px',fontWeight:'700',color:'#1a1207'}}>{r.referred_name || 'Unknown'}</td>
                      <td style={{padding:'14px 20px',fontSize:'12px',color:'#6b5744'}}>{r.referred_email || '—'}</td>
                      <td style={{padding:'14px 20px',fontSize:'12px',color:'#9c8b78'}}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{padding:'14px 20px'}}>
                        <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
                          +{r.points_awarded || 100} pts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gmail' && (
        <div style={{background:'#fff',borderRadius:'20px',border:'1px solid #e8e2d9',overflow:'hidden',height:'82vh',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'20px 28px',borderBottom:'1px solid #f0ebe4',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafafa'}}>
            <div>
              <h2 style={{fontSize:'20px',fontWeight:'800',color:'#1a1207',margin:0,fontFamily:"'Outfit',sans-serif"}}>📬 Gmail Inbox</h2>
              <p style={{margin:'4px 0 0',fontSize:'13px',color:'#9c8b78'}}>noreplymrbuses@gmail.com — Support emails from users</p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noreferrer"
                style={{padding:'9px 18px',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:'#fff',fontSize:'13px',fontWeight:'700',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                📬 Open Full Gmail
              </a>
              <a href="https://mail.google.com/mail/u/0/#search/subject%3AMR-" target="_blank" rel="noreferrer"
                style={{padding:'9px 18px',background:'#fff',border:'1.5px solid #e8e2d9',borderRadius:'10px',color:'#6b5744',fontSize:'13px',fontWeight:'600',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                🔍 Search Tickets
              </a>
              <a href="https://mail.google.com/mail/?view=cm&to=&su=Re:+MR+Bus+Support&body=Hi," target="_blank" rel="noreferrer"
                style={{padding:'9px 18px',background:'#fff',border:'1.5px solid #e8e2d9',borderRadius:'10px',color:'#6b5744',fontSize:'13px',fontWeight:'600',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                ✉️ Compose
              </a>
            </div>
          </div>
          <div style={{flex:1,background:'#f8f9fa',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'40px'}}>
            <div style={{fontSize:'64px'}}>📬</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'20px',fontWeight:'800',color:'#1a1207',marginBottom:'8px',fontFamily:"'Outfit',sans-serif"}}>Gmail is ready</div>
              <div style={{fontSize:'14px',color:'#9c8b78',lineHeight:'1.7',maxWidth:'400px'}}>
                Gmail cannot be embedded due to browser security policies (X-Frame-Options).<br/>
                Click <strong>Open Full Gmail</strong> above to view your inbox in a new tab, or use the <strong>Search Tickets</strong> button to find all MR Bus Portal support emails.
              </div>
            </div>
            <div style={{display:'flex',gap:'12px',marginTop:'8px',flexWrap:'wrap',justifyContent:'center'}}>
              {[
                {label:'📥 All Inbox', url:'https://mail.google.com/mail/u/0/#inbox'},
                {label:'🎫 Ticket Emails', url:'https://mail.google.com/mail/u/0/#search/subject%3A%5BMR-'},
                {label:'📤 Sent', url:'https://mail.google.com/mail/u/0/#sent'},
                {label:'⭐ Starred', url:'https://mail.google.com/mail/u/0/#starred'},
                {label:'📝 Drafts', url:'https://mail.google.com/mail/u/0/#drafts'},
              ].map((item,i)=>(
                <a key={i} href={item.url} target="_blank" rel="noreferrer"
                  style={{padding:'10px 20px',background:'#fff',border:'1.5px solid #e8e2d9',borderRadius:'12px',color:'#4a3728',fontSize:'13px',fontWeight:'600',textDecoration:'none',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  {item.label}
                </a>
              ))}
            </div>
            <div style={{marginTop:'16px',padding:'14px 20px',background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:'12px',maxWidth:'480px'}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#f97316',marginBottom:'4px'}}>💡 Pro Tip</div>
              <div style={{fontSize:'12px',color:'#9c8b78',lineHeight:'1.6'}}>
                Use <strong>Search Tickets</strong> to filter all emails with ticket IDs like [MR-2026-XXXXX]. Reply directly from Gmail and the user will receive your response. You can also use the <strong>📧 Gmail</strong> button on each support ticket above for one-click replies.
              </div>
            </div>
          </div>
        </div>
      )}


      </div>

      {/* ── BUS MODAL ── */}
      {busModal && (
        <div style={s.modalOverlay} onClick={() => setBusModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{busModal === 'create' ? '+ Add New Bus' : '✏️ Edit Bus'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { key: 'bus', label: 'Bus Name', placeholder: 'MR Express' },
                { key: 'origin', label: 'Origin', placeholder: 'Chicago, IL' },
                { key: 'destination', label: 'Destination', placeholder: 'Atlanta, GA' },
                { key: 'departure', label: 'Departure', placeholder: '12-25-2026 08:00' },
                { key: 'arrival', label: 'Arrival', placeholder: '12-25-2026 14:00' },
                { key: 'duration', label: 'Duration', placeholder: '6h 0m' },
                { key: 'price', label: 'Price ($)', placeholder: '39' },
                { key: 'seats_total', label: 'Total Seats', placeholder: '32' },
                { key: 'amenities', label: 'Amenities', placeholder: 'WiFi,USB,AC' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.key === 'amenities' ? '1 / -1' : 'auto' }}>
                  <label style={s.label}>{f.label}</label>
                  <input style={s.input} placeholder={f.placeholder} value={busForm[f.key]} onChange={e => setBusForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button style={{ ...s.primaryBtn, flex: 1 }} onClick={saveBus}>
                {busModal === 'create' ? 'Create Bus' : 'Save Changes'}
              </button>
              <button style={{ ...s.secondaryBtn, flex: 1 }} onClick={() => setBusModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  sidebar: { width: '220px', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '24px 0', height: '100vh', position: 'sticky', top: 0, flexShrink: 0 },
  sidebarLogo: { fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: '#fff', textDecoration: 'none', padding: '0 20px', marginBottom: '28px', display: 'block' },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 20px', fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', borderRadius: '0', transition: 'all 0.15s', margin: '1px 0' },
  navItemActive: { background: 'rgba(249,115,22,0.12)', color: '#fb923c', borderRight: '2px solid #f97316' },
  sidebarFooter: { padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  logoutBtn: { width: '100%', padding: '9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Outfit', sans-serif" },
  main: { flex: 1, padding: '40px', overflowY: 'auto', position: 'relative' },
  toast: { position: 'fixed', top: '20px', right: '20px', zIndex: 9999, color: '#fff', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  pageHeader: { marginBottom: '28px' },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '28px', color: '#fff', marginBottom: '4px' },
  pageSubtitle: { fontSize: '14px', color: 'rgba(255,255,255,0.35)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' },
  statCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' },
  statIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '4px' },
  statValue: { fontFamily: "'Playfair Display', serif", fontSize: '26px', color: '#fff', lineHeight: '1', marginBottom: '4px' },
  statSub: { fontSize: '11px', color: 'rgba(255,255,255,0.35)' },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', overflowX: 'auto' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#fff', marginBottom: '16px' },
  tableRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  th: { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', fontSize: '13px', verticalAlign: 'middle' },
  searchInput: { flex: 1, minWidth: '260px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontSize: '13px', fontFamily: "'Outfit', sans-serif", outline: 'none' },
  filterBtn: { padding: '9px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" },
  filterBtnActive: { background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' },
  dangerBtn: { padding: '5px 12px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)', color: '#f87171', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: "'Outfit', sans-serif" },
  actionBtn: { padding: '5px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9c8b78', borderRadius: '7px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: "'Outfit', sans-serif" },
  primaryBtn: { background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', fontFamily: "'Outfit', sans-serif", outline: 'none', boxSizing: 'border-box' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' },
  modal: { background: '#1a0f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#fff', marginBottom: '24px' },
};