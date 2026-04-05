const mongoose = require('mongoose');

const customerOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNo: { type: String, required: true, unique: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    cylinderType: { type: String, enum: ['Domestic', 'Commercial'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    handlingFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    paymentMethod: { type: String, enum: ['UPI', 'Card', 'Cash On Delivery'], required: true },
    billingRefNo: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Booked', 'Delivered'], default: 'Booked', required: true },
    placedAt: { type: Date, default: Date.now, required: true },
    estimatedDeliveryAt: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    deliveryPartnerName: { type: String, default: '', trim: true },
    deliveryAssignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerOrderSchema.index({ placedAt: -1 });

module.exports = mongoose.model('CustomerOrder', customerOrderSchema);
