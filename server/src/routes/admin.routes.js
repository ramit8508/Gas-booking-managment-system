const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middlewares/auth');
const allowRoles = require('../middlewares/roleGuard');
const User = require('../models/User');
const CustomerOrder = require('../models/CustomerOrder');

const router = express.Router();

router.use(auth);
router.use(allowRoles('ADMIN'));

router.get('/summary', async (req, res) => {
  try {
    const [orderAgg] = await CustomerOrder.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSoldGas: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
          bookedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Booked'] }, 1, 0],
            },
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const employeeCount = await User.countDocuments({ role: 'EMPLOYEE' });

    return res.json({
      totalOrders: orderAgg?.totalOrders || 0,
      totalSoldGas: orderAgg?.totalSoldGas || 0,
      totalRevenue: orderAgg?.totalRevenue || 0,
      bookedOrders: orderAgg?.bookedOrders || 0,
      deliveredOrders: orderAgg?.deliveredOrders || 0,
      employeeCount,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Load summary failed', error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await CustomerOrder.find({})
      .populate('userId', 'username fullName phone')
      .sort({ placedAt: -1 })
      .lean();

    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ message: 'Load orders failed', error: err.message });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' })
      .select('_id username fullName phone createdAt')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(employees);
  } catch (err) {
    return res.status(500).json({ message: 'Load employees failed', error: err.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { username, password, fullName = '', phone = '' } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'Username, password and full name are required' });
    }

    const cleanedUsername = String(username).trim().toLowerCase();
    if (cleanedUsername.length < 4) {
      return res.status(400).json({ message: 'Username must be at least 4 characters' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ username: cleanedUsername }).lean();
    if (exists) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const employee = await User.create({
      username: cleanedUsername,
      passwordHash,
      role: 'EMPLOYEE',
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      defaultAddress: '',
    });

    return res.status(201).json({
      message: 'Employee created',
      employee: {
        id: employee._id,
        username: employee.username,
        role: employee.role,
        fullName: employee.fullName,
        phone: employee.phone,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Create employee failed', error: err.message });
  }
});

module.exports = router;
