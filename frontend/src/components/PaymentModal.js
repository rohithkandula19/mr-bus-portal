import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

function CheckoutForm({ clientSecret, originalAmount, discountAmount, finalAmount, pointsToRedeem, bus, seat, user, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true); setError(null);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement), billing_details: { name: user?.name || "Guest", email: user?.email || "" } }
    });
    if (result.error) { setError(result.error.message); setProcessing(false); }
    else if (result.paymentIntent.status === "succeeded") { onSuccess(result.paymentIntent.id, pointsToRedeem); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily:"'Outfit',sans-serif" }}>
      <div style={{ background:"#faf7f3", borderRadius:"14px", padding:"16px 18px", marginBottom:"18px", border:"1px solid #f0ebe4" }}>
        {[["Route", `${bus?.origin?.split(',')[0]} → ${bus?.destination?.split(',')[0]}`],["Bus", bus?.bus],["Seat", seat]].map(([l,v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px" }}>
            <span style={{ color:"#9c8b78" }}>{l}</span>
            <span style={{ color: l==="Seat"?"#f97316":"#1a1207", fontWeight:"700", fontSize: l==="Seat"?"16px":"13px" }}>{v}</span>
          </div>
        ))}
        <div style={{ borderTop:"1px solid #f0ebe4", marginTop:"8px", paddingTop:"8px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", padding:"4px 0" }}>
            <span style={{ color:"#9c8b78" }}>Ticket price</span>
            <span style={{ color:"#1a1207", fontWeight:"700" }}>${originalAmount}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", padding:"4px 0" }}>
              <span style={{ color:"#16a34a", fontWeight:"600" }}>🏆 Points discount ({pointsToRedeem} pts)</span>
              <span style={{ color:"#16a34a", fontWeight:"800" }}>−${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"10px", marginTop:"4px", borderTop:"2px solid #f0ebe4" }}>
            <span style={{ fontWeight:"800", fontSize:"15px", color:"#1a1207" }}>Total</span>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"28px", color:"#1a1207" }}>${finalAmount.toFixed(2)}</div>
              {discountAmount > 0 && <div style={{ fontSize:"11px", color:"#16a34a", fontWeight:"600" }}>You saved ${discountAmount.toFixed(2)}! 🎉</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:"18px" }}>
        <label style={{ display:"block", fontSize:"11px", fontWeight:"700", color:"#9c8b78", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>Card Details</label>
        <div style={{ border:"1.5px solid #e8e2d9", borderRadius:"12px", padding:"13px 14px", background:"#faf7f3" }}>
          <CardElement options={{ style: { base: { fontSize:"15px", color:"#1a1207", fontFamily:"'Outfit',sans-serif", "::placeholder":{ color:"#c4b8a8" } } } }} />
        </div>
        <div style={{ marginTop:"8px", fontSize:"11px", color:"#9c8b78", background:"#fff7ed", padding:"7px 10px", borderRadius:"8px", border:"1px solid #fed7aa" }}>
          🧪 Test: <strong>4242 4242 4242 4242</strong> · any future date · any CVC
        </div>
      </div>

      {error && <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", color:"#dc2626", padding:"10px 14px", borderRadius:"10px", marginBottom:"14px", fontSize:"13px" }}>{error}</div>}

      <div style={{ display:"flex", gap:"10px" }}>
        <button type="button" style={{ flex:1, padding:"13px", background:"#faf7f3", color:"#6b5744", border:"1.5px solid #e8e2d9", borderRadius:"12px", cursor:"pointer", fontWeight:"600", fontSize:"14px", fontFamily:"'Outfit',sans-serif" }} onClick={onCancel} disabled={processing}>Cancel</button>
        <button type="submit" style={{ flex:2, padding:"13px", background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", borderRadius:"12px", cursor:"pointer", fontWeight:"700", fontSize:"15px", fontFamily:"'Outfit',sans-serif", opacity:processing||!stripe?0.7:1 }} disabled={processing||!stripe}>
          {processing ? "Processing..." : `Pay $${finalAmount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ bus, seat, onSuccess, onCancel, user }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [applyPoints, setApplyPoints] = useState(false);
  const [paymentInitialized, setPaymentInitialized] = useState(false);

  const originalAmount = bus?.price || 0;
  const maxPointsValue = loyalty ? Math.min(loyalty.points, originalAmount * 100) : 0;
  const discountAmount = applyPoints ? Math.min(pointsToUse / 100, originalAmount) : 0;
  const finalAmount = Math.max(0.5, originalAmount - discountAmount);

  useEffect(() => { fetchLoyalty(); }, []); // eslint-disable-line
  useEffect(() => { if (!paymentInitialized) { initPayment(); setPaymentInitialized(true); } }, []); // eslint-disable-line

  const fetchLoyalty = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${process.env.REACT_APP_API_URL}/loyalty/balance`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setLoyalty(d); setPointsToUse(Math.min(d.points, originalAmount * 100)); }
    } catch(e) {}
  };

  const initPayment = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem("token");
      if (!token) { setError("You must be logged in"); setLoading(false); return; }
      const res = await fetch(`${process.env.REACT_APP_API_URL}/payments/create-payment-intent`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ amount: originalAmount, bus_id: bus.id, seat, bus_name: bus.bus, origin: bus.origin, destination: bus.destination })
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); setError(e.detail||`Server error: ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      if (!data.client_secret) { setError("Payment setup failed"); setLoading(false); return; }
      const pubKey = data.publishable_key || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51TBU7VRzhhmpHwAznkYCOH0XGTZa51rEAHvSlpI799d0KakmIr94JE9Jb9BrIDx9XRb4rKUsBFs6kxU8YqVoDvwH00O142b5Be';
      if (!pubKey) { setError("Stripe key missing"); setLoading(false); return; }
      setClientSecret(data.client_secret);
      setStripePromise(loadStripe(pubKey));
    } catch(err) { setError("Payment service unavailable"); }
    finally { setLoading(false); }
  };

  const handleSuccess = async (paymentIntentId, redeemedPoints) => {
    if (redeemedPoints > 0 && applyPoints) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${process.env.REACT_APP_API_URL}/loyalty/redeem?points_to_redeem=${redeemedPoints}`, { method:"POST", headers:{ Authorization:`Bearer ${token}` } });
      } catch(e) {}
    }
    onSuccess(paymentIntentId);
  };

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", backdropFilter:"blur(4px)" }}>
      <div style={{ background:"#fff", borderRadius:"24px", padding:"28px", maxWidth:"500px", width:"100%", boxShadow:"0 40px 80px rgba(0,0,0,0.25)", fontFamily:"'Outfit',sans-serif", maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:"44px", height:"44px", borderRadius:"13px", background:"#fff7ed", border:"1px solid #fed7aa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px" }}>💳</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"20px", color:"#1a1207" }}>Complete Payment</div>
              <div style={{ fontSize:"12px", color:"#9c8b78", marginTop:"2px" }}>Secure payment powered by Stripe</div>
            </div>
          </div>
          <button style={{ background:"none", border:"none", fontSize:"18px", color:"#9c8b78", cursor:"pointer" }} onClick={onCancel}>✕</button>
        </div>

        {/* LOYALTY POINTS SECTION */}
        {loyalty && loyalty.points >= 10 && (
          <div style={{ borderRadius:"14px", padding:"14px 16px", marginBottom:"18px", background: applyPoints?"#f0fdf4":"#faf7f3", border:`1.5px solid ${applyPoints?"#86efac":"#e8e2d9"}`, transition:"all 0.2s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"20px" }}>🏆</span>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1207" }}>{loyalty.points.toLocaleString()} loyalty points available</div>
                  <div style={{ fontSize:"11px", color:"#9c8b78" }}>= ${(loyalty.points/100).toFixed(2)} discount · 100 pts = $1.00</div>
                </div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer" }}>
                <div style={{ width:"40px", height:"22px", borderRadius:"11px", background:applyPoints?"#16a34a":"#e8e2d9", position:"relative", transition:"background 0.2s", flexShrink:0 }}
                  onClick={() => setApplyPoints(p => !p)}>
                  <div style={{ position:"absolute", top:"3px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"transform 0.2s", transform:applyPoints?"translateX(21px)":"translateX(3px)" }} />
                </div>
                <span style={{ fontSize:"12px", fontWeight:"600", color:applyPoints?"#16a34a":"#9c8b78" }}>{applyPoints?"Applied!":"Apply"}</span>
              </label>
            </div>

            {applyPoints && (
              <div style={{ marginTop:"12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                  <span style={{ fontSize:"12px", color:"#6b5744", fontWeight:"600" }}>Points to use:</span>
                  <span style={{ fontSize:"12px", fontWeight:"800", color:"#16a34a" }}>{pointsToUse} pts = −${(pointsToUse/100).toFixed(2)}</span>
                </div>
                <input type="range" min={10} max={maxPointsValue} step={10} value={pointsToUse}
                  onChange={e => setPointsToUse(Number(e.target.value))}
                  style={{ width:"100%", accentColor:"#16a34a", marginBottom:"8px" }} />
                <div style={{ display:"flex", gap:"6px" }}>
                  {[100, 500, 1000, maxPointsValue].filter((v,i,a) => a.indexOf(v)===i && v<=maxPointsValue && v>=10).map(v => (
                    <button key={v} type="button"
                      style={{ flex:1, padding:"5px", borderRadius:"8px", border:`1px solid ${pointsToUse===v?"#16a34a":"#e8e2d9"}`, background:pointsToUse===v?"#f0fdf4":"#fff", color:pointsToUse===v?"#16a34a":"#9c8b78", fontSize:"11px", fontWeight:"700", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}
                      onClick={() => setPointsToUse(v)}>
                      {v===maxPointsValue?"Max":v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:"40px", color:"#9c8b78", fontSize:"14px" }}>⚙️ Setting up secure payment...</div>
        ) : error ? (
          <div style={{ textAlign:"center", padding:"20px" }}>
            <p style={{ color:"#dc2626", marginBottom:"16px" }}>{error}</p>
            <button style={{ padding:"10px 20px", background:"#faf7f3", border:"1px solid #e8e2d9", borderRadius:"10px", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }} onClick={onCancel}>Close</button>
          </div>
        ) : stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              clientSecret={clientSecret}
              originalAmount={originalAmount}
              discountAmount={discountAmount}
              finalAmount={finalAmount}
              pointsToRedeem={applyPoints ? pointsToUse : 0}
              bus={bus} seat={seat} user={user}
              onSuccess={handleSuccess}
              onCancel={onCancel}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}
