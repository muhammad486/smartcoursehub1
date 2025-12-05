const mongoose = require('mongoose');
// Ensure all related models are registered before using populate
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const enrollments = await Enrollment.find({}).limit(20).populate('user', 'name email').populate('course', 'title');
    enrollments.forEach(e => {
      console.log('---');
      console.log('Enrollment ID:', e._id.toString());
      console.log('User:', e.user?.name, e.user?.email);
      console.log('Course:', e.course?.title);
      console.log('Progress:', e.progress);
      console.log('notesCompleted:', e.notesCompleted, 'pdfCompleted:', e.pdfCompleted, 'playlistCompleted:', e.playlistCompleted, 'guidanceCompleted:', e.guidanceCompleted);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();