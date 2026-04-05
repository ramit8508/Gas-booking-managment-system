const app = require('./app');
const { port, mongoUri } = require('./config/env');
const connectDB = require('./config/db');
const seedDefaultAdmin = require('./seedAdmin');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

async function connectWithFallback() {
  try {
    await connectDB(mongoUri);
    return;
  } catch (err) {
    console.warn(`Primary MongoDB unavailable (${err.message}). Falling back to in-memory MongoDB for local development.`);
  }

  memoryServer = await MongoMemoryServer.create();
  const fallbackUri = memoryServer.getUri('gas_agency_local');
  await connectDB(fallbackUri);
  console.log('In-memory MongoDB fallback connected');
}

async function start() {
  try {
    await connectWithFallback();
    await seedDefaultAdmin();
    app.listen(port, () => {
      console.log(`API running on port ${port}`);
    });
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  if (memoryServer) {
    await memoryServer.stop();
  }
  process.exit(0);
});
