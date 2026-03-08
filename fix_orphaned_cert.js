const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  course: mongoose.Schema.Types.ObjectId,
  progress: Number,
  fullName: String
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String
});

const courseSchema = new mongoose.Schema({
  title: String
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);

async function createOrphanedCertificate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');

    // Find the orphaned enrollment
    const orphaned = await Enrollment.findOne({ 
      progress: 100,
      course: new mongoose.Types.ObjectId('6929fa5c5b6935c19b398b90')
    }).populate('user').populate('course');

    if (!orphaned) {
      console.log('No orphaned enrollment found');
      process.exit(0);
    }

    console.log(`Found orphaned enrollment for: ${orphaned.fullName}`);

    const certificateNumber = 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const cert = await mongoose.connection.collection('certificates').insertOne({
      user: orphaned.user._id,
      course: orphaned.course._id,
      enrollment: orphaned._id,
      certificateNumber,
      courseName: orphaned.course.title,
      userName: orphaned.fullName,
      completionDate: new Date(),
      status: 'issued'
    });

    console.log(`✅ Certificate created for orphaned enrollment`);
    console.log(`   Certificate #: ${certificateNumber}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createOrphanedCertificate();
