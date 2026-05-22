# ThriftGennie 🛍️

> *"This isn't thrift. It's a fashion archive."*

A peer-to-peer secondhand fashion marketplace built for India — where pre-loved 
pieces find new homes. Think Depop/Vinted, but designed around how Indians actually 
buy and sell: mood-based discovery, UPI-native payments, and AI-assisted listing creation.

🔗 **Live at [thriftgennie.com](https://thriftgennie.com)**

---

## 📸 Screenshots

| Homepage | Archive / Browse |
|----------|-----------------|
| ![Homepage](./screenshots/home.png) | ![Browse](./screenshots/browse.png) |

| Seller Profile | Submit a Piece |
|---------------|-------|
| ![Profile](./screenshots/profile.png) | ![Submit](./screenshots/submit.png) |

---

## ✨ Features

**For Buyers**
- 🎭 Mood-based discovery — shop by Y2K, Old Money, Indie, Bollywood Glam, 90s
- 🔍 Filter by price, size, category, condition, city
- 💬 Direct messaging + offer/negotiation system
- ❤️ Wishlist with live activity notifications
- 🛒 Checkout with Razorpay (UPI, cards, netbanking)

**For Sellers**
- 🤖 AI-powered listing descriptions via Gemini
- 📱 SMS OTP onboarding (MSG91)
- 📊 Seller dashboard with live activity feed (sales, offers, wishlists, likes)
- 💸 Payout management system
- 📦 Order tracking and shipping address management

**Platform**
- 🔴 Real-time notifications (Upstash Redis)
- 🛡️ Admin panel: manage buyers, sellers, listings, payouts, support
- 📧 Transactional emails (Resend)
- 🔗 Razorpay webhook verification for payment security

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + SMS OTP via MSG91 |
| Payments | Razorpay (live) |
| AI | Google Gemini API |
| Cache / Queues | Upstash Redis |
| Email | Resend |
| Deployment | Vercel |

---

## 📁 Project Structure

```
app/
├── admin/          # Admin panel (buyers, sellers, listings, payouts)
├── api/            # API routes (auth, orders, offers, payments, AI)
├── buy/            # Browse & product pages
├── checkout/       # Checkout flow
├── messages/       # Buyer-seller messaging
├── orders/         # Order management
├── sell/           # Listing creation with AI descriptions
├── seller/         # Seller profiles
├── account/        # User dashboard + activity feed
└── wishlist/       # Saved items

components/         # Shared UI components
lib/                # Supabase clients, middleware
```

---

## 🚀 Running Locally

```bash
# Clone the repo
git clone https://github.com/kanak3024/thrift-gennie-web.git
cd thrift-gennie-web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, Razorpay, MSG91, Resend, Gemini keys

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ⚡ Live Stats (May 2026)
- 👗 65+ listings live
- 👤 20 registered sellers
- 🏙️ 6 cities represented
- 💳 Live payments processing via Razorpay

---

## 👤 Built By

**Kanak** — [@kanak3024](https://github.com/kanak3024)  
🌐 [thriftgennie.com](https://thriftgennie.com)
