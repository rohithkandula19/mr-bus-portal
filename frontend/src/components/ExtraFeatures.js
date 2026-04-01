import React, { useState } from 'react';

// ── Night Bus Safety Score ──
export function SafetyScore({ bus, onClose }) {
  const score = Math.floor(Math.abs(Math.sin(bus?.id || 1) * 30) + 70);
  const level = score >= 90 ? "Excellent" : score >= 80 ? "Good" : score >= 70 ? "Fair" : "Low";
  const color = score >= 90 ? "#16a34a" : score >= 80 ? "#4f46e5" : score >= 70 ? "#f59e0b" : "#ef4444";

  const checks = [
    { label: "Experienced driver (5+ years)", pass: score > 72 },
    { label: "GPS tracking active", pass: true },
    { label: "Well-lit route", pass: score > 75 },
    { label: "Emergency contact system", pass: true },
    { label: "Recent vehicle inspection", pass: score > 70 },
    { label: "Night route frequency", pass: score > 80 },
  ];

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <div style={modalStyles.title}>🌙 Night Bus Safety Score</div>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "72px", fontWeight: "900", color }}>{score}</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color, marginTop: "4px" }}>{level}</div>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Safety Score out of 100</div>
          </div>
          <div style={{ background: "#f8f9ff", borderRadius: "12px", padding: "16px" }}>
            {checks.map((check, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < checks.length - 1 ? "1px solid #e8eaf0" : "none" }}>
                <span style={{ fontSize: "16px" }}>{check.pass ? "✅" : "⚠️"}</span>
                <span style={{ fontSize: "13px", color: check.pass ? "#333" : "#888" }}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Snack Pre-order ──
export function SnackOrder({ bus, onClose }) {
  const [cart, setCart] = useState({});

  const MENU = [
    { id: 1, name: "Sandwich", emoji: "🥪", price: 6.99, desc: "Fresh turkey & cheese" },
    { id: 2, name: "Coffee", emoji: "☕", price: 3.49, desc: "Hot or iced" },
    { id: 3, name: "Chips", emoji: "🥨", price: 2.49, desc: "Assorted flavors" },
    { id: 4, name: "Juice", emoji: "🧃", price: 2.99, desc: "Orange or apple" },
    { id: 5, name: "Muffin", emoji: "🧁", price: 3.49, desc: "Blueberry or chocolate" },
    { id: 6, name: "Water", emoji: "💧", price: 1.99, desc: "500ml bottle" },
  ];

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU.find(m => m.id === Number(id));
    return sum + (item?.price || 0) * qty;
  }, 0);

  const add = (id) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const remove = (id) => setCart(prev => {
    const newCart = { ...prev };
    if (newCart[id] > 1) newCart[id]--;
    else delete newCart[id];
    return newCart;
  });

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <div style={modalStyles.title}>🍿 Pre-order Snacks</div>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "16px" }}>
            Order snacks before boarding — ready when you get on! 🚌
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {MENU.map(item => (
              <div key={item.id} style={{ background: "#f8f9ff", borderRadius: "10px", padding: "12px", border: "1px solid #e8eaf0" }}>
                <div style={{ fontSize: "28px", marginBottom: "4px" }}>{item.emoji}</div>
                <div style={{ fontWeight: "700", fontSize: "14px" }}>{item.name}</div>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>{item.desc}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "700", color: "#4f46e5" }}>${item.price}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {cart[item.id] ? (
                      <>
                        <button onClick={() => remove(item.id)} style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: "700" }}>-</button>
                        <span style={{ fontWeight: "700", minWidth: "16px", textAlign: "center" }}>{cart[item.id]}</span>
                      </>
                    ) : null}
                    <button onClick={() => add(item.id)} style={{ width: "24px", height: "24px", borderRadius: "50%", border: "none", background: "#4f46e5", color: "#fff", cursor: "pointer", fontWeight: "700" }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {total > 0 && (
            <div style={{ background: "#1a1a2e", borderRadius: "10px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: "700" }}>Total: ${total.toFixed(2)}</span>
              <button
                style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: "700" }}
                onClick={() => { alert(`✅ Snack order placed!\nTotal: $${total.toFixed(2)}\nYour order will be ready when you board!`); onClose(); }}
              >
                Place Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Price Drop Alert ──
export function PriceAlert({ bus, onClose }) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(Math.floor((bus?.price || 50) * 0.8));
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <div style={modalStyles.title}>🔔 Price Drop Alert</div>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <div style={{ fontWeight: "700", fontSize: "18px", marginBottom: "8px" }}>Alert Set!</div>
              <div style={{ color: "#666", fontSize: "14px" }}>
                We'll email you when the price drops below ${targetPrice} for this route.
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: "#f8f9ff", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", color: "#666" }}>Current price for</div>
                <div style={{ fontWeight: "700", fontSize: "16px" }}>{bus?.origin} → {bus?.destination}</div>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#4f46e5", marginTop: "4px" }}>${bus?.price}</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: "700", fontSize: "13px", marginBottom: "6px" }}>
                  Alert me when price drops below:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "20px", fontWeight: "700", color: "#4f46e5" }}>$</span>
                  <input
                    type="number"
                    style={{ flex: 1, padding: "10px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "18px", fontWeight: "700" }}
                    value={targetPrice}
                    onChange={e => setTargetPrice(Number(e.target.value))}
                    min={10}
                    max={bus?.price - 1}
                  />
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  That's ${bus?.price - targetPrice} savings ({Math.round(((bus?.price - targetPrice) / bus?.price) * 100)}% off)
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontWeight: "700", fontSize: "13px", marginBottom: "6px" }}>Email address:</label>
                <input
                  type="email"
                  style={{ width: "100%", padding: "10px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button
                style={{ width: "100%", padding: "14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
                onClick={() => { if (email) setSubmitted(true); else alert("Please enter your email!"); }}
              >
                🔔 Set Price Alert
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 6000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" },
  header: { background: "linear-gradient(135deg, #1a1a2e, #4f46e5)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: "18px", fontWeight: "800" },
  closeBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "16px" },
  body: { overflowY: "auto", padding: "20px 24px" },
};