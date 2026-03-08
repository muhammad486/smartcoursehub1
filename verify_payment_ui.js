#!/usr/bin/env node
/**
 * Payment UI Frontend Test Verification
 * Checks that the payment UI is properly integrated in the frontend
 */

const fs = require('fs');
const path = require('path');

console.log('\n✅ PAYMENT UI FRONTEND VERIFICATION\n');

const indexPath = path.join(__dirname, 'public', 'index.html');
const content = fs.readFileSync(indexPath, 'utf8');

const checks = [
  {
    name: 'Payment State Variables',
    search: ['paymentQR', 'paymentLoading', 'paymentError', 'showQR', 'transactionId', 'verifyingPayment', 'currentEnrollmentId'],
    found: 0
  },
  {
    name: 'getPaymentQR Function',
    search: ['getPaymentQR', '/api/payments/qr'],
    found: 0
  },
  {
    name: 'verifyPaymentNow Function',
    search: ['verifyPaymentNow', '/api/payments/verify'],
    found: 0
  },
  {
    name: 'Payment UI Section (QR Code Display)',
    search: ['showQR', '💳 Payment Required', 'Google Pay'],
    found: 0
  },
  {
    name: 'Payment Status Badges',
    search: ['Pending Payment', 'Paid'],
    found: 0
  },
  {
    name: 'handleSubmit Payment Detection',
    search: ['paymentRequired', 'paymentStatus'],
    found: 0
  }
];

checks.forEach(check => {
  let count = 0;
  check.search.forEach(term => {
    if (content.includes(term)) count++;
  });
  check.found = count;
  
  const allFound = count === check.search.length;
  const status = allFound ? '✅' : '⚠️ ';
  console.log(`${status} ${check.name}: ${count}/${check.search.length} components found`);
});

const allChecked = checks.every(c => c.found === c.search.length);
console.log(`\n${allChecked ? '✅ All payment UI components are integrated!' : '⚠️  Some components may be missing'}\n`);

// Additional validation
const paymentUIMatches = content.match(/showQR && paymentQR/g);
console.log(`\n📊 Additional Details:`);
console.log(`  • Conditional payment UI renders: ${paymentUIMatches ? paymentUIMatches.length : 0}`);
console.log(`  • Frontend ready for payment flow: ${allChecked ? 'YES' : 'CHECK NEEDED'}\n`);

console.log('📱 NEXT STEPS:\n');
console.log('1. Go to http://localhost:5000');
console.log('2. Login or register');
console.log('3. Browse to a paid course (e.g., one with price > 0)');
console.log('4. Try to enroll - you should see the payment QR code UI');
console.log('5. Scan QR code with Google Pay to complete payment\n');

process.exit(allChecked ? 0 : 1);
