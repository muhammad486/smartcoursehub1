const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const jwt = require('jsonwebtoken');

async function createTestUserWithCertificate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create a new test user
    const newUser = await User.create({
      name: 'Test Student',
      email: 'teststudent@example.com',
      password: 'password123',
      role: 'user'
    });
    console.log('\n✅ New user created:', newUser.email);

    // Get any course
    const course = await Course.findOne();
    if (!course) {
      console.log('❌ No courses found in database');
      process.exit(1);
    }
    console.log('✅ Found course:', course.title);

    // Create enrollment with 100% progress
    const enrollment = await Enrollment.create({
      user: newUser._id,
      course: course._id,
      fullName: 'Test Student',
      phone: '1234567890',
      college: 'Test College',
      semester: '1st',
      notesCompleted: true,
      pdfCompleted: true,
      playlistCompleted: true,
      guidanceCompleted: true,
      progress: 100
    });
    console.log('✅ Enrollment created at 100% progress');

    // Create certificate
    const generateCertificateNumber = () => {
      return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    };

    const certificate = await Certificate.create({
      user: newUser._id,
      course: course._id,
      enrollment: enrollment._id,
      certificateNumber: generateCertificateNumber(),
      courseName: course.title,
      userName: 'Test Student',
      completionDate: new Date()
    });
    console.log('✅ Certificate created:', certificate._id);

    // Generate JWT token
    const token = jwt.sign({ 
      id: newUser._id, 
      email: newUser.email, 
      name: newUser.name 
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('\n📝 Login Details:');
    console.log('Email:', newUser.email);
    console.log('Password: password123');
    console.log('Token:', token.substring(0, 50) + '...');

    console.log('\n✅ Test data created successfully!');
    console.log('You can now login with this new user and download the certificate from the Certificates page.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTestUserWithCertificate();
