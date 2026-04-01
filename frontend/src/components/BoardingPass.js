import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BoardingPass({ booking, onClose }) {
  const passRef = useRef(null);

  const ticketPayload = encodeURIComponent(JSON.stringify({
    id: booking.transaction_id,
    route: `${booking.origin} → ${booking.destination}`,
    seat: booking.seat_number,
    departure: booking.departure,
    bus: booking.bus_name,
    passenger: booking.user_name || "Passenger"
  }));

  const qrUrl = `${window.location.origin}/verify-ticket?data=${ticketPayload}`;

  const originCode = booking.origin?.split(',')[0]?.substring(0, 3).toUpperCase() || "ORG";
  const destCode = booking.destination?.split(',')[0]?.substring(0, 3).toUpperCase() || "DST";
  const formatBoardingDate = (dep) => {
    if (!dep) return { date: "N/A", time: "" };
    try {
      // Handle ISO format: 2026-03-25T15:00:00
      // Handle MM-DD-YYYY HH:MM format
      let d;
      if (dep.includes('T')) {
        d = new Date(dep);
      } else {
        const [datePart, timePart] = dep.split(' ');
        const [mm, dd, yyyy] = datePart.split('-');
        d = new Date(`${yyyy}-${mm}-${dd}T${timePart || '00:00'}:00`);
      }
      if (isNaN(d.getTime())) return { date: dep, time: "" };
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const date = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      const time = `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
      return { date, time };
    } catch { return { date: dep, time: "" }; }
  };
  const { date: departureDate, time: departureTime } = formatBoardingDate(booking.departure);
  const { time: arrivalTime } = formatBoardingDate(booking.arrival);

  const handlePrint = () => {
    const content = passRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Boarding Pass - ${booking.transaction_id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            * { box-sizing: border-box; }
            @media print { body { background: white; padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={s.overlay}>
      <div style={s.container}>
        <div style={s.topLabel}>🎫 Your Digital Boarding Pass</div>

        <div ref={passRef} style={s.pass}>

          {/* HEADER */}
          <div style={s.header}>
            <div>
              <div style={s.logo}>🚌 MR Bus Portal</div>
              <div style={s.tagline}>Your journey starts here</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={s.bpLabel}>BOARDING PASS</div>
              <div style={s.bpClass}>ECONOMY CLASS</div>
            </div>
          </div>

          {/* PASSENGER BAR */}
          <div style={s.passengerBar}>
            <div style={s.pField}>
              <div style={s.fLabel}>PASSENGER NAME</div>
              <div style={s.pName}>{booking.user_name?.toUpperCase() || "PASSENGER"}</div>
            </div>
            <div style={s.pField}>
              <div style={s.fLabel}>BOOKING REF</div>
              <div style={s.bRef}>{booking.transaction_id}</div>
            </div>
            <div style={s.pField}>
              <div style={s.fLabel}>DATE</div>
              <div style={s.bRef}>{departureDate}{departureTime ? ` • ${departureTime}` : ''}</div>
            </div>
          </div>

          {/* ROUTE */}
          <div style={s.route}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={s.cityCode}>{originCode}</div>
              <div style={s.cityFull}>{booking.origin}</div>
              <div style={s.tLabel}>DEPARTURE</div>
              <div style={s.bigTime}>{departureTime}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <div style={s.dot} />
                <div style={s.dashes} />
                <span style={{ fontSize: "20px" }}>🚌</span>
                <div style={s.dashes} />
                <div style={s.dot} />
              </div>
              <div style={s.durBadge}>{booking.duration || "N/A"}</div>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div style={s.cityCode}>{destCode}</div>
              <div style={s.cityFull}>{booking.destination}</div>
              <div style={s.tLabel}>ARRIVAL</div>
              <div style={s.bigTime}>{arrivalTime || "N/A"}</div>
            </div>
          </div>

          {/* INFO ROW */}
          <div style={s.infoRow}>
            {[
              { l: "SEAT", v: booking.seat_number, big: true },
              { l: "BUS", v: booking.bus_name },
              { l: "GATE", v: `B${Math.abs(parseInt(booking.transaction_id?.slice(-2), 16) % 20) + 1}` },
              { l: "BOARDING", v: departureTime },
              { l: "FARE", v: `$${booking.price}`, orange: true },
            ].map((f, i) => (
              <div key={i} style={{ ...s.infoItem, borderRight: i < 4 ? "1px solid #f0ebe4" : "none" }}>
                <div style={s.fLabelDark}>{f.l}</div>
                <div style={{
                  fontSize: f.big ? "24px" : "14px",
                  fontWeight: "800",
                  color: f.orange ? "#f97316" : f.big ? "#f97316" : "#1a1207"
                }}>{f.v}</div>
              </div>
            ))}
          </div>

          {/* TEAR LINE */}
          <div style={s.tear}>
            <div style={s.nub} />
            <div style={s.perf}>
              {Array.from({ length: 28 }).map((_, i) => <div key={i} style={s.hole} />)}
            </div>
            <div style={s.nub} />
          </div>

          {/* STUB */}
          <div style={s.stub}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a1207" }}>🚌 MR Bus Portal</div>
                <div style={{ fontSize: "9px", fontWeight: "700", color: "#9c8b78", letterSpacing: "2px" }}>BOARDING STUB</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", color: "#f97316" }}>{originCode}</span>
                <span style={{ color: "#9c8b78", fontSize: "14px", fontWeight: "700" }}>——→</span>
                <span style={{ fontSize: "28px", fontWeight: "900", color: "#f97316" }}>{destCode}</span>
              </div>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {[
                  { l: "SEAT", v: booking.seat_number },
                  { l: "DEP", v: departureTime },
                  { l: "REF", v: booking.transaction_id }
                ].map(f => (
                  <div key={f.l}>
                    <span style={{ fontSize: "9px", color: "#9c8b78", fontWeight: "700", letterSpacing: "1px" }}>{f.l} </span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#1a1207", fontFamily: "monospace" }}>{f.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{ background: "#fff", padding: "8px", borderRadius: "12px", border: "2px solid #f0ebe4" }}>
                <QRCodeSVG
                  value={qrUrl}
                  size={110}
                  level="H"
                  includeMargin={false}
                  fgColor="#1a1207"
                  bgColor="#ffffff"
                />
              </div>
              <div style={{ fontSize: "9px", fontWeight: "700", color: "#9c8b78", letterSpacing: "2px" }}>SCAN TO BOARD</div>
              <div style={{ fontSize: "8px", color: "#c4b8a8", maxWidth: "120px", textAlign: "center" }}>
                {booking.transaction_id}
              </div>
            </div>
          </div>

          {/* NOTICE */}
          <div style={s.notice}>
            ⚠️ Please arrive 15 minutes before departure &nbsp;|&nbsp; Keep this pass handy &nbsp;|&nbsp; Non-transferable
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button style={s.printBtn} onClick={handlePrint}>🖨️ Print / Save as PDF</button>
          <button style={s.closeBtn} onClick={onClose}>✕ Close</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.88)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" },
  container: { width: "100%", maxWidth: "620px" },
  topLabel: { color: "#fff", fontSize: "16px", fontWeight: "600", marginBottom: "12px", textAlign: "center", opacity: 0.85 },
  pass: { background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
  header: { background: "linear-gradient(135deg,#1c0e04,#3d1f06,#0e0618)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { color: "#fff", fontSize: "18px", fontWeight: "800" },
  tagline: { color: "rgba(255,255,255,0.45)", fontSize: "11px", marginTop: "2px" },
  bpLabel: { color: "#fb923c", fontSize: "13px", fontWeight: "800", letterSpacing: "3px" },
  bpClass: { color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "2px", marginTop: "2px" },
  passengerBar: { display: "flex", background: "rgba(26,12,4,0.97)", padding: "12px 24px", gap: "0" },
  pField: { flex: 1, paddingRight: "16px" },
  fLabel: { fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "3px" },
  fLabelDark: { fontSize: "9px", color: "#9c8b78", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "4px" },
  pName: { fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "1px" },
  bRef: { fontSize: "13px", fontWeight: "700", color: "#fb923c", fontFamily: "monospace" },
  route: { display: "flex", alignItems: "center", padding: "22px 24px 14px", gap: "8px" },
  cityCode: { fontSize: "44px", fontWeight: "900", color: "#1a1207", letterSpacing: "2px", lineHeight: 1 },
  cityFull: { fontSize: "11px", color: "#9c8b78", marginTop: "2px", marginBottom: "8px" },
  tLabel: { fontSize: "9px", color: "#c4b8a8", fontWeight: "700", letterSpacing: "1px" },
  bigTime: { fontSize: "22px", fontWeight: "800", color: "#f97316" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", background: "#f97316" },
  dashes: { flex: 1, height: "2px", background: "repeating-linear-gradient(90deg,#f97316 0,#f97316 6px,transparent 6px,transparent 10px)" },
  durBadge: { fontSize: "11px", fontWeight: "700", color: "#9c8b78", marginTop: "6px", background: "#faf7f3", borderRadius: "12px", padding: "3px 10px", display: "inline-block" },
  infoRow: { display: "flex", borderTop: "1px solid #f0ebe4", borderBottom: "1px solid #f0ebe4", margin: "0 24px" },
  infoItem: { flex: 1, padding: "12px 8px", textAlign: "center" },
  tear: { display: "flex", alignItems: "center", height: "26px", background: "#faf7f3", position: "relative" },
  nub: { width: "22px", height: "22px", background: "rgba(0,0,0,0.88)", borderRadius: "50%", flexShrink: 0, marginLeft: "-11px", marginRight: "-11px" },
  perf: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px" },
  hole: { width: "6px", height: "6px", borderRadius: "50%", background: "rgba(0,0,0,0.88)" },
  stub: { display: "flex", padding: "18px 24px", gap: "20px", alignItems: "center", background: "#faf7f3" },
  notice: { background: "#fff7ed", borderTop: "1px solid #fed7aa", padding: "10px 24px", fontSize: "10px", color: "#c2410c", textAlign: "center", fontWeight: "500" },
  printBtn: { flex: 1, padding: "14px", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "15px", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" },
  closeBtn: { padding: "14px 20px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "15px" },
};