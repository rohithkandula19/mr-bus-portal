// frontend/src/pages/TermsPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const SECTIONS = [
  {
    id: 'acceptance', title: '1. Acceptance of Terms',
    content: `By accessing or using the MR Bus Portal platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.

These Terms apply to all visitors, users, and others who access or use the Service. We reserve the right to update these Terms at any time. We will notify you of significant changes by email or by posting a notice on our platform. Your continued use of the Service after changes constitutes acceptance of the new Terms.

MR Bus Portal ("Company", "we", "our", or "us") operates this platform at mrbusportal.com and through our mobile applications.`
  },
  {
    id: 'eligibility', title: '2. Eligibility & Account Registration',
    content: `You must be at least 18 years of age to use this Service. By using MR Bus Portal, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding contract.

When you create an account, you agree to provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.

We reserve the right to terminate accounts that violate these Terms or that have been inactive for more than 24 months.`
  },
  {
    id: 'bookings', title: '3. Booking & Reservations',
    content: `All bookings made through MR Bus Portal are subject to availability and confirmation. A booking is confirmed only when you receive a booking confirmation email with a valid transaction ID.

Prices displayed are in US Dollars and are inclusive of all applicable fees unless otherwise stated. We reserve the right to correct pricing errors. In the event of a pricing error, we will contact you before processing the booking.

Seat selection is subject to availability at the time of booking. We cannot guarantee specific seats for bookings made without seat selection. Group bookings of 6 or more passengers may be subject to additional terms.

You are responsible for ensuring all passenger details are accurate. We are not liable for denied boarding due to incorrect passenger information.`
  },
  {
    id: 'cancellation', title: '4. Cancellation & Refund Policy',
    content: `Cancellations made within 24 hours of booking are eligible for a full refund with no cancellation fee, provided the departure is more than 2 hours away.

Cancellations made more than 24 hours after booking are subject to a 25% cancellation fee. The remaining 75% will be refunded to the original payment method within 5-7 business days.

No refunds will be issued for no-shows or cancellations made less than 2 hours before departure, unless the cancellation is due to a service disruption on our end.

In the event of a bus cancellation by MR Bus Portal or the carrier, passengers will receive a full refund or the option to rebook on an alternative service at no additional charge.

For full details, please see our Refund Policy page.`
  },
  {
    id: 'loyalty', title: '5. Loyalty Points Program',
    content: `MR Bus Portal offers a loyalty points program ("MR Rewards") to eligible registered users. Points are earned on qualifying bookings at a rate of 1 point per $1 spent.

Points have no cash value and cannot be transferred, sold, or exchanged for cash. Points expire after 24 months of account inactivity.

We reserve the right to modify, suspend, or terminate the loyalty program at any time. Point balances may be adjusted in cases of fraudulent activity, booking cancellations, or other program violations.

Tier status (Bronze, Silver, Gold, Platinum) is determined by total points earned and may change based on earning and redemption activity.`
  },
  {
    id: 'subscriptions', title: '6. Bus Pass Subscriptions',
    content: `MR Bus Portal offers subscription plans ("Bus Pass") that provide benefits including ride credits, loyalty point multipliers, and priority boarding.

Subscriptions are billed monthly or annually in advance. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.

You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period — you retain access to all subscription benefits until then. No partial refunds are issued for unused portions of a billing period.

We reserve the right to change subscription pricing with 30 days notice. Price changes will not affect your current billing period.`
  },
  {
    id: 'prohibited', title: '7. Prohibited Uses',
    content: `You agree not to use MR Bus Portal for any unlawful purpose or in any way that violates these Terms. Prohibited activities include but are not limited to:

• Booking tickets with the intent to resell or transfer them commercially ("ticket scalping")
• Using automated scripts or bots to search, book, or cancel tickets
• Providing false information during registration or booking
• Attempting to circumvent our security measures or access other users' accounts
• Using the platform to distribute spam, malware, or harmful content
• Engaging in any activity that disrupts or interferes with our services
• Attempting to reverse engineer or copy our platform or algorithms

Violation of these terms may result in immediate account termination and, where applicable, legal action.`
  },
  {
    id: 'liability', title: '8. Limitation of Liability',
    content: `MR Bus Portal acts as an intermediary platform connecting passengers with bus operators. While we strive to ensure the accuracy of all information on our platform, we cannot guarantee the accuracy of third-party information including bus schedules, operator details, or route information.

To the maximum extent permitted by applicable law, MR Bus Portal shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the Service.

Our total liability for any claim arising from your use of the Service shall not exceed the amount you paid for the specific booking giving rise to the claim.

We are not responsible for delays, cancellations, or other disruptions caused by bus operators, weather conditions, government actions, or other circumstances beyond our control.`
  },
  {
    id: 'privacy', title: '9. Privacy & Data',
    content: `Your use of MR Bus Portal is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our Service, you consent to the collection and use of your information as described in our Privacy Policy.

We collect personal information necessary to provide our services, including name, email address, and payment information. We do not sell your personal data to third parties.

For full details on how we collect, use, and protect your data, please review our Privacy Policy.`
  },
  {
    id: 'governing', title: '10. Governing Law & Disputes',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.

Any dispute arising from or relating to these Terms or your use of the Service shall first be attempted to be resolved through good-faith negotiation. If resolution cannot be reached within 30 days, disputes shall be submitted to binding arbitration in Chicago, Illinois, under the rules of the American Arbitration Association.

You waive any right to participate in class action lawsuits against MR Bus Portal.

If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`
  },
  {
    id: 'contact', title: '11. Contact Us',
    content: `If you have questions about these Terms of Service, please contact us:

MR Bus Portal
123 Transit Ave, Chicago, IL 60601
Email: legal@mrbusportal.com
Phone: +1 (800) MR-BUSES
Support: mrbusportal.com/contact

These Terms of Service were last updated on March 17, 2026.`
  },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#f7f3ee', fontFamily:"'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');`}</style>

      {/* Navbar */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'68px', background: scrolled ? 'rgba(8,6,16,0.97)' : 'rgba(8,6,16,0.9)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:100, transition:'all 0.3s' }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>MR <em style={{ color:'#f97316', fontStyle:'italic' }}>Bus</em> Portal</Link>
        <div style={{ display:'flex', gap:'4px' }}>
          {[['/', '🔍 Routes'], ['/my-bookings', '📋 Bookings'], ['/contact', '💬 Support']].map(([to, l]) => (
            <Link key={l} to={to} style={{ padding:'7px 13px', borderRadius:'10px', fontSize:'12px', fontWeight:'500', color:'rgba(255,255,255,0.5)', textDecoration:'none' }}>{l}</Link>
          ))}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies'],['/refund-policy','Refunds']].map(([to,l]) => (
            <Link key={l} to={to} style={{ fontSize:'12px', color: to==='/terms' ? '#f97316' : 'rgba(255,255,255,0.35)', textDecoration:'none', fontWeight: to==='/terms' ? '700' : '400' }}>{l}</Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:'linear-gradient(155deg,#0e0618,#08100f)', padding:'52px 48px 40px', textAlign:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(249,115,22,0.7)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>📄 Legal</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'42px', color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Terms of Service</h1>
        <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', margin:'0 0 16px' }}>Last updated: March 17, 2026 · Effective: March 17, 2026</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:'20px', padding:'6px 16px' }}>
          <span style={{ fontSize:'12px', color:'#fb923c' }}>📧 Questions? Email legal@mrbusportal.com</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 48px 80px', display:'grid', gridTemplateColumns:'240px 1fr', gap:'40px', alignItems:'start' }}>

        {/* Sidebar nav */}
        <div style={{ position:'sticky', top:'88px', background:'#fff', borderRadius:'16px', padding:'16px', border:'1px solid #e8e2d9', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:'#9c8b78', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px', padding:'0 8px' }}>Table of Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setActiveSection(s.id)}
              style={{ display:'block', padding:'8px 10px', borderRadius:'9px', fontSize:'12px', fontWeight: activeSection===s.id ? '700' : '500', color: activeSection===s.id ? '#f97316' : '#6b5744', textDecoration:'none', background: activeSection===s.id ? '#fff7ed' : 'transparent', marginBottom:'2px', transition:'all 0.15s', borderLeft: activeSection===s.id ? '3px solid #f97316' : '3px solid transparent' }}>
              {s.title}
            </a>
          ))}
        </div>

        {/* Main content */}
        <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', border:'1px solid #e8e2d9', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize:'14px', color:'#6b5744', lineHeight:'1.8', margin:0 }}>
              Please read these Terms of Service carefully before using MR Bus Portal. These terms govern your use of our platform and services. By creating an account or making a booking, you agree to be bound by these terms.
            </p>
          </div>

          {SECTIONS.map(s => (
            <div key={s.id} id={s.id} style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', scrollMarginTop:'90px' }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 16px', paddingBottom:'12px', borderBottom:'1px solid #f0ebe4' }}>{s.title}</h2>
              {s.content.split('\n\n').map((para, i) => (
                <p key={i} style={{ fontSize:'14px', color:'#4a3728', lineHeight:'1.85', margin:'0 0 14px' }}>
                  {para.startsWith('•') ? (
                    <span style={{ display:'block', paddingLeft:'16px', borderLeft:'2px solid #f97316', marginBottom:'8px' }}>{para}</span>
                  ) : para}
                </p>
              ))}
            </div>
          ))}

          {/* Related links */}
          <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(249,115,22,0.2)' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#c2410c', marginBottom:'14px' }}>📋 Related Legal Documents</div>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[['/privacy','🔒 Privacy Policy'],['/cookies','🍪 Cookie Policy'],['/refund-policy','💰 Refund Policy'],['/contact','💬 Contact Us']].map(([to,l]) => (
                <Link key={l} to={to} style={{ padding:'8px 16px', background:'#fff', border:'1px solid rgba(249,115,22,0.3)', borderRadius:'10px', fontSize:'13px', fontWeight:'600', color:'#c2410c', textDecoration:'none' }}>{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
