const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // List all certificates
    const certs = await Certificate.find({}).populate('user', 'name email').populate('course', 'title').populate('enrollment');
    console.log('\n=== ALL CERTIFICATES IN DATABASE ===');
    console.log('Total certificates:', certs.length);
    certs.forEach(c => {
      console.log('---');
      console.log('Certificate ID:', c._id.toString());
      console.log('Certificate Number:', c.certificateNumber);
      console.log('User:', c.user?.name, c.user?.email);
      console.log('Course:', c.course?.title);
      console.log('Enrollment ID:', c.enrollment?._id?.toString());
      console.log('Status:', c.status);
      console.log('Issued At:', c.issuedAt);
    });

    // List enrollments at 100%
    const complete = await Enrollment.find({ progress: 100 }).populate('user', 'name email').populate('course', 'title');
    console.log('\n=== ENROLLMENTS AT 100% ===');
    console.log('Total 100% enrollments:', complete.length);
    complete.forEach(e => {
      console.log('---');
      console.log('Enrollment ID:', e._id.toString());
      console.log('User:', e.user?.name, e.user?.email);
      console.log('Course:', e.course?.title);
      console.log('Progress:', e.progress);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();