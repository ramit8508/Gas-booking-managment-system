const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'EMPLOYEE', 'CUSTOMER'], default: 'ADMIN' },
    fullName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    defaultAddress: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
