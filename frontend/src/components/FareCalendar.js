import React, { useState } from 'react';

export default function FareCalendar({ origin, destination, onClose, onSelectDate }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // Generate 30 days of fake fares from today
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    // Weekends are more expensive
    const basePrice = Math.floor(Math.random() * 40) + 25;
    const price = dayOfWeek === 0 || dayOfWeek === 6
      ? basePrice + Math.floor(Math.random() * 20) + 10
      : basePrice;
    const isCheapest = price < 35;
    return {
      date,
      price,
      isCheapest,
      available: Math.random() > 0.1,
      seatsLeft: Math.floor(Math.random() * 20) + 1
    };
  });

  const minPrice = Math.min(...days.map(d => d.price));

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>📅 Flexible Fare Calendar</div>
            <div style={styles.subtitle}>{origin} → {destination}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.legend}>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: "#16a34a" }} /> Best price</div>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: "#4f46e5" }} /> Selected</div>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: "#f59e0b" }} /> Weekend</div>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: "#e5e7eb" }} /> Unavailable</div>
        </div>

        <div style={styles.grid}>
          {days.map((day, i) => {
            const isSelected = selectedDate?.toDateString() === day.date.toDateString();
            const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
            const isBest = day.price === minPrice;
            return (
              <div
                key={i}
                style={{
                  ...styles.dayCard,
                  background: !day.available ? "#f5f5f5" :
                    isSelected ? "#4f46e5" :
                    isBest ? "#f0fdf4" :
                    isWeekend ? "#fffbeb" : "#fff",
                  border: isSelected ? "2px solid #4f46e5" :
                    isBest ? "2px solid #16a34a" : "1px solid #e5e7eb",
                  opacity: day.available ? 1 : 0.5,
                  cursor: day.available ? "pointer" : "not-allowed"
                }}
                onClick={() => day.available && setSelectedDate(day.date)}
              >
                <div style={{
                  ...styles.dayName,
                  color: isSelected ? "#fff" : "#666"
                }}>
                  {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div style={{
                  ...styles.dayNum,
                  color: isSelected ? "#fff" : "#1a1a2e"
                }}>
                  {day.date.getDate()}
                </div>
                <div style={{
                  ...styles.dayPrice,
                  color: isSelected ? "#fff" :
                    isBest ? "#16a34a" :
                    isWeekend ? "#d97706" : "#4f46e5"
                }}>
                  ${day.price}
                </div>
                {isBest && !isSelected && (
                  <div style={styles.bestTag}>BEST</div>
                )}
                {day.seatsLeft <= 5 && day.available && (
                  <div style={styles.urgencyTag}>{day.seatsLeft} left</div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div style={styles.footer}>
            <div style={styles.selectedInfo}>
              Selected: <strong>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
              {" • "}
              <strong style={{ color: "#4f46e5" }}>
                ${days.find(d => d.date.toDateString() === selectedDate.toDateString())?.price}
              </strong>
            </div>
            <button style={styles.selectBtn} onClick={() => { onSelectDate(selectedDate); onClose(); }}>
              Search This Date →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 6000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" },
  header: { background: "linear-gradient(135deg, #1a1a2e, #4f46e5)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: "18px", fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: "2px" },
  closeBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "16px" },
  legend: { display: "flex", gap: "16px", padding: "12px 24px", background: "#f8f9ff", flexShrink: 0, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#555" },
  dot: { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" },
  grid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", padding: "16px 24px", overflowY: "auto" },
  dayCard: { borderRadius: "8px", padding: "8px 4px", textAlign: "center", transition: "all 0.15s", position: "relative", minHeight: "72px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  dayName: { fontSize: "9px", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "2px" },
  dayNum: { fontSize: "16px", fontWeight: "800", marginBottom: "2px" },
  dayPrice: { fontSize: "11px", fontWeight: "700" },
  bestTag: { position: "absolute", top: "-6px", left: "50%", transform: "translateX(-50%)", background: "#16a34a", color: "#fff", fontSize: "7px", fontWeight: "800", padding: "1px 4px", borderRadius: "4px", whiteSpace: "nowrap" },
  urgencyTag: { position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)", background: "#ef4444", color: "#fff", fontSize: "7px", fontWeight: "800", padding: "1px 4px", borderRadius: "4px", whiteSpace: "nowrap" },
  footer: { padding: "16px 24px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: "16px", flexWrap: "wrap" },
  selectedInfo: { fontSize: "14px", color: "#444" },
  selectBtn: { background: "#4f46e5", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 24px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
};