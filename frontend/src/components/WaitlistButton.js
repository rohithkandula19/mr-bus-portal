// frontend/src/components/WaitlistButton.js
// Shows waitlist button on bus cards when bus appears full
// Usage: <WaitlistButton bus={bus} bookedSeats={bookedSeats} />

import React, { useState, useEffect } from 'react';
const API = `${process.env.REACT_APP_API_URL}`;

const getUserFromStorage = () => {
  try { const r = localStorage.getItem("user"); return r ? JSON.parse(r) : null; } catch { return null; }
};

export default function WaitlistButton({ bus, bookedSeats = [] }) {
  const [queueSize, setQueueSize] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [myWaitlist, setMyWaitlist] = useState([]);

  const user = getUserFromStorage();
  const token = localStorage.getItem("token");
  const totalSeats = bus.total_seats || 32;
  const isFull = bookedSeats.length >= totalSeats - 2; // show when nearly full

  useEffect(() => {
    if (bus?.id) fetchQueueSize();
    if (token) checkIfJoined();
  }, [bus?.id]); // eslint-disable-line

  const fetchQueueSize = async () => {
    try {
      const res = await fetch(`${API}/waitlist/queue/${bus.id}`);
      const data = await res.json();
      setQueueSize(data.queue_size || 0);
    } catch (e) {}
  };

  const checkIfJoined = async () => {
    try {
      const res = await fetch(`${API}/waitlist/my-waitlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyWaitlist(data);
        const existing = data.find(e => e.bus_id === bus.id && e.status === "waiting");
        if (existing) setJoined(true);
      }
    } catch (e) {}
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleJoin = async () => {
    if (!user || !token) {
      showToast('Please log in to join the waitlist', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bus_id: bus.id,
          bus_name: bus.bus,
          origin: bus.origin,
          destination: bus.destination,
          departure: bus.departure,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setJoined(true);
        setQueueSize(prev => prev + 1);
        showToast(`✅ You're #${data.position} on the waitlist! We'll email you when a seat opens.`);
      } else {
        showToast(data.detail || 'Failed to join waitlist', 'error');
      }
    } catch (e) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (waitlistId) => {
    try {
      const res = await fetch(`${API}/waitlist/leave/${waitlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setJoined(false);
        setQueueSize(prev => Math.max(0, prev - 1));
        showToast('Removed from waitlist');
        setShowModal(false);
      }
    } catch (e) {}
  };

  if (!isFull && !joined) return null; // Only show when bus is nearly/fully booked

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 99999,
          background: toast.type === 'error' ? "#dc2626" : "#16a34a",
          color: "#fff", padding: "12px 20px", borderRadius: "12px",
          fontSize: "13px", fontWeight: "600", boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          maxWidth: "360px", fontFamily: "'Outfit', sans-serif",
        }}>
          {toast.msg}
        </div>
      )}

      {/* My Waitlist Modal */}
      {showModal && (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#1a1207" }}>
                🔔 My Waitlist
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9c8b78" }}>✕</button>
            </div>

            {myWaitlist.filter(e => e.status === "waiting").length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 20px", color: "#9c8b78" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                <div style={{ fontWeight: "700", marginBottom: "6px" }}>No active waitlists</div>
                <div style={{ fontSize: "13px" }}>You've been removed from all waitlists.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {myWaitlist.filter(e => e.status === "waiting").map(entry => (
                  <div key={entry.waitlist_id} style={{
                    background: "#faf7f3", border: "1px solid #f0ebe4",
                    borderRadius: "14px", padding: "14px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1207", marginBottom: "4px" }}>
                        {entry.origin?.split(',')[0]} → {entry.destination?.split(',')[0]}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9c8b78" }}>
                        {entry.bus_name} · {entry.departure}
                      </div>
                      <div style={{ fontSize: "12px", color: "#f97316", fontWeight: "700", marginTop: "4px" }}>
                        Queue position: #{entry.position}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLeave(entry.waitlist_id)}
                      style={{
                        padding: "7px 14px", background: "#fef2f2",
                        border: "1px solid #fca5a5", color: "#dc2626",
                        borderRadius: "10px", fontSize: "12px",
                        fontWeight: "600", cursor: "pointer",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      Leave
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waitlist Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        {!joined ? (
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{
              background: "#fff7ed",
              color: "#c2410c",
              border: "1px solid #fed7aa",
              borderRadius: "6px",
              padding: "3px 8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "10px",
              fontFamily: "'Outfit', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            🔔 {loading ? "Joining..." : `Join Waitlist${queueSize > 0 ? ` (${queueSize} waiting)` : ""}`}
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
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
            ✅ On Waitlist — Manage
          </button>
        )}

        {isFull && (
          <span style={{
            fontSize: "9px", color: "#dc2626", fontWeight: "700",
            background: "#fef2f2", border: "1px solid #fca5a5",
            padding: "2px 7px", borderRadius: "5px",
          }}>
            🔴 Nearly Full
          </span>
        )}
      </div>
    </>
  );
}