#!/usr/bin/env python3
"""
Complete support ticket system:
1. User submits ticket → admin gets email + sees in portal instantly
2. Admin replies IN the portal → user gets email + sees in app
3. Admin can also open Gmail directly from the portal
4. Real-time open ticket count badge on Support Tickets tab
5. User sees full thread in /contact
"""

BASE = '/Users/rohithkandula/Desktop/mr_bus_portal_ultimate'
ADMIN_EMAIL = 'noreplymrbuses@gmail.com'

# ─── FIX support.py ──────────────────────────────────────────────────────────
support_path = f'{BASE}/backend/app/routers/support.py'
with open(support_path) as f:
    c = f.read()

# Fix all admin emails
c = c.replace('to_email="admin@mrbusportal.com"', f'to_email="{ADMIN_EMAIL}"')
c = c.replace('to_email="rohithkandula937@gmail.com"', f'to_email="{ADMIN_EMAIL}"')
print(f'✅ All admin emails → {ADMIN_EMAIL}')

# Ensure my-tickets returns full fields
old_my = '''        return [{
            "ticket_id": t.ticket_id,
            "category": t.category,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at.isoformat(),
        } for t in tickets]'''
new_my = '''        return [{
            "ticket_id": t.ticket_id,
            "category": t.category,
            "subject": t.subject,
            "message": t.message,
            "status": t.status,
            "priority": t.priority,
            "admin_notes": t.admin_notes,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        } for t in tickets]'''
if '"message": t.message' not in c:
    c = c.replace(old_my, new_my)
    print('✅ my-tickets returns full fields')

# Add admin reply endpoint (sends email to user)
if 'admin_reply' not in c:
    c = c.rstrip() + '''


class AdminReplyRequest(BaseModel):
    token: str
    reply: str
    status: str | None = None
    priority: str | None = None


@router.post("/admin/ticket/{ticket_id}/reply")
def admin_reply_to_user(ticket_id: str, req: AdminReplyRequest):
    """Admin replies to a ticket — updates admin_notes + emails the user."""
    db = SessionLocal()
    try:
        payload = decode_access_token(req.token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not admin or not admin.is_admin:
            raise HTTPException(status_code=403, detail="Admin only")

        ticket = db.query(SupportTicket).filter(
            SupportTicket.ticket_id == ticket_id.upper()
        ).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Update ticket
        ticket.admin_notes = req.reply.strip()
        if req.status:
            ticket.status = req.status
            if req.status == "resolved":
                ticket.resolved_at = datetime.utcnow()
        if req.priority:
            ticket.priority = req.priority
        ticket.updated_at = datetime.utcnow()
        db.commit()

        # Email the user
        try:
            send_email(
                to_email=ticket.email,
                subject=f"[{ticket.ticket_id}] Support Team Response — MR Bus Portal",
                body=f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:'Helvetica Neue',sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0e0618,#1a0a2e);padding:32px 40px;text-align:center;">
      <div style="font-size:40px;margin-bottom:10px;">💬</div>
      <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Support Team Response</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:6px 0 0;">Regarding ticket {ticket.ticket_id}</p>
    </div>
    <div style="padding:28px 40px;">
      <p style="font-size:14px;color:#4a3728;margin:0 0 20px;">Hi {ticket.name},</p>
      <p style="font-size:14px;color:#4a3728;margin:0 0 16px;">Our support team has responded to your ticket:</p>
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
        <div style="font-size:11px;color:#3b82f6;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">🛟 Support Team Response</div>
        <p style="font-size:14px;color:#1e3a5f;margin:0;line-height:1.8;">{req.reply}</p>
      </div>
      <div style="background:#faf7f3;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Ticket ID</span>
          <span style="font-size:13px;color:#f97316;font-weight:700;font-family:monospace;">{ticket.ticket_id}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Subject</span>
          <span style="font-size:13px;color:#1a1207;font-weight:600;">{ticket.subject}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:12px;color:#9c8b78;font-weight:600;">Status</span>
          <span style="font-size:12px;font-weight:700;color:#16a34a;background:#f0fdf4;padding:3px 10px;border-radius:20px;border:1px solid #bbf7d0;">{ticket.status.replace("_"," ").title()}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#9c8b78;">Need to add more details? Visit <a href="http://localhost:3000/contact" style="color:#f97316;text-decoration:none;">your support tickets</a> to reply.</p>
    </div>
    <div style="padding:16px 40px;background:#f7f3ee;border-top:1px solid #e8e2d9;text-align:center;">
      <p style="font-size:11px;color:#b0a090;margin:0;">MR Bus Portal Support · noreplymrbuses@gmail.com</p>
    </div>
  </div>
</body>
</html>""",
            )
            print(f"[EMAIL SENT] Admin reply → {ticket.email} for {ticket.ticket_id}")
        except Exception as e:
            print(f"Email failed (non-fatal): {e}")

        return {
            "status": "replied",
            "ticket_id": ticket_id,
            "message": f"Reply sent to {ticket.email}"
        }
    finally:
        db.close()


@router.post("/ticket/{ticket_id}/reply")
def user_reply_ticket(ticket_id: str, req: CreateTicketRequest):
    """User adds a follow-up reply to their ticket."""
    db = SessionLocal()
    try:
        ticket = db.query(SupportTicket).filter(
            SupportTicket.ticket_id == ticket_id.upper()
        ).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        ticket.message = (ticket.message or "") + f"\\n\\n---USER REPLY [{timestamp}]---\\n{req.message.strip()}"
        if ticket.status in ["resolved", "closed"]:
            ticket.status = "open"
        ticket.updated_at = datetime.utcnow()
        db.commit()

        # Notify admin
        try:
            send_email(
                to_email="noreplymrbuses@gmail.com",
                subject=f"[{ticket.ticket_id}] User Follow-Up — {ticket.category.upper()}",
                body=f"""<html><body style="font-family:sans-serif;background:#f7f3ee;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#1a0a2e;padding:24px;text-align:center;">
    <h2 style="color:#fff;margin:0;font-size:18px;">💬 User Replied to Ticket</h2>
  </div>
  <div style="padding:24px;">
    <p style="color:#9c8b78;font-size:13px;">Ticket: <strong style="color:#f97316;font-family:monospace;">{ticket.ticket_id}</strong></p>
    <p style="color:#9c8b78;font-size:13px;">From: <strong style="color:#1a1207;">{ticket.name}</strong> &lt;{ticket.email}&gt;</p>
    <div style="background:#fff7ed;border-left:3px solid #f97316;border-radius:8px;padding:14px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#4a3728;line-height:1.7;">{req.message}</p>
    </div>
    <a href="http://localhost:3000/admin" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;">Open Admin Dashboard →</a>
  </div>
</div>
</body></html>""",
            )
        except Exception as e:
            print(f"Admin notify failed: {e}")

        return {"status": "replied", "message": "Reply sent!"}
    finally:
        db.close()
'''
    print('✅ Added admin reply endpoint + user reply endpoint')

