const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    consumerNo: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    addressLine: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    connectionDate: { type: Date, default: Date.now },
    activeFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
