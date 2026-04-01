import React, { useState, useEffect, useRef } from 'react';

export default function BusTracker({ booking, onClose }) {
  const [progress, setProgress] = useState(Math.random() * 60 + 10); // 10-70% into journey
  const [speed, setSpeed] = useState(Math.floor(Math.random() * 20 + 55)); // 55-75 mph
  const [status, setStatus] = useState('On Time');
  const [eta, setEta] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stops] = useState(() => generateStops(booking?.origin, booking?.destination));
  const intervalRef = useRef(null);

  function generateStops(origin, dest) {
    const o = origin?.split(',')[0] || 'Origin';
    const d = dest?.split(',')[0] || 'Destination';
    const midpoints = ['Rest Stop', 'Service Area', 'Junction', 'City Center'];
    const mid1 = midpoints[Math.floor(Math.random() * midpoints.length)];
    const mid2 = midpoints[Math.floor(Math.random() * midpoints.length)];
    return [
      { name: o, time: '08:00 AM', done: true, isOrigin: true },
      { name: mid1, time: '09:45 AM', done: true },
      { name: mid2, time: '11:20 AM', done: false, isCurrent: true },
      { name: d, time: '01:30 PM', done: false, isDest: true },
    ];
  }

  useEffect(() => {
    // Calculate initial ETA
    updateEta(progress);

    // Simulate bus moving — update every 4 seconds
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const newP = Math.min(p + (Math.random() * 0.8 + 0.2), 95);
        updateEta(newP);
        return newP;
      });
      setSpeed(Math.floor(Math.random() * 20 + 55));
      setLastUpdate(new Date());
      // Occasionally change status
      const statuses = ['On Time', 'On Time', 'On Time', 'Slightly Delayed', 'On Time'];
      setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 4000);

    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line

  function updateEta(p) {
    const remainingMins = Math.round(((100 - p) / 100) * 210); // ~3.5hr total
    const now = new Date();
    now.setMinutes(now.getMinutes() + remainingMins);
    setEta(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  const origin = booking?.origin?.split(',')[0] || 'Origin';
  const dest   = booking?.destination?.split(',')[0] || 'Destination';
  const distanceCovered = Math.round((progress / 100) * 320);
  const totalDistance   = 320;
  const remainingMiles  = totalDistance - distanceCovered;

  // Route points for the SVG path (curved road)
  const routeW = 420, routeH = 140;
  const pathD = `M 20,${routeH - 20} C 100,${routeH - 20} 120,20 ${routeW / 2},40 S ${routeW - 100},${routeH - 20} ${routeW - 20},${routeH - 20}`;

  // Bus position along path using progress
  function getBusPos(pct) {
    // Approximate position along the SVG path
    const t = pct / 100;
    // Bezier approximation
    const x = 20 + (routeW - 40) * t;
    const y = (routeH - 20) - Math.sin(t * Math.PI) * (routeH - 40);
    return { x, y };
  }

  const busPos = getBusPos(progress);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: '#0a0a0a',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Live Tracking</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>
              {origin} <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: '200' }}>→</span> {dest}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status === 'On Time' ? '#4ade80' : '#fbbf24', boxShadow: status === 'On Time' ? '0 0 8px rgba(74,222,128,0.6)' : '0 0 8px rgba(251,191,36,0.6)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '12px', color: status === 'On Time' ? '#4ade80' : '#fbbf24', fontWeight: '600' }}>{status}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>· Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Map area */}
        <div style={{ padding: '20px 22px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Road map SVG */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 10px', position: 'relative', overflow: 'hidden' }}>

            {/* Map background dots */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px', borderRadius: '16px' }} />

            {/* Origin & Dest labels */}
            <div style={{ position: 'absolute', left: '14px', bottom: '10px', fontSize: '9px', fontWeight: '700', color: '#4ade80', letterSpacing: '0.5px' }}>{origin.substring(0,6).toUpperCase()}</div>
            <div style={{ position: 'absolute', right: '14px', bottom: '10px', fontSize: '9px', fontWeight: '700', color: '#ff6b00', letterSpacing: '0.5px' }}>{dest.substring(0,6).toUpperCase()}</div>

            <svg width="100%" viewBox={`0 0 ${routeW} ${routeH}`} style={{ display: 'block' }}>
              {/* Road shadow */}
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" strokeLinecap="round" />
              {/* Road */}
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" />
              {/* Completed path */}
              <path d={pathD} fill="none" stroke="#ff6b00" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 600} 600`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
              {/* Remaining path dashed */}
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="6 8"
                style={{ opacity: 0.5 }} />

              {/* Origin dot */}
              <circle cx="20" cy={routeH - 20} r="6" fill="#4ade80" />
              <circle cx="20" cy={routeH - 20} r="10" fill="rgba(74,222,128,0.15)" />

              {/* Destination dot */}
              <circle cx={routeW - 20} cy={routeH - 20} r="6" fill="#ff6b00" />
              <circle cx={routeW - 20} cy={routeH - 20} r="10" fill="rgba(255,107,0,0.15)" />

              {/* Bus icon */}
              <g transform={`translate(${busPos.x - 12}, ${busPos.y - 12})`} style={{ transition: 'transform 1s ease' }}>
                {/* Glow */}
                <circle cx="12" cy="12" r="16" fill="rgba(255,107,0,0.15)" />
                {/* Bus body */}
                <rect x="2" y="4" width="20" height="14" rx="3" fill="#ff6b00" />
                {/* Windows */}
                <rect x="5" y="7" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)" />
                <rect x="12" y="7" width="5" height="4" rx="1" fill="rgba(255,255,255,0.8)" />
                {/* Wheels */}
                <circle cx="7" cy="18" r="2.5" fill="#333" stroke="#ff6b00" strokeWidth="1" />
                <circle cx="17" cy="18" r="2.5" fill="#333" stroke="#ff6b00" strokeWidth="1" />
              </g>

              {/* Pulse ring around bus */}
              <circle cx={busPos.x} cy={busPos.y} r="22" fill="none" stroke="rgba(255,107,0,0.2)" strokeWidth="2">
                <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{distanceCovered} mi covered</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{remainingMiles} mi remaining</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#ff6b00,#fbbf24)', borderRadius: '10px', transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span style={{ fontSize: '10px', color: '#4ade80' }}>{origin}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{Math.round(progress)}% complete</span>
              <span style={{ fontSize: '10px', color: '#ff6b00' }}>{dest}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { icon: '🕐', label: 'ETA', value: eta || '—' },
            { icon: '⚡', label: 'Speed', value: `${speed} mph` },
            { icon: '🛣️', label: 'Distance', value: `${remainingMiles} mi left` },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px 16px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px', marginBottom: '2px' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Route stops */}
        <div style={{ padding: '16px 22px 20px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Route Stops</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {stops.map((stop, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {/* Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%', border: '2px solid',
                    borderColor: stop.done ? '#4ade80' : stop.isCurrent ? '#ff6b00' : 'rgba(255,255,255,0.1)',
                    background: stop.done ? '#4ade80' : stop.isCurrent ? '#ff6b00' : 'transparent',
                    marginTop: '2px',
                    boxShadow: stop.isCurrent ? '0 0 10px rgba(255,107,0,0.5)' : 'none',
                  }} />
                  {i < stops.length - 1 && (
                    <div style={{ width: '2px', height: '28px', background: stop.done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)', marginTop: '2px' }} />
                  )}
                </div>
                {/* Stop info */}
                <div style={{ paddingBottom: i < stops.length - 1 ? '14px' : '0', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: stop.isCurrent ? '700' : '500', color: stop.done ? 'rgba(255,255,255,0.4)' : stop.isCurrent ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                      {stop.name}
                      {stop.isCurrent && <span style={{ fontSize: '10px', background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.25)', color: '#ff6b00', padding: '1px 7px', borderRadius: '20px', marginLeft: '8px', fontWeight: '700' }}>Current</span>}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontWeight: '500' }}>{stop.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}