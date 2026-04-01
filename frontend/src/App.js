import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import "./App.css";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
import MyBookings from "./pages/MyBookings";
import PaymentModal from './components/PaymentModal';
import LoyaltyBadge from './components/LoyaltyBadge';
import BusTracker from './components/BusTracker';
import FareCalendar from './components/FareCalendar';
import TravelBuddy from './components/TravelBuddy';
import GroupBooking from './components/GroupBooking';
import { SafetyScore, SnackOrder, PriceAlert } from './components/ExtraFeatures';
import { formatDate } from './utils/dateFormat';
import BookingDetail from './pages/BookingDetail';
import { PricePrediction, PackingListButton } from './components/AIFeatures';
import SeatMapModal from './components/SeatMapModal';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ReviewsPage from './pages/ReviewsPage';
import ReferralPage from './pages/ReferralPage';
import SubscriptionPage from './pages/SubscriptionPage';
import VerifyTicket from './pages/VerifyTicket';
import ContactPage from './pages/ContactPage';
import TransactionsPage from './pages/TransactionsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiesPage from './pages/CookiesPage';
import RefundPolicyPage from './pages/RefundPolicyPage';

const _gf = document.createElement('link');
_gf.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
_gf.rel = 'stylesheet';
document.head.appendChild(_gf);

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined") return null;
    return JSON.parse(raw);
  } catch { return null; }
};

/* ─── NAVBAR ─────────────────────────────────────────────────────── */
function Navbar({ user, onLogout }) {
  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";
  return (
    <nav style={nav.bar}>
      <Link to="/" style={nav.logo}>MR <em style={{ fontStyle:"italic", color:"#f97316" }}>Bus</em> Portal</Link>
      <div style={nav.links}>
        {user && <>
          <Link to="/" style={nav.link}>🔍 Routes</Link>
          <Link to="/my-bookings" style={nav.link}>📋 Bookings</Link>
          <Link to="/my-bookings" style={nav.link}>🏆 Rewards</Link>
          <Link to="/referral" style={nav.link}>🎁 Referrals</Link>
          <Link to="/reviews" style={nav.link}>⭐ Reviews</Link>
          <Link to="/subscription" style={{ ...nav.link, color:"#fbbf24", fontWeight:"700" }}>🎫 Plans</Link>
        </>}
      </div>
      <div style={nav.right}>
        {user ? (<>
          <LoyaltyBadge />
          <Link to="/profile" style={{ textDecoration:"none" }}>
            <div style={nav.userPill}>
              <div style={nav.avatar}>{initials}</div>
              <span style={nav.userName}>{user.name}</span>
            </div>
          </Link>
          <button style={nav.logoutBtn} onClick={onLogout}>Logout</button>
        </>) : (<>
          <Link to="/login" style={nav.link}>Sign In</Link>
          <Link to="/signup" style={nav.signupBtn}>Get Started</Link>
        </>)}
      </div>
    </nav>
  );
}

