#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Setting up Microstore Microservices...\n');

// Install dependencies for all services
const services = ['gateway', 'user-service', 'product-service', 'order-service'];

console.log('📦 Installing dependencies...');
services.forEach(service => {
  console.log(`Installing dependencies for ${service}...`);
  try {
    execSync('npm install', { cwd: service, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to install dependencies for ${service}`);
  }
});

console.log('\n📝 Creating environment files...');
services.forEach(service => {
  const envExamplePath = join(service, 'env.example');
  const envPath = join(service, '.env');
  
  if (existsSync(envExamplePath) && !existsSync(envPath)) {
    copyFileSync(envExamplePath, envPath);
    console.log(`Created .env file for ${service}`);
  }
});

console.log('\n✅ Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Install PostgreSQL if not already installed');
console.log('2. Create the required databases:');
console.log('   - microstore_users');
console.log('   - microstore_products');
console.log('   - microstore_orders');
console.log('3. Update the .env files with your database credentials');
console.log('4. Start the services using npm run dev in each directory');
console.log('\n📖 See README.md for detailed instructions');
