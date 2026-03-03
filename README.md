# JONGTAO (จองโต๊ะ) - Table Reservation System

JONGTAO is a modern, real-time table reservation system designed for restaurants and venues. It features a sleek glassmorphism UI with neon accents, full Thai language support, and a real-time administrative dashboard.

![Real-time Dashboard](https://raw.githubusercontent.com/ChunWarayut/JONGTAO/main/src/assets/dashboard_preview.png) *(Placeholder if you add images to repo)*

## ✨ Key Features

### 🌟 Customer Experience
- **Interactive Zone Map**: A visual map for selecting tables. Other zones are visible in gray for spatial awareness.
- **Real-time Availability**: Tables update instantly using Server-Sent Events (SSE). If another customer books a table, it turns gray immediately on your screen.
- **Fluid Booking Flow**: Step-by-step process (Zone -> Guests -> Extra Tables -> Customer Info -> Payment).
- **QR Code Confirmation**: Instant booking confirmation with a unique QR code for check-in.
- **Stripe PromptPay**: Secure deposit payments via Thai QR PromptPay powered by Stripe.
- **Thai Language UI**: Fully localized interface for better accessibility.

### 🛠️ Administrative Power
- **Premium Activity Feed**: Real-time "Recent Activity" timeline with glowing "LIVE" markers for new bookings.
- **Dashboard Overview**: Instant stats on today's bookings, revenue, and confirmation status.
- **Advanced Table Management**: Add/Delete tables and manage zones with ease.
- **Dynamic Policy Control**: Toggle booking availability, set opening hours, and manage booking fees on the fly.
- **Detailed Booking Search**: Search and view comprehensive details for every booking.

## 🚀 Technology Stack

- **Frontend**: [Vite](https://vitejs.dev/) + Vanilla JavaScript + Modern CSS (Glassmorphism & Neon Aesthetics).
- **Backend**: [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/).
- **Database**: [SQLite](https://sqlite.org/) managed via [Prisma ORM](https://www.prisma.io/).
- **Real-time communication**: [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).
- **Payments**: [Stripe](https://stripe.com/) (PromptPay QR via PaymentIntents).
- **Testing**: [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest).

## 📥 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ChunWarayut/JONGTAO.git
   cd JONGTAO
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   ```bash
   # Initialize SQLite database and run migrations
   npm run prisma:migrate
   
   # Optional: Seed the database with sample data
   node server/prisma/seed.js
   ```

4. **Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env.example` if exists):
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your_secret_key"
   PORT=3001
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

5. **Stripe Webhook (Local Testing)**:
   ```bash
   # Install Stripe CLI: https://stripe.com/docs/stripe-cli
   stripe listen --forward-to http://localhost:3001/api/payments/webhook
   ```

## 🛠️ Available Scripts

- `npm run dev`: Start the Vite development server (Frontend).
- `npm run server`: Start the Express server with Nodemon (Backend).
- `npm run prisma:migrate`: Apply database migrations.
- `npm run prisma:studio`: Open Prisma Studio to manage data visually.
- `npm test`: Run the test suite.
- `npm run coverage`: Generate test coverage reports.

## 📁 Project Structure

```text
jongtao/
├── server/               # Express Backend
│   ├── controllers/      # API Logic
│   ├── prisma/           # Database Schema & Migrations
│   ├── routes/           # API Endpoints
│   └── index.js          # Server Entry point
├── src/                  # Frontend Logic
│   ├── admin/            # Admin Dashboard Modules
│   ├── components/       # Reusable UI Components
│   ├── styles/           # Global & Admin Styles
│   └── main.js           # Client Entry point
├── admin.html            # Admin Interface Entry
└── index.html            # Customer Interface Entry
```

## 📸 Design Philosophy
The UI is built with a **Premium Dark Aesthetic**, utilizing:
- **Glassmorphism**: Translucent cards with blurred backgrounds.
- **Neon Accents**: High-contrast purple and green highlights for primary actions.
- **Real-time UX**: Smooth transitions and pulsating animations for live data.

---
Developed with ❤️ by **ChunWarayut**
