const express = require('express');
const auth = require('../middlewares/auth');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const { generateBookingNo, generateBillNo } = require('../utils/bookingNo');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();

    const match = {};
    if (search) {
      const customers = await Customer.find({ fullName: { $regex: search, $options: 'i' } })
        .select('_id')
        .lean();
      const customerIds = customers.map((c) => c._id);
      match.$or = [
        { bookingNo: { $regex: search, $options: 'i' } },
        { customerId: { $in: customerIds } },
      ];
    }

    const bookings = await Booking.find(match)
      .populate('customerId', 'fullName consumerNo phone')
      .sort({ bookingDate: -1 })
      .lean();

    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Load bookings failed', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, cylinderType, quantity, billAmount } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const qty = Number(quantity);
    const amount = Number(billAmount);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'Bill amount must be 0 or more' });
    }
    if (!['Domestic', 'Commercial'].includes(cylinderType)) {
      return res.status(400).json({ message: 'Cylinder type must be Domestic or Commercial' });
    }

    const bookingNo = await generateBookingNo();
    const billNo = generateBillNo(bookingNo);

    const booking = await Booking.create({
      bookingNo,
      billNo,
      customerId,
      bookingDate: new Date(),
      cylinderType,
      quantity: qty,
      bookingStatus: 'Booked',
      deliveryDate: null,
      billAmount: amount,
    });

    const populated = await Booking.findById(booking._id).populate('customerId', 'fullName consumerNo phone').lean();

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Create booking failed', error: err.message });
  }
});

router.patch('/:id/deliver', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus: 'Delivered', deliveryDate: new Date() },
      { new: true }
    )
      .populate('customerId', 'fullName consumerNo phone')
      .lean();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Delivery update failed', error: err.message });
  }
});

router.get('/:id/invoice', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'fullName consumerNo phone addressLine')
      .lean();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Invoice fetch failed', error: err.message });
  }
});

module.exports = router;
