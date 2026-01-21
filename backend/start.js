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
} else {
  console.warn('⚠️  DATABASE_URL not found, skipping migrations');
}

// Start the server
console.log('🌐 Starting server...');
require('./dist/server.js');
