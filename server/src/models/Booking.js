const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, required: true, unique: true, trim: true },
    billNo: { type: String, required: true, unique: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    bookingDate: { type: Date, required: true, default: Date.now },
    cylinderType: { type: String, required: true, enum: ['Domestic', 'Commercial'] },
    quantity: { type: Number, required: true, min: 1 },
    bookingStatus: { type: String, required: true, enum: ['Booked', 'Delivered'], default: 'Booked' },
    deliveryDate: { type: Date, default: null },
    billAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

bookingSchema.index({ customerId: 1 });
bookingSchema.index({ bookingDate: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
