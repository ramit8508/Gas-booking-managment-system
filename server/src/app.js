const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { frontendOrigin } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customers.routes');
const bookingRoutes = require('./routes/bookings.routes');
const reportRoutes = require('./routes/reports.routes');

const app = express();

const corsOptions = frontendOrigin === '*'
  ? { origin: '*' }
  : { origin: frontendOrigin.split(',').map((s) => s.trim()), credentials: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'gas-booking-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

module.exports = app;
