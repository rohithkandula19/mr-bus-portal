#!/usr/bin/env python3
"""
Patches AdminDashboard.js to add:
1. Support Tickets tab (view, update status, add notes)
2. Subscription Revenue tab (MRR, plan breakdown, all subs table)

Run: python3 patch_admin.py
"""

import re

path = '/Users/rohithkandula/Desktop/mr_bus_portal_ultimate/frontend/src/pages/AdminDashboard.js'

with open(path, 'r') as f:
    c = f.read()

print(f'File size: {len(c)} chars')
print(f'Current tabs found: {re.findall(r"setActiveTab\([\'\"](\\w+)[\'\"]", c)}')

# ── 1. Add new state variables ────────────────────────────────────────────────
new_states = """
  const [tickets, setTickets] = React.useState([]);
  const [ticketStats, setTicketStats] = React.useState(null);
  const [ticketFilter, setTicketFilter] = React.useState('all');
  const [subRevenue, setSubRevenue] = React.useState(null);
  const [ticketNotes, setTicketNotes] = React.useState({});
  const [updatingTicket, setUpdatingTicket] = React.useState(null);"""

if 'setTickets' not in c:
    # Find a good anchor - the last useState in the component
    match = re.search(r'const \[(\w+), set\w+\] = (?:React\.)?useState\([^)]*\);(?!\s*const \[)', c)
    if match:
        insert_at = match.end()
        c = c[:insert_at] + new_states + c[insert_at:]
        print('✅ Added state variables')
    else:
        print('⚠️  Could not auto-insert state — add manually')
else:
    print('ℹ️  State variables already present')

# ── 2. Add fetch functions ────────────────────────────────────────────────────
fetch_functions = """
  const fetchTickets = async (tok) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/support/admin/tickets?token=${tok}`);
      const data = await res.json();
      if (res.ok) { setTickets(data.tickets || []); setTicketStats(data.stats || null); }
    } catch (e) { console.error(e); }
  };

  const fetchSubRevenue = async (tok) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/subscriptions/admin/all?token=${tok}`);
      const data = await res.json();
      if (res.ok) setSubRevenue(data);
    } catch (e) { console.error(e); }
  };

  const updateTicket = async (ticketId, status, priority, notes) => {
    setUpdatingTicket(ticketId);
    const tok = localStorage.getItem('token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/support/admin/ticket/${ticketId}`, {
        method: 'PATCH', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({token: tok, status, priority, admin_notes: notes}),
      });
      if (res.ok) { alert('✅ Ticket updated!'); fetchTickets(tok); }
    } catch (e) { alert('Update failed'); }
    finally { setUpdatingTicket(null); }
  };
"""

if 'fetchTickets' not in c:
    # Insert before the return statement
    return_match = re.search(r'\n  return \(', c)
    if return_match:
        c = c[:return_match.start()] + '\n' + fetch_functions + c[return_match.start():]
        print('✅ Added fetch functions')
    else:
        print('⚠️  Could not find return statement — add fetch functions manually')
else:
    print('ℹ️  Fetch functions already present')

# ── 3. Add tab buttons ────────────────────────────────────────────────────────
tab_buttons = """
            <button
              onClick={() => { setActiveTab('tickets'); fetchTickets(localStorage.getItem('token')); }}
              style={{ padding:'9px 20px', borderRadius:'10px', border:'none', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit',sans-serif", background: activeTab==='tickets' ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#f7f3ee', color: activeTab==='tickets' ? '#fff' : '#6b5744' }}>
              🎫 Support Tickets
            </button>
            <button
              onClick={() => { setActiveTab('revenue'); fetchSubRevenue(localStorage.getItem('token')); }}
              style={{ padding:'9px 20px', borderRadius:'10px', border:'none', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'Outfit',sans-serif", background: activeTab==='revenue' ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#f7f3ee', color: activeTab==='revenue' ? '#fff' : '#6b5744' }}>
              💰 Subscription Revenue
            </button>"""

if 'Support Tickets' not in c:
    # Find a tab button pattern and insert after the last one
    tab_match = list(re.finditer(r"setActiveTab\('(\w+)'\)[^}]+?\}", c))
    if tab_match:
        last_tab = tab_match[-1]
        # Find the end of the button element
        btn_end = c.find('</button>', last_tab.end())
        if btn_end != -1:
            c = c[:btn_end + 9] + tab_buttons + c[btn_end + 9:]
            print('✅ Added tab buttons')
        else:
            print('⚠️  Could not find button end — add tab buttons manually')
    else:
        print('⚠️  No existing tabs found — add tab buttons manually')
