const { execSync } = require('child_process');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  console.log('🔄 Running Vercel build script...');
  
  try {
    // Run Prisma generate
    console.log('📊 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Run Next.js build
    console.log('🏗️ Building Next.js application...');
    execSync('next build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
} else {
  console.log('⏩ Not in Vercel environment, skipping custom build script');
  // Run the regular build command
  try {
    execSync('next build', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
} 