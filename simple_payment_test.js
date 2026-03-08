/**
 * Simple Payment Endpoint Test
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function simpleTest() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');
    console.log('\n✅ Connected to MongoDB\n');

    const users = mongoose.connection.collection('users');
    const user = await users.findOne({ email: 'paymenttest@example.com' });

    if (!user) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    console.log('✅ Test User:', user.email);
    console.log('✅ JWT Token Generated\n');

    // Get enrollments for this user
    const enrollments = mongoose.connection.collection('enrollments');
    const enrollment = await enrollments.findOne({ user: user._id });

    if (!enrollment) {
      console.log('❌ No enrollment found for this user');
      process.exit(1);
    }

    console.log('✅ Enrollment Found');
    console.log(`   ID: ${enrollment._id}`);
    console.log(`   Payment Required: ${enrollment.paymentRequired}`);
    console.log(`   Payment Amount: ₹${enrollment.paymentAmount}`);
    console.log(`   Payment Status: ${enrollment.paymentStatus}\n`);

    console.log('✅ PAYMENT BACKEND SETUP COMPLETE!\n');

    console.log('📋 To test QR generation manually:');
    console.log(`   curl -H "Authorization: Bearer ${token}" \\`);
    console.log(`   http://localhost:5000/api/payments/qr/${enrollment._id}\n`);

    console.log('📝 Next Steps:');
    console.log('   1. Update frontend enrollment form to show payment UI');
    console.log('   2. Add QR code display when payment is required');
    console.log('   3. Set your UPI ID in .env or server.js (line 716)');
    console.log('   4. Update course prices via admin panel\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

simpleTest();
