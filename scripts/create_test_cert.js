const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

function generateCertificateNumber() {
  return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the first 100% enrollment
    const enrollment = await Enrollment.findOne({ progress: 100 }).populate('user').populate('course');
    if (!enrollment) {
      console.log('No 100% enrollments found');
      process.exit(1);
    }

    console.log('Found enrollment:', {
      enrollmentId: enrollment._id.toString(),
      user: enrollment.user?.email,
      course: enrollment.course?.title,
      progress: enrollment.progress
    });

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      user: enrollment.user._id,
      enrollment: enrollment._id
    });

    if (existing) {
      console.log('Certificate already exists:', existing._id.toString());
      process.exit(0);
    }

    // Create certificate
    const cert = await Certificate.create({
      user: enrollment.user._id,
      course: enrollment.course._id,
      enrollment: enrollment._id,
      certificateNumber: generateCertificateNumber(),
      courseName: enrollment.course.title,
      userName: enrollment.user.name,
      completionDate: new Date(),
      issuedAt: new Date(),
      status: 'issued'
    });

    console.log('✅ Certificate created successfully:', {
      certId: cert._id.toString(),
      certNumber: cert.certificateNumber,
      user: cert.userName,
      course: cert.courseName
    });

    // Verify it was saved
    const verify = await Certificate.findById(cert._id);
    console.log('✅ Certificate verified in database:', verify ? 'YES' : 'NO');

    await mongoose.disconnect();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

run();