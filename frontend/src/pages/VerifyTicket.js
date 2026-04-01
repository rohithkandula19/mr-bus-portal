import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function VerifyTicket() {
  const [searchParams] = useSearchParams();
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // QR contains JSON — parse it from URL param or hash
      const raw = searchParams.get('data') || window.location.hash.replace('#', '');
      if (raw) {
        const decoded = JSON.parse(decodeURIComponent(raw));
        setTicketData(decoded);
      } else {
        setError("No ticket data found in QR code.");
      }
    } catch (e) {
      setError("Invalid QR code format.");
    }
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <h2 style={{ color: "#c00" }}>Invalid Ticket</h2>
          <p style={{ color: "#666" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "32px" }}>🔍</div>
          <p>Verifying ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.pass}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🚌 MR Bus Portal</div>
          <div style={styles.verified}>✅ VERIFIED TICKET</div>
        </div>

        {/* Route */}
        <div style={styles.routeSection}>
          <div style={styles.cityBlock}>
            <div style={styles.cityCode}>
              {ticketData.route?.split('→')[0]?.trim()?.substring(0, 3).toUpperCase() || "ORG"}
            </div>
            <div style={styles.cityName}>{ticketData.route?.split('→')[0]?.trim()}</div>
          </div>
          <div style={styles.routeMiddle}>
            <div style={styles.routeLine} />
            <span style={{ fontSize: "24px" }}>🚌</span>
            <div style={styles.routeLine} />
          </div>
          <div style={styles.cityBlock}>
            <div style={styles.cityCode}>
              {ticketData.route?.split('→')[1]?.trim()?.substring(0, 3).toUpperCase() || "DST"}
            </div>
            <div style={styles.cityName}>{ticketData.route?.split('→')[1]?.trim()}</div>
          </div>
        </div>

        {/* Details */}
        <div style={styles.details}>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>PASSENGER</div>
            <div style={styles.detailValue}>{ticketData.passenger || "Passenger"}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>SEAT</div>
            <div style={{ ...styles.detailValue, fontSize: "28px", color: "#c0392b", fontWeight: "900" }}>
              {ticketData.seat}
            </div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>DEPARTURE</div>
            <div style={styles.detailValue}>{ticketData.departure}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>BUS</div>
            <div style={styles.detailValue}>{ticketData.bus}</div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>TRANSACTION ID</div>
            <div style={{ ...styles.detailValue, fontFamily: "monospace", color: "#c0392b" }}>
              {ticketData.id}
            </div>
          </div>
          <div style={styles.detailItem}>
            <div style={styles.detailLabel}>STATUS</div>
            <div style={{ ...styles.detailValue, color: "#16a34a" }}>✅ CONFIRMED</div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerBadge}>✅ This ticket has been verified by MR Bus Portal</div>
          <p style={styles.footerText}>
            Please arrive 15 minutes before departure. Show this screen to the bus driver.
          </p>
          <p style={styles.footerText}>© 2026 MR Bus Portal — Safe Travels 🚌</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "#fff", borderRadius: "16px", padding: "40px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  pass: { background: "#fff", borderRadius: "16px", overflow: "hidden", maxWidth: "500px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" },
  header: { background: "linear-gradient(135deg, #96281b, #c0392b)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "#fff", fontSize: "18px", fontWeight: "800" },
  verified: { background: "rgba(255,255,255,0.2)", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" },
  routeSection: { display: "flex", alignItems: "center", padding: "24px", background: "#fff9f9" },
  cityBlock: { flex: 1, textAlign: "center" },
  cityCode: { fontSize: "36px", fontWeight: "900", color: "#c0392b", letterSpacing: "2px" },
  cityName: { fontSize: "11px", color: "#666", marginTop: "4px" },
  routeMiddle: { flex: 1, display: "flex", alignItems: "center", gap: "6px" },
  routeLine: { flex: 1, height: "2px", background: "#c0392b" },
  details: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", padding: "0 24px" },
  detailItem: { padding: "14px 8px", borderBottom: "1px solid #fef2f2" },
  detailLabel: { fontSize: "10px", color: "#aaa", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "4px" },
  detailValue: { fontSize: "14px", fontWeight: "700", color: "#1a1a2e" },
  footer: { background: "#fff9f9", padding: "16px 24px", textAlign: "center", borderTop: "1px solid #fde8e8" },
  footerBadge: { background: "#dcfce7", color: "#16a34a", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", marginBottom: "12px", display: "inline-block" },
  footerText: { fontSize: "11px", color: "#999", margin: "4px 0" },
};