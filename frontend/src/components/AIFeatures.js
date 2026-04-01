import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const API = `${process.env.REACT_APP_API_URL}`;

/* ══════════════════════════════════════════════
   1. PRICE PREDICTION BADGE + MODAL
══════════════════════════════════════════════ */
export function PricePrediction({ bus, inline = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetch_prediction = async () => {
    if (data) { setShowModal(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai-features/price-prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: bus.origin, destination: bus.destination, current_price: bus.price, bus_id: bus.id })
      });
      const d = await res.json();
      setData(d);
      setShowModal(true);
    } catch (e) {
      console.error("Price prediction failed: - AIFeatures.js:26", e);
    } finally {
      setLoading(false);
    }
  };

  const trendColor = data?.trend === "drop" ? "#16a34a" : data?.trend === "rising" || data?.trend === "peak" ? "#dc2626" : "#f97316";
  const trendIcon = data?.trend === "drop" ? "📉" : data?.trend === "rising" || data?.trend === "peak" ? "📈" : "➡️";

  return (
    <>
      <button style={{ ...pp.badge, background: loading ? "#faf7f3" : "#fff7ed", borderColor: loading ? "#e8e2d9" : "#fed7aa" }}
        onClick={fetch_prediction} disabled={loading}>
        {loading ? "⏳" : "📉"} {loading ? "Analyzing..." : "Price Prediction"}
      </button>

      {showModal && data && (
        <div style={modal.overlay} onClick={() => setShowModal(false)}>
          <div style={modal.box} onClick={e => e.stopPropagation()}>
            <div style={modal.header}>
              <div style={modal.headerLeft}>
                <div style={modal.headerIcon}>📊</div>
                <div>
                  <div style={modal.title}>Price Prediction</div>
                  <div style={modal.subtitle}>{bus.origin.split(',')[0]} → {bus.destination.split(',')[0]}</div>
                </div>
              </div>
              <button style={modal.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Price display */}
            <div style={pp.priceRow}>
              <div style={pp.priceBox}>
                <div style={pp.priceLabel}>Current Price</div>
                <div style={pp.priceVal}>${data.current_price}</div>
              </div>
              <div style={pp.arrow}>{data.trend === "drop" ? "↓" : data.trend === "rising" ? "↑" : "→"}</div>
              <div style={{ ...pp.priceBox, background: data.trend === "drop" ? "#f0fdf4" : "#fef2f2" }}>
                <div style={pp.priceLabel}>Predicted</div>
                <div style={{ ...pp.priceVal, color: trendColor }}>${data.predicted_price}</div>
              </div>
            </div>

            {/* Trend badge */}
            <div style={{ ...pp.trendBadge, background: data.trend === "drop" ? "#f0fdf4" : data.trend === "rising" || data.trend === "peak" ? "#fef2f2" : "#fff7ed", color: trendColor, border: `1px solid ${trendColor}33` }}>
              {trendIcon} Price is {data.trend === "drop" ? "dropping" : data.trend === "rising" ? "rising" : data.trend === "peak" ? "at peak" : "stable"} · {data.confidence} confidence · {data.day_of_week}
            </div>

            {/* Recommendation */}
            <div style={pp.rec}>
              <div style={pp.recIcon}>💡</div>
              <div>
                <div style={pp.recTitle}>AI Recommendation</div>
                <div style={pp.recText}>{data.recommendation}</div>
              </div>
            </div>

            {/* Best window */}
            <div style={pp.window}>
              <span style={pp.windowIcon}>⏰</span>
              <span style={pp.windowText}>{data.best_window}</span>
            </div>

            {data.savings_potential > 0 && (
              <div style={pp.savings}>
                🎉 Potential savings: <strong style={{ color: "#16a34a" }}>${data.savings_potential}</strong> if you wait until the right day
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const pp = {
  badge: { fontSize: "11px", fontWeight: "600", padding: "4px 9px", borderRadius: "7px", cursor: "pointer", border: "1px solid #fed7aa", color: "#c2410c", fontFamily: "'Outfit', sans-serif" },
  priceRow: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" },
  priceBox: { flex: 1, background: "#faf7f3", borderRadius: "12px", padding: "14px", textAlign: "center" },
  priceLabel: { fontSize: "11px", color: "#9c8b78", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" },
  priceVal: { fontFamily: "'Playfair Display', serif", fontSize: "32px", color: "#1a1207", letterSpacing: "-1px" },
  arrow: { fontSize: "28px", color: "#9c8b78", fontWeight: "900" },
  trendBadge: { textAlign: "center", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" },
  rec: { display: "flex", gap: "12px", background: "#faf7f3", borderRadius: "12px", padding: "14px", marginBottom: "12px" },
  recIcon: { fontSize: "22px", flexShrink: 0 },
  recTitle: { fontSize: "13px", fontWeight: "700", color: "#1a1207", marginBottom: "4px" },
  recText: { fontSize: "13px", color: "#6b5744", lineHeight: "1.5" },
  window: { display: "flex", alignItems: "center", gap: "8px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px" },
  windowIcon: { fontSize: "16px" },
  windowText: { fontSize: "13px", fontWeight: "600", color: "#c2410c" },
  savings: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#15803d" },
};


/* ══════════════════════════════════════════════
   2. AI PACKING LIST
══════════════════════════════════════════════ */
export function PackingListModal({ destination, durationHours, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});
  const [activeTab, setActiveTab] = useState("must");

  useEffect(() => {
    fetchPackingList();
  }, []); // eslint-disable-line

  const fetchPackingList = async () => {
    try {
      const res = await fetch(`${API}/ai-features/packing-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, duration_hours: durationHours })
      });
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error("Packing list failed: - AIFeatures.js:143", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (item) => {
    setChecked(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const tabs = [
    { key: "must", label: "Must Pack", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
    { key: "recommended", label: "Recommended", color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
    { key: "optional", label: "Optional", color: "#9c8b78", bg: "#faf7f3", border: "#e8e2d9" },
  ];

  const activeItems = data ? (activeTab === "must" ? data.must_pack : activeTab === "recommended" ? data.recommended : data.optional) : [];
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = data ? data.total_items : 0;

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={{ ...modal.box, maxWidth: "500px" }} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            <div style={modal.headerIcon}>🎒</div>
            <div>
              <div style={modal.title}>AI Packing List</div>
              <div style={modal.subtitle}>{destination}</div>
            </div>
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={pl.loading}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🌤️</div>
            <div style={{ fontSize: "14px", color: "#9c8b78" }}>Checking weather & building your list...</div>
          </div>
        ) : data ? (
          <>
            {/* Weather badge */}
            {data.weather && (
              <div style={pl.weatherBadge}>
                <span style={{ fontSize: "18px" }}>🌡️</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a1207" }}>
                  {destination.split(',')[0]}: {data.weather.temp_f}°F · {data.weather.description}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "12px", color: "#9c8b78" }}>
                  {checkedCount}/{totalCount} packed
                </span>
              </div>
            )}

            {/* Progress bar */}
            <div style={pl.progress}>
              <div style={{ ...pl.progressFill, width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }} />
            </div>

            {/* Tabs */}
            <div style={pl.tabs}>
              {tabs.map(t => (
                <button key={t.key} style={{ ...pl.tab, ...(activeTab === t.key ? { background: t.bg, borderColor: t.border, color: t.color } : {}) }}
                  onClick={() => setActiveTab(t.key)}>
                  {t.label}
                  <span style={{ ...pl.tabCount, background: activeTab === t.key ? t.bg : "#faf7f3" }}>
                    {(activeTab === t.key ? activeItems : (t.key === "must" ? data.must_pack : t.key === "recommended" ? data.recommended : data.optional)).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Items */}
            <div style={pl.list}>
              {activeItems.map((item, i) => {
                const getIcon = (name) => {
                  const n = name.toLowerCase();
                  if (n.includes("passport") || n.includes("photo id") || n.includes("id card") || n.includes("license")) return "🪪";
                  if (n.includes("boarding pass") || n.includes("ticket") || n.includes("booking")) return "🎫";
                  if (n.includes("phone") && (n.includes("charg") || n.includes("cable"))) return "🔌";
                  if (n.includes("phone") || n.includes("mobile") || n.includes("smartphone")) return "📱";
                  if (n.includes("charger") || n.includes("cable") || n.includes("adapter") || n.includes("plug")) return "🔌";
                  if (n.includes("power bank") || n.includes("portable battery")) return "🔋";
                  if (n.includes("laptop") || n.includes("computer") || n.includes("macbook")) return "💻";
                  if (n.includes("headphone") || n.includes("earphone") || n.includes("airpod") || n.includes("earbud")) return "🎧";
                  if (n.includes("wallet") || n.includes("cash") || n.includes("money") || n.includes("credit card") || n.includes("debit")) return "💳";
                  if (n.includes("water bottle") || n.includes("water")) return "🍶";
                  if (n.includes("snack") || n.includes("food") || n.includes("meal") || n.includes("sandwich")) return "🍱";
                  if (n.includes("medicine") || n.includes("medication") || n.includes("pill") || n.includes("tablet") || n.includes("prescription")) return "💊";
                  if (n.includes("first aid") || n.includes("bandage") || n.includes("band-aid")) return "🩹";
                  if (n.includes("hand sanitizer") || n.includes("sanitizer")) return "🧴";
                  if (n.includes("face mask") || n.includes("surgical mask")) return "😷";
                  if (n.includes("toothbrush") || n.includes("toothpaste") || n.includes("dental")) return "🪥";
                  if (n.includes("shampoo") || n.includes("bodywash") || n.includes("shower gel")) return "🧼";
                  if (n.includes("soap")) return "🧼";
                  if (n.includes("deodorant") || n.includes("perfume") || n.includes("cologne")) return "🌸";
                  if (n.includes("winter jacket") || n.includes("heavy jacket") || n.includes("parka")) return "🧥";
                  if (n.includes("jacket") || n.includes("coat") || n.includes("hoodie") || n.includes("sweater") || n.includes("pullover")) return "🧥";
                  if (n.includes("thermal") || n.includes("underlayer") || n.includes("base layer") || n.includes("inner wear")) return "🧣";
                  if (n.includes("gloves") || n.includes("mittens")) return "🧤";
                  if (n.includes("beanie") || n.includes("hat") || n.includes("cap") || n.includes("winter hat")) return "🧢";
                  if (n.includes("scarf") || n.includes("muffler")) return "🧣";
                  if (n.includes("shirt") || n.includes("tshirt") || n.includes("t-shirt") || n.includes("blouse")) return "👕";
                  if (n.includes("pants") || n.includes("jeans") || n.includes("trousers") || n.includes("shorts")) return "👖";
                  if (n.includes("waterproof") && n.includes("boot")) return "🥾";
                  if (n.includes("boots") || n.includes("ankle boot")) return "🥾";
                  if (n.includes("shoes") || n.includes("sneakers") || n.includes("footwear") || n.includes("sandals")) return "👟";
                  if (n.includes("sock") || n.includes("compression sock")) return "🧦";
                  if (n.includes("umbrella") || n.includes("raincoat") || n.includes("rain jacket")) return "☂️";
                  if (n.includes("sunscreen") || n.includes("sunblock") || n.includes("spf")) return "☀️";
                  if (n.includes("sunglasses") || n.includes("shades")) return "🕶️";
                  if (n.includes("glasses") || n.includes("spectacles")) return "👓";
                  if (n.includes("book") || n.includes("novel") || n.includes("magazine") || n.includes("reading material")) return "📚";
                  if (n.includes("camera") || n.includes("gopro")) return "📷";
                  if (n.includes("keys") || n.includes("house key") || n.includes("car key")) return "🔑";
                  if (n.includes("map") || n.includes("navigation")) return "🗺️";
                  if (n.includes("luggage") || n.includes("suitcase") || n.includes("trolley bag")) return "🧳";
                  if (n.includes("backpack") || n.includes("bag") || n.includes("tote")) return "🎒";
                  if (n.includes("neck pillow") || n.includes("travel pillow")) return "🛏️";
                  if (n.includes("pillow")) return "🛏️";
                  if (n.includes("blanket") || n.includes("shawl") || n.includes("throw")) return "🛋️";
                  if (n.includes("eye mask") || n.includes("sleep mask")) return "😴";
                  if (n.includes("earplugs") || n.includes("ear plug") || n.includes("noise")) return "🔇";
                  if (n.includes("watch") || n.includes("smartwatch")) return "⌚";
                  if (n.includes("towel") || n.includes("beach towel")) return "🏖️";
                  if (n.includes("hand warmer") || n.includes("heating pad")) return "🔥";
                  if (n.includes("gym") || n.includes("workout") || n.includes("exercise")) return "💪";
                  if (n.includes("charcoal") || n.includes("heating") || n.includes("warm")) return "🔥";
                  if (n.includes("insect") || n.includes("mosquito") || n.includes("bug spray")) return "🦟";
                  if (n.includes("tissues") || n.includes("tissue") || n.includes("napkin")) return "🧻";
                  if (n.includes("lock") || n.includes("padlock")) return "🔒";
                  if (n.includes("pen") || n.includes("pencil") || n.includes("stationery")) return "✏️";
                  return "🎒";
                };
                const icon = getIcon(item.item);
                const priorityColor = item.priority === "must" ? "#f97316" : item.priority === "recommended" ? "#c2410c" : "#9c8b78";
                const priorityBg = item.priority === "must" ? "rgba(249,115,22,0.1)" : item.priority === "recommended" ? "rgba(194,65,12,0.08)" : "rgba(156,139,120,0.08)";
                return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 14px", background: checked[item.item] ? "rgba(249,115,22,0.04)" : "#fff", borderRadius:"12px", cursor:"pointer", marginBottom:"8px", border: checked[item.item] ? "1.5px solid rgba(249,115,22,0.3)" : "1.5px solid #f0ebe4", opacity: checked[item.item] ? 0.6 : 1, transition:"all 0.15s ease" }}
                  onClick={() => toggleCheck(item.item)}>
                  <div style={{ width:"36px", height:"36px", borderRadius:"10px", background: checked[item.item] ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(249,115,22,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"16px" }}>
                    {checked[item.item] ? <span style={{ fontSize:"14px", color:"#fff" }}>✓</span> : icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1207", marginBottom:"2px", textDecoration: checked[item.item] ? "line-through" : "none" }}>
                      {item.item}
                    </div>
                    <div style={{ fontSize:"11px", color:"#9c8b78" }}>{item.reason}</div>
                  </div>
                  <div style={{ fontSize:"10px", fontWeight:"700", padding:"3px 9px", borderRadius:"20px", flexShrink:0, background: priorityBg, color: priorityColor, border:`1px solid ${priorityColor}30`, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                    {item.priority}
                  </div>
                </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={pl.loading}><div style={{ color: "#dc2626" }}>Failed to generate packing list</div></div>
        )}
      </div>
    </div>
  );
}

export function PackingListButton({ destination, durationHours }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <button style={pp.badge} onClick={() => setShowModal(true)}>🎒 Packing List</button>
      {showModal && ReactDOM.createPortal(<PackingListModal destination={destination} durationHours={durationHours} onClose={() => setShowModal(false)} />, document.body)}
    </>
  );
}

const pl = {
  loading: { padding: "40px", textAlign: "center" },
  weatherBadge: { display: "flex", alignItems: "center", gap: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px" },
  progress: { height: "4px", background: "#f0ebe4", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#f97316,#4ade80)", borderRadius: "10px", transition: "width 0.3s ease" },
  tabs: { display: "flex", gap: "6px", marginBottom: "14px" },
  tab: { flex: 1, padding: "7px 10px", borderRadius: "9px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid #e8e2d9", background: "#fff", color: "#9c8b78", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },
  tabCount: { fontSize: "10px", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" },
  list: { maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" },
  item: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#faf7f3", color: "#1a1207", borderRadius: "10px", cursor: "pointer", border: "1px solid #f0ebe4" },
  checkbox: { width: '90vw', maxWidth: '480px', height: "18px", borderRadius: "5px", border: "1.5px solid #e8e2d9", background: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { background: "linear-gradient(135deg,#f97316,#ea580c)", border: "none" },
  itemName: { fontSize: "13px", fontWeight: "600", color: "#1a1207", marginBottom: "2px", display: "block" },
  itemReason: { fontSize: "11px", color: "#9c8b78" },
  priority: { fontSize: "9px", padding: "2px 7px", borderRadius: "6px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.3px", flexShrink: 0 },
};


/* ══════════════════════════════════════════════
   3. SMART REBOOKING PANEL
══════════════════════════════════════════════ */
export function SmartRebook({ booking, onRescheduled }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const checkRebook = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ai-features/smart-rebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transaction_id: booking.transaction_id })
      });
      const d = await res.json();
      setData(d);
      setShowModal(true);
    } catch (e) {
      console.error("Smart rebook failed: - AIFeatures.js:293", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (alt) => {
    if (!window.confirm(`Reschedule to:\n${alt.bus}\nDeparture: ${alt.departure}\nPrice: $${alt.price}\n\nConfirm?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/bookings/reschedule/${booking.transaction_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_bus_id: alt.id, new_departure: alt.departure, new_arrival: alt.arrival, new_duration: alt.duration, new_price: alt.price })
      });
      const d = await res.json();
      if (d.status === "rescheduled") {
        alert(`✅ Rescheduled! New departure: ${alt.departure}`);
        setShowModal(false);
        if (onRescheduled) onRescheduled();
      } else {
        alert(`❌ ${d.message}`);
      }
    } catch { alert("Reschedule failed."); }
  };

  const scenarioColor = data?.scenario === "imminent" ? "#dc2626" : data?.scenario === "upcoming" ? "#f97316" : "#9c8b78";
  const scenarioIcon = data?.scenario === "imminent" ? "🚨" : data?.scenario === "upcoming" ? "⚡" : data?.scenario === "past" ? "✅" : "🔄";

  return (
    <>
      <button style={{ ...pp.badge, background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}
        onClick={checkRebook} disabled={loading}>
        {loading ? "⏳" : "🔄"} {loading ? "Checking..." : "Smart Rebook"}
      </button>

      {showModal && data && (
        <div style={modal.overlay} onClick={() => setShowModal(false)}>
          <div style={{ ...modal.box, maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
            <div style={modal.header}>
              <div style={modal.headerLeft}>
                <div style={modal.headerIcon}>🔄</div>
                <div>
                  <div style={modal.title}>Smart Rebooking</div>
                  <div style={modal.subtitle}>{booking.origin} → {booking.destination}</div>
                </div>
              </div>
              <button style={modal.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Status */}
            <div style={{ ...sr.status, borderColor: scenarioColor + "33", background: scenarioColor + "0a" }}>
              <span style={{ fontSize: "20px" }}>{scenarioIcon}</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: scenarioColor, marginBottom: "3px" }}>
                  {data.hours_until_departure > 0 ? `Departing in ${data.hours_until_departure}h` : "Trip completed"}
                </div>
                <div style={{ fontSize: "13px", color: "#6b5744" }}>{data.message}</div>
              </div>
            </div>

            {/* Current booking */}
            <div style={sr.current}>
              <div style={sr.currentLabel}>Current Booking</div>
              <div style={sr.currentRow}>
                <span style={sr.currentRoute}>{booking.origin?.split(',')[0]} → {booking.destination?.split(',')[0]}</span>
                <span style={sr.currentPrice}>${booking.price}</span>
              </div>
              <div style={sr.currentMeta}>Seat {booking.seat_number} · {booking.departure}</div>
            </div>

            {/* Alternatives */}
            {data.alternatives?.length > 0 && (
              <>
                <div style={sr.altTitle}>Alternative Departures</div>
                <div style={sr.altList}>
                  {data.alternatives.slice(0, 5).map((alt, i) => (
                    <div key={i} style={sr.altItem} onClick={() => handleReschedule(alt)}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a1207", marginBottom: "3px" }}>{alt.bus}</div>
                        <div style={{ fontSize: "12px", color: "#f97316", fontWeight: "600" }}>🕐 {alt.departure}</div>
                        <div style={{ fontSize: "11px", color: "#9c8b78", marginTop: "2px" }}>⏱ {alt.duration}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#1a1207" }}>${alt.price}</div>
                        {alt.price_diff !== 0 && (
                          <div style={{ fontSize: "11px", fontWeight: "600", color: alt.price_diff < 0 ? "#16a34a" : "#dc2626" }}>
                            {alt.price_diff < 0 ? "Save" : "+"} ${Math.abs(alt.price_diff)}
                          </div>
                        )}
                        <div style={sr.selectBtn}>Select →</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={sr.policy}>{data.cancellation_policy}</div>
          </div>
        </div>
      )}
    </>
  );
}

const sr = {
  status: { display: "flex", gap: "12px", alignItems: "flex-start", border: "1.5px solid", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" },
  current: { background: "#faf7f3", borderRadius: "12px", padding: "14px", marginBottom: "16px" },
  currentLabel: { fontSize: "10px", color: "#9c8b78", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  currentRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" },
  currentRoute: { fontSize: "15px", fontWeight: "800", color: "#1a1207" },
  currentPrice: { fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#f97316" },
  currentMeta: { fontSize: "12px", color: "#9c8b78" },
  altTitle: { fontSize: "11px", fontWeight: "700", color: "#9c8b78", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" },
  altList: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" },
  altItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1.5px solid #e8e2d9", borderRadius: "12px", padding: "14px 16px", cursor: "pointer" },
  selectBtn: { fontSize: "11px", color: "#f97316", fontWeight: "700", marginTop: "4px" },
  policy: { fontSize: "11px", color: "#9c8b78", textAlign: "center", lineHeight: "1.5" },
};


/* ══════════════════════════════════════════════
   4. TRIP SUMMARY CARD
══════════════════════════════════════════════ */
export function TripSummary({ booking, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []); // eslint-disable-line

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/ai-features/trip-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transaction_id: booking.transaction_id })
      });
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error("Trip summary failed: - AIFeatures.js:437", e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (data?.share_text) {
      navigator.clipboard.writeText(data.share_text).then(() => {
        alert("✅ Share text copied to clipboard!");
      });
    }
  };

  return ReactDOM.createPortal(
    <div style={modal.overlay} onClick={onClose}>
      <div style={{ ...modal.box, maxWidth: "540px" }} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            <div style={modal.headerIcon}>🏆</div>
            <div>
              <div style={modal.title}>Trip Summary</div>
              <div style={modal.subtitle}>AI-powered travel recap</div>
            </div>
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div style={pl.loading}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>✨</div>
            <div style={{ fontSize: "14px", color: "#9c8b78" }}>Generating your trip summary...</div>
          </div>
        ) : data ? (
          <>
            {/* Route header */}
            <div style={ts.routeCard}>
              <div style={ts.originCode}>{data.booking.origin?.split(',')[0]?.substring(0, 3).toUpperCase()}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px" }}>🚌</div>
                <div style={{ fontSize: "11px", color: "#9c8b78", marginTop: "3px" }}>{data.booking.duration}</div>
              </div>
              <div style={ts.originCode}>{data.booking.destination?.split(',')[0]?.substring(0, 3).toUpperCase()}</div>
            </div>

            {/* Stats grid */}
            <div style={ts.statsGrid}>
              {[
                { icon: "🛣️", label: "Distance", value: `~${data.stats.distance_miles} mi` },
                { icon: "💰", label: "Fare Paid", value: `$${data.stats.fare_paid}` },
                { icon: "✈️", label: "Saved vs Flight", value: `$${data.stats.saved_vs_flight}`, green: true },
                { icon: "🌱", label: "CO₂ Saved", value: `${data.stats.co2_saved_kg}kg`, green: true },
                { icon: "🏆", label: "Points Earned", value: `+${data.stats.points_earned}`, orange: true },
                { icon: "🎫", label: "Total Trips", value: data.stats.total_trips },
              ].map((s, i) => (
                <div key={i} style={ts.statItem}>
                  <div style={ts.statIcon}>{s.icon}</div>
                  <div style={ts.statLabel}>{s.label}</div>
                  <div style={{ ...ts.statValue, color: s.green ? "#16a34a" : s.orange ? "#f97316" : "#1a1207" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Loyalty */}
            <div style={ts.loyaltyBadge}>
              <span style={{ fontSize: "20px" }}>🥉</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a1207" }}>{data.loyalty.tier} Member</div>
                <div style={{ fontSize: "12px", color: "#9c8b78" }}>{data.loyalty.total_points?.toLocaleString()} total points · {data.loyalty.total_earned?.toLocaleString()} earned</div>
              </div>
            </div>

            {/* Highlights */}
            <div style={ts.highlights}>
              {data.highlights?.map((h, i) => (
                <div key={i} style={ts.highlight}>
                  <span style={ts.highlightDot} />
                  <span style={ts.highlightText}>{h}</span>
                </div>
              ))}
            </div>

            {/* Share button */}
            <button style={ts.shareBtn} onClick={handleShare}>
              📤 Copy Share Text
            </button>
          </>
        ) : (
          <div style={pl.loading}><div style={{ color: "#dc2626" }}>Failed to generate summary</div></div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function TripSummaryButton({ booking }) {
  const [show, setShow] = useState(false);

  // Only show for confirmed past trips
  const isPast = () => {
    try {
      const dep = new Date(booking.departure);
      return dep < new Date();
    } catch { return false; }
  };

  if (!isPast() || booking.status !== "confirmed") return null;

  return (
    <>
      <button style={{ ...pp.badge, background: "#faf5ff", borderColor: "#e9d5ff", color: "#7c3aed" }}
        onClick={() => setShow(true)}>
        ✨ Trip Summary
      </button>
      {show && <TripSummary booking={booking} onClose={() => setShow(false)} />}
    </>
  );
}

const ts = {
  routeCard: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#1c0e04,#3d1f06)", borderRadius: "14px", padding: "20px 24px", marginBottom: "16px" },
  originCode: { fontFamily: "'Playfair Display', serif", fontSize: "36px", color: "#fff", letterSpacing: "2px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "14px" },
  statItem: { background: "#faf7f3", borderRadius: "12px", padding: "12px 10px", textAlign: "center" },
  statIcon: { fontSize: "18px", marginBottom: "5px" },
  statLabel: { fontSize: "10px", color: "#9c8b78", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "600", marginBottom: "3px" },
  statValue: { fontSize: "16px", fontWeight: "800", letterSpacing: "-0.3px" },
  loyaltyBadge: { display: "flex", alignItems: "center", gap: "12px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: "12px", padding: "12px 16px", marginBottom: "14px" },
  highlights: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  highlight: { display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#6b5744", lineHeight: "1.5" },
  highlightDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#f97316", flexShrink: 0, marginTop: "5px" },
  highlightText: {},
  shareBtn: { width: "100%", background: "linear-gradient(135deg,#f97316,#ea580c)", border: "none", color: "#fff", padding: "12px", borderRadius: "12px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
};


/* ── Shared Modal styles ── */
const modal = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(4px)" },
  box: { background: "#fff", borderRadius: "24px", padding: "28px", width: '90vw', maxWidth: '480px', maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 40px 80px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerIcon: { width: "44px", height: "44px", borderRadius: "13px", background: "#fff7ed", border: "1px solid #fed7aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#1a1207" },
  subtitle: { fontSize: "12px", color: "#9c8b78", marginTop: "2px" },
  closeBtn: { background: "transparent", border: "none", fontSize: "18px", color: "#9c8b78", cursor: "pointer", padding: "4px" },
};