const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gas_agency',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
};
