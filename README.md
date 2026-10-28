# HotelPro — MERN Hotel Booking & Management

A full-stack starter project based on the SkillWallet HotelPro brief.

## Stack
- React + Vite frontend
- Node.js + Express REST API
- MongoDB + Mongoose
- JWT authentication, bcrypt password hashing
- Role-based admin routes

## Requirements
- Node.js 18+
- MongoDB local installation or MongoDB Atlas connection string

## Run locally
Open two terminals.

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```
Update `MONGODB_URI` in `server/.env` before seeding if needed.

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## Demo admin
After running the seed command:
- Email: `admin@hotelpro.local`
- Password: `Admin123!`

Change the demo password before using this beyond local development.

## Main features
- Browse rooms and filter by room type
- Register and log in
- Check room availability for dates
- Create and view bookings; cancel pending bookings
- Admin dashboard with room and booking management
- Seed sample rooms and a demo admin
- Responsive interface

## Notes
- This is a local development project, not a production deployment.
- For production, add email verification, password reset, rate limiting, audit logging, payment-provider integration, secure HTTPS deployment, and stronger operational controls.
