import dotenv from 'dotenv';
dotenv.config();

import { config } from './config/env.js';
import { connectDB } from './database/index.js';
import { createApp } from './app.js';

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
