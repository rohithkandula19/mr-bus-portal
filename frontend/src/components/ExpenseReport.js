// frontend/src/components/ExpenseReport.js
// Generates a downloadable PDF expense report from user's bookings
// Usage: <ExpenseReportButton bookings={bookings} user={user} loyalty={loyalty} />
// No external libraries needed — uses browser print API for PDF

import React, { useState } from 'react';

function generateReportHTML(bookings, user, loyalty) {
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const totalSpent = confirmed.reduce((s, b) => s + b.price, 0);
  const totalRefunded = cancelled.reduce((s, b) => s + Math.round(b.price * 0.75), 0);
  const avgPerTrip = confirmed.length ? Math.round(totalSpent / confirmed.length) : 0;
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Group by month
  const byMonth = {};
  confirmed.forEach(b => {
    const date = new Date(b.departure || b.created_at || Date.now());
    const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(b);
  });

  // Top routes
  const routeCounts = {};
  confirmed.forEach(b => {
    const key = `${b.origin?.split(',')[0]} → ${b.destination?.split(',')[0]}`;
    routeCounts[key] = (routeCounts[key] || 0) + b.price;
  });
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const tierColors = { Bronze: '#cd7f32', Silver: '#94a3b8', Gold: '#f97316', Platinum: '#8b5cf6' };
  const tierColor = tierColors[loyalty?.tier] || '#f97316';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MR Bus Portal — Expense Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1207; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #f97316; }
    .logo { font-size: 24px; font-weight: 900; color: #1a1207; }
    .logo span { color: #f97316; font-style: italic; }
    .report-meta { text-align: right; font-size: 12px; color: #9c8b78; }
    .report-meta strong { display: block; font-size: 18px; color: #1a1207; font-weight: 800; margin-bottom: 4px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #faf7f3; border: 1px solid #f0ebe4; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-label { font-size: 10px; color: #9c8b78; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .stat-value { font-size: 28px; font-weight: 900; color: #1a1207; }
    .stat-value.green { color: #16a34a; }
    .stat-value.orange { color: #f97316; }
    .stat-value.red { color: #dc2626; }
    
    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 800; color: #1a1207; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0ebe4; }
    
    .loyalty-card { background: linear-gradient(135deg, #1c0e04, #3a1d06); border-radius: 12px; padding: 20px; color: #fff; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
    .loyalty-tier { font-size: 20px; font-weight: 900; color: ${tierColor}; }
    .loyalty-pts { text-align: right; }
    .loyalty-pts-val { font-size: 32px; font-weight: 900; color: #fff; }
    .loyalty-pts-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
    
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f97316; color: #fff; padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0ebe4; }
    tr:nth-child(even) td { background: #faf7f3; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
    .badge-green { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .badge-red { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
    
    .month-group { margin-bottom: 8px; }
    .month-label { font-size: 11px; font-weight: 700; color: #9c8b78; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0 4px; }
    
    .top-routes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .route-card { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px; }
    .route-name { font-size: 12px; font-weight: 700; color: #c2410c; margin-bottom: 4px; }
    .route-spent { font-size: 20px; font-weight: 900; color: #1a1207; }
    
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f0ebe4; display: flex; justify-content: space-between; font-size: 11px; color: #9c8b78; }
    
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">MR <span>Bus</span> Portal</div>
      <div style="font-size:12px;color:#9c8b78;margin-top:4px;">Travel Expense Report</div>
    </div>
    <div class="report-meta">
      <strong>${user?.name || 'Traveler'}</strong>
      ${user?.email || ''}<br>
      Generated: ${now}<br>
      Report Period: All Time
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Spent</div>
      <div class="stat-value orange">$${totalSpent}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Trips Taken</div>
      <div class="stat-value">${confirmed.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg per Trip</div>
      <div class="stat-value">$${avgPerTrip}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Points Earned</div>
      <div class="stat-value green">${totalSpent}</div>
    </div>
  </div>

  <!-- Loyalty Card -->
  <div class="loyalty-card">
    <div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Loyalty Status</div>
      <div class="loyalty-tier">${loyalty?.tier || 'Bronze'} Member</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">100 points = $1.00 discount value</div>
    </div>
    <div class="loyalty-pts">
      <div class="loyalty-pts-val">${loyalty?.points || 0}</div>
      <div class="loyalty-pts-label">Available Points = $${((loyalty?.points || 0) / 100).toFixed(2)} value</div>
    </div>
  </div>

  <!-- Top Routes -->
  ${topRoutes.length > 0 ? `
  <div class="section">
    <div class="section-title">🔥 Most Traveled Routes</div>
    <div class="top-routes">
      ${topRoutes.map(([route, spent]) => `
        <div class="route-card">
          <div class="route-name">${route}</div>
          <div class="route-spent">$${spent}</div>
          <div style="font-size:10px;color:#9c8b78;margin-top:2px;">total spent</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- All Bookings Table -->
  <div class="section">
    <div class="section-title">📋 All Bookings</div>
    <table>
      <thead>
        <tr>
          <th>Transaction ID</th>
          <th>Route</th>
          <th>Bus</th>
          <th>Seat</th>
          <th>Departure</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${[...confirmed, ...cancelled].map(b => `
          <tr>
            <td style="font-family:monospace;font-size:11px;font-weight:700;">${b.transaction_id}</td>
            <td>${b.origin?.split(',')[0]} → ${b.destination?.split(',')[0]}</td>
            <td>${b.bus_name || 'MR Express'}</td>
            <td style="font-weight:700;color:#f97316;">${b.seat_number}</td>
            <td>${b.departure || '—'}</td>
            <td style="font-weight:700;">$${b.price}</td>
            <td><span class="badge ${b.status === 'confirmed' ? 'badge-green' : 'badge-red'}">${b.status === 'confirmed' ? '✅ Confirmed' : '❌ Cancelled'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Summary -->
  <div style="background:#faf7f3;border-radius:12px;padding:16px 20px;border:1px solid #f0ebe4;margin-bottom:20px;">
    <div style="font-size:13px;font-weight:800;color:#1a1207;margin-bottom:10px;">💰 Financial Summary</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
      <div>Total bookings: <strong>${bookings.length}</strong></div>
      <div>Confirmed trips: <strong style="color:#16a34a;">${confirmed.length}</strong></div>
      <div>Cancelled bookings: <strong style="color:#dc2626;">${cancelled.length}</strong></div>
      <div>Estimated refunds: <strong>$${totalRefunded}</strong></div>
      <div>Total spent (net): <strong style="color:#f97316;">$${totalSpent}</strong></div>
      <div>Loyalty points value: <strong style="color:#16a34a;">$${((loyalty?.points || 0) / 100).toFixed(2)}</strong></div>
    </div>
  </div>

  <div class="footer">
    <div>MR Bus Portal — Rohith Kandula · noreplymrbuses@gmail.com</div>
    <div>© 2026 Rohith Kandula · MR Bus Portal · All rights reserved.</div>
  </div>
</body>
</html>`;
}

export default function ExpenseReportButton({ bookings, user, loyalty }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!bookings?.length) {
      alert('No bookings found to generate a report!');
      return;
    }
    setGenerating(true);

    const html = generateReportHTML(bookings, user, loyalty);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Please allow popups to download the report.');
      setGenerating(false);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();

    // Auto-trigger print/save dialog after content loads
    setTimeout(() => {
      win.print();
      setGenerating(false);
    }, 800);
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        background: generating ? "#f0ebe4" : "linear-gradient(135deg,#1a1207,#3a1d06)",
        color: generating ? "#9c8b78" : "#fff",
        border: "none",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: generating ? "not-allowed" : "pointer",
        fontFamily: "'Outfit', sans-serif",
        boxShadow: generating ? "none" : "0 4px 14px rgba(0,0,0,0.2)",
        transition: "all 0.2s",
      }}
    >
      {generating ? (
        <>
          <div style={{
            width: "14px", height: "14px",
            border: "2px solid rgba(0,0,0,0.2)",
            borderTopColor: "#9c8b78",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          Generating...
        </>
      ) : (
        <>📄 Download Expense Report</>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </button>
  );
}