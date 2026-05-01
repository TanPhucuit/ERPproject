#!/usr/bin/env node

/**
 * JWT Secret Generator
 * Generate a secure JWT secret for production use
 */

const crypto = require('crypto');

function generateJWTSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

function generateHashPassword(password) {
  // Note: In production, use bcrypt or similar
  // This is just for demo purposes
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('🔐 NovaTech ERP - Secret Generator\n');

// Generate JWT Secret
const jwtSecret = generateJWTSecret(32);
console.log('Generated JWT_SECRET (32 bytes):');
console.log(jwtSecret);
console.log('\n');

// Generate alternate length JWT Secret
const jwtSecret64 = generateJWTSecret(64);
console.log('Generated JWT_SECRET (64 bytes - more secure):');
console.log(jwtSecret64);
console.log('\n');

console.log('📝 Usage Instructions:');
console.log('');
console.log('1. Copy one of the secrets above');
console.log('2. Add to backend/.env.local:');
console.log('   JWT_SECRET=<paste-secret-here>');
console.log('');
console.log('3. Add to Render/Railway environment variables:');
console.log('   JWT_SECRET=<same-secret>');
console.log('');
console.log('⚠️  Keep this secret safe!');
console.log('    Do not commit to GitHub');
console.log('    Do not share with anyone');
