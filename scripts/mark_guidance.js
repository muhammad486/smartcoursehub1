const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('../models/User');
require('../models/Course');
const Enrollment = require('../models/Enrollment');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const id = '6932a07316f00e4390cc99cc'; // enrollment to update
    const en = await Enrollment.findById(id);
    if (!en) {
      console.log('Enrollment not found:', id);
      return process.exit(1);
    }

    en.guidanceCompleted = true;

    // Recalculate progress
    const parts = ['notesCompleted','pdfCompleted','playlistCompleted','guidanceCompleted'];
    const completed = parts.reduce((acc, k) => acc + (en[k] ? 1 : 0), 0);
    en.progress = Math.round((completed / parts.length) * 100);

    await en.save();
    console.log('Updated enrollment:', en._id.toString(), 'progress=', en.progress);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();