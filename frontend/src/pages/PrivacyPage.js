// frontend/src/pages/PrivacyPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const SECTIONS = [
  {
    id: 'overview', title: '1. Overview',
    content: `MR Bus Portal ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at mrbusportal.com and related services.

We comply with applicable privacy laws including the California Consumer Privacy Act (CCPA), General Data Protection Regulation (GDPR) for users in the European Economic Area, and other applicable US state privacy laws.

If you have questions about this policy, please contact our Data Protection Officer at privacy@mrbusportal.com.`
  },
  {
    id: 'collect', title: '2. Information We Collect',
    content: `We collect information you provide directly to us, including:

• Account Information: Name, email address, password (hashed), phone number
• Booking Information: Travel details, passenger names, seat preferences
• Payment Information: We use Stripe for payment processing and do not store full card details
• Profile Information: Travel preferences, loyalty tier, referral code
• Communications: Support tickets, reviews, chat messages with our AI assistant

We automatically collect certain information when you use our platform:

• Usage Data: Pages visited, features used, search queries, booking patterns
• Device Information: Browser type, operating system, IP address
• Location Data: Only when you explicitly grant permission for route suggestions
• Cookies: See our Cookie Policy for full details`
  },
  {
    id: 'use', title: '3. How We Use Your Information',
    content: `We use the information we collect to:

• Process and fulfill your bus bookings and transactions
• Send booking confirmations, receipts, and travel reminders
• Manage your loyalty points account and rewards
• Provide customer support and respond to inquiries
• Personalize your experience and show relevant routes
• Process subscription payments and manage your Bus Pass
• Send promotional emails (you can opt out at any time)
• Improve our platform through analytics and A/B testing
• Detect and prevent fraud and unauthorized account access
• Comply with legal obligations and enforce our Terms of Service
• Power our AI features including seat recommendations and price predictions

We process your data on the following legal bases: contract performance (bookings), legitimate interests (fraud prevention, analytics), consent (marketing emails), and legal compliance.`
  },
  {
    id: 'share', title: '4. Information Sharing',
    content: `We do not sell your personal information to third parties. We share your information only in the following circumstances:

• Bus Operators: We share necessary booking details with the bus operators you book with
• Payment Processors: Stripe processes payments on our behalf under their privacy policy
• Email Services: We use email service providers to send transactional and marketing emails
• Analytics: We use anonymized, aggregated data for platform analytics
• Legal Requirements: We may disclose information when required by law, court order, or government authority
• Business Transfers: In the event of a merger or acquisition, your data may be transferred as a business asset, with notice provided to you
• With Your Consent: We share information in other circumstances with your explicit consent

All third-party service providers are contractually obligated to keep your information confidential and use it only for the purposes we specify.`
  },
  {
    id: 'retention', title: '5. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide services. Specifically:

• Account data: Retained while your account is active plus 3 years after deletion
• Booking records: Retained for 7 years for tax and legal compliance
• Payment data: Retained per Stripe's data retention policies
• Chat logs: Retained for 90 days then anonymized
• Marketing preferences: Until you opt out or delete your account

You can request deletion of your account and personal data at any time. Note that some data must be retained for legal compliance even after account deletion.`
  },
  {
    id: 'rights', title: '6. Your Privacy Rights',
    content: `Depending on your location, you may have the following rights regarding your personal data:

• Right to Access: Request a copy of the personal data we hold about you
• Right to Rectification: Correct inaccurate or incomplete information
• Right to Erasure: Request deletion of your personal data ("right to be forgotten")
• Right to Portability: Receive your data in a machine-readable format
• Right to Restrict Processing: Limit how we use your data in certain circumstances
• Right to Object: Object to processing based on legitimate interests
• Right to Opt Out: Opt out of marketing emails at any time
• CCPA Rights: California residents have additional rights under the CCPA

To exercise any of these rights, email us at privacy@mrbusportal.com or use the data request form in your account settings. We will respond within 30 days.`
  },
  {
    id: 'security', title: '7. Data Security',
    content: `We implement industry-standard security measures to protect your personal information:

• All data transmitted between your browser and our servers is encrypted using TLS 1.3
• Passwords are hashed using bcrypt with salt rounds
• Payment processing is handled by Stripe, which is PCI DSS Level 1 certified
• We conduct regular security audits and penetration testing
• Access to personal data is restricted to authorized personnel on a need-to-know basis
• We maintain an incident response plan for potential data breaches

Despite our security measures, no system is 100% secure. If you believe your account has been compromised, please contact us immediately at security@mrbusportal.com.`
  },
  {
    id: 'cookies', title: '8. Cookies',
    content: `We use cookies and similar technologies to improve your experience. For full details on the types of cookies we use and how to control them, please see our Cookie Policy.

In summary, we use:
• Essential cookies: Required for login and core functionality
• Analytics cookies: To understand how you use our platform (can be declined)
• Marketing cookies: For personalized advertising (require explicit consent)

You can manage your cookie preferences at any time through our cookie banner or your browser settings.`
  },
  {
    id: 'children', title: '9. Children\'s Privacy',
    content: `MR Bus Portal is not directed to children under 18 years of age. We do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18, we will delete it promptly.

If you believe we have inadvertently collected information from a child, please contact us at privacy@mrbusportal.com.`
  },
  {
    id: 'contact', title: '10. Contact & Data Requests',
    content: `For privacy-related questions, requests, or concerns, please contact:

Data Protection Officer
MR Bus Portal
123 Transit Ave, Chicago, IL 60601
Email: privacy@mrbusportal.com
Response time: Within 30 days

For urgent security concerns: security@mrbusportal.com

This Privacy Policy was last updated on March 17, 2026.`
  },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('overview');
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

      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 48px', height:'68px', background: scrolled ? 'rgba(8,6,16,0.97)' : 'rgba(8,6,16,0.9)', backdropFilter:'blur(32px)', borderBottom:'1px solid rgba(255,255,255,0.07)', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', fontWeight:'700', color:'#fff', textDecoration:'none' }}>MR <em style={{ color:'#f97316', fontStyle:'italic' }}>Bus</em> Portal</Link>
        <div style={{ display:'flex', gap:'16px' }}>
          {[['/terms','Terms'],['/privacy','Privacy'],['/cookies','Cookies'],['/refund-policy','Refunds']].map(([to,l]) => (
            <Link key={l} to={to} style={{ fontSize:'12px', color: to==='/privacy' ? '#f97316' : 'rgba(255,255,255,0.35)', textDecoration:'none', fontWeight: to==='/privacy' ? '700' : '400' }}>{l}</Link>
          ))}
        </div>
        <Link to="/" style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff', borderRadius:'10px', textDecoration:'none', fontSize:'13px', fontWeight:'700' }}>← Back to App</Link>
      </nav>

      <div style={{ background:'linear-gradient(155deg,#0e0618,#08100f)', padding:'52px 48px 40px', textAlign:'center' }}>
        <div style={{ fontSize:'11px', fontWeight:'700', color:'rgba(249,115,22,0.7)', letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'12px' }}>🔒 Legal</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'42px', color:'#fff', margin:'0 0 12px', letterSpacing:'-1px' }}>Privacy Policy</h1>
        <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', margin:'0 0 16px' }}>Last updated: March 17, 2026 · GDPR & CCPA Compliant</p>
        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          {['🇪🇺 GDPR Compliant', '🇺🇸 CCPA Compliant', '🔒 256-bit SSL', '✅ No Data Selling'].map((b, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'5px 14px', fontSize:'12px', color:'rgba(255,255,255,0.5)' }}>{b}</div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'40px 48px 80px', display:'grid', gridTemplateColumns:'240px 1fr', gap:'40px', alignItems:'start' }}>
        <div style={{ position:'sticky', top:'88px', background:'#fff', borderRadius:'16px', padding:'16px', border:'1px solid #e8e2d9' }}>
          <div style={{ fontSize:'11px', fontWeight:'700', color:'#9c8b78', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'12px', padding:'0 8px' }}>Contents</div>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setActiveSection(s.id)}
              style={{ display:'block', padding:'8px 10px', borderRadius:'9px', fontSize:'12px', fontWeight: activeSection===s.id ? '700' : '500', color: activeSection===s.id ? '#f97316' : '#6b5744', textDecoration:'none', background: activeSection===s.id ? '#fff7ed' : 'transparent', marginBottom:'2px', borderLeft: activeSection===s.id ? '3px solid #f97316' : '3px solid transparent' }}>
              {s.title}
            </a>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
          {SECTIONS.map(s => (
            <div key={s.id} id={s.id} style={{ background:'#fff', borderRadius:'16px', padding:'28px 32px', border:'1px solid #e8e2d9', scrollMarginTop:'90px' }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'20px', color:'#1a1207', margin:'0 0 16px', paddingBottom:'12px', borderBottom:'1px solid #f0ebe4' }}>{s.title}</h2>
              {s.content.split('\n\n').map((para, i) => (
                <p key={i} style={{ fontSize:'14px', color:'#4a3728', lineHeight:'1.85', margin:'0 0 12px' }}>{para}</p>
              ))}
            </div>
          ))}
          <div style={{ background:'linear-gradient(135deg,#fff7ed,#fef3e2)', borderRadius:'16px', padding:'24px', border:'1px solid rgba(249,115,22,0.2)' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#c2410c', marginBottom:'14px' }}>📋 Related Documents</div>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[['/terms','📄 Terms of Service'],['/cookies','🍪 Cookie Policy'],['/refund-policy','💰 Refund Policy'],['/contact','💬 Data Request']].map(([to,l]) => (
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
