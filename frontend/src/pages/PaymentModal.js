import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

function CheckoutForm({ clientSecret, amount, bus, seat, user, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: user?.name || "Guest",
          email: user?.email || ""
        }
      }
    });

    if (result.error) {
      setError(result.error.message);
      setProcessing(false);
    } else if (result.paymentIntent.status === "succeeded") {
      onSuccess(result.paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={styles.summary}>
        <div style={styles.summaryRow}>
          <span>Route</span>
          <span>{bus?.origin} → {bus?.destination}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>Seat</span>
          <span>{seat}</span>
        </div>
        <div style={styles.summaryRow}>
          <span>Bus</span>
          <span>{bus?.bus}</span>
        </div>
        <div style={{ ...styles.summaryRow, borderTop: "1px solid #e0e0e0", paddingTop: "12px", marginTop: "8px" }}>
          <span style={{ fontWeight: "700" }}>Total</span>
          <span style={{ fontWeight: "700", fontSize: "20px", color: "#4f46e5" }}>${amount}</span>
        </div>
      </div>

      <div style={styles.cardContainer}>
        <label style={styles.cardLabel}>Card Details</label>
        <div style={styles.cardElement}>
          <CardElement options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#333",
                "::placeholder": { color: "#aaa" }
              }
            }
          }} />
        </div>
        <p style={styles.testNote}>
          🧪 Test mode: Use card <strong>4242 4242 4242 4242</strong>, any future date, any CVC
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.buttons}>
        <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={processing}>
          Cancel
        </button>
        <button type="submit" style={styles.payBtn} disabled={processing || !stripe}>
          {processing ? "Processing..." : `Pay $${amount}`}
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

  useEffect(() => {
    initPayment();
  }, []);

  const initPayment = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/payments/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: bus.price,
          bus_id: bus.id,
          seat: seat,
          bus_name: bus.bus,
          origin: bus.origin,
          destination: bus.destination
        })
      });

      const data = await res.json();
      if (data.client_secret) {
        setClientSecret(data.client_secret);
        setStripePromise(loadStripe(data.publishable_key));
      } else {
        setError("Failed to initialize payment");
      }
    } catch (err) {
      setError("Payment service unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>💳 Complete Payment</h2>
          <p style={styles.subtitle}>Secure payment powered by Stripe</p>
        </div>

        {loading ? (
          <div style={styles.loading}>Setting up secure payment...</div>
        ) : error ? (
          <div style={styles.errorBox}>
            {error}
            <button style={styles.cancelBtn} onClick={onCancel}>Close</button>
          </div>
        ) : stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              clientSecret={clientSecret}
              amount={bus.price}
              bus={bus}
              seat={seat}
              user={user}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  header: { marginBottom: "24px" },
  title: { margin: "0 0 4px", fontSize: "22px", fontWeight: "700", color: "#1a1a2e" },
  subtitle: { margin: 0, color: "#666", fontSize: "14px" },
  summary: { background: "#f8f9ff", borderRadius: "10px", padding: "16px", marginBottom: "20px" },
  summaryRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "14px", color: "#444" },
  cardContainer: { marginBottom: "20px" },
  cardLabel: { display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" },
  cardElement: { border: "1px solid #ddd", borderRadius: "8px", padding: "12px 14px", background: "#fafafa" },
  testNote: { margin: "8px 0 0", fontSize: "12px", color: "#888", background: "#fffbf0", padding: "8px", borderRadius: "6px" },
  error: { background: "#fee", color: "#c00", padding: "10px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  errorBox: { textAlign: "center", padding: "20px", color: "#c00" },
  loading: { textAlign: "center", padding: "40px", color: "#666" },
  buttons: { display: "flex", gap: "12px" },
  cancelBtn: { flex: 1, padding: "12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  payBtn: { flex: 2, padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "15px" },
};