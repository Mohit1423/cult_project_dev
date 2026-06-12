# 🚗 Cult Ride - IIT Roorkee Campus Ride-Sharing

## Overview
Cult Ride is a full-stack, real-time ride-sharing application designed exclusively for the IIT Roorkee campus. It connects passengers (students, faculty, staff) with campus drivers instantly, providing live location tracking, fare estimation, and seamless ride management.

## 🚀 Live Deployment
> **Deployed Link:** [Insert your deployed link here]

## ✨ Key Features
### For Passengers
- **Campus-Specific Locations:** Pre-configured with over 80+ prominent IIT Roorkee locations (Bhawan, Departments, Labs, Gates).
- **Real-Time Booking:** Request a ride instantly or schedule one for later.
- **Live Tracking:** Watch your driver approach on an interactive map.
- **Fare Estimation:** Get upfront fare calculations based on campus distances.
- **Ride History & Feedback:** View past trips and rate drivers.

### For Drivers
- **Interactive Dashboard:** Toggle online/offline status to start receiving pings.
- **Real-Time Radar:** Instantly see new ride requests with pickup/dropoff points and fare.
- **Live Navigation:** Built-in routing and live GPS updates.
- **Earnings & Analytics:** Track total rides, lifetime earnings, and average rating.

## 🛠️ Technology Stack
**Frontend**
- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS v4, Framer Motion
- **State Management:** Zustand
- **Maps:** Leaflet, React-Leaflet, Leaflet Routing Machine
- **Real-Time:** Socket.io-client

**Backend**
- **Framework:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Real-Time:** Socket.io
- **Authentication:** JSON Web Tokens (JWT), bcryptjs

## 📦 Local Installation & Setup

### Prerequisites
- Node.js (v20+)
- MongoDB connection string (Atlas or Local)

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   PORT=5001
   JWT_SECRET="your_secret_key"
   FRONTEND_URL="http://localhost:3000"
   MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/your_database"
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure
- `/frontend` - Next.js client application containing UI pages, mapping components, and Zustand store logic.
- `/backend` - Node.js + Express server handling authentication, MongoDB data models, and Socket.io dispatch logic.
