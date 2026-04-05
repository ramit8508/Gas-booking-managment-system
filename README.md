# Gas Booking System (React + Node.js + MongoDB)

This is a web version of your VB6 Gas Agency system with matching modules:
- Login
- Customer Module (add/update/delete/search)
- Booking Module (create booking, mark delivered, receipt print)
- Billing Report (invoice preview + print)
- Delivery Register (date-wise + print)
- Monthly Summary (KPIs + print)

## Project Structure

- client: React (Vite) frontend (Vercel-ready)
- server: Node.js + Express + MongoDB API (Render-ready)

## 1) Local Run

### Backend
1. Go to server folder.
2. Copy .env.example to .env.
3. Set MONGODB_URI and JWT_SECRET.
4. Install dependencies: npm install.
5. Run: npm run dev.

Default API URL: http://localhost:5000/api

### Frontend
1. Go to client folder.
2. Copy .env.example to .env and set VITE_API_BASE_URL.
3. Install dependencies: npm install.
4. Run: npm run dev.

Default login (auto-seeded on backend startup):
- Username: admin
- Password: admin123

## 2) Deploy Backend on Render

1. Create new Web Service in Render from this repository.
2. Set Root Directory to `server`.
2. Set environment variables:
   - PORT=10000
   - MONGODB_URI=<your mongodb connection string>
   - JWT_SECRET=<strong random secret>
   - FRONTEND_ORIGIN=<your vercel app url>
3. Render will run `npm install` and `npm start`.
4. Copy deployed API URL, example: https://gas-booking-api.onrender.com

Health check endpoint:
- /api/health

## 3) Deploy Frontend on Vercel

1. Import client folder/repo into Vercel.
2. Add environment variable in Vercel project:
   - VITE_API_BASE_URL=https://your-render-domain/api
3. Deploy.
4. Use frontend URL in Render FRONTEND_ORIGIN env var.

## 4) Matching with VB6 Logic

- Booking number format: BKyymmdd-####
- Bill number format: INV-<BookingNo>
- Status values: Booked, Delivered
- Monthly summary:
  - Total bookings by bookingDate
  - Pending booked count
  - Delivered count
  - Revenue from delivered bookings by deliveryDate

## 5) Security Notes

- Passwords are hashed using bcrypt.
- JWT-based auth is used for all protected routes.
- CORS is controlled via FRONTEND_ORIGIN.

## 6) Production Suggestions

- Add rate-limiting and helmet middleware.
- Add role-based access if needed.
- Add backup/restore and audit logs.
- Add PDF export for reports.