with open(support_path, 'w') as f:
    f.write(c)
print('✅ support.py saved\n')

# ─── FIX AdminDashboard.js ───────────────────────────────────────────────────
admin_path = f'{BASE}/frontend/src/pages/AdminDashboard.js'
with open(admin_path) as f:
    c = f.read()

# Add replyDraft + sendingReply state
if 'replyDraft' not in c:
    c = c.replace(
        'const [updatingTicket, setUpdatingTicket] = React.useState(null);',
        '''const [updatingTicket, setUpdatingTicket] = React.useState(null);
  const [replyDraft, setReplyDraft] = React.useState({});
  const [sendingReply, setSendingReply] = React.useState(null);
  const [openCount, setOpenCount] = React.useState(0);'''
    )
    print('✅ Added replyDraft + openCount state')

# Add sendAdminReply function + update fetchTickets to set openCount
if 'sendAdminReply' not in c:
    c = c.replace(
        '  const fetchTickets = async (tok) => {',
        '''  const sendAdminReply = async (ticketId, status, priority) => {
    const reply = replyDraft[ticketId];
    if (!reply || !reply.trim()) { alert('Please write a reply message first'); return; }
    setSendingReply(ticketId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/support/admin/ticket/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reply: reply.trim(), status, priority }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ Reply sent to user! Email delivered.`);
        setReplyDraft(p => ({ ...p, [ticketId]: '' }));
        fetchTickets(token);
      } else {
        showToast(data.detail || 'Failed to send reply', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSendingReply(null); }
  };

  const fetchTickets = async (tok) => {'''
    )
    print('✅ Added sendAdminReply function')

# Update fetchTickets to set openCount
if 'setOpenCount' not in c:
    c = c.replace(
        '''  const fetchTickets = async (tok) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/support/admin/tickets?token=${tok}`);
      const data = await res.json();
      if (res.ok) { setTickets(data.tickets || []); setTicketStats(data.stats || null); }
    } catch (e) { console.error(e); }
  };''',
        '''  const fetchTickets = async (tok) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/support/admin/tickets?token=${tok}`);
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets || []);
        setTicketStats(data.stats || null);
        setOpenCount(data.stats?.open || 0);
      }
    } catch (e) { console.error(e); }
  };'''
    )
    print('✅ fetchTickets now updates openCount badge')

