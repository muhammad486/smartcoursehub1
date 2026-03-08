const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[TEST] Connected to MongoDB');

    // Get the 4th enrollment (the last one we haven't created a cert for yet)
    const enrollments = await Enrollment.find({ progress: 100 }).populate('user').populate('course');
    
    if (enrollments.length === 0) {
      console.log('[TEST] No enrollment at 100%');
      process.exit(0);
    }

    // Find one without a certificate
    const Certificate = require('../models/Certificate');
    let targetEnrollment = null;
    for (const e of enrollments) {
      const existing = await Certificate.findOne({
        user: e.user._id,
        enrollment: e._id
      });
      if (!existing) {
        targetEnrollment = e;
        break;
      }
    }

    if (!targetEnrollment) {
      console.log('[TEST] All enrollments already have certificates - creating for last one anyway');
      targetEnrollment = enrollments[enrollments.length - 1];
    }

    console.log('\n[TEST] Testing with:');
    console.log('  - Enrollment ID:', targetEnrollment._id.toString());
    console.log('  - User Email:', targetEnrollment.user.email);
    console.log('  - Course:', targetEnrollment.course.title);

    // Generate JWT token for this user
    const token = jwt.sign({ 
      id: targetEnrollment.user._id, 
      email: targetEnrollment.user.email, 
      name: targetEnrollment.user.name 
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('[TEST] Generated JWT token for user');

    // Make API call to POST /api/certificates/issue
    console.log('\n[TEST] Calling POST /api/certificates/issue...');
    const response = await fetch('http://127.0.0.1:5000/api/certificates/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ enrollmentId: targetEnrollment._id.toString() })
    });

    console.log('[TEST] API Response Status:', response.status);
    const data = await response.json();

    if (!response.ok) {
      console.log('[TEST] ❌ API Error:', data);
      process.exit(1);
    }

    console.log('[TEST] ✅ Certificate created via API');
    console.log('  - Certificate ID:', data._id);
    console.log('  - Certificate Number:', data.certificateNumber);
    console.log('  - UserName:', data.userName);
    console.log('  - Status:', data.status);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[TEST] ❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
