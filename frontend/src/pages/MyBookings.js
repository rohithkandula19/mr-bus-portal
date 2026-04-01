import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BoardingPass from '../components/BoardingPass';
import { formatDate } from '../utils/dateFormat';
import { SmartRebook, TripSummaryButton } from '../components/AIFeatures';
import ExpenseReportButton from '../components/ExpenseReport';
import SeatMapModal from '../components/SeatMapModal';
export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardingPass, setBoardingPass] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [rescheduling, setRescheduling] = useState(null);
  const [availableBuses, setAvailableBuses] = useState([]);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSelectedBus, setRescheduleSelectedBus] = useState(null);
  const [rescheduleShowSeatMap, setRescheduleShowSeatMap] = useState(false);
  const [rescheduleBookedSeats, setRescheduleBookedSeats] = useState([]);
  const [rescheduleSelectedSeat, setRescheduleSelectedSeat] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(100);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const getUserFromStorage = () => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw || raw === "undefined") return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const user = getUserFromStorage();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchBookings();
    fetchLoyaltyData();
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // eslint-disable-line

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch bookings: - MyBookings.js:58", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoyaltyData = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/bookings/award-completed-trip-points`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
      const [balRes, histRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/loyalty/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${process.env.REACT_APP_API_URL}/loyalty/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setLoyalty(await balRes.json());
      const hist = await histRes.json();
      setPointsHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error("Loyalty fetch failed: - MyBookings.js:78", err);
    }
  };

  const handleRedeem = async () => {
    if (redeemPoints < 100) { alert("Minimum redemption is 100 points ($1.00)"); return; }
    if (redeemPoints > (loyalty?.points || 0)) { alert("You don't have enough points."); return; }
    setRedeemLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/loyalty/redeem?points_to_redeem=${redeemPoints}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setRedeemResult(data);
        fetchLoyaltyData();
      } else {
        alert(`❌ ${data.detail || data.message || "Redemption failed"}`);
      }
    } catch { alert("Redemption failed. Please try again."); }
    finally { setRedeemLoading(false); }
  };

  const closeRedeem = () => { setShowRedeem(false); setRedeemResult(null); setRedeemPoints(100); };

  const isTripCompleted = (booking) => {
    try {
      const parts = booking.departure.split(" ");
      if (parts.length >= 2) {
        const [month, day, year] = parts[0].split("-");
        const time = parts[1];
        const depDate = new Date(`${year}-${month}-${day}T${time}`);
        return depDate < new Date();
      }
      return new Date(booking.departure) < new Date();
    }
    catch { return false; }
  };

  const cancelBooking = async (transactionId) => {
    if (!window.confirm(`Cancel booking ${transactionId}?\n\nNote: 25% fee applies if cancelled after 24 hours.`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/cancel/${transactionId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "cancelled") {
        alert(`✅ Booking cancelled!\nRefund: $${data.refund_amount}\n${data.fee_message}`);
        fetchBookings(); fetchLoyaltyData();
      } else { alert(`❌ ${data.message}`); }
    } catch { alert("Failed to cancel booking."); }
  };

  const resendReceipt = async (transactionId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/resend-receipt/${transactionId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.status === "sent" ? `✅ ${data.message}` : `❌ ${data.message}`);
    } catch { alert("Failed to resend receipt."); }
  };

  // ── FIX 3: openReschedule with proper validation and error handling ──
  const openReschedule = async (booking) => {
    setRescheduling(booking);
    setRescheduleSelectedBus(null);
    setRescheduleShowSeatMap(false);
    setRescheduleSelectedSeat(null);
    setRescheduleBookedSeats([]);
    try {
      const origin = booking.origin || '';
      const destination = booking.destination || '';
      if (!origin || !destination) { alert("Cannot reschedule: missing route info"); return; }
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buses/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
      const data = await res.json();
      const buses = Array.isArray(data) ? data.slice(0, 8) : [];
      if (buses.length === 0) { alert("No alternative buses found for this route."); return; }
      setAvailableBuses(buses);
      setShowReschedule(true);
    } catch (e) { alert("Failed to load buses for rescheduling. Please try again."); }
  };

  const handleRescheduleBusSelect = async (bus) => {
    setRescheduleSelectedBus(bus);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/seats/${bus.id}`);
      const data = await res.json();
      setRescheduleBookedSeats(Array.isArray(data.booked_seats) ? data.booked_seats : []);
    } catch { setRescheduleBookedSeats([]); }
    setRescheduleShowSeatMap(true);
  };

  // ── FIX 3: confirmReschedule without popup dialog - auto reschedules on click ──
  const confirmReschedule = async (newBus) => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        new_bus_id: newBus.id,
        new_departure: newBus.departure || '',
        new_arrival: newBus.arrival || '',
        new_duration: newBus.duration || '',
        new_price: newBus.price || 0
      });
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/reschedule/${rescheduling.transaction_id}?${params}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'rescheduled' || data.status === 'ok') {
        alert(`✅ Booking rescheduled!\n\nOld: ${rescheduling.departure}\nNew: ${newBus.departure ? formatDate(newBus.departure) : 'See bookings'}\nSeat: ${rescheduleSelectedSeat || rescheduling.seat_number}\n\n📧 Confirmation email sent!`);
        setShowReschedule(false); setRescheduleShowSeatMap(false); setRescheduleSelectedBus(null); setRescheduleSelectedSeat(null); setRescheduling(null); fetchBookings();
      } else { alert(`❌ ${data.message || 'Reschedule failed'}`); }
    } catch { alert("Reschedule failed. Please try again."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    navigate("/login");
  };

  const filteredBookings = bookings.filter(b => {
    const matchFilter = activeFilter === 'all' ? true : activeFilter === 'upcoming' ? b.status === 'confirmed' : b.status === 'cancelled';
    const matchSearch = searchQuery === '' ? true : (
      b.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchFilter && matchSearch;
  });

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const totalSpent = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.price, 0);
  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";
  const dollarValue = loyalty ? (loyalty.dollar_value ?? loyalty.points / 100) : 0;
  const maxRedeem = loyalty?.points || 0;
  const redeemDollarValue = (redeemPoints / 100).toFixed(2);

  return (
    <div style={{ fontFamily:"'Outfit', sans-serif", minHeight:"100vh", background:"#f7f3ee" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ ...nav.bar, boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.15)" : "none", background: scrolled ? "rgba(8,6,16,0.97)" : "rgba(8,6,16,0.85)" }}>
        <Link to="/" style={nav.logo}>MR <em style={{ fontStyle:"italic", color:"#f97316" }}>Bus</em> Portal</Link>
        <div style={nav.links}>
          <Link to="/" style={nav.link}>🔍 Routes</Link>
          <Link to="/my-bookings" style={{ ...nav.link, color:"#fb923c", background:"rgba(249,115,22,0.1)", borderRadius:"10px" }}>📋 Bookings</Link>
        </div>
        <div style={nav.right}>
          {loyalty && (
            <div style={{ background:"rgba(249,115,22,0.12)", border:"1px solid rgba(249,115,22,0.25)", padding:"5px 12px", borderRadius:"20px", display:"flex", alignItems:"center", gap:"6px" }}>
              <span style={{ fontSize:"13px" }}>{loyalty.tier_emoji || "🥉"}</span>
              <span style={{ fontSize:"12px", fontWeight:"700", color:"#fb923c" }}>{loyalty.points?.toLocaleString()} pts</span>
            </div>
          )}
          <div style={nav.userPill}>
            <div style={nav.avatar}>{initials}</div>
            <span style={nav.userName}>{user?.name}</span>
          </div>
          <button style={nav.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background:`radial-gradient(ellipse at 20% 50%,rgba(249,115,22,0.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(139,92,246,0.08) 0%,transparent 50%),linear-gradient(155deg,#0e0618,#08100f)`, padding:"52px 52px 36px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize:"32px 32px", pointerEvents:"none" }} />
        <div style={{ maxWidth:"900px", margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:"rgba(249,115,22,0.7)", letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:"10px" }}>✈ Travel History</div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
            <div>
              <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:"38px", color:"#fff", margin:"0 0 6px", letterSpacing:"-1px" }}>My Bookings</h1>
              <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.35)", margin:0 }}>Hello {user?.name?.split(' ')[0]} 👋 — manage your trips below</p>
            </div>
            <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
              <Link to="/" style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", padding:"11px 22px", borderRadius:"12px", textDecoration:"none", fontWeight:"700", fontSize:"13px", boxShadow:"0 4px 16px rgba(249,115,22,0.4)", flexShrink:0 }}>
                + Book New Trip
              </Link>
              <ExpenseReportButton bookings={bookings} user={user} loyalty={loyalty} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginTop:"28px" }}>
            {[
              { icon:"🎫", n: bookings.length, l:"Total Bookings" },
              { icon:"✅", n: confirmedBookings.length, l:"Confirmed" },
              { icon:"💰", n:`$${totalSpent}`, l:"Total Spent" },
              { icon:"🏆", n:`${loyalty?.points?.toLocaleString() || 0}`, l:"Loyalty Points" },
            ].map((stat, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px", padding:"16px 18px", backdropFilter:"blur(10px)" }}>
                <div style={{ fontSize:"20px", marginBottom:"6px" }}>{stat.icon}</div>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"24px", color:"#fff", lineHeight:"1", marginBottom:"3px" }}>{stat.n}</div>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", fontWeight:"600", letterSpacing:"0.5px" }}>{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOYALTY CARD ── */}
      {loyalty && (
        <div style={{ background:"#fff", borderBottom:"1px solid #f0ebe4" }}>
          <div style={{ maxWidth:"900px", margin:"0 auto", padding:"20px 52px" }}>
            <div style={{ background:"linear-gradient(135deg,#fff7ed,#fef3e2)", border:"1.5px solid rgba(249,115,22,0.2)", borderRadius:"20px", padding:"20px 24px", display:"flex", alignItems:"center", gap:"24px", flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                <div style={{ width:"52px", height:"52px", borderRadius:"16px", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", boxShadow:"0 4px 16px rgba(249,115,22,0.35)" }}>
                  {loyalty.tier_emoji || "🥉"}
                </div>
                <div>
                  <div style={{ fontSize:"16px", fontWeight:"800", color:loyalty.tier_color || "#f97316" }}>{loyalty.tier} Member</div>
                  <div style={{ fontSize:"12px", color:"#9c8b78", marginTop:"2px" }}>
                    {loyalty.points_to_next > 0
                      ? `$${loyalty.points_to_next} more to reach ${loyalty.tier === "Bronze" ? "Silver" : loyalty.tier === "Silver" ? "Gold" : "Platinum"}`
                      : "🎉 Maximum tier achieved!"}
                  </div>
                </div>
              </div>

              <div style={{ textAlign:"center", minWidth:"100px" }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"32px", color:"#1a1207", lineHeight:"1" }}>{loyalty.points?.toLocaleString()}</div>
                <div style={{ fontSize:"10px", color:"#9c8b78", textTransform:"uppercase", letterSpacing:"1px", marginTop:"2px" }}>Points</div>
                <div style={{ fontSize:"12px", color:"#f97316", fontWeight:"800", marginTop:"2px" }}>${dollarValue.toFixed(2)} value</div>
              </div>

              <div style={{ flex:1, minWidth:"160px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#9c8b78", marginBottom:"5px" }}>
                  <span>Spent: ${loyalty.total_earned?.toLocaleString()}</span>
                  <span>Next: ${loyalty.next_tier}</span>
                </div>
                <div style={{ height:"8px", background:"#f0ebe4", borderRadius:"10px", overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:"10px", transition:"width 0.8s ease", width:`${Math.min(100,((loyalty.total_earned||0)/(loyalty.next_tier||1))*100)}%`, background:`linear-gradient(90deg,${loyalty.tier_color || "#f97316"},#fbbf24)` }} />
                </div>
              </div>

              <div style={{ display:"flex", gap:"8px" }}>
                <button
                  style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.25)", color:"#c2410c", padding:"9px 16px", borderRadius:"10px", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"'Outfit', sans-serif" }}
                  onClick={() => setShowHistory(!showHistory)}>
                  📊 History
                </button>
                <button
                  style={{ background: loyalty.points >= 100 ? "linear-gradient(135deg,#f97316,#ea580c)" : "#f0ebe4", border:"none", color: loyalty.points >= 100 ? "#fff" : "#9c8b78", padding:"9px 18px", borderRadius:"10px", fontSize:"12px", fontWeight:"700", cursor: loyalty.points >= 100 ? "pointer" : "not-allowed", fontFamily:"'Outfit', sans-serif", boxShadow: loyalty.points >= 100 ? "0 4px 14px rgba(249,115,22,0.35)" : "none", whiteSpace:"nowrap" }}
                  onClick={() => loyalty.points >= 100 && setShowRedeem(true)}>
                  🎁 Redeem Points
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POINTS HISTORY ── */}
      {showHistory && pointsHistory.length > 0 && (
        <div style={{ maxWidth:"900px", margin:"0 auto", padding:"16px 52px 0" }}>
          <div style={{ background:"#fff", borderRadius:"18px", padding:"22px", border:"1px solid #e8e2d9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:"18px", color:"#1a1207", margin:0 }}>🏆 Points History</h3>
              <button style={{ background:"none", border:"none", color:"#9c8b78", cursor:"pointer", fontSize:"18px" }} onClick={() => setShowHistory(false)}>✕</button>
            </div>
            {pointsHistory.slice(0, 8).map((tx) => {
              const isEarned = tx.type === "earned";
              const isCancelled = tx.type === "cancelled";
              return (
                <div key={tx.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #faf7f3" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", background: isEarned ? "#f0fdf4" : isCancelled ? "#fef2f2" : "#fff7ed" }}>
                      {isEarned ? "✅" : isCancelled ? "❌" : "🎁"}
                    </div>
                    <div>
                      <div style={{ fontSize:"13px", color:"#1a1207", fontWeight:"600" }}>{tx.description}</div>
                      <div style={{ fontSize:"10px", color:"#b0a090" }}>= ${(Math.abs(tx.points)/100).toFixed(2)}</div>
                    </div>
                  </div>
                  <span style={{ padding:"4px 12px", borderRadius:"8px", fontSize:"12px", fontWeight:"700",
                    background: isEarned ? "#f0fdf4" : isCancelled ? "#fef2f2" : "#fff7ed",
                    color: isEarned ? "#16a34a" : isCancelled ? "#dc2626" : "#c2410c",
                    border: `1px solid ${isEarned ? "#bbf7d0" : isCancelled ? "#fca5a5" : "#fed7aa"}` }}>
                    {isEarned ? "+" : ""}{tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FILTER + SEARCH BAR ── */}
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"20px 52px 8px" }}>
        <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", background:"#fff", border:"1px solid #e8e2d9", borderRadius:"12px", padding:"3px", gap:"2px" }}>
            {[
              { key:'all', label:`All (${bookings.length})` },
              { key:'upcoming', label:`✅ Confirmed (${confirmedBookings.length})` },
              { key:'cancelled', label:`❌ Cancelled (${cancelledBookings.length})` },
              { key:'completed', label:`✅ Completed (${bookings.filter(b => b.status === 'confirmed' && isTripCompleted(b)).length})` },
            ].map(f => (
              <button key={f.key}
                style={{ padding:"7px 14px", borderRadius:"9px", border:"none", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"'Outfit', sans-serif", transition:"all 0.2s",
                  background: activeFilter===f.key ? "linear-gradient(135deg,#f97316,#ea580c)" : "transparent",
                  color: activeFilter===f.key ? "#fff" : "#9c8b78",
                  boxShadow: activeFilter===f.key ? "0 2px 8px rgba(249,115,22,0.3)" : "none" }}
                onClick={() => setActiveFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ flex:1, minWidth:"200px", position:"relative" }}>
            <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", pointerEvents:"none" }}>🔍</span>
            <input
              style={{ width:"100%", padding:"9px 12px 9px 36px", border:"1px solid #e8e2d9", borderRadius:"12px", fontSize:"13px", background:"#fff", fontFamily:"'Outfit', sans-serif", outline:"none", boxSizing:"border-box" }}
              placeholder="Search by ID, city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── BOOKINGS LIST ── */}
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"8px 52px 60px" }}>
        {loading ? (
          <div style={{ background:"#fff", borderRadius:"20px", padding:"60px", textAlign:"center", border:"1px solid #e8e2d9" }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>⏳</div>
            <div style={{ fontSize:"15px", color:"#9c8b78", fontWeight:"600" }}>Loading your bookings...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ background:"#fff", borderRadius:"24px", padding:"60px", textAlign:"center", border:"1px solid #e8e2d9", boxShadow:"0 4px 20px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:"56px", marginBottom:"16px" }}>🎫</div>
            <div style={{ fontSize:"20px", fontWeight:"700", color:"#1a1207", marginBottom:"8px", fontFamily:"'Playfair Display', serif" }}>
              {searchQuery ? "No matching bookings" : activeFilter==='all' ? "No bookings yet" : `No ${activeFilter} bookings`}
            </div>
            <div style={{ color:"#9c8b78", marginBottom:"28px", fontSize:"14px" }}>
              {searchQuery ? "Try a different search term" : activeFilter==='all' ? "Book your first bus ride today!" : "Try a different filter"}
            </div>
            <Link to="/" style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", padding:"13px 32px", borderRadius:"13px", textDecoration:"none", fontWeight:"700", fontSize:"14px", display:"inline-block", boxShadow:"0 4px 16px rgba(249,115,22,0.35)" }}>
              Search Buses →
            </Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {filteredBookings.map((booking) => {
              const completed = isTripCompleted(booking);
              const pointsEarned = booking.price;
              const isConfirmed = booking.status === "confirmed";
              return (
                <div key={booking.id} style={{ background:"#fff", border:`1px solid ${isConfirmed ? "#e8e2d9" : "#fde8e8"}`, borderRadius:"20px", overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", transition:"transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.05)"; }}>
                  <div style={{ height:"3px", background: isConfirmed ? "linear-gradient(90deg,#f97316,#fbbf24)" : "linear-gradient(90deg,#e8e2d9,#f0ebe4)" }} />
                  <div style={{ padding:"20px 24px", display:"flex", gap:"16px", alignItems:"flex-start" }}>
                    <div style={{ width:"48px", height:"48px", borderRadius:"14px", background: isConfirmed ? "linear-gradient(135deg,#fff7ed,#fef3e2)" : "#f7f3ee", border:`1px solid ${isConfirmed ? "#fed7aa" : "#e8e2d9"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", flexShrink:0 }}>
                      🚌
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", marginBottom:"6px" }}>
                        <div>
                          <div style={{ fontSize:"16px", fontWeight:"800", color:"#1a1207", letterSpacing:"-0.3px" }}>
                            {booking.origin.split(',')[0]} → {booking.destination.split(',')[0]}
                          </div>
                          <div style={{ fontSize:"12px", color:"#9c8b78", marginTop:"2px" }}>
                            {formatDate(booking.departure)} · Seat <strong style={{ color:"#f97316" }}>{booking.seat_number}</strong> · {booking.bus_name}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"24px", color:"#1a1207", lineHeight:"1" }}>${booking.price}</div>
                          <div style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"8px", fontWeight:"600", display:"inline-block", marginTop:"4px",
                            ...(isConfirmed
                              ? { background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0" }
                              : { background:"#fef2f2", color:"#dc2626", border:"1px solid #fca5a5" }) }}>
                            {isConfirmed ? "✅ Confirmed" : "❌ Cancelled"}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"12px" }}>
                        <span style={{ fontSize:"10px", background:"#f7f3ee", border:"1px solid #e8e2d9", color:"#9c8b78", padding:"3px 9px", borderRadius:"6px", fontFamily:"monospace", fontWeight:"600" }}>
                          {booking.transaction_id}
                        </span>
                        {booking.duration && (
                          <span style={{ fontSize:"10px", background:"#f7f3ee", border:"1px solid #e8e2d9", color:"#9c8b78", padding:"3px 9px", borderRadius:"6px" }}>
                            ⏱ {booking.duration}
                          </span>
                        )}
                        {isConfirmed && (
                          <span style={{ fontSize:"10px", padding:"3px 9px", borderRadius:"6px", fontWeight:"600",
                            background: completed ? "#f0fdf4" : "#fefce8",
                            color: completed ? "#16a34a" : "#92400e",
                            border: `1px solid ${completed ? "#bbf7d0" : "#fde047"}` }}>
                            {completed ? `✅ +${pointsEarned} pts earned` : `⏳ +${pointsEarned} pts after trip`}
                          </span>
                        )}
                      </div>
                      {isConfirmed && (
                        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"10px" }}>
                          <TripSummaryButton booking={booking} />
                          <SmartRebook booking={booking} onRescheduled={fetchBookings} />
                        </div>
                      )}
                      {isConfirmed && (
                        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                          <button style={btnStyle.orange} onClick={() => setBoardingPass({...booking, user_name:user?.name})}>
                            🎫 Boarding Pass
                          </button>
                          <button style={btnStyle.orange} onClick={() => resendReceipt(booking.transaction_id)}>
                            📧 Receipt
                          </button>
                          <button style={btnStyle.grey} onClick={() => openReschedule(booking)}>
                            🔄 Reschedule
                          </button>
                          {!completed && (
                            <button style={btnStyle.red} onClick={() => cancelBooking(booking.transaction_id)}>
                              ✕ Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {boardingPass && <BoardingPass booking={boardingPass} onClose={() => setBoardingPass(null)} />}

      {/* ── REDEEM MODAL ── */}
      {showRedeem && loyalty && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:6000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(6px)" }}>
          <div style={{ background:"#fff", borderRadius:"24px", padding:"36px", maxWidth:"440px", width:"100%", boxShadow:"0 40px 80px rgba(0,0,0,0.25)" }}>
            {redeemResult ? (
              <>
                <div style={{ textAlign:"center", marginBottom:"24px" }}>
                  <div style={{ fontSize:"52px", marginBottom:"12px" }}>🎉</div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:"24px", color:"#1a1207", margin:"0 0 8px" }}>Points Redeemed!</h2>
                  <p style={{ fontSize:"14px", color:"#9c8b78" }}>Your discount has been applied.</p>
                </div>
                <div style={{ background:"linear-gradient(135deg,#fff7ed,#fef3e2)", border:"1.5px solid #f97316", borderRadius:"16px", padding:"20px", marginBottom:"24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                    <span style={{ fontSize:"13px", color:"#9c8b78", fontWeight:"600" }}>Points Redeemed</span>
                    <span style={{ fontSize:"13px", fontWeight:"800", color:"#c2410c" }}>−{redeemResult.points_redeemed} pts</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
                    <span style={{ fontSize:"13px", color:"#9c8b78", fontWeight:"600" }}>Discount Earned</span>
                    <span style={{ fontSize:"22px", fontWeight:"900", color:"#16a34a", fontFamily:"'Playfair Display', serif" }}>${redeemResult.discount_amount?.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop:"1px dashed #fed7aa", paddingTop:"10px", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"12px", color:"#9c8b78" }}>Remaining</span>
                    <span style={{ fontSize:"13px", fontWeight:"700", color:"#1a1207" }}>{redeemResult.remaining_points} pts</span>
                  </div>
                </div>
                <button style={{ width:"100%", padding:"13px", background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", color:"#fff", borderRadius:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer" }} onClick={closeRedeem}>Done ✓</button>
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"22px" }}>
                  <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"#fff7ed", border:"1px solid #fed7aa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>🎁</div>
                  <div>
                    <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:"22px", color:"#1a1207", margin:0 }}>Redeem Points</h2>
                    <p style={{ fontSize:"12px", color:"#9c8b78", margin:"3px 0 0" }}>100 points = $1.00 discount</p>
                  </div>
                </div>
                <div style={{ background:"#f7f3ee", borderRadius:"14px", padding:"16px", marginBottom:"20px", display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:"11px", color:"#9c8b78", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Available</div>
                    <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"28px", color:"#1a1207" }}>{loyalty.points} pts</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"11px", color:"#9c8b78", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px", marginBottom:"4px" }}>Cash Value</div>
                    <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"28px", color:"#f97316" }}>${dollarValue.toFixed(2)}</div>
                  </div>
                </div>
                <label style={{ fontSize:"12px", fontWeight:"700", color:"#9c8b78", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"10px" }}>How many points?</label>
                <input type="range" min={100} max={maxRedeem} step={100} value={redeemPoints} onChange={e => setRedeemPoints(Number(e.target.value))} style={{ width:"100%", accentColor:"#f97316", marginBottom:"10px" }} />
                <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
                  {[100, 500, 1000, maxRedeem].filter((v,i,a) => a.indexOf(v)===i && v <= maxRedeem).map(v => (
                    <button key={v} style={{ flex:1, padding:"6px", borderRadius:"9px", border:`1.5px solid ${redeemPoints===v?"#f97316":"#e8e2d9"}`, background:redeemPoints===v?"#fff7ed":"#fff", color:redeemPoints===v?"#c2410c":"#9c8b78", fontSize:"11px", fontWeight:"700", cursor:"pointer" }} onClick={() => setRedeemPoints(v)}>
                      {v === maxRedeem ? "Max" : v}
                    </button>
                  ))}
                </div>
                <div style={{ background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #bbf7d0", borderRadius:"12px", padding:"14px 16px", marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div><div style={{ fontSize:"12px", color:"#9c8b78", fontWeight:"600" }}>Redeem</div><div style={{ fontSize:"16px", fontWeight:"800", color:"#1a1207" }}>{redeemPoints} pts</div></div>
                  <div style={{ fontSize:"20px", color:"#9c8b78" }}>→</div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:"12px", color:"#9c8b78", fontWeight:"600" }}>You save</div><div style={{ fontFamily:"'Playfair Display', serif", fontSize:"24px", color:"#16a34a" }}>${redeemDollarValue}</div></div>
                </div>
                <div style={{ display:"flex", gap:"10px" }}>
                  <button style={{ flex:1, padding:"13px", background:"#f7f3ee", color:"#6b5744", border:"1.5px solid #e8e2d9", borderRadius:"13px", cursor:"pointer", fontWeight:"600", fontSize:"14px" }} onClick={closeRedeem}>Cancel</button>
                  <button style={{ flex:2, padding:"13px", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", borderRadius:"13px", cursor:"pointer", fontWeight:"700", fontSize:"14px", opacity:redeemLoading?0.7:1 }} onClick={handleRedeem} disabled={redeemLoading}>
                    {redeemLoading ? "Processing..." : `Redeem → $${redeemDollarValue} off`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── RESCHEDULE MODAL ── */}
      {showReschedule && rescheduling && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:5000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:"24px", padding:"32px", maxWidth:"520px", width:"100%", maxHeight:"80vh", overflowY:"auto" }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:"22px", color:"#1a1207", margin:"0 0 8px" }}>🔄 Reschedule Booking</h2>
            <p style={{ fontSize:"14px", color:"#9c8b78", lineHeight:"1.6", marginBottom:"20px" }}>
              <strong>{rescheduling.origin} → {rescheduling.destination}</strong><br />
              Current: <strong style={{ color:"#f97316" }}>{formatDate(rescheduling.departure)}</strong>
            </p>
            <div style={{ fontSize:"11px", fontWeight:"700", color:"#9c8b78", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"12px" }}>Click a bus to reschedule instantly:</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
              {availableBuses.map(bus => (
                <div key={bus.id} style={{ padding:"14px 16px", background:"#faf7f3", border:"1.5px solid #e8e2d9", borderRadius:"14px", cursor:"pointer", transition:"all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#f97316"; e.currentTarget.style.background="#fff7ed"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e2d9"; e.currentTarget.style.background="#faf7f3"; }}
                  onClick={() => handleRescheduleBusSelect(bus)}>
                  <div style={{ fontWeight:"700", fontSize:"14px", color:"#1a1207", marginBottom:"3px" }}>{bus.bus || 'Bus'}</div>
                  <div style={{ fontSize:"13px", color:"#f97316", fontWeight:"600", marginBottom:"2px" }}>
                    🕐 {bus.departure ? formatDate(bus.departure) : 'TBD'}
                  </div>
                  <div style={{ fontSize:"12px", color:"#9c8b78" }}>
                    ⏱ {bus.duration || 'N/A'} · 💰 ${bus.price || '?'} · {bus.available_seats || '?'} seats left
                  </div>
                </div>
              ))}
            </div>
            <button style={{ width:"100%", padding:"13px", background:"#faf7f3", border:"1.5px solid #e8e2d9", color:"#9c8b78", borderRadius:"12px", cursor:"pointer", fontWeight:"600", fontSize:"14px" }}
              onClick={() => { setShowReschedule(false); setRescheduling(null); }}>Close</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}`}</style>
    </div>
  );
}

const btnStyle = {
  orange: { fontSize:"11px", padding:"7px 14px", borderRadius:"9px", cursor:"pointer", fontWeight:"600", background:"#fff7ed", border:"1px solid #fed7aa", color:"#c2410c", fontFamily:"'Outfit', sans-serif", transition:"all 0.15s" },
  grey:   { fontSize:"11px", padding:"7px 14px", borderRadius:"9px", cursor:"pointer", fontWeight:"600", background:"#fff", border:"1px solid #e8e2d9", color:"#6b5744", fontFamily:"'Outfit', sans-serif", transition:"all 0.15s" },
  red:    { fontSize:"11px", padding:"7px 14px", borderRadius:"9px", cursor:"pointer", fontWeight:"600", background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", fontFamily:"'Outfit', sans-serif", transition:"all 0.15s" },
};

const nav = {
  bar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 52px", height:"68px", backdropFilter:"blur(28px)", borderBottom:"1px solid rgba(255,255,255,0.07)", position:"sticky", top:0, zIndex:1000, transition:"background 0.3s, box-shadow 0.3s" },
  logo:{ fontFamily:"'Playfair Display', serif", fontSize:"21px", fontWeight:"700", color:"#fff", textDecoration:"none", letterSpacing:"-0.3px" },
  links:{ display:"flex", gap:"4px" },
  link:{ padding:"8px 14px", borderRadius:"10px", fontSize:"13px", fontWeight:"500", color:"rgba(255,255,255,0.55)", textDecoration:"none", transition:"all 0.2s" },
  right:{ display:"flex", alignItems:"center", gap:"10px" },
  userPill:{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", padding:"5px 14px 5px 6px", borderRadius:"30px" },
  avatar:{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:"#fff" },
  userName:{ fontSize:"13px", fontWeight:"600", color:"#fff" },
  logoutBtn:{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", padding:"8px 16px", borderRadius:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"'Outfit', sans-serif" },
};