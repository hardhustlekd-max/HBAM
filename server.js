// Alternative entry point for GoDaddy cPanel "Setup Node.js App" / Phusion Passenger
// Automatically handles auto-building if dist/ is missing and loads dist/server.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bundlePath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(bundlePath)) {
  console.log('[GoDaddy App Launcher] dist/server.cjs not found. Triggering production build...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('[GoDaddy App Launcher Error] Production build failed:', err ? err.message : err);
  }
}

require('./dist/server.cjs');