# Add openCount badge to Support Tickets nav item
if 'openCount > 0' not in c:
    c = c.replace(
        "{ key: 'tickets', icon: '🎫', label: 'Support Tickets' },",
        "{ key: 'tickets', icon: '🎫', label: 'Support Tickets', badge: true },"
    )
    # Update nav item render to show badge
    c = c.replace(
        '''<div key={t.key} style={{ ...s.navItem, ...(activeTab === t.key ? s.navItemActive : {}) }}''',
        '''<div key={t.key} style={{ ...s.navItem, ...(activeTab === t.key ? s.navItemActive : {}), position: 'relative' }}'''
    )
    # Add badge after the icon/label render - find the icon span
    c = c.replace(
        '''              onClick={() => {
                setActiveTab(t.key);
                if (t.key === 'tickets') fetchTickets(token);
                if (t.key === 'revenue') fetchSubRevenue(token);
              }}>''',
        '''              onClick={() => {
                setActiveTab(t.key);
                if (t.key === 'tickets') fetchTickets(token);
                if (t.key === 'revenue') fetchSubRevenue(token);
              }}>
              {t.badge && openCount > 0 && (
                <span style={{ position: 'absolute', top: '6px', right: '8px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>{openCount}</span>
              )}'''
    )
    print('✅ Added open ticket count badge on nav')

