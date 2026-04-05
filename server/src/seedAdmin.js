const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seedDefaultAdmin() {
  const existing = await User.findOne({ username: 'admin' }).lean();
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    passwordHash,
    role: 'ADMIN',
  });

  console.log('Default admin created: admin / admin123');
}

module.exports = seedDefaultAdmin;
