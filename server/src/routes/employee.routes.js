const express = require('express');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/roleGuard');
const CustomerOrder = require('../models/CustomerOrder');

const router = express.Router();

router.use(auth);
router.use(allowRoles('EMPLOYEE'));

router.get('/orders', async (req, res) => {
  try {
    const now = new Date();

    await CustomerOrder.updateMany(
      {
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

    const orders = await CustomerOrder.find({})
      .populate('userId', 'username fullName phone')
      .sort({ placedAt: -1 })
      .lean();

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Load employee orders failed', error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const [agg] = await CustomerOrder.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSoldGas: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    return res.json({
      totalOrders: agg?.totalOrders || 0,
      totalSoldGas: agg?.totalSoldGas || 0,
      totalRevenue: agg?.totalRevenue || 0,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Load employee summary failed', error: err.message });
  }
});

module.exports = router;
