import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB, User, Product } from './index.js';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'customer';
}

interface SeedProduct {
  name: string;
  price: number;
  stock: number;
  category: string;
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

const seedProducts: SeedProduct[] = [
  { name: 'Wireless Bluetooth Headphones', price: 79.99, stock: 150, category: 'Electronics' },
  { name: 'USB-C Charging Cable', price: 12.99, stock: 500, category: 'Electronics' },
  { name: 'Mechanical Keyboard RGB', price: 129.99, stock: 75, category: 'Electronics' },
  { name: '27" 4K Monitor', price: 349.99, stock: 30, category: 'Electronics' },
  { name: 'Webcam HD 1080p', price: 49.99, stock: 200, category: 'Electronics' },
  { name: 'Ergonomic Office Chair', price: 249.99, stock: 40, category: 'Furniture' },
  { name: 'Standing Desk Converter', price: 189.99, stock: 60, category: 'Furniture' },
  { name: 'Desk Lamp LED', price: 34.99, stock: 120, category: 'Furniture' },
  { name: 'The Pragmatic Programmer', price: 42.99, stock: 90, category: 'Books' },
  { name: 'Clean Code', price: 38.99, stock: 110, category: 'Books' },
  { name: 'Designing Data-Intensive Applications', price: 45.99, stock: 85, category: 'Books' },
  { name: 'Premium Notebook A5', price: 14.99, stock: 300, category: 'Stationery' },
  { name: 'Gel Pen Set (12 colors)', price: 9.99, stock: 400, category: 'Stationery' },
  { name: 'Stainless Steel Water Bottle', price: 24.99, stock: 250, category: 'Accessories' },
  { name: 'Laptop Backpack', price: 59.99, stock: 180, category: 'Accessories' },
];

async function seed() {
  const isReset = process.argv.includes('--reset');

  console.log('Seeding database...\n');

  await connectDB();

  if (isReset) {
    await User.deleteMany({ email: { $in: seedUsers.map((u) => u.email) } });
    await Product.deleteMany({ name: { $in: seedProducts.map((p) => p.name) } });
    console.log('  Dropped existing seed data\n');
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

  for (const productData of seedProducts) {
    const exists = await Product.findOne({ name: productData.name });

    if (exists) {
      console.log(`  Skipped: ${productData.name} (already exists)`);
      skipped++;
      continue;
    }

    await Product.create(productData);

    console.log(`  Created: ${productData.name} (${productData.category})`);
    created++;
  }

  console.log(`\nDone! Created ${created}, skipped ${skipped}.\n`);

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
