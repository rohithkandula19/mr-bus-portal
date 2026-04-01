import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const _gf = document.createElement('link');
_gf.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
_gf.rel = 'stylesheet';
document.head.appendChild(_gf);

export default function BookingDetail() {
  const { transactionId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [transactionId]); // eslint-disable-line

  const fetchBooking = async () => {
    try {
      // Try to fetch from logged-in user's bookings first
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const bookings = await res.json();
          const found = bookings.find(b => b.transaction_id === transactionId);
          if (found) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            setBooking({ ...found, user_name: user.name || 'Passenger' });
            setLoading(false);
            return;
          }
        }
      }
      // If not logged in or not found in their bookings, show public view
      setError('Please log in to view full booking details.');
    } catch (err) {
      setError('Unable to load booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const originCode = booking?.origin?.split(',')[0]?.substring(0, 3).toUpperCase() || '???';
  const destCode = booking?.destination?.split(',')[0]?.substring(0, 3).toUpperCase() || '???';
  const departureTime = booking?.departure?.split(' ')[1] || '';
  const departureDate = booking?.departure?.split(' ')[0] || '';

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <div style={s.spinner}>🚌</div>
          <p style={s.loadingText}>Loading boarding pass...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={s.page}>
        <div style={s.errorCard}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
          <h2 style={s.errorTitle}>Booking #{transactionId}</h2>
          <p style={s.errorSub}>{error || 'Booking not found.'}</p>
          <Link to="/login" style={s.loginBtn}>Sign in to view details</Link>
          <Link to="/" style={s.homeLink}>← Back to MR Bus Portal</Link>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmed';

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <Link to="/" style={s.headerLogo}>
          MR <em style={{ fontStyle: 'italic', color: '#f97316' }}>Bus</em> Portal
        </Link>
        <div style={s.headerTag}>Digital Boarding Pass</div>
      </div>

      {/* Status banner */}
      <div style={{ ...s.statusBanner, background: isConfirmed ? 'linear-gradient(135deg,#16a34a,#4ade80)' : '#ef4444' }}>
        <span style={s.statusIcon}>{isConfirmed ? '✅' : '❌'}</span>
        <span style={s.statusText}>{isConfirmed ? 'Booking Confirmed' : 'Booking Cancelled'}</span>
      </div>

      {/* Main pass card */}
      <div style={s.passCard}>

        {/* Pass header */}
        <div style={s.passHeader}>
          <div>
            <div style={s.passLogo}>🚌 MR Bus Portal</div>
            <div style={s.passTagline}>Your journey starts here</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={s.passType}>BOARDING PASS</div>
            <div style={s.passClass}>ECONOMY CLASS</div>
          </div>
        </div>

        {/* Passenger info */}
        <div style={s.passengerBar}>
          <div style={s.pf}>
            <div style={s.pfl}>Passenger</div>
            <div style={s.pfv}>{booking.user_name?.toUpperCase()}</div>
          </div>
          <div style={s.pf}>
            <div style={s.pfl}>Booking Ref</div>
            <div style={{ ...s.pfv, color: '#fb923c', fontFamily: 'monospace' }}>{booking.transaction_id}</div>
          </div>
          <div style={s.pf}>
            <div style={s.pfl}>Date</div>
            <div style={{ ...s.pfv, color: '#fb923c' }}>{departureDate}</div>
          </div>
        </div>

        {/* Route */}
        <div style={s.route}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={s.cityCode}>{originCode}</div>
            <div style={s.cityName}>{booking.origin}</div>
            <div style={s.timeLabel}>DEPARTURE</div>
            <div style={s.timeVal}>{departureTime}</div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={s.routeViz}>
              <div style={s.routeDot} />
              <div style={s.routeLine} />
              <span style={{ fontSize: '24px' }}>🚌</span>
              <div style={s.routeLine} />
              <div style={s.routeDot} />
            </div>
            <div style={s.duration}>{booking.duration || 'N/A'}</div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={s.cityCode}>{destCode}</div>
            <div style={s.cityName}>{booking.destination}</div>
            <div style={s.timeLabel}>ARRIVAL</div>
            <div style={s.timeVal}>{booking.arrival?.split(' ')[1] || 'N/A'}</div>
          </div>
        </div>

        {/* Details grid */}
        <div style={s.detailsGrid}>
          {[
            { label: 'Seat', value: booking.seat_number, highlight: true },
            { label: 'Bus', value: booking.bus_name },
            { label: 'Duration', value: booking.duration || 'N/A' },
            { label: 'Fare', value: `$${booking.price}`, highlight: true },
          ].map((d, i) => (
            <div key={i} style={s.detailItem}>
              <div style={s.detailLabel}>{d.label}</div>
              <div style={{ ...s.detailValue, color: d.highlight ? '#f97316' : '#1a1207', fontSize: d.highlight ? '22px' : '15px' }}>
                {d.value}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLeft} />
          <div style={s.dividerDots}>{Array.from({ length: 20 }).map((_, i) => <div key={i} style={s.dividerDot} />)}</div>
          <div style={s.dividerRight} />
        </div>

        {/* Transaction info */}
        <div style={s.txnRow}>
          <div style={s.txnItem}>
            <div style={s.txnLabel}>Transaction ID</div>
            <div style={s.txnValue}>{booking.transaction_id}</div>
          </div>
          <div style={s.txnItem}>
            <div style={s.txnLabel}>Status</div>
            <div style={{ ...s.txnValue, color: isConfirmed ? '#16a34a' : '#ef4444' }}>
              {isConfirmed ? '✅ Confirmed' : '❌ Cancelled'}
            </div>
          </div>
        </div>

        {/* Notice */}
        <div style={s.notice}>
          ⚠️ Please arrive at the bus terminal at least 15 minutes before departure · Keep this pass handy · Non-transferable
        </div>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <Link to="/my-bookings" style={s.actionBtn}>📋 View All Bookings</Link>
        <Link to="/" style={s.actionBtnSecondary}>🏠 Back to Home</Link>
      </div>

      <div style={s.footer}>
        MR Bus Portal · Secure booking system · © 2026
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: `radial-gradient(ellipse at 20% 30%,rgba(249,115,22,0.1) 0%,transparent 60%),linear-gradient(155deg,#0e0618,#08100f)`, fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0 40px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#fff' },
  spinner: { fontSize: '48px', animation: 'spin 1s linear infinite', marginBottom: '16px' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: '14px' },
  errorCard: { background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '420px', width: '90%', textAlign: 'center', marginTop: '80px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  errorTitle: { fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#1a1207', marginBottom: '10px' },
  errorSub: { fontSize: '14px', color: '#9c8b78', marginBottom: '24px' },
  loginBtn: { display: 'block', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', marginBottom: '12px' },
  homeLink: { display: 'block', color: '#f97316', textDecoration: 'none', fontSize: '13px', fontWeight: '600' },

  header: { width: '100%', maxWidth: '580px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' },
  headerLogo: { fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '700', color: '#fff', textDecoration: 'none' },
  headerTag: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' },

  statusBanner: { width: '100%', maxWidth: '580px', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  statusIcon: { fontSize: '18px' },
  statusText: { fontSize: '15px', fontWeight: '700', color: '#fff' },

  passCard: { width: '100%', maxWidth: '580px', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.4)', marginBottom: '20px' },

  passHeader: { background: 'linear-gradient(135deg,#1c0e04,#3d1f06,#0e0618)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  passLogo: { color: '#fff', fontSize: '17px', fontWeight: '800' },
  passTagline: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' },
  passType: { color: '#fb923c', fontSize: '12px', fontWeight: '800', letterSpacing: '3px' },
  passClass: { color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '2px', marginTop: '2px' },

  passengerBar: { background: 'rgba(26,12,4,0.95)', padding: '12px 24px', display: 'flex', gap: '0' },
  pf: { flex: 1, paddingRight: '16px' },
  pfl: { fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '3px', textTransform: 'uppercase' },
  pfv: { fontSize: '15px', fontWeight: '800', color: '#fff', letterSpacing: '0.5px' },

  route: { display: 'flex', alignItems: 'center', padding: '24px 24px 16px' },
  cityCode: { fontFamily: "'Playfair Display', serif", fontSize: '44px', fontWeight: '900', color: '#1a1207', letterSpacing: '1px', lineHeight: 1 },
  cityName: { fontSize: '11px', color: '#9c8b78', marginTop: '2px', marginBottom: '8px' },
  timeLabel: { fontSize: '9px', color: '#c4b8a8', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' },
  timeVal: { fontSize: '22px', fontWeight: '800', color: '#f97316' },
  routeViz: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '6px' },
  routeDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#f97316', flexShrink: 0 },
  routeLine: { flex: 1, height: '2px', background: 'repeating-linear-gradient(90deg,#f97316 0,#f97316 6px,transparent 6px,transparent 10px)', maxWidth: '40px' },
  duration: { fontSize: '12px', fontWeight: '700', color: '#9c8b78', background: '#faf7f3', borderRadius: '20px', padding: '4px 12px', display: 'inline-block' },

  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0', borderTop: '1px solid #f0ebe4', borderBottom: '1px solid #f0ebe4', margin: '0 24px' },
  detailItem: { padding: '14px 10px', textAlign: 'center', borderRight: '1px solid #f0ebe4' },
  detailLabel: { fontSize: '9px', color: '#9c8b78', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '5px', textTransform: 'uppercase' },
  detailValue: { fontWeight: '800' },

  divider: { display: 'flex', alignItems: 'center', background: '#faf7f3', height: '26px', position: 'relative' },
  dividerLeft: { width: '22px', height: '22px', background: 'rgba(14,6,24,0.9)', borderRadius: '50%', flexShrink: 0, marginLeft: '-11px' },
  dividerDots: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' },
  dividerDot: { width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(14,6,24,0.9)' },
  dividerRight: { width: '22px', height: '22px', background: 'rgba(14,6,24,0.9)', borderRadius: '50%', flexShrink: 0, marginRight: '-11px' },

  txnRow: { display: 'flex', padding: '16px 24px', gap: '24px', background: '#faf7f3' },
  txnItem: {},
  txnLabel: { fontSize: '10px', color: '#9c8b78', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' },
  txnValue: { fontSize: '13px', fontWeight: '700', color: '#1a1207', fontFamily: 'monospace' },

  notice: { background: '#fff7ed', borderTop: '1px solid #fed7aa', padding: '10px 24px', fontSize: '10px', color: '#c2410c', textAlign: 'center', fontWeight: '500' },

  actions: { display: 'flex', gap: '12px', width: '100%', maxWidth: '580px', marginBottom: '20px' },
  actionBtn: { flex: 1, padding: '13px', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', textAlign: 'center', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' },
  actionBtnSecondary: { flex: 1, padding: '13px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' },
  footer: { fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
};