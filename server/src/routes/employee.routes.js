const express = require('express');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/roleGuard');
const CustomerOrder = require('../models/CustomerOrder');

const router = express.Router();

const DELIVERY_PARTNERS = [
  'Ravi Kumar',
  'Suresh Patel',
  'Nitin Yadav',
  'Anil Sharma',
  'Deepak Singh',
  'Mohit Verma',
];

router.use(auth);
router.use(allowRoles('EMPLOYEE'));

router.get('/delivery-partners', (req, res) => {
  return res.json(DELIVERY_PARTNERS);
});

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

router.patch('/orders/:orderId/assign-partner', async (req, res) => {
  try {
    const { orderId } = req.params;
    let { partnerName } = req.body;

    if (partnerName) {
      partnerName = String(partnerName).trim();
      if (!DELIVERY_PARTNERS.includes(partnerName)) {
        return res.status(400).json({ message: 'Invalid delivery partner' });
      }
    } else {
      const idx = Math.floor(Math.random() * DELIVERY_PARTNERS.length);
      partnerName = DELIVERY_PARTNERS[idx];
    }

    const updated = await CustomerOrder.findByIdAndUpdate(
      orderId,
      {
        $set: {
          deliveryPartnerName: partnerName,
          deliveryAssignedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('userId', 'username fullName phone')
      .lean();

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json({
      message: `Delivery partner assigned: ${partnerName}`,
      order: updated,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Assign delivery partner failed', error: err.message });
  }
});

module.exports = router;
