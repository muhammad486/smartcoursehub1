const mongoose = require('mongoose');

// Define Enrollment schema to check progress
const enrollmentSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  course: mongoose.Schema.Types.ObjectId,
  notesCompleted: Boolean,
  pdfCompleted: Boolean,
  playlistCompleted: Boolean,
  guidanceCompleted: Boolean,
  fullName: String
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

const userSchema = new mongoose.Schema({
  email: String,
  name: String
});

const User = mongoose.model('User', userSchema);

async function testCertificateFlow() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');
    console.log('\n✓ Connected to MongoDB\n');

    // Find test student
    const testUser = await User.findOne({ email: 'teststudent@example.com' });
    if (!testUser) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    console.log(`Found test user: ${testUser.name} (${testUser.email})`);
    console.log(`User ID: ${testUser._id}\n`);

    // Find enrollments for this user
    const enrollments = await Enrollment.find({ user: testUser._id }).populate('course');
    console.log(`✓ Found ${enrollments.length} enrollments\n`);

    enrollments.forEach((enrollment, idx) => {
      const progress = [
        enrollment.notesCompleted ? 25 : 0,
        enrollment.pdfCompleted ? 25 : 0,
        enrollment.playlistCompleted ? 25 : 0,
        enrollment.guidanceCompleted ? 25 : 0
      ].reduce((a, b) => a + b, 0);

      console.log(`${idx + 1}. Course: ${enrollment.course?.title || 'Unknown'}`);
      console.log(`   Enrollment ID: ${enrollment._id}`);
      console.log(`   Progress: ${progress}%`);
      console.log(`   - Notes: ${enrollment.notesCompleted ? '✓' : '✗'}`);
      console.log(`   - PDF: ${enrollment.pdfCompleted ? '✓' : '✗'}`);
      console.log(`   - Playlist: ${enrollment.playlistCompleted ? '✓' : '✗'}`);
      console.log(`   - Guidance: ${enrollment.guidanceCompleted ? '✓' : '✗'}\n`);
    });

    // Find certificates for this user
    const certificateCollection = mongoose.connection.collection('certificates');
    const certs = await certificateCollection.find({ user: testUser._id }).toArray();
    console.log(`✓ Found ${certs.length} certificates for this user\n`);

    certs.forEach((cert, idx) => {
      console.log(`${idx + 1}. Certificate #: ${cert.certificateNumber}`);
      console.log(`   Enrollment: ${cert.enrollment}`);
      console.log(`   Created: ${cert.completionDate}`);
      console.log(`   Status: ${cert.status}\n`);
    });

    console.log('\n✓ Test user data verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testCertificateFlow();
