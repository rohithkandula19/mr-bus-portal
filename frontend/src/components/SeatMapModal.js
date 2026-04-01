import React, { useState, useCallback } from 'react';

const ROWS = ["A","B","C","D","E","F","G","H"];

function Seat({ seat, state, onSelect, justSelected }) {
  const [hovered, setHovered] = useState(false);

  const isBooked   = state === 'booked';
  const isSelected = state === 'selected';
  const isAI       = state === 'ai';
  const isTop      = state === 'top';
  const isJust     = justSelected === seat;
  const isHov      = hovered && !isBooked;

  const back = isBooked ? 'rgba(239,68,68,0.14)'
    : isSelected        ? '#ff6b00'
    : isAI              ? '#fbbf24'
    : isTop             ? 'rgba(96,165,250,0.25)'
    : isHov             ? 'rgba(255,107,0,0.25)'
    :                     'rgba(255,255,255,0.09)';

  const cushion = isBooked ? 'rgba(239,68,68,0.08)'
    : isSelected          ? '#c44d00'
    : isAI                ? '#d97706'
    : isTop               ? 'rgba(96,165,250,0.15)'
    : isHov               ? 'rgba(255,107,0,0.15)'
    :                       'rgba(255,255,255,0.05)';

  const borderColor = isBooked ? 'rgba(239,68,68,0.22)'
    : isSelected          ? 'rgba(255,150,60,0.55)'
    : isAI                ? 'rgba(251,191,36,0.5)'
    : isTop               ? 'rgba(96,165,250,0.3)'
    : isHov               ? 'rgba(255,107,0,0.35)'
    :                       'rgba(255,255,255,0.09)';

  const textColor = isBooked ? 'rgba(239,68,68,0.28)'
    : isSelected          ? '#fff'
    : isAI                ? '#78350f'
    : isTop               ? '#bfdbfe'
    : isHov               ? '#ff9a50'
    :                       'rgba(255,255,255,0.38)';

  const scale = isJust ? 'scale(1.22)' : isSelected ? 'scale(1.05)' : isHov ? 'scale(1.08) translateY(-2px)' : 'scale(1)';

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isBooked && onSelect(seat)}
      disabled={isBooked}
      style={{
        width: '42px', height: '46px',
        position: 'relative',
        background: 'none', border: 'none', padding: 0,
        cursor: isBooked ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transform: scale,
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        outline: 'none',
      }}>
      {/* Seat back */}
      <div style={{
        position: 'absolute', top: 0, left: 2, right: 2, height: '27px',
        borderRadius: '7px 7px 3px 3px',
        background: back,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 14px rgba(255,107,0,0.35)' : isAI ? '0 0 10px rgba(251,191,36,0.25)' : 'none',
      }} />
      {/* Seat cushion */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '17px',
        borderRadius: '4px 4px 9px 9px',
        background: cushion,
        border: `1px solid ${borderColor}`,
        borderTop: 'none',
        transition: 'all 0.15s ease',
      }} />
      {/* Label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: '2px',
        fontSize: '9px', fontWeight: '800',
        color: textColor,
        fontFamily: "-apple-system,var(--font-sans)",
        letterSpacing: '-0.2px',
        zIndex: 2,
        transition: 'color 0.15s ease',
        pointerEvents: 'none',
      }}>{seat}</div>
      {/* AI star */}
      {isAI && (
        <div style={{
          position: 'absolute', top: '-6px', right: '-6px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px', color: '#78350f', fontWeight: '900',
          border: '1.5px solid #0a0a0a', zIndex: 3, pointerEvents: 'none',
        }}>★</div>
      )}
      {/* Selected check */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '-5px', right: '-5px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#ff6b00', border: '1.5px solid #0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px', color: '#fff', fontWeight: '900', zIndex: 3, pointerEvents: 'none',
        }}>✓</div>
      )}
    </button>
  );
}

