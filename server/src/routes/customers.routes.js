const express = require('express');
const Customer = require('../models/Customer');
const auth = require('../middlewares/auth');

const router = express.Router();

function isValidConsumerNo(consumerNo) {
  return /^[A-Za-z0-9-]{4,20}$/.test(String(consumerNo || '').trim());
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 0 || (digits.length >= 10 && digits.length <= 12);
}

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.search || '').trim();
    const query = q
      ? {
          $or: [
            { consumerNo: { $regex: q, $options: 'i' } },
            { fullName: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const customers = await Customer.find(query).sort({ fullName: 1 }).lean();
    return res.json(customers);
  } catch (err) {
    return res.status(500).json({ message: 'Load customers failed', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { consumerNo, fullName, addressLine = '', phone = '' } = req.body;

    if (!consumerNo || !fullName) {
      return res.status(400).json({ message: 'Consumer No and Name are required' });
    }
    if (!isValidConsumerNo(consumerNo)) {
      return res.status(400).json({ message: 'Consumer No must be 4-20 chars (letters, numbers, -)' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Phone must have 10 to 12 digits' });
    }

    const exists = await Customer.findOne({ consumerNo: consumerNo.trim() }).lean();
    if (exists) {
      return res.status(409).json({ message: 'Consumer No already exists' });
    }

    const customer = await Customer.create({
      consumerNo: consumerNo.trim(),
      fullName: fullName.trim(),
      addressLine: String(addressLine).trim(),
      phone: String(phone).trim(),
      connectionDate: new Date(),
      activeFlag: true,
    });

    return res.status(201).json(customer);
  } catch (err) {
    return res.status(500).json({ message: 'Add customer failed', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { consumerNo, fullName, addressLine = '', phone = '' } = req.body;

    if (!consumerNo || !fullName) {
      return res.status(400).json({ message: 'Consumer No and Name are required' });
    }
    if (!isValidConsumerNo(consumerNo)) {
      return res.status(400).json({ message: 'Consumer No must be 4-20 chars (letters, numbers, -)' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: 'Phone must have 10 to 12 digits' });
    }

    const duplicate = await Customer.findOne({
      consumerNo: consumerNo.trim(),
      _id: { $ne: id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ message: 'Consumer No already exists for another customer' });
    }

    const updated = await Customer.findByIdAndUpdate(
      id,
      {
        consumerNo: consumerNo.trim(),
        fullName: fullName.trim(),
        addressLine: String(addressLine).trim(),
        phone: String(phone).trim(),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Update customer failed', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    return res.json({ message: 'Customer deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete customer failed', error: err.message });
  }
});

module.exports = router;
