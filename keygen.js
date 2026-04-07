import crypto from 'crypto';

const SALT = 'INNOVATIVE_CENTRE_SECURE_SALT_2024';

const machineId = process.argv[2];

if (!machineId) {
    console.log('\n❌ Usage: node keygen.js <MACHINE_ID>');
    console.log('Example: node keygen.js 9A2B-3C4D-5E6F-7G8H\n');
    process.exit(1);
}

const key = crypto.createHash('sha256')
    .update(machineId + SALT)
    .digest('hex')
    .toUpperCase()
    .substring(0, 16)
    .match(/.{1,4}/g)
    .join('-');

console.log('\n✅ License Key Generated:');
console.log('=================================');
console.log(key);
console.log('=================================\n');