else:
    print('ℹ️  Tab buttons already present')

# ── 4. Add tab content panels ─────────────────────────────────────────────────
tickets_panel = """
      {activeTab === 'tickets' && (
        <div style={{fontFamily:"'Outfit',sans-serif"}}>
          {ticketStats && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
              {[{icon:'📋',label:'Total',value:ticketStats.total,color:'#1a1207'},{icon:'🔴',label:'Open',value:ticketStats.open,color:'#f97316'},{icon:'🔵',label:'In Progress',value:ticketStats.in_progress,color:'#3b82f6'},{icon:'✅',label:'Resolved',value:ticketStats.resolved,color:'#16a34a'}].map((s,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e8e2d9',textAlign:'center'}}>
                  <div style={{fontSize:'24px',marginBottom:'8px'}}>{s.icon}</div>
                  <div style={{fontSize:'32px',fontWeight:'800',color:s.color,lineHeight:'1'}}>{s.value}</div>
                  <div style={{fontSize:'12px',color:'#9c8b78',fontWeight:'600',marginTop:'4px',textTransform:'uppercase'}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',background:'#fff',border:'1px solid #e8e2d9',borderRadius:'12px',padding:'3px',gap:'2px',marginBottom:'16px',width:'fit-content'}}>
            {[['all','All'],['open','🔴 Open'],['in_progress','🔵 In Progress'],['resolved','✅ Resolved']].map(([k,l])=>(
              <button key={k} onClick={()=>setTicketFilter(k)} style={{padding:'7px 16px',borderRadius:'9px',border:'none',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",background:ticketFilter===k?'linear-gradient(135deg,#f97316,#ea580c)':'transparent',color:ticketFilter===k?'#fff':'#9c8b78'}}>
                {l} ({k==='all'?tickets.length:tickets.filter(t=>t.status===k).length})
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {(ticketFilter==='all'?tickets:tickets.filter(t=>t.status===ticketFilter)).map(t=>(
              <div key={t.ticket_id} style={{background:'#fff',borderRadius:'16px',border:'1px solid #e8e2d9',overflow:'hidden'}}>
                <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',borderBottom:'1px solid #f0ebe4'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1,minWidth:0}}>
                    <div style={{fontFamily:'monospace',fontSize:'13px',fontWeight:'700',color:'#f97316',flexShrink:0}}>{t.ticket_id}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'#1a1207',marginBottom:'2px'}}>{t.subject}</div>
                      <div style={{fontSize:'12px',color:'#9c8b78'}}>{t.name} · {t.email} · {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.status==='open'?'#fff7ed':t.status==='in_progress'?'#eff6ff':t.status==='resolved'?'#f0fdf4':'#f7f3ee',color:t.status==='open'?'#f97316':t.status==='in_progress'?'#3b82f6':t.status==='resolved'?'#16a34a':'#9c8b78'}}>{t.status.replace('_',' ')}</span>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.priority==='high'?'#fef2f2':'#f7f3ee',color:t.priority==='high'?'#dc2626':'#9c8b78'}}>{t.priority}</span>
                    <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#f7f3ee',color:'#9c8b78'}}>{t.category}</span>
                  </div>
                </div>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f0ebe4'}}>
                  <div style={{fontSize:'13px',color:'#4a3728',lineHeight:'1.7',background:'#faf7f3',borderRadius:'10px',padding:'12px 14px',borderLeft:'3px solid #f97316'}}>{t.message}</div>
                  {t.admin_notes&&<div style={{marginTop:'10px',fontSize:'13px',color:'#3b82f6',background:'#eff6ff',borderRadius:'10px',padding:'12px 14px',borderLeft:'3px solid #3b82f6'}}><strong>Admin note:</strong> {t.admin_notes}</div>}
                </div>
                <div style={{padding:'14px 20px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
                  <select onChange={e=>updateTicket(t.ticket_id,e.target.value,t.priority,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.status} style={{padding:'7px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#faf7f3',cursor:'pointer',outline:'none'}}>
                    <option value="open">🔴 Open</option><option value="in_progress">🔵 In Progress</option><option value="resolved">✅ Resolved</option><option value="closed">⚫ Closed</option>
                  </select>
                  <select onChange={e=>updateTicket(t.ticket_id,t.status,e.target.value,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.priority} style={{padding:'7px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#faf7f3',cursor:'pointer',outline:'none'}}>
                    <option value="low">🟢 Low</option><option value="normal">🟡 Normal</option><option value="high">🔴 High</option><option value="urgent">🚨 Urgent</option>
                  </select>
                  <input placeholder="Add admin note..." value={ticketNotes[t.ticket_id]||''} onChange={e=>setTicketNotes(p=>({...p,[t.ticket_id]:e.target.value}))} style={{flex:1,minWidth:'180px',padding:'7px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#faf7f3',outline:'none'}}/>
                  <button onClick={()=>updateTicket(t.ticket_id,t.status,t.priority,ticketNotes[t.ticket_id])} disabled={updatingTicket===t.ticket_id} style={{padding:'7px 16px',background:'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'9px',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>
                    {updatingTicket===t.ticket_id?'Saving...':'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div style={{fontFamily:"'Outfit',sans-serif"}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
            {[{icon:'💰',label:'Monthly Revenue',value:`$${(subRevenue?.monthly_revenue||0).toFixed(2)}`,color:'#16a34a'},{icon:'🟢',label:'Active Plans',value:subRevenue?.active_subscriptions||0,color:'#f97316'},{icon:'📋',label:'Total Subscriptions',value:subRevenue?.total_subscriptions||0,color:'#3b82f6'},{icon:'📈',label:'Annual Projection',value:`$${((subRevenue?.monthly_revenue||0)*12).toFixed(0)}`,color:'#a78bfa'}].map((s,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e8e2d9',textAlign:'center'}}>
                <div style={{fontSize:'24px',marginBottom:'8px'}}>{s.icon}</div>
                <div style={{fontSize:'28px',fontWeight:'800',color:s.color,lineHeight:'1',marginBottom:'4px'}}>{s.value}</div>
                <div style={{fontSize:'11px',color:'#9c8b78',fontWeight:'600',textTransform:'uppercase'}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:'16px',border:'1px solid #e8e2d9',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f0ebe4',fontSize:'14px',fontWeight:'700',color:'#1a1207'}}>📋 All Subscriptions</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#faf7f3'}}>
                    {['Invoice','Plan','Billing','Amount','Status','Rides Left','Started'].map(h=>(
                      <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',borderBottom:'1px solid #e8e2d9'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(subRevenue?.subscriptions||[]).map((s,i)=>(
                    <tr key={s.id} style={{borderBottom:'1px solid #f0ebe4',background:i%2===0?'#fff':'#faf7f3'}}>
                      <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:'12px',color:'#f97316',fontWeight:'600'}}>{s.invoice_number}</td>
                      <td style={{padding:'12px 16px',fontWeight:'700',color:'#1a1207'}}>{s.plan_name}</td>
                      <td style={{padding:'12px 16px',color:'#9c8b78',textTransform:'capitalize'}}>{s.billing_cycle}</td>
                      <td style={{padding:'12px 16px',fontWeight:'700',color:'#16a34a'}}>${s.price_paid}</td>
                      <td style={{padding:'12px 16px'}}><span style={{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',background:s.status==='active'?'#f0fdf4':'#fef2f2',color:s.status==='active'?'#16a34a':'#dc2626'}}>{s.status==='active'?'🟢 Active':'⛔ Cancelled'}</span></td>
                      <td style={{padding:'12px 16px',color:'#9c8b78'}}>{s.rides_remaining===null?'∞':s.rides_remaining}</td>
                      <td style={{padding:'12px 16px',color:'#9c8b78',fontSize:'12px'}}>{new Date(s.started_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}"""

if "activeTab === 'tickets'" not in c:
    # Find the last existing tab panel and insert after it
    # Look for the closing of the last tab panel
    panels = list(re.finditer(r"\{activeTab === '(\w+)' && \(", c))
    if panels:
        last_panel = panels[-1]
        # Find matching closing )} after the last panel
        depth = 0
        i = last_panel.start()
        while i < len(c):
            if c[i] == '(':
                depth += 1
            elif c[i] == ')':
                depth -= 1
                if depth == 0:
                    break
            i += 1
        # Skip closing )
        close_pos = i + 1
        # Skip closing }
        while close_pos < len(c) and c[close_pos] in ' \n':
            close_pos += 1
        if c[close_pos] == '}':
            close_pos += 1
        c = c[:close_pos] + '\n' + tickets_panel + c[close_pos:]
        print('✅ Added ticket + revenue tab panels')
    else:
        print('⚠️  No existing tab panels found')
else:
    print('ℹ️  Tab panels already present')

with open(path, 'w') as f:
    f.write(c)

print('\n✅ AdminDashboard.js patched successfully!')
print('Restart npm start to see the changes.')
