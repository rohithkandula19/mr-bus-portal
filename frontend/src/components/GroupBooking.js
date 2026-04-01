import React, { useState } from 'react';

export default function GroupBooking({ bus, bookedSeats, onClose, onConfirm }) {
  const [groupSize, setGroupSize] = useState(2);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [groupName, setGroupName] = useState("");

  const allSeats = [
    "A1","A2","A3","A4","B1","B2","B3","B4",
    "C1","C2","C3","C4","D1","D2","D3","D4",
    "E1","E2","E3","E4","F1","F2","F3","F4",
    "G1","G2","G3","G4","H1","H2","H3","H4"
  ];

  const toggleSeat = (seat) => {
    if (bookedSeats.includes(seat)) return;
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(prev => prev.filter(s => s !== seat));
    } else if (selectedSeats.length < groupSize) {
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const totalPrice = selectedSeats.length * (bus?.price || 0);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>👨‍👩‍👧‍👦 Group Booking</div>
            <div style={styles.subtitle}>{bus?.origin} → {bus?.destination}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Group Name / Reference</label>
              <input
                style={styles.input}
                placeholder="e.g. Smith Family Trip"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Group Size</label>
              <select style={styles.input} value={groupSize} onChange={e => { setGroupSize(Number(e.target.value)); setSelectedSeats([]); }}>
                {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} passengers</option>)}
              </select>
            </div>
          </div>

          <div style={styles.sectionTitle}>
            Select {groupSize} seats ({selectedSeats.length}/{groupSize} selected):
          </div>

          <div style={styles.seatMap}>
            <div style={styles.driverLabel}>🚌 Driver</div>
            <div style={styles.seatGrid}>
              {allSeats.map((seat, index) => {
                const isBooked = bookedSeats.includes(seat);
                const isSelected = selectedSeats.includes(seat);
                const addAisle = index % 4 === 2;
                return (
                  <React.Fragment key={seat}>
                    {addAisle && <div style={styles.aisleGap} />}
                    <button
                      style={{
                        ...styles.seat,
                        background: isBooked ? "#fee2e2" : isSelected ? "#4f46e5" : "#f0f4ff",
                        color: isBooked ? "#999" : isSelected ? "#fff" : "#1a1a2e",
                        cursor: isBooked ? "not-allowed" : "pointer",
                        border: isSelected ? "2px solid #3730a3" : "1px solid #e0e7ff",
                        transform: isSelected ? "scale(1.05)" : "scale(1)"
                      }}
                      onClick={() => toggleSeat(seat)}
                      disabled={isBooked}
                    >
                      {seat}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div style={styles.summary}>
              <div style={styles.summaryRow}>
                <span>Selected seats:</span>
                <span style={{ fontWeight: "700" }}>{selectedSeats.join(", ")}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Price per seat:</span>
                <span>${bus?.price}</span>
              </div>
              <div style={{ ...styles.summaryRow, borderTop: "1px solid #e0e7ff", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontWeight: "700" }}>Total:</span>
                <span style={{ fontWeight: "800", fontSize: "20px", color: "#4f46e5" }}>${totalPrice}</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.confirmBtn,
              opacity: selectedSeats.length === groupSize ? 1 : 0.5,
              cursor: selectedSeats.length === groupSize ? "pointer" : "not-allowed"
            }}
            disabled={selectedSeats.length !== groupSize}
            onClick={() => onConfirm(selectedSeats, groupName, totalPrice)}
          >
            Confirm Group Booking ({selectedSeats.length}/{groupSize}) →
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 6000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "580px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" },
  header: { background: "linear-gradient(135deg, #1a1a2e, #4f46e5)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  title: { color: "#fff", fontSize: "18px", fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: "2px" },
  closeBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "16px" },
  body: { overflowY: "auto", padding: "20px 24px" },
  row: { display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" },
  field: { flex: 1, minWidth: "180px" },
  label: { display: "block", fontSize: "12px", fontWeight: "700", color: "#555", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" },
  sectionTitle: { fontSize: "13px", fontWeight: "700", color: "#1a1a2e", marginBottom: "12px" },
  seatMap: { background: "#f8f9ff", borderRadius: "12px", padding: "16px" },
  driverLabel: { textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#666", marginBottom: "8px" },
  seatGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" },
  seat: { padding: "8px 4px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", transition: "all 0.15s" },
  aisleGap: { width: "20px" },
  summary: { background: "#f0f4ff", borderRadius: "10px", padding: "14px 16px", marginTop: "16px" },
  summaryRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14px", color: "#444" },
  footer: { display: "flex", gap: "12px", padding: "16px 24px", borderTop: "1px solid #f0f0f0", flexShrink: 0 },
  cancelBtn: { flex: 1, padding: "12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  confirmBtn: { flex: 2, padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "14px" },
};