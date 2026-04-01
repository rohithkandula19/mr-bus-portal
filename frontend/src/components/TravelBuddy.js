import React, { useState, useEffect } from 'react';

const ALL_BUDDIES = [
  { name:"Liam T.", age:24, city:"Chicago", interests:["Music","Travel","Photography"], rating:4.8, trips:12, emoji:"👨‍💼" },
  { name:"Sofia R.", age:26, city:"Miami", interests:["Yoga","Art","Food"], rating:4.9, trips:8, emoji:"👩‍🎨" },
  { name:"Marcus J.", age:31, city:"Atlanta", interests:["Sports","Gaming","Travel"], rating:4.7, trips:20, emoji:"👨‍💻" },
  { name:"Priya S.", age:23, city:"New York", interests:["Reading","Music","Fitness"], rating:5.0, trips:5, emoji:"👩‍🎓" },
  { name:"Carlos M.", age:28, city:"Houston", interests:["Food","Travel","Photography"], rating:4.6, trips:15, emoji:"👨‍🍳" },
  { name:"Aisha K.", age:25, city:"Boston", interests:["Art","Yoga","Reading"], rating:4.9, trips:9, emoji:"👩‍💼" },
  { name:"Noah B.", age:29, city:"Seattle", interests:["Gaming","Music","Sports"], rating:4.5, trips:17, emoji:"🧑‍🎮" },
  { name:"Yuki T.", age:22, city:"Portland", interests:["Photography","Art","Travel"], rating:4.8, trips:6, emoji:"👩‍🌾" },
  { name:"Ethan W.", age:33, city:"Denver", interests:["Fitness","Travel","Food"], rating:4.7, trips:22, emoji:"🧑‍🏋️" },
  { name:"Amara O.", age:27, city:"Dallas", interests:["Music","Reading","Yoga"], rating:4.9, trips:11, emoji:"👩‍🎤" },
  { name:"James H.", age:35, city:"Phoenix", interests:["Sports","Travel","Gaming"], rating:4.6, trips:28, emoji:"👨‍✈️" },
  { name:"Luna G.", age:21, city:"San Diego", interests:["Yoga","Photography","Art"], rating:4.8, trips:4, emoji:"👩‍🔬" },
  { name:"Raj P.", age:30, city:"Austin", interests:["Technology","Travel","Food"], rating:4.7, trips:19, emoji:"👨‍🔬" },
  { name:"Emma L.", age:24, city:"Nashville", interests:["Music","Art","Reading"], rating:5.0, trips:7, emoji:"👩‍🎵" },
  { name:"Omar F.", age:32, city:"Charlotte", interests:["Sports","Fitness","Travel"], rating:4.5, trips:24, emoji:"🧑‍🏃" },
  { name:"Zara A.", age:26, city:"Minneapolis", interests:["Reading","Yoga","Photography"], rating:4.9, trips:13, emoji:"👩‍💻" },
  { name:"Diego V.", age:28, city:"Tampa", interests:["Food","Music","Gaming"], rating:4.7, trips:16, emoji:"👨‍🎸" },
  { name:"Hannah K.", age:23, city:"Orlando", interests:["Art","Travel","Fitness"], rating:4.8, trips:8, emoji:"👩‍🏊" },
  { name:"Kwame A.", age:29, city:"Cleveland", interests:["Sports","Reading","Music"], rating:4.6, trips:21, emoji:"👨‍🎓" },
  { name:"Mei L.", age:25, city:"Indianapolis", interests:["Photography","Food","Yoga"], rating:4.9, trips:10, emoji:"👩‍🍳" },
  { name:"Tyler R.", age:27, city:"Columbus", interests:["Gaming","Sports","Travel"], rating:4.5, trips:14, emoji:"🧑‍💻" },
  { name:"Fatima N.", age:31, city:"Detroit", interests:["Music","Art","Reading"], rating:4.8, trips:18, emoji:"👩‍🎨" },
  { name:"Sam B.", age:22, city:"Kansas City", interests:["Fitness","Food","Photography"], rating:4.7, trips:5, emoji:"🧑‍🍳" },
  { name:"Anya M.", age:28, city:"Pittsburgh", interests:["Travel","Yoga","Music"], rating:4.9, trips:12, emoji:"👩‍✈️" },
  { name:"Leo K.", age:34, city:"Sacramento", interests:["Sports","Gaming","Food"], rating:4.6, trips:26, emoji:"👨‍🏋️" },
  { name:"Nina C.", age:24, city:"Raleigh", interests:["Reading","Art","Travel"], rating:5.0, trips:6, emoji:"👩‍📚" },
  { name:"Hassan J.", age:30, city:"Memphis", interests:["Music","Sports","Fitness"], rating:4.7, trips:20, emoji:"👨‍🎶" },
  { name:"Isla F.", age:26, city:"Louisville", interests:["Photography","Yoga","Food"], rating:4.8, trips:9, emoji:"👩‍🌿" },
  { name:"Andre T.", age:29, city:"Richmond", interests:["Travel","Gaming","Art"], rating:4.6, trips:15, emoji:"🧑‍🎨" },
  { name:"Maya S.", age:23, city:"Salt Lake City", interests:["Fitness","Travel","Photography"], rating:4.9, trips:7, emoji:"👩‍🏔️" },
];

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TravelBuddy({ booking, onClose }) {
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [connected, setConnected] = useState({});
  const [buddies, setBuddies] = useState([]);

  useEffect(() => {
    // Generate a unique seed from the bus route so each bus gets different people
    const seed = (booking?.origin || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
               + (booking?.destination || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
               + (booking?.busId || Math.random() * 9999 | 0);
    const shuffled = seededShuffle(ALL_BUDDIES, seed);
    setBuddies(shuffled.slice(0, 5));
  }, [booking]);

  const allInterests = ["Music","Travel","Food","Sports","Reading","Gaming","Art","Fitness","Photography","Yoga"];

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const filteredBuddies = selectedInterests.length === 0
    ? buddies
    : buddies.filter(b => b.interests.some(i => selectedInterests.includes(i)));

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(6px)" }}>
      <div style={{ background:"#fff", borderRadius:"24px", width:"100%", maxWidth:"560px", maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column", fontFamily:"'Outfit', sans-serif", boxShadow:"0 32px 80px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#4f46e5,#7c3aed)", padding:"22px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"20px", fontWeight:"800", color:"#fff" }}>👥 Travel Buddy Matching</div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.7)", marginTop:"3px" }}>
              {booking?.origin?.split(',')[0]} → {booking?.destination?.split(',')[0]}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:"34px", height:"34px", borderRadius:"50%", cursor:"pointer", fontSize:"16px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>
          {/* Interest filter */}
          <div style={{ marginBottom:"20px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:"#9c8b78", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"10px" }}>Filter by interests:</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {allInterests.map(interest => (
                <button key={interest}
                  style={{ padding:"5px 14px", borderRadius:"20px", border:`1.5px solid ${selectedInterests.includes(interest)?"#4f46e5":"#e8e2d9"}`, background:selectedInterests.includes(interest)?"#ede9fe":"#fff", color:selectedInterests.includes(interest)?"#4f46e5":"#6b5744", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"'Outfit', sans-serif", transition:"all 0.15s" }}
                  onClick={() => toggleInterest(interest)}>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Buddies */}
          <div style={{ fontSize:"11px", fontWeight:"700", color:"#9c8b78", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"12px" }}>
            {filteredBuddies.length} travelers on this route:
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {filteredBuddies.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px", color:"#9c8b78", fontSize:"14px" }}>
                No travelers match your interests.<br />Try selecting fewer filters.
              </div>
            ) : filteredBuddies.map((buddy, i) => (
              <div key={i} style={{ background:"#f7f3ee", borderRadius:"16px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"14px", border:"1px solid #ede8e0" }}>
                <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"linear-gradient(135deg,#ede9fe,#ddd6fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", flexShrink:0 }}>
                  {buddy.emoji}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"3px" }}>
                    <span style={{ fontWeight:"800", fontSize:"15px", color:"#1a1207" }}>{buddy.name}, {buddy.age}</span>
                    <span style={{ fontSize:"11px", color:"#9c8b78" }}>📍 {buddy.city}</span>
                  </div>
                  <div style={{ display:"flex", gap:"5px", marginBottom:"6px", flexWrap:"wrap" }}>
                    {buddy.interests.map(int => (
                      <span key={int} style={{ fontSize:"10px", background: selectedInterests.includes(int)?"#ede9fe":"#fff", color: selectedInterests.includes(int)?"#4f46e5":"#6b5744", border:`1px solid ${selectedInterests.includes(int)?"#c4b5fd":"#e8e2d9"}`, padding:"2px 8px", borderRadius:"10px", fontWeight:"600" }}>{int}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:"11px", color:"#9c8b78" }}>
                    ⭐ {buddy.rating} · {buddy.trips} trips
                  </div>
                </div>
                <button
                  style={{ padding:"8px 18px", borderRadius:"12px", border:"none", background: connected[i] ? "#f0fdf4" : "linear-gradient(135deg,#4f46e5,#7c3aed)", color: connected[i] ? "#16a34a" : "#fff", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"'Outfit', sans-serif", flexShrink:0, transition:"all 0.2s" }}
                  onClick={() => setConnected(prev => ({...prev, [i]: !prev[i]}))}>
                  {connected[i] ? "✓ Connected" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"16px 24px", borderTop:"1px solid #ede8e0", background:"#faf7f3", fontSize:"12px", color:"#9c8b78", textAlign:"center" }}>
          🔒 Connections are anonymous until both travelers agree
        </div>
      </div>
    </div>
  );
}