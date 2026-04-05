const express = require('express');
const auth = require('../middlewares/auth');
const Booking = require('../models/Booking');

const router = express.Router();

router.use(auth);

router.get('/delivery-register', async (req, res) => {
  try {
    const fromDate = new Date(req.query.fromDate);
    const toDate = new Date(req.query.toDate);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ message: 'Invalid fromDate or toDate' });
    }

    if (fromDate > toDate) {
      return res.status(400).json({ message: 'From date cannot be greater than to date' });
    }

    const rows = await Booking.find({
      bookingStatus: 'Delivered',
      deliveryDate: { $gte: fromDate, $lte: toDate },
    })
      .populate('customerId', 'fullName phone')
      .sort({ deliveryDate: 1 })
      .lean();

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'Load register failed', error: err.message });
  }
});

router.get('/monthly-summary', async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Month must be 1-12' });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ message: 'Year must be 2000-2100' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const [totalBookings, pendingBookings, deliveredBookings, revenueAgg] = await Promise.all([
      Booking.countDocuments({ bookingDate: { $gte: startDate, $lte: endDate } }),
      Booking.countDocuments({ bookingDate: { $gte: startDate, $lte: endDate }, bookingStatus: 'Booked' }),
      Booking.countDocuments({ bookingDate: { $gte: startDate, $lte: endDate }, bookingStatus: 'Delivered' }),
      Booking.aggregate([
        {
          $match: {
            bookingStatus: 'Delivered',
            deliveryDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$billAmount' } } },
      ]),
    ]);

    const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    return res.json({ totalBookings, pendingBookings, deliveredBookings, revenue });
  } catch (err) {
    return res.status(500).json({ message: 'Load summary failed', error: err.message });
  }
});

module.exports = router;