export default function SeatMapModal({
  selectedBus, bookedSeats, selectedSeat, setSelectedSeat,
  recommendedSeat, topSeats, onConfirm, onClose
}) {
  const [justSelected, setJustSelected] = useState(null);

  const handleSelect = useCallback((seat) => {
    setSelectedSeat(seat);
    setJustSelected(seat);
    setTimeout(() => setJustSelected(null), 500);
  }, [setSelectedSeat]);

  const getState = (seat) => {
    if (bookedSeats.includes(seat)) return 'booked';
    if (seat === selectedSeat)       return 'selected';
    if (seat === recommendedSeat)    return 'ai';
    if (topSeats?.includes(seat))    return 'top';
    return 'free';
  };

  const total     = 32;
  const available = total - bookedSeats.length;
  const urgent    = available < 8;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px',
      fontFamily: "-apple-system,'SF Pro Display',var(--font-sans)",
    }}>
      <div style={{
        width: '100%', maxWidth: '560px',
        background: '#0a0a0a',
        borderRadius: '22px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.9), 0 0 0 0.5px rgba(255,255,255,0.03)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh',
      }}>

        {/* HEADER */}
        <div style={{
          padding: '22px 24px 17px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.2)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Select Seat
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '6px' }}>
              {selectedBus?.origin?.split(',')[0]}&nbsp;
              <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: '200' }}>→</span>&nbsp;
              {selectedBus?.destination?.split(',')[0]}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.26)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{selectedBus?.bus}</span>
              <span style={{ color: 'rgba(255,255,255,0.08)' }}>·</span>
              <span>{selectedBus?.departure?.slice(0,10)}</span>
              <span style={{ color: 'rgba(255,255,255,0.08)' }}>·</span>
              <span style={{ color: '#ff6b00', fontWeight: '600' }}>${selectedBus?.price}/seat</span>
              <span style={{ color: 'rgba(255,255,255,0.08)' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.26)' }}>+{selectedBus?.price} pts</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {/* Circular availability ring */}
            <div style={{ textAlign: 'center' }}>
              <svg width="52" height="52" style={{ display: 'block' }}>
                <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                <circle cx="26" cy="26" r="21" fill="none"
                  stroke={urgent ? '#ef4444' : '#ff6b00'}
                  strokeWidth="3"
                  strokeDasharray={`${2*Math.PI*21}`}
                  strokeDashoffset={`${2*Math.PI*21*(1-available/total)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 26 26)"
                  style={{ transition: 'all 0.6s ease' }}
                />
                <text x="26" y="31" textAnchor="middle" fill={urgent ? '#ef4444' : '#fff'} fontSize="13" fontWeight="700" fontFamily="-apple-system,sans-serif">{available}</text>
              </svg>
              <div style={{ fontSize: '8px', color: urgent ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.16)', textAlign: 'center', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {urgent ? '⚡ fast' : 'seats'}
              </div>
            </div>
            {/* Close button */}
            <button onClick={onClose} style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>✕</button>
          </div>
        </div>

        {/* AI banner */}
        {recommendedSeat && (
          <div style={{
            background: 'rgba(251,191,36,0.06)',
            borderBottom: '1px solid rgba(251,191,36,0.1)',
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>🎯</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#fbbf24' }}>AI Pick: Seat {recommendedSeat}</span>
            <span style={{ fontSize: '11px', color: 'rgba(251,191,36,0.4)' }}>— best match for your preferences</span>
          </div>
        )}

        {/* Legend */}
        <div style={{
          padding: '9px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', gap: '18px', flexWrap: 'wrap',
        }}>
          {[
            { back: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.09)', label: 'Available' },
            { back: 'rgba(239,68,68,0.14)',   border: 'rgba(239,68,68,0.22)',   label: 'Taken' },
            { back: '#ff6b00',                border: 'rgba(255,150,60,0.55)',  label: 'Selected' },
            { back: '#fbbf24',                border: 'rgba(251,191,36,0.5)',   label: 'AI Pick ★' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '14px', height: '12px', borderRadius: '3px 3px 5px 5px', background: l.back, border: `1px solid ${l.border}` }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', fontWeight: '500' }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* BUS INTERIOR */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '16px 18px 10px' }}>

            {/* Driver cabin */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderBottom: 'none',
              borderRadius: '14px 14px 0 0',
              padding: '10px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: '22px', height: '10px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,107,0,0.2)' }} />
                <span style={{ fontSize: '9px', fontWeight: '600', color: 'rgba(255,255,255,0.12)', letterSpacing: '2px', textTransform: 'uppercase' }}>Driver Cabin</span>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,107,0,0.2)' }} />
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: '22px', height: '10px', borderRadius: '3px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />)}
              </div>
            </div>

            {/* Seat grid */}
            <div style={{
              background: 'rgba(255,255,255,0.012)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderTop: '1px solid rgba(255,107,0,0.07)',
              borderBottom: 'none',
              padding: '16px 12px',
            }}>
              {/* Column headers */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', gap: '5px' }}>
                <div style={{ width: '16px' }} />
                {['WIN','ISL','','ISL','WIN'].map((h, i) => (
                  <div key={i} style={{ width: i===2 ? '18px' : '42px', textAlign: 'center', fontSize: '8px', fontWeight: '600', color: 'rgba(255,255,255,0.12)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>

              {/* All 8 rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ROWS.map((row, ri) => (
                  <div key={row} style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '16px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.14)', flexShrink: 0 }}>{row}</div>
                    <Seat seat={`${row}1`} state={getState(`${row}1`)} onSelect={handleSelect} justSelected={justSelected} />
                    <Seat seat={`${row}2`} state={getState(`${row}2`)} onSelect={handleSelect} justSelected={justSelected} />
                    <div style={{ width: '18px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ri === 3 && <div style={{ fontSize: '6px', color: 'rgba(255,255,255,0.07)', fontWeight: '600', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', letterSpacing: '0.5px', textTransform: 'uppercase' }}>AISLE</div>}
                    </div>
                    <Seat seat={`${row}3`} state={getState(`${row}3`)} onSelect={handleSelect} justSelected={justSelected} />
                    <Seat seat={`${row}4`} state={getState(`${row}4`)} onSelect={handleSelect} justSelected={justSelected} />
                  </div>
                ))}
              </div>
            </div>

            {/* Rear exit */}
            <div style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderTop: 'none',
              borderRadius: '0 0 14px 14px',
              padding: '9px 18px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2,3].map(i => <div key={i} style={{ width: '10px', height: '6px', borderRadius: '2px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />)}
              </div>
              <span style={{ fontSize: '8px', fontWeight: '600', color: 'rgba(255,255,255,0.09)', letterSpacing: '2px', textTransform: 'uppercase' }}>Exit</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0,1,2,3].map(i => <div key={i} style={{ width: '10px', height: '6px', borderRadius: '2px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* CONFIRM BAR */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a' }}>
          {selectedSeat ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                flex: 1,
                background: 'rgba(255,107,0,0.07)',
                border: '1px solid rgba(255,107,0,0.16)',
                borderRadius: '14px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {/* Mini seat */}
                <div style={{ width: '32px', height: '36px', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 0, left: 2, right: 2, height: '22px', borderRadius: '5px 5px 2px 2px', background: '#ff6b00' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '13px', borderRadius: '3px 3px 7px 7px', background: '#c44d00' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1px', fontSize: '8px', fontWeight: '900', color: '#fff', zIndex: 2 }}>{selectedSeat}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', letterSpacing: '-0.3px' }}>Seat {selectedSeat}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>
                    {selectedBus?.origin?.split(',')[0]} → {selectedBus?.destination?.split(',')[0]}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#ff6b00', letterSpacing: '-0.8px', lineHeight: 1 }}>${selectedBus?.price}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>+{selectedBus?.price} pts</div>
                </div>
              </div>
              <button
                onClick={() => onConfirm && onConfirm()}
                onMouseDown={e => { e.currentTarget.style.transform='scale(0.97)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(255,107,0,0.3)'; }}
                onMouseUp={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(255,107,0,0.4)'; }}
                style={{
                  background: '#ff6b00',
                  border: 'none', color: '#fff',
                  padding: '15px 26px',
                  borderRadius: '14px',
                  fontSize: '14px', fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: "-apple-system,var(--font-sans)",
                  letterSpacing: '-0.2px',
                  boxShadow: '0 4px 20px rgba(255,107,0,0.4)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'transform 0.12s, box-shadow 0.12s',
                }}>
                Confirm →
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.22)', fontWeight: '500' }}>Tap any available seat to select it</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.1)', marginTop: '3px' }}>Or type a seat number in the AI chat (e.g. "A2")</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}