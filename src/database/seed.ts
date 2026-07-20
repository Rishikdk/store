import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB, User } from './index.js';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'customer';
}

const seedUsers: SeedUser[] = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'John Customer',
    email: 'john@example.com',
    password: 'Customer@123',
    role: 'customer',
  },
];

async function seed() {
  const isReset = process.argv.includes('--reset');

  console.log('Seeding database...\n');

  await connectDB();

  if (isReset) {
    await User.deleteMany({ email: { $in: seedUsers.map((u) => u.email) } });
    console.log('  Dropped existing seed users\n');
  }

  let created = 0;
  let skipped = 0;

  for (const userData of seedUsers) {
    const exists = await User.findOne({ email: userData.email });

    if (exists) {
      console.log(`  Skipped: ${userData.email} (already exists)`);
      skipped++;
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    await User.create({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
    });

    console.log(`  Created: ${userData.email} (${userData.role})`);
    created++;
  }

  console.log(`\nDone! Created ${created}, skipped ${skipped}.\n`);

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
