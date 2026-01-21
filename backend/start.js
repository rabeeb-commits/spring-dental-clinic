const { execSync } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🚀 Starting Dental Clinic Backend...');

// Run database migrations before starting server
if (process.env.DATABASE_URL) {
  console.log('📦 Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname),
      env: process.env,
    });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }

  // Auto-seed database if AUTO_SEED is enabled
  if (process.env.AUTO_SEED === 'true') {
    console.log('🌱 Auto-seeding database...');
    try {
      // Use Prisma's built-in seed command
      execSync('npx prisma db seed', {
        stdio: 'inherit',
        cwd: path.join(__dirname),
        env: process.env,
      });
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('⚠️  Auto-seed failed (non-critical):', error.message);
      console.log('💡 You can manually seed using: npm run seed');
    }
  }
} else {
  console.warn('⚠️  DATABASE_URL not found, skipping migrations');
}

// Start the server
console.log('🌐 Starting server...');
require('./dist/server.js');
