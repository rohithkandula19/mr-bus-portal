import React, { useEffect, useState } from 'react';

export default function LoyaltyBadge() {
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => { fetchLoyalty(); }, []);

  const fetchLoyalty = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${process.env.REACT_APP_API_URL}/loyalty/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      setLoyalty(await res.json());
    } catch (err) {}
  };

  if (!loyalty) return null;

  const dollarValue = loyalty.dollar_value ?? (loyalty.points / 100);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      background: "rgba(255,255,255,0.09)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: "20px", padding: "4px 12px", cursor: "pointer",
    }}
    title={`${loyalty.tier} Member — ${loyalty.points} pts = $${dollarValue.toFixed(2)} value`}>
      <span style={{ fontSize: "13px" }}>{loyalty.tier_emoji}</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
        <span style={{ color: loyalty.tier_color, fontWeight: "800", fontSize: "12px" }}>
          {loyalty.points} pts
        </span>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", fontWeight: "600" }}>
          = ${dollarValue.toFixed(2)}
        </span>
      </div>
    </div>
  );
}