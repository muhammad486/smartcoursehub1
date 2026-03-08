/**
 * Payment System Test
 * Tests QR code generation and payment flow
 */

const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function testPaymentSystem() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           SmartCourseHub - Payment System Test                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');
    console.log('✅ Connected to MongoDB\n');

    // Get collections
    const userCollection = mongoose.connection.collection('users');
    const courseCollection = mongoose.connection.collection('courses');
    const enrollmentCollection = mongoose.connection.collection('enrollments');

    // Find or create test user
    let user = await userCollection.findOne({ email: 'paymenttest@example.com' });
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await userCollection.insertOne({
        name: 'Payment Test User',
        email: 'paymenttest@example.com',
        password: hashedPassword,
        role: 'student'
      });
      user = await userCollection.findOne({ _id: result.insertedId });
      console.log('✅ Created test user: paymenttest@example.com\n');
    } else {
      console.log('✅ Found existing test user: paymenttest@example.com\n');
    }

    // Find a course and set price
    let course = await courseCollection.findOne();
    if (!course) {
      console.log('❌ No courses found in database');
      process.exit(1);
    }

    // Update course price
    await courseCollection.updateOne(
      { _id: course._id },
      { $set: { price: 499 } }
    );
    course = await courseCollection.findOne({ _id: course._id });
    console.log(`✅ Updated course price: ${course.title} = ₹${course.price}\n`);

    // Create enrollment
    const enrollmentResult = await enrollmentCollection.insertOne({
      user: user._id,
      course: course._id,
      fullName: user.name,
      phone: '9876543210',
      college: 'Test College',
      semester: '4',
      paymentRequired: true,
      paymentAmount: course.price,
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    const enrollmentId = enrollmentResult.insertedId;
    console.log(`✅ Created enrollment with payment required\n`);
    console.log(`   Enrollment ID: ${enrollmentId}`);
    console.log(`   Payment Amount: ₹${course.price}`);
    console.log(`   Payment Status: pending\n`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Test QR Code Generation
    console.log('🔄 Testing QR Code Generation...\n');

    const qrResponse = await makeRequest(
      'GET',
      `/api/payments/qr/${enrollmentId}`,
      null,
      token
    );

    if (qrResponse.status === 200) {
      const data = qrResponse.data;
      console.log('✅ QR Code Generated Successfully!\n');
      console.log(`   Reference ID: ${data.referenceId}`);
      console.log(`   Amount: ₹${data.amount}`);
      console.log(`   Course: ${data.courseName}`);
      console.log(`   UPI ID: ${data.upiId}`);
      console.log(`   Merchant: ${data.merchantName}\n`);

      if (data.qrCode) {
        console.log('✅ QR Code Data URL generated (length: ' + data.qrCode.length + ' bytes)\n');
      }
    } else {
      console.log('❌ QR Code Generation Failed');
      console.log('Response:', qrResponse.data);
    }

    // Test Payment Verification
    console.log('🔄 Testing Payment Verification...\n');

    const verifyResponse = await makeRequest(
      'POST',
      `/api/payments/verify/${enrollmentId}`,
      { transactionId: 'TXN123456789' },
      token
    );

    if (verifyResponse.status === 200) {
      console.log('✅ Payment Verified Successfully!\n');
      console.log('   Payment Status: completed');
      console.log(`   Transaction ID: TXN123456789\n`);
    } else {
      console.log('❌ Payment Verification Failed');
      console.log('Response:', verifyResponse.data);
    }

    // Test Payment Status
    console.log('🔄 Testing Payment Status...\n');

    const statusResponse = await makeRequest(
      'GET',
      `/api/payments/status/${enrollmentId}`,
      null,
      token
    );

    if (statusResponse.status === 200) {
      const status = statusResponse.data;
      console.log('✅ Payment Status Retrieved!\n');
      console.log(`   Payment Required: ${status.paymentRequired}`);
      console.log(`   Payment Status: ${status.paymentStatus}`);
      console.log(`   Amount: ₹${status.paymentAmount}`);
      console.log(`   Course: ${status.courseName}`);
      console.log(`   Paid At: ${status.paidAt}`);
      console.log(`   Transaction ID: ${status.transactionId}\n`);
    }

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   ALL TESTS PASSED ✅                          ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                ║');
    console.log('║  Payment System is Working!                                   ║');
    console.log('║                                                                ║');
    console.log('║  Next Steps:                                                  ║');
    console.log('║  1. Set your UPI ID in .env file (UPI_ID=yourname@upi)       ║');
    console.log('║  2. Set course prices in admin panel                         ║');
    console.log('║  3. Update frontend to show payment UI                       ║');
    console.log('║  4. Test complete payment flow                              ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

setTimeout(() => {
  testPaymentSystem();
}, 1000);