const nav = {
  bar:{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", height:"68px", background:"rgba(10,6,18,0.85)", backdropFilter:"blur(32px)", borderBottom:"1px solid rgba(255,255,255,0.07)", position:"fixed", top:0, left:0, right:0, zIndex:1000, fontFamily:"'Outfit', sans-serif" },
  logo:{ fontFamily:"'Playfair Display', serif", fontSize:"21px", fontWeight:"700", color:"#fff", textDecoration:"none", letterSpacing:"-0.3px" },
  links:{ display:"flex", gap:"2px" },
  link:{ padding:"8px 13px", borderRadius:"10px", fontSize:"13px", fontWeight:"500", color:"rgba(255,255,255,0.5)", textDecoration:"none", transition:"color 0.2s" },
  right:{ display:"flex", alignItems:"center", gap:"10px" },
  userPill:{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.14)", padding:"5px 14px 5px 6px", borderRadius:"30px", cursor:"pointer" },
  avatar:{ width:"28px", height:"28px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:"#fff", flexShrink:0 },
  userName:{ fontSize:"13px", fontWeight:"600", color:"#fff" },
  logoutBtn:{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.65)", padding:"8px 16px", borderRadius:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"'Outfit', sans-serif" },
  signupBtn:{ background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", padding:"9px 20px", borderRadius:"11px", textDecoration:"none", fontSize:"13px", fontWeight:"700", boxShadow:"0 4px 16px rgba(249,115,22,0.35)" },
};

/* ─── HOME PAGE ──────────────────────────────────────────────────── */
function HomePage() {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState("one-way");
  const [multiLegs, setMultiLegs] = React.useState([
    { from: "", to: "", date: "", buses: [], loading: false, selectedBus: null },
    { from: "", to: "", date: "", buses: [], loading: false, selectedBus: null },
  ]);

  const addLeg = () => setMultiLegs(legs => [...legs, { from:"", to:"", date:"", buses:[], loading:false, selectedBus:null }]);
  const removeLeg = (idx) => setMultiLegs(legs => legs.filter((_,i) => i !== idx));
  const updateLeg = (idx, field, value) => setMultiLegs(legs => {
    const updated = legs.map((l,i) => i===idx ? {...l, [field]: value} : l);
    if (field === 'to' && idx < updated.length - 1) {
      updated[idx+1] = {...updated[idx+1], from: value};
    }
    return updated;
  });

  const searchLegBuses = async (idx) => {
    const leg = multiLegs[idx];
    if (!leg.from || !leg.to) return;
    updateLeg(idx, 'loading', true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buses/search?origin=${encodeURIComponent(leg.from)}&destination=${encodeURIComponent(leg.to)}`);
      const data = await res.json();
      setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, buses: data.slice(0,5), loading:false} : l));
    } catch { updateLeg(idx, 'loading', false); }
  };

  const totalMultiPrice = multiLegs.reduce((sum, leg) => sum + (leg.selectedBus ? leg.selectedBus.price : 0), 0);
  const [totalBuses, setTotalBuses] = React.useState(8104);
  const [originSuggestions, setOriginSuggestions] = React.useState([]);
  const [destSuggestions, setDestSuggestions] = React.useState([]);
  const [showOriginDrop, setShowOriginDrop] = React.useState(false);
  const [showDestDrop, setShowDestDrop] = React.useState(false);

  const fetchCitySuggestions = async (query, setSuggestions, setShow) => {
    if (!query || query.length < 2) { setSuggestions([]); setShow(false); return; }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buses/cities?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      const cities = (data.cities || []).map(c => typeof c === 'string' ? {city: c, display: c} : c);
      setSuggestions(cities);
      setShow(cities.length > 0);
    } catch { setSuggestions([]); setShow(false); }
  };

  // ── FIX 2: Auto-detect user location on mount ──
  React.useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/buses/count`)
      .then(r => r.json())
      .then(d => setTotalBuses(d.routes || 8104))
      .catch(() => {});

    // Ask for user location and auto-fill From city
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const city = data.address?.city
              || data.address?.town
              || data.address?.village
              || data.address?.county
              || '';
            if (city) setOrigin(city);
          } catch {}
        },
        () => {} // silently fail if denied
      );
    }
  }, []);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRestored, setPendingRestored] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [recommendedSeat, setRecommendedSeat] = useState(null);
  const [recommendReason, setRecommendReason] = useState("");
  const [topSeats, setTopSeats] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [weather, setWeather] = useState(null);
  const [carbonSaved, setCarbonSaved] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role:"assistant", text:"Hi! 👋 I'm your MR Bus AI assistant.\n\nTry these commands:\n🔍 'buses from Chicago to Atlanta'\n💺 'select seat A2' — after searching\n📋 'show my bookings'\n💰 'cheapest bus today'\n🎒 'packing list for Miami'\n🏆 'my loyalty points'\n\nWhat can I help you with?" }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBuddy, setShowBuddy] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showSnacks, setShowSnacks] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [activeBusForModal, setActiveBusForModal] = useState(null);
  const [currentSearch, setCurrentSearch] = useState({ origin:"Chicago", destination:"Atlanta" });
  const [seatHover, setSeatHover] = useState(null);

  const seatSectionRef = useRef(null);
  // ── FIX 1: Ref for auto-scroll to bus results ──
  const busResultsRef = React.useRef(null);
  const recognitionRef = useRef(null);
  const chatBodyRef = useRef(null);
  const user = getUserFromStorage();

  const cacheBus = async (bus) => {
    try { await fetch(`${process.env.REACT_APP_API_URL}/bookings/cache-bus`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(bus) }); } catch(e){}
  };

  useEffect(() => {
    if (user && !pendingRestored) {
      const pending = localStorage.getItem("pending_booking");
      if (pending) {
        try {
          const { bus, seat } = JSON.parse(pending);
          localStorage.removeItem("pending_booking");
          setPendingRestored(true);
          viewSeats(bus).then(() => setSelectedSeat(seat));
        } catch { localStorage.removeItem("pending_booking"); }
      }
    }
  }, [user]); // eslint-disable-line

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [chatMessages, chatTyping]);

  const handleLogout = () => {
    localStorage.removeItem("token"); localStorage.removeItem("user"); localStorage.removeItem("pending_booking");
    window.location.reload();
  };

  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice search not supported. Try Chrome!"); return; }
    const recognition = new SR();
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const match = transcript.match(/from\s+(.+?)\s+to\s+(.+)/);
      if (match) { setOrigin(match[1].trim()); setDestination(match[2].trim()); }
      else if (transcript.includes(' to ')) { const parts = transcript.split(' to '); setOrigin(parts[0].trim()); setDestination(parts[1].trim()); }
      else { alert(`Heard: "${transcript}"\nTry: "from Chicago to Atlanta"`); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const fetchWeather = async (city) => {
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.split(',')[0])}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) return;
      const { latitude, longitude, name, admin1 } = geoData.results[0];
      const wr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`);
      const wd = await wr.json();
      const code = wd.current_weather?.weathercode;
      const getDesc = (c) => {
        if(c===0) return{desc:"Clear sky",icon:"☀️"};
        if(c<=2) return{desc:"Partly cloudy",icon:"⛅"};
        if(c<=3) return{desc:"Overcast",icon:"☁️"};
        if(c<=29) return{desc:"Rain",icon:"🌧️"};
        if(c<=49) return{desc:"Snow",icon:"❄️"};
        return{desc:"Storm",icon:"⛈️"};
      };
      const { desc, icon } = getDesc(code);
      setWeather({ city:`${name}, ${admin1}`, temp:Math.round(wd.current_weather?.temperature), desc, icon, wind:Math.round(wd.current_weather?.windspeed) });
    } catch(e){}
  };

  const calculateCarbon = (d) => {
    if(!d) return null;
    const b=d*1.609*0.089, c=d*1.609*0.171, f=d*1.609*0.255, s=c-b;
    return { bus:b.toFixed(1), car:c.toFixed(1), flight:f.toFixed(1), savedVsCar:s.toFixed(1), trees:(s/21).toFixed(2) };
  };

  const searchBuses = async () => {
    if (!origin.trim() || !destination.trim()) { alert("Please enter origin and destination"); return; }
    try {
      setLoading(true); setWeather(null); setCarbonSaved(null);
      setCurrentSearch({ origin:origin.trim().split(',')[0], destination:destination.trim().split(',')[0] });
      const res = await fetch(`${process.env.REACT_APP_API_URL}/buses/search?origin=${encodeURIComponent(origin.trim())}&destination=${encodeURIComponent(destination.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const ba = Array.isArray(data) ? data : [];
      setBuses(ba); setSelectedBus(null); setSelectedSeat(null); setBookedSeats([]);
      if (destination.trim()) fetchWeather(destination.trim());
      if (ba.length > 0 && ba[0].distance_miles) setCarbonSaved(calculateCarbon(ba[0].distance_miles));
      // ── FIX 1: Auto-scroll to bus results after search ──
      setTimeout(() => {
        if (busResultsRef.current) {
          busResultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
    } catch { alert("Search failed. Check backend."); }
    finally { setLoading(false); }
  };

  const swapCities = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  const viewSeats = async (bus) => {
    try {
      setSelectedBus(bus); setSelectedSeat(null); setRecommendedSeat(null); setTopSeats([]);
      setCurrentSearch({ origin:bus.origin.split(',')[0], destination:bus.destination.split(',')[0] });
      await cacheBus(bus);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/seats/${bus.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookedSeats(Array.isArray(data.booked_seats) ? data.booked_seats : []);
      setShowPreferenceModal(true);
    } catch { alert("Unable to load seats"); }
  };

  const getRecommendation = async (preferences) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/seats/recommend`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ booked_seats:bookedSeats, preferences }) });
      const data = await res.json();
      if (data.recommended) { setRecommendedSeat(data.recommended); setRecommendReason(data.reason); setTopSeats(data.top_seats||[]); setSelectedSeat(data.recommended); }
    } catch(err){}
  };

  const confirmBooking = async () => {
    if (!selectedBus || !selectedSeat) { alert("Please select a bus and seat"); return; }
    if (!user) { localStorage.setItem("pending_booking", JSON.stringify({ bus:selectedBus, seat:selectedSeat })); alert("Please log in to confirm your booking."); navigate("/login"); return; }
    setShowSeatModal(false); setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    setShowPayment(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/book?bus_id=${selectedBus.id}&seat=${selectedSeat}`,{ method:"POST", headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status === "seat_taken") { alert("That seat was just taken. Please choose another."); await viewSeats(selectedBus); return; }
      alert(`Booking Confirmed! 🎉\n\nBus: ${selectedBus.bus}\nRoute: ${selectedBus.origin} → ${selectedBus.destination}\nSeat: ${selectedSeat}\nTransaction ID: ${data.transaction_id}\n\nConfirmation email sent!`);
      setBookedSeats((prev) => [...prev, selectedSeat]); setSelectedSeat(null); setRecommendedSeat(null);
    } catch { alert("Payment succeeded but booking failed. Contact support."); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");

    const seatMatch = msg.match(/^(?:select\s+|book\s+|choose\s+|pick\s+)?seat\s*([A-Ha-h][1-4])$/i)
                   || msg.match(/^([A-Ha-h][1-4])$/i);
    if (seatMatch && selectedBus) {
      const requestedSeat = (seatMatch[1] || seatMatch[2]).toUpperCase();
      setChatMessages(prev => [...prev, { role:"user", text:msg }]);
      if (bookedSeats.includes(requestedSeat)) {
        const alt = ["A1","A3","B2","C4","D1","E3"].find(s => !bookedSeats.includes(s)) || "A1";
        setChatMessages(prev => [...prev, { role:"assistant", text:`❌ Seat ${requestedSeat} is already taken!\n\nTry seat ${alt} — it's available right now.` }]);
      } else {
        setSelectedSeat(requestedSeat);
        setShowSeatModal(true);
        setChatMessages(prev => [...prev, { role:"assistant", text:`✅ Seat ${requestedSeat} selected!\n\n🚌 ${selectedBus.bus}\n📍 ${selectedBus.origin.split(',')[0]} → ${selectedBus.destination.split(',')[0]}\n💺 Seat ${requestedSeat} · $${selectedBus.price}\n\nClick "Confirm →" in the seat map to pay.` }]);
      }
      return;
    }

    if (/^confirm$/i.test(msg.trim()) && selectedBus && selectedSeat) {
      setChatMessages(prev => [...prev, { role:"user", text:msg }]);
      setChatMessages(prev => [...prev, { role:"assistant", text:`Opening payment for Seat ${selectedSeat}... 💳` }]);
      setTimeout(() => confirmBooking(), 400);
      return;
    }

    const packingMatch = msg.match(/packing\s*list(?:\s+for\s+(.+))?/i);
    if (packingMatch) {
      setChatMessages(prev => [...prev, { role:"user", text:msg }]);
      if (packingMatch[1]) {
        const dest = packingMatch[1].trim();
        setChatMessages(prev => [...prev, { role:"assistant", text:`🎒 Packing list for ${dest}!\n\nSearch for a bus to ${dest} and click the 🎒 Packing List button on the card — it'll check the weather and generate a full AI checklist for your trip!` }]);
      } else if (destination) {
        setChatMessages(prev => [...prev, { role:"assistant", text:`🎒 Packing list for ${destination}!\n\nClick the 🎒 Packing List button on any bus card below — it checks live weather and builds a smart checklist for your trip!` }]);
      } else {
        setChatMessages(prev => [...prev, { role:"assistant", text:`🎒 I'd love to help with a packing list!\n\nWhich city are you traveling to?\nTry: "packing list for Miami" or "packing list for Chicago"\n\nOr search for a route first and tap the 🎒 button on a bus card!` }]);
      }
      return;
    }

    setChatMessages(prev => [...prev, { role:"user", text:msg }]);
    setChatTyping(true);
    try {
      const token = localStorage.getItem("token");
      const history = chatMessages.slice(-6).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
      const res = await fetch(`${process.env.REACT_APP_API_URL}/ai/chat`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message:msg, token:token||null, history }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChatTyping(false);
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        const newText = data.response || "Sorry, I couldn't generate a response.";
        if (last?.role === "assistant" && last?.text === newText) return prev;
        return [...prev, { role:"assistant", text:newText }];
      });
      if (data.action === "open_seats" && data.bus) {
        const bus = data.bus;
        setBuses(prev => { const exists = prev.find(b => b.id === bus.id); return exists ? prev : [...prev, bus]; });
        await viewSeats(bus);
        setChatOpen(false);
      }
      if (data.action === "refresh_bookings" || data.action === "show_bookings") { setTimeout(() => navigate("/my-bookings"), 1500); }
      if (data.action === "show_reviews") { setTimeout(() => navigate("/reviews"), 800); }
      if (data.action === "show_profile") { setTimeout(() => navigate("/profile"), 800); }
      if (data.action === "show_subscription") { setTimeout(() => navigate("/subscription"), 800); }
    } catch {
      setChatTyping(false);
      setChatMessages(prev => [...prev, { role:"assistant", text:"⚠️ AI service unavailable. Please try again." }]);
    }
  };

  const popularRoutes = [
    { from:"Chicago", to:"Atlanta" }, { from:"New York", to:"Boston" },
    { from:"Dallas", to:"Houston" }, { from:"Seattle", to:"Portland" }, { from:"Miami", to:"Orlando" },
  ];
  const quickReplies = user
    ? ["Show my bookings", "My loyalty points", "Cheapest bus today", "Packing list"]
    : ["Search buses", "How it works", "Sign up free", "Help"];

  const totalSeats = 32;
  const availableSeats = totalSeats - bookedSeats.length;

  return (
    <div style={{ fontFamily:"'Outfit', sans-serif", minHeight:"100vh", background:"#f7f3ee" }}>
      <Navbar user={user} onLogout={handleLogout} />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{ background:`radial-gradient(ellipse at 10% 70%,rgba(255,140,0,0.22) 0%,transparent 55%),radial-gradient(ellipse at 90% 10%,rgba(220,60,30,0.13) 0%,transparent 50%),linear-gradient(158deg,#0c0518 0%,#070f0d 55%,#040816 100%)`, position:"relative", overflow:"hidden", paddingTop:"68px" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.5, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize:"36px 36px", pointerEvents:"none" }} />

        <div style={{ padding:"72px 48px 52px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"64px", alignItems:"center", position:"relative", zIndex:1, maxWidth:"1200px", margin:"0 auto" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
              <div style={{ background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.22)", padding:"5px 14px", borderRadius:"30px" }}>
                <span style={{ fontSize:"10px", fontWeight:"700", color:"#fb923c", letterSpacing:"2.5px", textTransform:"uppercase" }}>AI-Powered Travel</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px rgba(74,222,128,0.6)", animation:"pulse 2s infinite" }} />
                <span style={{ fontSize:"11px", color:"rgba(74,222,128,0.8)", fontWeight:"600" }}>{buses.length > 0 ? `${buses.length} routes found` : `${totalBuses ? totalBuses.toLocaleString() : "8,104"} routes live`}</span>
              </div>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:"58px", lineHeight:"1.0", letterSpacing:"-1.5px", color:"#fff", margin:"0 0 18px" }}>
              Go anywhere.<br />
              <em style={{ fontStyle:"italic", background:"linear-gradient(135deg,#f97316,#fb923c,#fbbf24)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Pay less.</em>
            </h1>
            <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.38)", lineHeight:"1.85", marginBottom:"32px", maxWidth:"420px" }}>
              Find the best bus routes, earn loyalty points, and let AI handle price predictions, packing lists, and smart rebooking.
            </p>

            {/* ── SEARCH BOX ─────────────────────────────────────── */}
            <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"20px", padding:"16px", backdropFilter:"blur(20px)" }}>

              {/* Trip type + passengers */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:"12px", padding:"3px", gap:"2px" }}>
                  {["one-way","round-trip","multi-city"].map(t => (
                    <button key={t} style={{ padding:"6px 14px", borderRadius:"10px", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"'Outfit', sans-serif", background:tripType===t?"linear-gradient(135deg,#f97316,#ea580c)":"transparent", color:tripType===t?"#fff":"rgba(255,255,255,0.45)", transition:"all 0.2s" }}
                      onClick={() => setTripType(t)}>
                      {t === "one-way" ? "✈ One Way" : t === "round-trip" ? "↔ Round Trip" : "🗺️ Multi-City"}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", fontWeight:"600" }}>👤 Passengers</span>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <button style={{ width:"26px", height:"26px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.08)", color:"#fff", cursor:"pointer", fontSize:"14px", fontFamily:"'Outfit', sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onClick={() => setPassengers(p => Math.max(1, p-1))}>−</button>
                    <span style={{ fontSize:"14px", fontWeight:"700", color:"#fff", minWidth:"16px", textAlign:"center" }}>{passengers}</span>
                    <button style={{ width:"26px", height:"26px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.08)", color:"#fff", cursor:"pointer", fontSize:"14px", fontFamily:"'Outfit', sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onClick={() => setPassengers(p => Math.min(6, p+1))}>+</button>
                  </div>
                </div>
              </div>

              {/* From / To */}
              <div style={{ display: tripType === "multi-city" ? "none" : "flex", alignItems:"center", gap:"4px", marginBottom:"10px", position:"relative" }}>
                <div style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:"13px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px", border:"1px solid rgba(255,255,255,0.1)", position:"relative" }}>
                  <span style={{ fontSize:"16px" }}>📍</span>
                  <input style={{ flex:1, background:"transparent", border:"none", color:"#fff", fontSize:"14px", fontFamily:"'Outfit', sans-serif", outline:"none", fontWeight:"500" }}
                    placeholder="From city..." value={origin}
                    onChange={e => { setOrigin(e.target.value); fetchCitySuggestions(e.target.value, setOriginSuggestions, setShowOriginDrop); }}
                    onKeyDown={e => { if(e.key==="Enter") { setShowOriginDrop(false); searchBuses(); } if(e.key==="Escape") setShowOriginDrop(false); }}
                    onBlur={() => setTimeout(() => setShowOriginDrop(false), 150)} />
                  {showOriginDrop && originSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1c1208", border:"1px solid rgba(249,115,22,0.4)", borderRadius:"12px", zIndex:9999, overflow:"hidden", boxShadow:"0 12px 32px rgba(0,0,0,0.5)" }}>
                      {originSuggestions.map((city, i) => (
                        <div key={i}
                          style={{ padding:"11px 16px", cursor:"pointer", color:"#fff", fontSize:"13px", fontWeight:"500", borderBottom: i < originSuggestions.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", display:"flex", alignItems:"center", gap:"10px" }}
                          onMouseDown={() => { setOrigin(typeof city === 'string' ? city : city.city||city.display); setShowOriginDrop(false); setOriginSuggestions([]); }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(249,115,22,0.12)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <span style={{ fontSize:"14px" }}>🚌</span>
                          <span>{typeof city === 'string' ? city : city.display||city.city}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={swapCities} style={{ width:"34px", height:"34px", borderRadius:"50%", background:"rgba(249,115,22,0.15)", border:"1px solid rgba(249,115,22,0.25)", color:"#f97316", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", transition:"all 0.2s" }}>⇄</button>

                <div style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:"13px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px", border:"1px solid rgba(255,255,255,0.1)", position:"relative" }}>
                  <span style={{ fontSize:"16px" }}>🏁</span>
                  <input style={{ flex:1, background:"transparent", border:"none", color:"#fff", fontSize:"14px", fontFamily:"'Outfit', sans-serif", outline:"none", fontWeight:"500" }}
                    placeholder="To city..." value={destination}
                    onChange={e => { setDestination(e.target.value); fetchCitySuggestions(e.target.value, setDestSuggestions, setShowDestDrop); }}
                    onKeyDown={e => { if(e.key==="Enter") { setShowDestDrop(false); searchBuses(); } if(e.key==="Escape") setShowDestDrop(false); }}
                    onBlur={() => setTimeout(() => setShowDestDrop(false), 150)} />
                  {showDestDrop && destSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1c1208", border:"1px solid rgba(249,115,22,0.4)", borderRadius:"12px", zIndex:9999, overflow:"hidden", boxShadow:"0 12px 32px rgba(0,0,0,0.5)" }}>
                      {destSuggestions.map((city, i) => (
                        <div key={i}
                          style={{ padding:"11px 16px", cursor:"pointer", color:"#fff", fontSize:"13px", fontWeight:"500", borderBottom: i < destSuggestions.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", display:"flex", alignItems:"center", gap:"10px" }}
                          onMouseDown={() => { setDestination(typeof city === 'string' ? city : city.city||city.display); setShowDestDrop(false); setDestSuggestions([]); }}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(249,115,22,0.12)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <span style={{ fontSize:"14px" }}>📍</span>
                          <span>{typeof city === 'string' ? city : city.display||city.city}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: tripType === "multi-city" ? "none" : "grid", gridTemplateColumns:tripType==="round-trip"?"1fr 1fr":"1fr", gap:"8px", marginBottom:"12px" }}>
                <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:"13px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px", border:"1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize:"14px" }}>📅</span>
                  <input type="date" style={{ flex:1, background:"transparent", border:"none", color:departDate?"#fff":"rgba(255,255,255,0.35)", fontSize:"13px", fontFamily:"'Outfit', sans-serif", outline:"none", colorScheme:"dark" }}
                    value={departDate} onChange={e => setDepartDate(e.target.value)} />
                  <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", fontWeight:"600" }}>DEPART</span>
                </div>
                {tripType === "round-trip" && (
                  <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:"13px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px", border:"1px solid rgba(249,115,22,0.2)" }}>
                    <span style={{ fontSize:"14px" }}>📅</span>
                    <input type="date" style={{ flex:1, background:"transparent", border:"none", color:returnDate?"#fff":"rgba(255,255,255,0.35)", fontSize:"13px", fontFamily:"'Outfit', sans-serif", outline:"none", colorScheme:"dark" }}
                      value={returnDate} onChange={e => setReturnDate(e.target.value)} min={departDate} />
                    <span style={{ fontSize:"11px", color:"rgba(249,115,22,0.6)", fontWeight:"600" }}>RETURN</span>
                  </div>
                )}
              </div>

              {/* Search row */}
              <div style={{ display:"flex", gap:"8px" }}>
                <button style={{ width:"42px", height:"42px", borderRadius:"12px", border:"none", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:isListening?"#ef4444":"rgba(249,115,22,0.15)", transition:"all 0.2s" }} onClick={startVoiceSearch}>
                  {isListening ? "🔴" : "🎤"}
                </button>
                <button style={{ display: tripType === "multi-city" ? "none" : "block", flex:1, background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", color:"#fff", padding:"12px 28px", borderRadius:"13px", fontSize:"14px", fontWeight:"800", cursor:"pointer", fontFamily:"'Outfit', sans-serif", boxShadow:"0 6px 20px rgba(249,115,22,0.4)", letterSpacing:"0.3px" }}
                  onClick={searchBuses} disabled={loading}>
                  {loading ? "Searching..." : `Search ${passengers > 1 ? `(${passengers} passengers)` : "Buses"} →`}
                </button>
              </div>
            </div>

            {isListening && <p style={{ color:"#4ade80", marginTop:"10px", fontSize:"13px", fontWeight:"600" }}>🎤 Listening... Say "from Chicago to Atlanta"</p>}

            {/* Popular routes */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginTop:"16px" }}>

              {/* ── MULTI-CITY PLANNER ── */}
              {tripType === "multi-city" && (
                <div style={{ width:"100%", marginBottom:"12px" }}>
                  {multiLegs.map((leg, idx) => (
                    <div key={idx} style={{ background:"rgba(255,255,255,0.05)", borderRadius:"12px", padding:"12px", marginBottom:"8px", border:"1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                        <span style={{ fontSize:"12px", fontWeight:"700", color:"#f97316" }}>Leg {idx+1}</span>
                        {idx > 1 && <button onClick={() => removeLeg(idx)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:"16px" }}>✕</button>}
                      </div>
                      <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
                        <div style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:"10px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"6px", position:"relative" }}>
                          <span>📍</span>
                          <input style={{ flex:1, background:"transparent", border:"none", color:"#fff", fontSize:"13px", outline:"none" }}
                            placeholder="From city..."
                            value={leg.from}
                            onChange={e => {
                              updateLeg(idx, 'from', e.target.value);
                              fetchCitySuggestions(e.target.value,
                                s => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, fromSuggestions:s} : l)),
                                s => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showFromDrop:s} : l))
                              );
                            }}
                            onBlur={() => setTimeout(() => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showFromDrop:false} : l)), 150)} />
                          {leg.showFromDrop && (leg.fromSuggestions||[]).length > 0 && (
                            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#1c1208", border:"1px solid rgba(249,115,22,0.4)", borderRadius:"10px", zIndex:9999, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
                              {(leg.fromSuggestions||[]).map((city, ci) => (
                                <div key={ci}
                                  style={{ padding:"9px 14px", cursor:"pointer", color:"#fff", fontSize:"12px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:"8px" }}
                                  onMouseDown={() => { updateLeg(idx, 'from', typeof city==='string'?city:city.city); setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showFromDrop:false} : l)); }}
                                  onMouseEnter={e => e.currentTarget.style.background="rgba(249,115,22,0.12)"}
                                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                                  🚌 {typeof city==='string'?city:city.display||city.city}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ flex:1, background:"rgba(255,255,255,0.07)", borderRadius:"10px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"6px", position:"relative" }}>
                          <span>🏁</span>
                          <input style={{ flex:1, background:"transparent", border:"none", color:"#fff", fontSize:"13px", outline:"none" }}
                            placeholder="To city..."
                            value={leg.to}
                            onChange={e => {
                              updateLeg(idx, 'to', e.target.value);
                              fetchCitySuggestions(e.target.value,
                                s => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, toSuggestions:s} : l)),
                                s => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showToDrop:s} : l))
                              );
                            }}
                            onBlur={() => setTimeout(() => setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showToDrop:false} : l)), 150)} />
                          {leg.showToDrop && (leg.toSuggestions||[]).length > 0 && (
                            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#1c1208", border:"1px solid rgba(249,115,22,0.4)", borderRadius:"10px", zIndex:9999, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
                              {(leg.toSuggestions||[]).map((city, ci) => (
                                <div key={ci}
                                  style={{ padding:"9px 14px", cursor:"pointer", color:"#fff", fontSize:"12px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:"8px" }}
                                  onMouseDown={() => { updateLeg(idx, 'to', typeof city==='string'?city:city.city); setMultiLegs(legs => legs.map((l,i) => i===idx ? {...l, showToDrop:false} : l)); }}
                                  onMouseEnter={e => e.currentTarget.style.background="rgba(249,115,22,0.12)"}
                                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                                  📍 {typeof city==='string'?city:city.display||city.city}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:"10px", padding:"8px 12px", display:"flex", alignItems:"center", gap:"6px" }}>
                          <span>📅</span>
                          <input type="date" style={{ background:"transparent", border:"none", color:"#fff", fontSize:"13px", outline:"none", colorScheme:"dark" }}
                            value={leg.date}
                            onChange={e => updateLeg(idx, 'date', e.target.value)} />
                        </div>
                      </div>
                      <button onClick={() => searchLegBuses(idx)}
                        style={{ width:"100%", padding:"8px", background:"rgba(249,115,22,0.2)", border:"1px solid rgba(249,115,22,0.4)", borderRadius:"8px", color:"#f97316", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>
                        {leg.loading ? "Searching..." : "🔍 Find Buses for This Leg"}
                      </button>
                      {leg.buses.length > 0 && (
                        <div style={{ marginTop:"8px" }}>
                          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginBottom:"6px", fontWeight:"600" }}>SELECT A BUS:</div>
                          {leg.buses.map((bus, bi) => (
                            <div key={bi} onClick={() => updateLeg(idx, 'selectedBus', leg.selectedBus?.id === bus.id ? null : bus)}
                              style={{ padding:"10px 12px", borderRadius:"10px", marginBottom:"4px", cursor:"pointer", border:`1px solid ${leg.selectedBus?.id === bus.id ? "#f97316" : "rgba(255,255,255,0.1)"}`, background: leg.selectedBus?.id === bus.id ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <div>
                                <div style={{ fontSize:"12px", fontWeight:"600", color:"#fff" }}>{bus.bus}</div>
                                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.5)" }}>{bus.departure?.slice(11,16)} → {bus.arrival?.slice(11,16)} · {bus.duration}</div>
                              </div>
                              <div style={{ fontSize:"14px", fontWeight:"700", color:"#f97316" }}>${bus.price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:"8px" }}>
                    <button onClick={addLeg} style={{ flex:1, padding:"10px", background:"rgba(255,255,255,0.06)", border:"1px dashed rgba(255,255,255,0.2)", borderRadius:"10px", color:"rgba(255,255,255,0.6)", fontSize:"13px", cursor:"pointer" }}>
                      + Add Another Stop
                    </button>
                    {totalMultiPrice > 0 && (
                      <button
                        onClick={async () => {
                          const unselected = multiLegs.filter(l => !l.selectedBus);
                          if (unselected.length > 0) { alert("Please select a bus for each leg"); return; }
                          const token = localStorage.getItem("token");
                          if (!token) { alert("Please login to book"); return; }
                          let booked = 0;
                          for (const leg of multiLegs) {
                            try {
                              await fetch(`${process.env.REACT_APP_API_URL}/bookings/book`, {
                                method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
                                body: JSON.stringify({ bus_id: leg.selectedBus.id, seat: "A1", passengers: passengers, trip_type:"one-way" })
                              });
                              booked++;
                            } catch {}
                          }
                          alert(`✅ ${booked} legs booked! Total: $${totalMultiPrice}\n\nCheck My Bookings for details.`);
                          setMultiLegs([{from:"",to:"",date:"",buses:[],loading:false,selectedBus:null},{from:"",to:"",date:"",buses:[],loading:false,selectedBus:null}]);
                          setTripType("one-way");
                        }}
                        style={{ padding:"10px 20px", background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", borderRadius:"10px", color:"#fff", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                        Book All · ${totalMultiPrice}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", fontWeight:"700", letterSpacing:"1px", textTransform:"uppercase" }}>Popular:</span>
              {popularRoutes.map((r,i) => (
                <div key={i}
                  style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.16)", color:"rgba(255,255,255,0.75)", fontSize:"11px", fontWeight:"700", padding:"5px 12px", borderRadius:"20px", cursor:"pointer", transition:"all 0.15s" }}
                  onClick={() => { setOrigin(r.from); setDestination(r.to); }}>
                  {r.from} → {r.to}
                </div>
              ))}
            </div>
          </div>

          {/* ── 3D CARD ───────────────────────────────────────────── */}
          <div style={{ perspective:"1200px", display:"flex", alignItems:"center", justifyContent:"center", paddingBottom:"48px", position:"relative" }}>
            <div style={{ transform:"rotateY(-14deg) rotateX(6deg)", transformStyle:"preserve-3d", position:"relative", width:"340px" }}>
              <div style={{ position:"absolute", width:"340px", height:"215px", borderRadius:"22px", background:"rgba(255,100,20,0.04)", border:"1px solid rgba(249,115,22,0.05)", zIndex:1, top:"36px", left:"28px", opacity:0.25 }} />
              <div style={{ position:"absolute", width:"340px", height:"215px", borderRadius:"22px", background:"linear-gradient(150deg,#170c04,#221306)", border:"1px solid rgba(249,115,22,0.1)", zIndex:2, top:"19px", left:"15px", opacity:0.6 }} />
              <div style={{ position:"relative", width:"340px", borderRadius:"22px", padding:"24px", background:"linear-gradient(150deg,#251407,#3a1d06,#1e0f03)", border:"1px solid rgba(249,115,22,0.5)", boxShadow:"0 40px 80px rgba(249,115,22,0.16),inset 0 1px 0 rgba(255,200,100,0.1)", zIndex:3 }}>
                <div style={{ width:"32px", height:"24px", background:"linear-gradient(135deg,#fcd34d,#f59e0b,#d97706)", borderRadius:"5px", marginBottom:"22px" }} />
                <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.25)", letterSpacing:"2.5px", textTransform:"uppercase", marginBottom:"4px" }}>MR EXPRESS</div>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"17px", color:"#fff", marginBottom:"16px", letterSpacing:"-0.3px" }}>
                  {selectedBus ? `${selectedBus.origin.split(',')[0]} → ${selectedBus.destination.split(',')[0]}` : buses.length > 0 ? `${buses[0].origin.split(',')[0]} → ${buses[0].destination.split(',')[0]}` : `${currentSearch.origin} → ${currentSearch.destination}`}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"3px" }}>Seat</div>
                    <div style={{ fontSize:"24px", fontWeight:"900", color:"#fff" }}>{selectedSeat || (selectedBus ? "—" : "B4")}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"3px" }}>{tripType === "round-trip" ? "Round Trip" : "Fare"}</div>
                    <div style={{ fontSize:"24px", fontWeight:"900", color:"#fb923c" }}>
                      {(() => {
                        const p = selectedBus?.price || buses[0]?.price;
                        if (!p) return "$—";
                        return `$${p * (tripType === "round-trip" ? 2 : 1)}`;
                      })()}
                    </div>
                    {tripType === "round-trip" && <div style={{ fontSize:"8px", color:"rgba(251,191,36,0.6)", marginTop:"1px" }}>↔ both legs</div>}
                  </div>
                  {passengers > 1 && (
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:"3px" }}>Total</div>
                      <div style={{ fontSize:"18px", fontWeight:"900", color:"#fbbf24" }}>
                        {(() => {
                          const p = selectedBus?.price || buses[0]?.price;
                          if (!p) return "$—";
                          return `$${p * (tripType === "round-trip" ? 2 : 1) * passengers}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ borderTop:"1px dashed rgba(255,255,255,0.1)", margin:"12px 0" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"8px", color:"rgba(255,255,255,0.18)", fontFamily:"monospace", letterSpacing:"1px" }}>MR BUS PORTAL</span>
                  <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.25)", padding:"3px 9px", borderRadius:"20px" }}>
                    <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:"#4ade80" }} />
                    <span style={{ fontSize:"8px", fontWeight:"700", color:"#4ade80", letterSpacing:"0.5px" }}>{selectedSeat ? "SELECTED" : buses.length > 0 ? "RESULTS" : "LIVE"}</span>
                  </div>
                </div>
              </div>
              <div style={{ position:"absolute", backdropFilter:"blur(16px)", borderRadius:"11px", padding:"8px 12px", fontSize:"11px", fontWeight:"600", whiteSpace:"nowrap", border:"1px solid rgba(74,222,128,0.2)", background:"rgba(5,25,12,0.92)", color:"#4ade80", bottom:"-14px", left:"-48px", zIndex:10 }}>✦ +{selectedBus?.price || buses[0]?.price || 39} pts earned</div>
              <div style={{ position:"absolute", backdropFilter:"blur(16px)", borderRadius:"11px", padding:"8px 12px", fontSize:"11px", fontWeight:"600", whiteSpace:"nowrap", border:"1px solid rgba(249,115,22,0.2)", background:"rgba(18,8,4,0.92)", color:"#fb923c", top:"4px", right:"-56px", zIndex:10 }}>↓ Price drops Tue</div>
              <div style={{ position:"absolute", backdropFilter:"blur(16px)", borderRadius:"11px", padding:"8px 12px", fontSize:"11px", fontWeight:"600", whiteSpace:"nowrap", border:"1px solid rgba(251,191,36,0.2)", background:"rgba(18,14,3,0.92)", color:"#fbbf24", bottom:"14px", right:"-40px", zIndex:10 }}>🌱 CO₂ saved</div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"16px 48px", display:"flex", alignItems:"center", gap:"24px", position:"relative", zIndex:1, flexWrap:"wrap", maxWidth:"1200px", margin:"0 auto" }}>
          {["🔒 Secure payments","⚡ Instant confirmation","🔄 Free cancellation (24h)","🏆 Earn points every trip","📧 Receipt by email"].map((t,i,a) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width:"1px", height:"16px", background:"rgba(255,255,255,0.07)" }} />}
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", fontWeight:"500" }}>{t}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Weather + Carbon */}
      {(weather || carbonSaved) && (
        <div style={{ display:"flex", gap:"14px", padding:"18px 48px", background:"#f0fdf4", borderBottom:"1px solid #bbf7d0", flexWrap:"wrap" }}>
          {weather && (
            <div style={{ display:"flex", alignItems:"center", gap:"12px", background:"#fff", padding:"12px 16px", borderRadius:"14px", flex:1, minWidth:"240px", border:"1px solid #e8f5e9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize:"26px" }}>{weather.icon}</span>
              <div>
                <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1207", marginBottom:"2px" }}>📍 {weather.city}</div>
                <div style={{ fontSize:"12px", color:"#6b5744" }}>{weather.temp}°F · {weather.desc} · 💨 {weather.wind} mph</div>
              </div>
            </div>
          )}
          {carbonSaved && (
            <div style={{ display:"flex", alignItems:"center", gap:"12px", background:"#fff", padding:"12px 16px", borderRadius:"14px", flex:1, minWidth:"240px", border:"1px solid #e8f5e9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize:"26px" }}>🌿</span>
              <div>
                <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1207", marginBottom:"2px" }}>Carbon Footprint</div>
                <div style={{ fontSize:"12px", color:"#6b5744" }}>🚌 {carbonSaved.bus}kg · 🚗 {carbonSaved.car}kg · ✈️ {carbonSaved.flight}kg</div>
                <div style={{ fontSize:"12px", color:"#16a34a", fontWeight:"600", marginTop:"1px" }}>🌱 Save {carbonSaved.savedVsCar}kg CO₂ vs driving</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:"#fff", borderBottom:"1px solid #ede8e0" }}>
        {[
          { n:totalBuses||"8K+", l:"Live Routes", d:"↑ 3 today" },
          { n:"2.3K", l:"Travelers Today", d:"↑ 12%" },
          { n:"98%", l:"On-time Rate", d:"This week" },
          { n:buses.length > 0 ? `${buses.length}` : "$27", l:buses.length > 0 ? "Results Found" : "Lowest Fare", d:buses.length > 0 ? `${currentSearch.origin} → ${currentSearch.destination}` : "Today" }
        ].map((s,i) => (
          <div key={i} style={{ padding:"22px 30px", position:"relative", overflow:"hidden", borderRight:i < 3 ? "1px solid #ede8e0" : "none" }}>
            <div style={{ position:"absolute", top:0, left:0, width:"3px", height:"100%", background:"linear-gradient(180deg,#f97316,#fbbf24)" }} />
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"34px", color:"#1a1207", lineHeight:"1", marginBottom:"5px" }}>{s.n}</div>
            <div style={{ fontSize:"10px", color:"#9c8b78", textTransform:"uppercase", letterSpacing:"1px", fontWeight:"700" }}>{s.l}</div>
            <div style={{ fontSize:"11px", color:"#16a34a", marginTop:"2px", fontWeight:"600" }}>{s.d}</div>
          </div>
        ))}
      </div>

      {/* ── BUS RESULTS ──────────────────────────────────────────── */}
      <div style={{ background:"#f7f3ee", padding:"44px 48px" }}>
        {/* ── FIX 1: ref on this div so scrollIntoView works ── */}
        <div ref={busResultsRef} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"22px", maxWidth:"1200px", margin:"0 auto 22px" }}>
          <div>
            <span style={{ fontFamily:"'Playfair Display', serif", fontSize:"24px", color:"#1a1207", letterSpacing:"-0.5px" }}>Available Buses</span>
            {buses.length > 0 && <span style={{ fontSize:"13px", color:"#9c8b78", marginLeft:"8px" }}>· {buses.length} results for {currentSearch.origin} → {currentSearch.destination}</span>}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            {buses.length > 0 && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"#fef2f2", border:"1px solid #fecaca", padding:"5px 11px", borderRadius:"20px", fontSize:"11px", color:"#dc2626", fontWeight:"700" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#ef4444", animation:"pulse 1.5s infinite" }} />{Math.floor(Math.random()*20)+5} viewing now
                </div>
                <button style={{ background:"#fff", border:"1.5px solid #e8e2d9", color:"#6b5744", padding:"7px 14px", borderRadius:"10px", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"'Outfit', sans-serif" }} onClick={() => setShowCalendar(true)}>
                  📅 Fare Calendar
                </button>
              </>
            )}
          </div>
        </div>

        {buses.length === 0 ? (
          <div style={{ background:"#fff", borderRadius:"20px", padding:"56px", textAlign:"center", border:"1px solid #e8e2d9", maxWidth:"600px", margin:"0 auto" }}>
            <div style={{ fontSize:"52px", marginBottom:"14px" }}>🚌</div>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1207", marginBottom:"8px" }}>Search for a route to get started</div>
            <div style={{ fontSize:"13px", color:"#9c8b78" }}>Enter origin and destination above to see available buses</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"18px", maxWidth:"1200px", margin:"0 auto" }}>
            {buses.map((bus, idx) => (
              <div key={bus.id} style={{ background:"#fff", border:idx===0?"2px solid #f97316":"1px solid #e8e2d9", borderRadius:"22px", overflow:"hidden", fontFamily:"'Outfit', sans-serif", boxShadow:idx===0?"0 8px 32px rgba(249,115,22,0.12)":"0 2px 8px rgba(0,0,0,0.04)", transition:"transform 0.2s,box-shadow 0.2s" }}>
                <div style={{ height:"3px", background:idx===0?"linear-gradient(90deg,#f97316,#fbbf24)":"#f0ebe4" }} />
                <div style={{ padding:"18px 20px 14px" }}>
                  <div style={{ display:"flex", gap:"5px", marginBottom:"10px" }}>
                    {idx===0 && <span style={{ fontSize:"9px", fontWeight:"700", padding:"3px 8px", borderRadius:"6px", background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa" }}>⭐ Best Value</span>}
                    {bus.price < 35 && <span style={{ fontSize:"9px", fontWeight:"700", padding:"3px 8px", borderRadius:"6px", background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0" }}>📉 Price Drop</span>}
                    {tripType === "round-trip" && <span style={{ fontSize:"9px", fontWeight:"700", padding:"3px 8px", borderRadius:"6px", background:"#f0f9ff", color:"#0369a1", border:"1px solid #bae6fd" }}>↔ Round Trip</span>}
                  </div>
                  <div style={{ fontSize:"11px", color:"#9c8b78", marginBottom:"8px" }}>{bus.bus} · {formatDate(bus.departure).split(',')[0]}</div>
                  <div style={{ display:"flex", alignItems:"center", marginBottom:"12px" }}>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontSize:"18px", fontWeight:"900", color:"#1a1207", letterSpacing:"-0.5px" }}>{formatDate(bus.departure).split('•')[1]?.trim() || ''}</div>
                          <div style={{ fontSize:"11px", color:"#9c8b78", marginTop:"2px" }}>{formatDate(bus.departure).split('•')[0]?.trim() || ''}</div>
                      <div style={{ fontSize:"10px", color:"#b0a090" }}>{bus.origin.split(',')[0]}</div>
                    </div>
                    <div style={{ flex:1, padding:"0 10px", textAlign:"center" }}>
                      <div style={{ height:"1px", background:"#e8e2d9", position:"relative" }}>
                        <div style={{ position:"absolute", top:"-4px", left:"50%", transform:"translateX(-50%)", fontSize:"10px" }}>🚌</div>
                      </div>
                      <div style={{ fontSize:"9px", color:"#b0a090", marginTop:"6px", fontWeight:"600" }}>{bus.duration}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"18px", fontWeight:"900", color:"#1a1207", letterSpacing:"-0.5px" }}>{bus.arrival ? formatDate(bus.arrival).split('•')[1]?.trim() : "—"}</div>
                          <div style={{ fontSize:"11px", color:"#9c8b78", marginTop:"2px" }}>{bus.arrival ? formatDate(bus.arrival).split('•')[0]?.trim() : ''}</div>
                      <div style={{ fontSize:"10px", color:"#b0a090" }}>{bus.destination.split(',')[0]}</div>
                    </div>
                  </div>
                  {(() => {
                    const oneWayPrice = bus.price;
                    const tripMultiplier = tripType === "round-trip" ? 2 : 1;
                    const displayPrice = oneWayPrice * tripMultiplier;
                    const totalPrice = displayPrice * passengers;
                    const saving = Math.floor(displayPrice * 0.15);
                    return (
                      <div style={{ marginBottom:"10px" }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:"8px", flexWrap:"wrap" }}>
                          <span style={{ fontFamily:"'Playfair Display', serif", fontSize:"32px", color:"#1a1207", letterSpacing:"-1px", lineHeight:"1" }}>${displayPrice}</span>
                          {tripType === "round-trip" && (
                            <span style={{ fontSize:"11px", color:"#0369a1", fontWeight:"700", background:"#f0f9ff", border:"1px solid #bae6fd", padding:"2px 7px", borderRadius:"6px" }}>↔ ${oneWayPrice} × 2</span>
                          )}
                          {passengers > 1 && (
                            <span style={{ fontSize:"11px", color:"#f97316", fontWeight:"700" }}>× {passengers} pax = ${totalPrice}</span>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:"6px", marginTop:"5px", flexWrap:"wrap" }}>
                          <span style={{ fontSize:"10px", color:"#9c8b78", fontWeight:"500" }}>{tripType === "round-trip" ? `$${oneWayPrice}/leg` : "per person"}</span>
                          <span style={{ fontSize:"10px", color:"#16a34a", fontWeight:"700", background:"#f0fdf4", border:"1px solid #bbf7d0", padding:"1px 6px", borderRadius:"5px" }}>Save ${saving}</span>
                          {returnDate && tripType === "round-trip" && (
                            <span style={{ fontSize:"10px", color:"#7c3aed", fontWeight:"600", background:"#f5f3ff", border:"1px solid #ddd6fe", padding:"1px 6px", borderRadius:"5px" }}>Return {returnDate}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"12px" }}>
                    {["WiFi","USB","AC"].map(a => <span key={a} style={{ fontSize:"9px", color:"#9c8b78", background:"#f7f3ee", border:"1px solid #e8e2d9", padding:"2px 8px", borderRadius:"6px" }}>{a}</span>)}
                  </div>
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"6px" }}>
                    {[
                      { icon:"🗺️", label:"Track", fn:()=>{ setActiveBusForModal(bus); setShowTracker(true); }},
                      { icon:"🌙", label:"Safety", fn:()=>{ setActiveBusForModal(bus); setShowSafety(true); }},
                      { icon:"🍿", label:"Snacks", fn:()=>{ setActiveBusForModal(bus); setShowSnacks(true); }},
                      { icon:"🔔", label:"Alert", fn:()=>{ setActiveBusForModal(bus); setShowPriceAlert(true); }},
                      { icon:"👥", label:"Buddy", fn:()=>{ setActiveBusForModal(bus); setShowBuddy(true); }},
                    ].map(fb => (
                      <button key={fb.label} style={{ background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa", borderRadius:"6px", padding:"3px 8px", cursor:"pointer", fontWeight:"600", fontSize:"10px", fontFamily:"'Outfit', sans-serif" }} onClick={fb.fn}>
                        {fb.icon} {fb.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
                    <PricePrediction bus={bus} />
                    <PackingListButton destination={bus.destination} durationHours={parseFloat(bus.duration)||4} />
                  </div>
                </div>
                <div style={{ borderTop:"1px solid #f0ebe4", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontSize:"10px", color:"#dc2626", display:"flex", alignItems:"center", gap:"4px", fontWeight:"700" }}>
                    <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:"#ef4444" }} />{Math.floor(Math.random()*10)+1} viewing
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button style={{ background:"#f7f3ee", border:"1px solid #e8e2d9", color:"#6b5744", padding:"7px 11px", borderRadius:"9px", fontSize:"11px", fontWeight:"600", cursor:"pointer", fontFamily:"'Outfit', sans-serif" }}
                      onClick={() => { setActiveBusForModal(bus); setShowGroup(true); }}>👨‍👩‍👧 Group</button>
                    <button style={{ background:idx===0?"linear-gradient(135deg,#f97316,#ea580c)":"#fff7ed", color:idx===0?"#fff":"#c2410c", border:idx===0?"none":"1px solid #fed7aa", padding:"7px 14px", borderRadius:"9px", fontSize:"11px", fontWeight:"700", cursor:"pointer", fontFamily:"'Outfit', sans-serif", boxShadow:idx===0?"0 4px 12px rgba(249,115,22,0.3)":"none" }}
                      onClick={() => viewSeats(bus)}>View Seats →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PREFERENCE MODAL ─────────────────────────────────────── */}
      {showPreferenceModal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.65)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(6px)" }}>
          <div style={{ background:"#fff", borderRadius:"24px", padding:"34px", maxWidth:"500px", width:"100%", fontFamily:"'Outfit', sans-serif", boxShadow:"0 40px 80px rgba(0,0,0,0.25)" }}>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:"22px", color:"#1a1207", margin:"0 0 6px" }}>🎯 AI Seat Recommendation</h2>
            <p style={{ color:"#9c8b78", fontSize:"13px", marginBottom:"22px" }}>Select your preferences and we'll find your perfect seat</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"22px" }}>
              {[
                { key:"window", label:"🪟 Window Seat", desc:"Great views, lean against wall" },
                { key:"quiet", label:"🔇 Away from Engine", desc:"Quieter, less vibration" },
                { key:"exit", label:"🚪 Near Exit", desc:"Faster boarding & alighting" },
                { key:"legroom", label:"🦵 Extra Legroom", desc:"More space to stretch" },
                { key:"toilet", label:"🚻 Away from Toilet", desc:"Avoid odors & traffic" },
              ].map(pref => (
                <div key={pref.key} style={{ padding:"12px 14px", borderRadius:"12px", cursor:"pointer", background:selectedPreferences.includes(pref.key)?"#fff7ed":"#f7f3ee", border:`2px solid ${selectedPreferences.includes(pref.key)?"#f97316":"#e8e2d9"}`, transition:"all 0.15s" }}
                  onClick={() => setSelectedPreferences(prev => prev.includes(pref.key) ? prev.filter(p => p !== pref.key) : [...prev, pref.key])}>
                  <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1207", marginBottom:"3px" }}>{pref.label}</div>
                  <div style={{ fontSize:"11px", color:"#9c8b78" }}>{pref.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button style={{ flex:1, padding:"12px", background:"#f7f3ee", color:"#6b5744", border:"1.5px solid #e8e2d9", borderRadius:"12px", cursor:"pointer", fontWeight:"600", fontSize:"13px", fontFamily:"'Outfit', sans-serif" }}
                onClick={() => { setShowPreferenceModal(false); setSelectedPreferences([]); setShowSeatModal(true); }}>Skip — Choose Manually</button>
              <button style={{ flex:1, padding:"12px", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", borderRadius:"12px", cursor:"pointer", fontWeight:"700", fontSize:"13px", fontFamily:"'Outfit', sans-serif", boxShadow:"0 4px 16px rgba(249,115,22,0.35)" }}
                onClick={async () => { setShowPreferenceModal(false); if (selectedPreferences.length > 0) await getRecommendation(selectedPreferences); setSelectedPreferences([]); setShowSeatModal(true); }}>
                🎯 Get My Best Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment&&selectedBus&&selectedSeat&&<PaymentModal bus={selectedBus} seat={selectedSeat} user={user} onSuccess={handlePaymentSuccess} onCancel={()=>setShowPayment(false)} />}

      {showSeatModal && selectedBus && (
        <SeatMapModal
          selectedBus={selectedBus}
          bookedSeats={bookedSeats}
          selectedSeat={selectedSeat}
          setSelectedSeat={setSelectedSeat}
          recommendedSeat={recommendedSeat}
          topSeats={topSeats}
          onConfirm={confirmBooking}
          onClose={() => setShowSeatModal(false)}
        />
      )}
      {showTracker&&activeBusForModal&&<BusTracker booking={{origin:activeBusForModal.origin,destination:activeBusForModal.destination}} onClose={()=>setShowTracker(false)} />}
      {showCalendar&&<FareCalendar origin={origin} destination={destination} onClose={()=>setShowCalendar(false)} onSelectDate={()=>{searchBuses();setShowCalendar(false);}} />}
      {showBuddy&&activeBusForModal&&<TravelBuddy booking={{origin:activeBusForModal.origin,destination:activeBusForModal.destination}} onClose={()=>setShowBuddy(false)} />}
      {showGroup&&activeBusForModal&&<GroupBooking bus={activeBusForModal} bookedSeats={bookedSeats} onClose={()=>setShowGroup(false)} onConfirm={(seats,name,total)=>{alert(`✅ Group booking confirmed!\nSeats: ${seats.join(", ")}\nTotal: $${total}`);setShowGroup(false);}} />}
      {showSafety&&activeBusForModal&&<SafetyScore bus={activeBusForModal} onClose={()=>setShowSafety(false)} />}
      {showSnacks&&activeBusForModal&&<SnackOrder bus={activeBusForModal} onClose={()=>setShowSnacks(false)} />}
      {showPriceAlert&&activeBusForModal&&<PriceAlert bus={activeBusForModal} onClose={()=>setShowPriceAlert(false)} />}

      {/* ── CHATBOT ─────────────────────────────────────────────── */}
      <div style={{ position:"fixed", bottom:"28px", right:"28px", zIndex:500 }}>
        {chatOpen ? (
          <div style={{ width:"400px", background:"#fff", borderRadius:"24px", overflow:"hidden", boxShadow:"0 24px 64px rgba(0,0,0,0.18)", border:"1px solid #e8e2d9", fontFamily:"'Outfit', sans-serif" }}>
            <div style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px" }}>🤖</div>
                <div>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:"#fff" }}>MR Bus AI</div>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", gap:"4px" }}>
                    <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#4ade80" }} /> Online · Replies instantly
                    {selectedBus && <span style={{ marginLeft:"6px", background:"rgba(255,255,255,0.2)", padding:"1px 8px", borderRadius:"10px", fontSize:"10px" }}>Seat mode 💺</span>}
                  </div>
                </div>
              </div>
              <button style={{ color:"rgba(255,255,255,0.7)", background:"none", border:"none", fontSize:"18px", cursor:"pointer" }} onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div style={{ padding:"14px", display:"flex", flexDirection:"column", gap:"10px", minHeight:"260px", maxHeight:"340px", overflowY:"auto", background:"#f7f3ee" }} ref={chatBodyRef}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display:"flex", gap:"7px", alignItems:"flex-start", flexDirection:msg.role==="user"?"row-reverse":"row" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", flexShrink:0 }}>🤖</div>
                  )}
                  <div style={{ maxWidth:"290px", padding:"9px 13px", borderRadius:"14px", fontSize:"12px", lineHeight:"1.6", whiteSpace:"pre-wrap",
                    ...(msg.role==="user"
                      ? { background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", borderBottomRightRadius:"4px" }
                      : { background:"#fff", border:"1px solid #e8e2d9", color:"#1a1207", borderBottomLeftRadius:"4px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" })
                  }}>{msg.text}</div>
                </div>
              ))}
              {chatTyping && (
                <div style={{ display:"flex", gap:"7px", alignItems:"flex-start" }}>
                  <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#ea580c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", flexShrink:0 }}>🤖</div>
                  <div style={{ background:"#fff", border:"1px solid #e8e2d9", borderRadius:"14px", borderBottomLeftRadius:"4px", padding:"11px 14px", display:"flex", gap:"3px", alignItems:"center" }}>
                    {[0,1,2].map(j => <div key={j} style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#c4b8a8", animation:`td 1.4s infinite ${j*0.2}s` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding:"8px 12px 0", background:"#fff", borderTop:"1px solid #f0ebe4" }}>
              <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"8px" }}>
                {(showSeatModal
                  ? ["Select A1", "Select B2", "Select C3", "Select D4"]
                  : selectedBus
                  ? ["Select A1", "Select B3", "Confirm booking", "Packing list"]
                  : quickReplies
                ).map(qr => (
                  <div key={qr} style={{ background:"#f7f3ee", border:"1px solid #e8e2d9", color:"#6b5744", fontSize:"10px", fontWeight:"600", padding:"4px 10px", borderRadius:"16px", cursor:"pointer", transition:"all 0.15s" }}
                    onClick={() => { setChatInput(qr); }}>
                    {qr}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:"7px", paddingBottom:"12px" }}>
                <input style={{ flex:1, background:"#f7f3ee", border:"1.5px solid #e8e2d9", borderRadius:"12px", padding:"9px 13px", fontSize:"12px", color:"#1a1207", outline:"none", fontFamily:"'Outfit', sans-serif" }}
                  placeholder={selectedBus ? "Type a seat like 'A2' to select it..." : "Ask anything about buses..."}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()} />
                <button style={{ width:"40px", height:"40px", background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", borderRadius:"11px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:"14px", color:"#fff", flexShrink:0, opacity:chatInput.trim() ? 1 : 0.45, transition:"opacity 0.15s" }}
                  onClick={sendChat}>➤</button>
              </div>
              <div style={{ fontSize:"9px", color:"#c4b8a8", textAlign:"center", paddingBottom:"8px" }}>Powered by MR Bus AI</div>
            </div>
          </div>
        ) : (
          <div style={{ position:"relative" }}>
            <button style={{ width:"58px", height:"58px", background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", boxShadow:"0 8px 28px rgba(249,115,22,0.45)", cursor:"pointer", transition:"transform 0.2s" }}
              onClick={() => setChatOpen(true)}>🤖</button>
            <div style={{ position:"absolute", top:"-4px", right:"-4px", background:"#ef4444", color:"#fff", borderRadius:"50%", width:"20px", height:"20px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"700", border:"2px solid #f7f3ee" }}>AI</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes td{0%,100%{transform:translateY(0);opacity:0.4;}50%{transform:translateY(-4px);opacity:1;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
      `}</style>

      {/* ── FOOTER ── */}
      <div style={{ background:"#0a0614", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"28px 48px", fontFamily:"'Outfit', sans-serif" }}>
        <div style={{ maxWidth:"1200px", margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:"18px", fontWeight:"700", color:"#fff" }}>
            MR <em style={{ fontStyle:"italic", color:"#f97316" }}>Buses</em>
          </div>
          <div style={{ display:"flex", gap:"20px", flexWrap:"wrap" }}>
            {[
              { label:"Privacy Policy", path:"/privacy" },
              { label:"Terms of Service", path:"/terms" },
              { label:"Refund Policy", path:"/refund-policy" },
              { label:"Contact", path:"/contact" },
              { label:"Cookie Policy", path:"/cookies" },
            ].map((l,i) => (
              <Link key={i} to={l.path} style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", textDecoration:"none", fontWeight:"500" }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)" }}>© 2026 MR Buses. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/booking/:transactionId" element={<BookingDetail />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/verify-ticket" element={<VerifyTicket />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
      </Routes>
    </Router>
  );
}