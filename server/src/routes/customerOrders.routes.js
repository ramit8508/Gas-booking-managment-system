const express = require('express');
const auth = require('../middlewares/auth');
const CustomerOrder = require('../models/CustomerOrder');

const router = express.Router();

const PRODUCT_PRICING = {
  Domestic: 1050,
  Commercial: 1850,
};

function generateOrderNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD${yy}${mm}${dd}-${random}`;
}

function generateBillingRefNo() {
  return `BILL-${Date.now()}`;
}

function requireCustomer(req, res, next) {
  if (req.user?.role !== 'CUSTOMER') {
    return res.status(403).json({ message: 'Customer access required' });
  }
  return next();
}

router.use(auth);
router.use(requireCustomer);

router.post('/', async (req, res) => {
  try {
    const {
      companyName = 'Gas Agency Management System',
      cylinderType,
      quantity,
      addressLine,
      city,
      pincode,
      paymentMethod,
    } = req.body;

    if (!PRODUCT_PRICING[cylinderType]) {
      return res.status(400).json({ message: 'Invalid cylinder type' });
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    if (!addressLine || !city || !pincode || !paymentMethod) {
      return res.status(400).json({ message: 'Address and payment details are required' });
    }

    const unitPrice = PRODUCT_PRICING[cylinderType];
    const subtotal = unitPrice * qty;
    const handlingFee = 49;
    const totalAmount = subtotal + handlingFee;

    const placedAt = new Date();
    const estimatedDeliveryAt = new Date(placedAt.getTime() + 2 * 24 * 60 * 60 * 1000);

    const order = await CustomerOrder.create({
      userId: req.user.userId,
      orderNo: generateOrderNo(),
      companyName,
      cylinderType,
      quantity: qty,
      unitPrice,
      subtotal,
      handlingFee,
      totalAmount,
      addressLine: String(addressLine).trim(),
      city: String(city).trim(),
      pincode: String(pincode).trim(),
      paymentMethod,
      billingRefNo: generateBillingRefNo(),
      status: 'Booked',
      placedAt,
      estimatedDeliveryAt,
      deliveredAt: null,
    });

    return res.status(201).json({
      message: 'Order placed successfully. Your order will be delivered in 2 days.',
      order,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Order placement failed', error: err.message });
  }
});

router.get('/mine', async (req, res) => {
  try {
    const now = new Date();

    await CustomerOrder.updateMany(
      {
        userId: req.user.userId,
        status: 'Booked',
        estimatedDeliveryAt: { $lte: now },
      },
      {
        $set: {
          status: 'Delivered',
          deliveredAt: now,
        },
      }
    );

    const orders = await CustomerOrder.find({ userId: req.user.userId })
      .sort({ placedAt: -1 })
      .lean();

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Load orders failed', error: err.message });
  }
});

module.exports = router;
