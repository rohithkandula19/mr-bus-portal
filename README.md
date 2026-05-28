> **⚠️ All Rights Reserved.** This repository is published for viewing and portfolio purposes only. The code is **not** open source — reuse, redistribution, modification, or derivative works are not permitted without written permission. See [LICENSE](./LICENSE).
<div align="center">

# 🚌 MR Bus Portal

### AI-Powered Interstate Bus Booking Platform

**Search, book, and track buses across 321 US cities — with loyalty rewards, smart seat recommendations, and real-time tracking**

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Cloud_SQL-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Google Cloud Run](https://img.shields.io/badge/Cloud_Run-Backend-4285F4?style=flat-square&logo=googlecloud)](https://cloud.google.com/run)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)](https://stripe.com)

🌐 **[Live Demo](https://mrbusportal.com)** · 🔧 **[API Docs](https://mrbus-backend-cfn4hzlpra-uc.a.run.app/docs)**

![321 Cities](https://img.shields.io/badge/321-US_Cities-f97316?style=flat-square)
![JWT Auth](https://img.shields.io/badge/JWT-Auth-green?style=flat-square)
![Loyalty Points](https://img.shields.io/badge/Loyalty-3_Tiers-gold?style=flat-square)
![AI Powered](https://img.shields.io/badge/AI-Seat_Recommendations-purple?style=flat-square)

</div>

---

## What is MR Bus Portal?

MR Bus Portal is a **full-stack, production-deployed bus booking platform** that lets users search thousands of routes across the US, book seats with Stripe payments, earn loyalty points on every trip, and track their bus in real time. It includes AI-powered features like seat recommendations, price prediction, a travel AI chat assistant, and a smart packing list generator.

> 🚀 Fully deployed at [mrbusportal.com](https://mrbusportal.com) — React frontend on Firebase Hosting, FastAPI backend on Google Cloud Run, PostgreSQL on Cloud SQL.

---

## ✨ Features

### 🔍 Search & Booking
- Search buses across **321 US cities** with live results
- **One-way, Round Trip, and Multi-City** booking modes
- City autocomplete with smart suggestions
- **Voice search** — say "from Chicago to Atlanta"
- Fare calendar to find the cheapest travel dates
- Passenger count selection (1–6 passengers)

### 💳 Payments
- **Stripe payment integration** with secure payment intent flow
- Booking confirmation with **email receipt**
- Booking **cancellation and reschedule** support
- Multi-passenger fare calculation

### 🏆 Loyalty & Rewards
- **Earn points** on every trip automatically
- **3-tier system**: Silver (100 pts) → Gold (500 pts) → Platinum (1,500 pts)
- Redeem points at checkout for discounts
- **Referral program** — earn bonus points for referring friends
- Points history and balance dashboard

### 🤖 AI Features
- **Smart seat recommendations** based on user preferences (window, aisle, quiet, etc.)
- **AI travel chat assistant** — natural language queries ("cheapest bus today", "show my bookings")
- **Price prediction** — flags when fares are expected to drop
- **Packing list generator** based on destination and trip length
- **Travel Buddy** — destination tips and local weather info

### 📍 Real-Time Bus Tracker
- Live progress bar showing bus location between stops
- Real ETA calculation based on departure/arrival times
- Animated route visualization with SVG path
- Fallback simulation mode when live times unavailable

### 👤 User Features
- JWT authentication (signup / login / Google OAuth)
- User profile with trip history
- **My Bookings** page with cancellation, reschedule, and receipt resend
- Subscription / membership plans
- Customer reviews system
- Group booking coordinator
- Safety check-in feature
- Snack pre-order (coming soon)
- Price alert notifications
- Waitlist for sold-out routes

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18.2, React Router v6, Stripe.js |
| **Backend** | FastAPI (Python), SQLAlchemy ORM |
| **Database** | PostgreSQL on Google Cloud SQL |
| **Auth** | JWT (python-jose), Google OAuth 2.0 |
| **Payments** | Stripe Payment Intents API |
| **Email** | Resend API + SMTP (Gmail) |
| **AI / LLM** | Anthropic Claude API, OpenAI API |
| **Hosting** | Firebase Hosting (frontend) + Google Cloud Run (backend) |
| **CI/CD** | GitHub → Cloud Run auto-deploy |

---

## 📁 Project Structure

```
mr-bus-portal/
├── frontend/                  # React 18 app
│   ├── src/
│   │   ├── pages/             # HomePage, MyBookings, Profile, etc.
│   │   ├── components/        # BusTracker, PaymentModal, SeatMap, etc.
│   │   └── App.js             # Router + Navbar
│   └── public/
├── backend/
│   └── app/
│       ├── routers/           # bookings, buses, payments, loyalty, auth, ...
│       ├── models.py          # SQLAlchemy models
│       ├── schemas.py         # Pydantic schemas
│       ├── main.py            # FastAPI app + DB migrations
│       └── security.py        # JWT helpers
├── dataset/                   # 321-city US bus route dataset
└── docs/                      # Architecture & API docs
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL
- A Stripe account (test mode works fine)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create backend/app/.env (see .env.example)
cp backend/app/.env.example backend/app/.env
# Fill in your keys

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install

# Create frontend/.env
echo "REACT_APP_API_URL=http://localhost:8000" > .env

npm start
```

### Environment Variables

Create `backend/app/.env` with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mrbus
SECRET_KEY=your_secret_key
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_CLIENT_ID=your_google_client_id
```

> ⚠️ Never commit `.env`. It is covered by `.gitignore`.

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Firebase Hosting | [mrbusportal.com](https://mrbusportal.com) |
| Backend | Google Cloud Run | [API](https://mrbus-backend-cfn4hzlpra-uc.a.run.app) |
| Database | Cloud SQL (PostgreSQL) | Private VPC |

---

## 📸 Screenshots

| Homepage | My Bookings | Bus Tracker |
|----------|-------------|-------------|
| Search 321 US city routes with AI voice search | View, cancel, and reschedule bookings | Real-time animated route progress |

---

## 📄 License

This project is a **portfolio demonstration** project. It is not a licensed commercial product.

---

<div align="center">

Built by [Rohith Kandula](https://github.com/rohithkandula19) · Deployed at [mrbusportal.com](https://mrbusportal.com)

</div>