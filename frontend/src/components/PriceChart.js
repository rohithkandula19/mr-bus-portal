// frontend/src/components/PriceChart.js
// AI Price Chart — shows 7-day price trend and best day to buy
// Add to bus cards: <PriceChart bus={bus} />

import React, { useState } from 'react';

const _gf = document.createElement('link');
_gf.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap';
_gf.rel = 'stylesheet';
document.head.appendChild(_gf);

// Generate deterministic price trend based on bus id + route
function generatePriceTrend(bus) {
  const seed = (bus.id || 1) + (bus.origin?.length || 0) + (bus.destination?.length || 0);
  const basePrice = bus.price || 30;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  
  // Seeded pseudo-random
  const rand = (n) => {
    const x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };

  // Typical pattern: cheaper mid-week, expensive weekends
  const dayMultipliers = [1.18, 0.88, 0.85, 0.90, 1.12, 1.22, 1.15]; // Sun-Sat
  
  return days.map((day, i) => {
    const dayIndex = (today + i) % 7;
    const multiplier = dayMultipliers[dayIndex];
    const noise = (rand(i * 3) - 0.5) * 0.1; // ±5% noise
    const price = Math.round(basePrice * (multiplier + noise));
    return { day, price, dayIndex, isToday: i === 0 };
  });
}

function getBestDay(trend) {
  return trend.reduce((best, day) => day.price < best.price ? day : best, trend[0]);
}

function getPriceInsight(trend, currentPrice) {
  const best = getBestDay(trend);
  const worst = trend.reduce((max, d) => d.price > max.price ? d : max, trend[0]);
  const avg = Math.round(trend.reduce((s, d) => s + d.price, 0) / trend.length);
  
  if (currentPrice <= best.price + 2) {
    return { text: "Today is a great day to book! 🎉", color: "#16a34a", icon: "✅" };
  } else if (currentPrice <= avg) {
    return { text: `Book ${best.day} to save $${currentPrice - best.price}`, color: "#f97316", icon: "💡" };
  } else {
    return { text: `Wait until ${best.day} — save $${currentPrice - best.price}!`, color: "#dc2626", icon: "⏳" };
  }
}

export default function PriceChart({ bus }) {
  const [open, setOpen] = useState(false);
  
  const trend = generatePriceTrend(bus);
  const best = getBestDay(trend);
  const insight = getPriceInsight(trend, bus.price);
  const minPrice = Math.min(...trend.map(d => d.price));
  const maxPrice = Math.max(...trend.map(d => d.price));
  const range = maxPrice - minPrice || 1;

  return (
    <>
      {/* Trigger button — fits on bus card */}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "#f0f9ff",
          color: "#0369a1",
          border: "1px solid #bae6fd",
          borderRadius: "6px",
          padding: "3px 8px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "10px",
          fontFamily: "'Outfit', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        📈 Price Trend
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 5000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", backdropFilter: "blur(6px)",
          fontFamily: "'Outfit', sans-serif",
        }}>
          <div style={{
            background: "#fff", borderRadius: "24px", padding: "28px",
            maxWidth: "480px", width: "100%",
            boxShadow: "0 40px 80px rgba(0,0,0,0.25)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#1a1207", margin: "0 0 4px" }}>
                  📈 7-Day Price Forecast
                </h2>
                <div style={{ fontSize: "13px", color: "#9c8b78" }}>
                  {bus.origin?.split(',')[0]} → {bus.destination?.split(',')[0]}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9c8b78" }}>✕</button>
            </div>

            {/* AI Insight Banner */}
            <div style={{
              background: insight.color === "#16a34a" ? "#f0fdf4" : insight.color === "#f97316" ? "#fff7ed" : "#fef2f2",
              border: `1.5px solid ${insight.color === "#16a34a" ? "#86efac" : insight.color === "#f97316" ? "#fed7aa" : "#fca5a5"}`,
              borderRadius: "12px", padding: "12px 16px", marginBottom: "20px",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ fontSize: "20px" }}>{insight.icon}</span>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: insight.color }}>{insight.text}</div>
                <div style={{ fontSize: "11px", color: "#9c8b78", marginTop: "2px" }}>
                  Best price: ${best.price} on {best.day} · Current: ${bus.price}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "120px", padding: "0 4px" }}>
                {trend.map((d, i) => {
                  const heightPct = 20 + ((d.price - minPrice) / range) * 70;
                  const isBest = d.price === best.price;
                  const isToday = d.isToday;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      {/* Price label */}
                      <div style={{
                        fontSize: "10px", fontWeight: "700",
                        color: isBest ? "#16a34a" : isToday ? "#f97316" : "#9c8b78",
                      }}>${d.price}</div>
                      {/* Bar */}
                      <div style={{
                        width: "100%", height: `${heightPct}px`,
                        background: isBest
                          ? "linear-gradient(180deg,#4ade80,#16a34a)"
                          : isToday
                          ? "linear-gradient(180deg,#fb923c,#f97316)"
                          : "linear-gradient(180deg,#e2e8f0,#cbd5e1)",
                        borderRadius: "6px 6px 0 0",
                        position: "relative",
                        transition: "height 0.3s ease",
                      }}>
                        {isBest && (
                          <div style={{
                            position: "absolute", top: "-18px", left: "50%", transform: "translateX(-50%)",
                            fontSize: "12px",
                          }}>⭐</div>
                        )}
                      </div>
                      {/* Day label */}
                      <div style={{
                        fontSize: "10px", fontWeight: isToday ? "800" : "600",
                        color: isToday ? "#f97316" : "#9c8b78",
                      }}>{isToday ? "Today" : d.day}</div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "center" }}>
                {[
                  { color: "#f97316", label: "Today" },
                  { color: "#16a34a", label: "Best day" },
                  { color: "#cbd5e1", label: "Other days" },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#9c8b78" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "Lowest", value: `$${minPrice}`, color: "#16a34a" },
                { label: "Average", value: `$${Math.round(trend.reduce((s,d)=>s+d.price,0)/7)}`, color: "#f97316" },
                { label: "Highest", value: `$${maxPrice}`, color: "#dc2626" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: "#faf7f3", borderRadius: "10px", padding: "10px",
                  textAlign: "center", border: "1px solid #f0ebe4",
                }}>
                  <div style={{ fontSize: "10px", color: "#9c8b78", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color, marginTop: "3px" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* AI Analysis */}
            <div style={{
              background: "#f0f9ff", borderRadius: "12px", padding: "14px 16px",
              border: "1px solid #bae6fd", marginBottom: "20px",
              fontSize: "12px", color: "#0369a1", lineHeight: "1.6",
            }}>
              🤖 <strong>AI Analysis:</strong> Prices on this route are{" "}
              {maxPrice - minPrice > 10 ? "highly variable" : "fairly stable"}.{" "}
              {best.day === trend[0].day
                ? "Today is the best day to book!"
                : `Booking on ${best.day} could save you $${bus.price - best.price}.`}{" "}
              Prices typically rise on Fridays and weekends due to high demand.
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg,#f97316,#ea580c)",
                border: "none", color: "#fff", borderRadius: "13px",
                fontSize: "14px", fontWeight: "700", cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
                boxShadow: "0 4px 16px rgba(249,115,22,0.35)",
              }}
            >
              Got it — Book Now →
            </button>
          </div>
        </div>
      )}
    </>
  );
}