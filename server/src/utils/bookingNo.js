const Booking = require('../models/Booking');

async function generateBookingNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `BK${yy}${mm}${dd}-`;

  const latest = await Booking.findOne({ bookingNo: { $regex: `^${prefix}` } })
    .sort({ bookingNo: -1 })
    .lean();

  let nextSeq = 1;
  if (latest?.bookingNo) {
    const num = Number(latest.bookingNo.slice(-4));
    if (!Number.isNaN(num)) {
      nextSeq = num + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function generateBillNo(bookingNo) {
  return `INV-${bookingNo}`;
}

module.exports = {
  generateBookingNo,
  generateBillNo,
};