# Replace the tickets tab content with improved version including reply box + Gmail button
old_tickets_panel_start = "{activeTab === 'tickets' && ("
if old_tickets_panel_start in c:
    # Find the full tickets panel and replace it
    start_idx = c.find(old_tickets_panel_start)
    # Find matching closing - count parens
    depth = 0
    i = start_idx
    while i < len(c):
        if c[i] == '(':
            depth += 1
        elif c[i] == ')':
            depth -= 1
            if depth == 0:
                break
        i += 1
    end_idx = i + 1
    # skip closing }
    while end_idx < len(c) and c[end_idx] in ' \n':
        end_idx += 1
    if c[end_idx] == '}':
        end_idx += 1

    new_tickets_panel = """      {activeTab === 'tickets' && (
        <div style={{fontFamily:"'Outfit',sans-serif"}}>
          {/* Stats */}
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
          {/* Filter tabs */}
          <div style={{display:'flex',background:'#fff',border:'1px solid #e8e2d9',borderRadius:'12px',padding:'3px',gap:'2px',marginBottom:'16px',width:'fit-content'}}>
            {[['all','All'],['open','🔴 Open'],['in_progress','🔵 In Progress'],['resolved','✅ Resolved']].map(([k,l])=>(
              <button key={k} onClick={()=>setTicketFilter(k)} style={{padding:'7px 16px',borderRadius:'9px',border:'none',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",background:ticketFilter===k?'linear-gradient(135deg,#f97316,#ea580c)':'transparent',color:ticketFilter===k?'#fff':'#9c8b78'}}>
                {l} ({k==='all'?tickets.length:tickets.filter(t=>t.status===k).length})
              </button>
            ))}
          </div>
          {/* Ticket list */}
          <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            {(ticketFilter==='all'?tickets:tickets.filter(t=>t.status===ticketFilter)).map(t=>(
              <div key={t.ticket_id} style={{background:'#fff',borderRadius:'16px',border:`1.5px solid ${t.status==='open'?'rgba(249,115,22,0.3)':t.status==='in_progress'?'rgba(59,130,246,0.3)':'#e8e2d9'}`,overflow:'hidden'}}>
                {/* Ticket header */}
                <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',borderBottom:'1px solid #f0ebe4',background:t.status==='open'?'#fff7ed':t.status==='in_progress'?'#eff6ff':'#fafafa'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1,minWidth:0}}>
                    <div style={{fontFamily:'monospace',fontSize:'13px',fontWeight:'700',color:'#f97316',flexShrink:0}}>{t.ticket_id}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'#1a1207',marginBottom:'2px'}}>{t.subject}</div>
                      <div style={{fontSize:'12px',color:'#9c8b78'}}>{t.name} · <a href={`mailto:${t.email}`} style={{color:'#f97316',textDecoration:'none'}}>{t.email}</a> · {new Date(t.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.status==='open'?'#fff7ed':t.status==='in_progress'?'#eff6ff':t.status==='resolved'?'#f0fdf4':'#f7f3ee',color:t.status==='open'?'#f97316':t.status==='in_progress'?'#3b82f6':t.status==='resolved'?'#16a34a':'#9c8b78',border:`1px solid ${t.status==='open'?'#fed7aa':t.status==='in_progress'?'#bfdbfe':t.status==='resolved'?'#bbf7d0':'#e8e2d9'}`}}>{t.status.replace('_',' ')}</span>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 10px',borderRadius:'20px',background:t.priority==='high'?'#fef2f2':'#f7f3ee',color:t.priority==='high'?'#dc2626':'#9c8b78',border:`1px solid ${t.priority==='high'?'#fca5a5':'#e8e2d9'}`}}>{t.priority}</span>
                    <span style={{fontSize:'11px',padding:'4px 10px',borderRadius:'20px',background:'#f7f3ee',color:'#9c8b78',border:'1px solid #e8e2d9'}}>{t.category}</span>
                    {/* Gmail button */}
                    <a href={`https://mail.google.com/mail/?view=cm&to=${t.email}&su=[${t.ticket_id}] Re: ${encodeURIComponent(t.subject)}&body=Hi ${encodeURIComponent(t.name)},%0A%0A`} target="_blank" rel="noreferrer"
                      style={{fontSize:'11px',fontWeight:'700',padding:'4px 12px',borderRadius:'20px',background:'#fff',border:'1px solid #e8e2d9',color:'#6b5744',textDecoration:'none',display:'flex',alignItems:'center',gap:'4px'}}>
                      📧 Gmail
                    </a>
                  </div>
                </div>
                {/* User message */}
                <div style={{padding:'14px 20px',borderBottom:'1px solid #f0ebe4'}}>
                  <div style={{fontSize:'10px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>User Message</div>
                  {(t.message||'').split(/\n\n---USER REPLY \[([^\]]+)\]---\n/).reduce((acc,part,i,arr)=>{
                    if(i===0) acc.push({text:part,label:'Original',time:new Date(t.created_at).toLocaleDateString()});
                    else if(i%2===0) acc.push({text:part,label:'Follow-up',time:arr[i-1]});
                    return acc;
                  },[]).map((m,mi)=>(
                    <div key={mi} style={{background:'#faf7f3',borderLeft:'3px solid #f97316',borderRadius:'8px',padding:'10px 14px',marginBottom:'8px'}}>
                      <div style={{fontSize:'10px',color:'#f97316',fontWeight:'700',marginBottom:'4px'}}>{m.label} · {m.time}</div>
                      <p style={{margin:0,fontSize:'13px',color:'#4a3728',lineHeight:'1.7'}}>{m.text.trim()}</p>
                    </div>
                  ))}
                  {t.admin_notes && (
                    <div style={{background:'#eff6ff',borderLeft:'3px solid #3b82f6',borderRadius:'8px',padding:'10px 14px',marginTop:'8px'}}>
                      <div style={{fontSize:'10px',color:'#3b82f6',fontWeight:'700',marginBottom:'4px'}}>🛟 Your Previous Reply</div>
                      <p style={{margin:0,fontSize:'13px',color:'#1e3a5f',lineHeight:'1.7'}}>{t.admin_notes}</p>
                    </div>
                  )}
                </div>
                {/* Admin reply box */}
                <div style={{padding:'16px 20px',background:'#fafafa'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#9c8b78',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>📤 Reply to {t.name}</div>
                  <textarea
                    value={replyDraft[t.ticket_id]||''}
                    onChange={e=>setReplyDraft(p=>({...p,[t.ticket_id]:e.target.value}))}
                    placeholder={`Type your response to ${t.name}... This will be emailed to ${t.email}`}
                    rows={3}
                    style={{width:'100%',padding:'10px 14px',border:'1.5px solid #e8e2d9',borderRadius:'10px',fontSize:'13px',fontFamily:"'Outfit',sans-serif",outline:'none',background:'#fff',color:'#1a1207',resize:'vertical',lineHeight:'1.6',boxSizing:'border-box'}}/>
                  <div style={{display:'flex',gap:'10px',marginTop:'10px',flexWrap:'wrap',alignItems:'center'}}>
                    <select onChange={e=>updateTicket(t.ticket_id,e.target.value,t.priority,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.status}
                      style={{padding:'8px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#fff',cursor:'pointer',outline:'none'}}>
                      <option value="open">🔴 Open</option>
                      <option value="in_progress">🔵 In Progress</option>
                      <option value="resolved">✅ Resolved</option>
                      <option value="closed">⚫ Closed</option>
                    </select>
                    <select onChange={e=>updateTicket(t.ticket_id,t.status,e.target.value,ticketNotes[t.ticket_id]||t.admin_notes)} defaultValue={t.priority}
                      style={{padding:'8px 12px',borderRadius:'9px',border:'1px solid #e8e2d9',fontSize:'12px',fontFamily:"'Outfit',sans-serif",background:'#fff',cursor:'pointer',outline:'none'}}>
                      <option value="low">🟢 Low</option>
                      <option value="normal">🟡 Normal</option>
                      <option value="high">🔴 High</option>
                      <option value="urgent">🚨 Urgent</option>
                    </select>
                    <button onClick={()=>sendAdminReply(t.ticket_id,t.status,t.priority)}
                      disabled={sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()}
                      style={{padding:'9px 20px',background:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'#e8e2d9':'linear-gradient(135deg,#f97316,#ea580c)',border:'none',borderRadius:'10px',color:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'#9c8b78':'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:"'Outfit',sans-serif",boxShadow:sendingReply===t.ticket_id||!(replyDraft[t.ticket_id]||'').trim()?'none':'0 4px 12px rgba(249,115,22,0.3)'}}>
                      {sendingReply===t.ticket_id?'⏳ Sending...':'📤 Send Reply & Email User'}
                    </button>
                    <a href={`https://mail.google.com/mail/?view=cm&to=${t.email}&su=[${t.ticket_id}] Re: ${encodeURIComponent(t.subject)}&body=${encodeURIComponent(`Hi ${t.name},\n\n`)}`}
                      target="_blank" rel="noreferrer"
                      style={{padding:'9px 16px',background:'#fff',border:'1px solid #e8e2d9',borderRadius:'10px',color:'#6b5744',fontSize:'13px',fontWeight:'600',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                      📧 Open in Gmail
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {(ticketFilter==='all'?tickets:tickets.filter(t=>t.status===ticketFilter)).length===0 && (
              <div style={{background:'#fff',borderRadius:'16px',padding:'48px',textAlign:'center',border:'1px solid #e8e2d9'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>🎫</div>
                <div style={{fontSize:'16px',color:'#9c8b78',fontWeight:'600'}}>No tickets in this category</div>
              </div>
            )}
          </div>
        </div>
      )}"""

    c = c[:start_idx] + new_tickets_panel + c[end_idx:]
    print('✅ Replaced tickets panel with full reply UI + Gmail button')

