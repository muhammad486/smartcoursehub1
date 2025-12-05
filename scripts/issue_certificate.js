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

    const enrollmentId = process.argv[2];
    if (!enrollmentId) {
      console.error('Usage: node issue_certificate.js <enrollmentId>');
      process.exit(1);
    }

    const enrollment = await Enrollment.findById(enrollmentId).populate('course').populate('user', 'name');
    if (!enrollment) {
      console.error('Enrollment not found:', enrollmentId);
      process.exit(1);
    }

    if (enrollment.progress !== 100) {
      console.error('Enrollment progress is not 100%:', enrollment.progress);
      process.exit(1);
    }

    const existing = await Certificate.findOne({ user: enrollment.user, enrollment: enrollment._id });
    if (existing) {
      console.log('Certificate already exists:', existing.certificateNumber, existing._id.toString());
      await mongoose.disconnect();
      return;
    }

    const cert = await Certificate.create({
      user: enrollment.user,
      course: enrollment.course._id,
      enrollment: enrollment._id,
      certificateNumber: generateCertificateNumber(),
      courseName: enrollment.course.title,
      userName: enrollment.user?.name || 'Student',
      completionDate: new Date()
    });

    console.log('Certificate issued:', cert.certificateNumber, cert._id.toString());
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();