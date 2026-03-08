const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

function generateCertificateNumber() {
  return `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get second enrollment at 100% (skip the first one which already has cert)
    const enrollments = await Enrollment.find({ progress: 100 }).populate('user').populate('course');
    
    if (enrollments.length === 0) {
      console.log('No enrollment at 100%');
      process.exit(0);
    }

    // Get one without a certificate
    let enrollment = null;
    for (const e of enrollments) {
      const existing = await Certificate.findOne({
        user: e.user._id,
        enrollment: e._id
      });
      if (!existing) {
        enrollment = e;
        break;
      }
    }

    if (!enrollment) {
      console.log('All enrollments already have certificates');
      process.exit(0);
    }

    console.log('\n=== CREATING CERTIFICATE ===');
    console.log('Enrollment ID:', enrollment._id.toString());
    console.log('User:', enrollment.user.email);
    console.log('Course:', enrollment.course.title);
    console.log('Progress:', enrollment.progress);

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      user: enrollment.user._id,
      enrollment: enrollment._id
    });

    if (existing) {
      console.log('\n❌ Certificate already exists for this enrollment!');
      console.log('Certificate ID:', existing._id.toString());
      console.log('Certificate Number:', existing.certificateNumber);
      process.exit(0);
    }

    // Create new certificate
    const certNumber = generateCertificateNumber();
    console.log('\nGenerating certificate number:', certNumber);

    const cert = await Certificate.create({
      user: enrollment.user._id,
      course: enrollment.course._id,
      enrollment: enrollment._id,
      certificateNumber: certNumber,
      courseName: enrollment.course.title,
      userName: enrollment.user.name || enrollment.fullName,
      completionDate: new Date()
    });

    console.log('\n✅ CERTIFICATE CREATED SUCCESS');
    console.log('Certificate ID:', cert._id.toString());
    console.log('Certificate Number:', cert.certificateNumber);
    console.log('Status:', cert.status);

    // Verify it exists
    const verify = await Certificate.findById(cert._id);
    console.log('\n✅ VERIFICATION - Certificate found in database');
    console.log('Verified ID:', verify._id.toString());

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