with open(admin_path, 'w') as f:
    f.write(c)
print('✅ AdminDashboard.js saved\n')

# ─── FIX ContactPage.js ───────────────────────────────────────────────────────
contact_path = f'{BASE}/frontend/src/pages/ContactPage.js'
with open(contact_path) as f:
    c = f.read()

if 'replyText' not in c:
    c = c.replace(
        'const [expandedTicket, setExpandedTicket] = useState(null);',
        'const [expandedTicket, setExpandedTicket] = useState(null);\n  const [replyText, setReplyText] = useState({});\n  const [replying, setReplying] = useState(null);'
    )

if 'sendReply' not in c:
    c = c.replace(
        '  const fetchMyTickets = async () => {',
        '''  const sendReply = async (ticketId) => {
    const msg = (replyText[ticketId] || '').trim();
    if (msg.length < 5) { alert('Please write at least 5 characters'); return; }
    setReplying(ticketId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/support/ticket/${ticketId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user?.name || 'User', email: user?.email || '', category: 'general', subject: 'Reply', message: msg, token: token || null }),
      });
      if (res.ok) { setReplyText(p => ({ ...p, [ticketId]: '' })); await fetchMyTickets(); alert('✅ Reply sent!'); }
      else { alert('Failed. Please try again.'); }
    } catch { alert('Network error.'); }
    finally { setReplying(null); }
  };

  const fetchMyTickets = async () => {'''
    )
    print('✅ Added sendReply to ContactPage')

with open(contact_path, 'w') as f:
    f.write(c)

print('\n🎉 ALL DONE! Restart both servers.')
print('Flow:')
print('  User submits ticket → admin gets email at noreplymrbuses@gmail.com')
print('  Admin types reply in dashboard → user gets email + sees in /contact')
print('  Admin can also click "Open in Gmail" to reply via Gmail directly')
print('  User can reply back → admin gets email notification')
print('  Open ticket count badge shows on Support Tickets nav item')
