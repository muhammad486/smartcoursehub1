const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: 'student' }
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  notes: String,
  pdf: String,
  playlist: String,
  guidance: String
});

const enrollmentSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  course: mongoose.Schema.Types.ObjectId,
  notesCompleted: { type: Boolean, default: false },
  pdfCompleted: { type: Boolean, default: false },
  playlistCompleted: { type: Boolean, default: false },
  guidanceCompleted: { type: Boolean, default: false },
  fullName: String
});

enrollmentSchema.virtual('progress').get(function() {
  const count = [this.notesCompleted, this.pdfCompleted, this.playlistCompleted, this.guidanceCompleted]
    .filter(Boolean).length;
  return count * 25;
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

async function createBrandNewUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');
    console.log('\n✓ Connected to MongoDB\n');

    // Create a new unique user
    const uniqueEmail = `newuser${Date.now()}@example.com`;
    const password = await bcrypt.hash('password123', 10);

    const user = await User.create({
      name: 'New User ' + Date.now(),
      email: uniqueEmail,
      password: password,
      role: 'student'
    });

    console.log(`✓ Created new user: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user._id}\n`);

    // Find a course
    const course = await Course.findOne();
    if (!course) {
      console.log('❌ No courses available');
      process.exit(1);
    }

    console.log(`✓ Found course: ${course.title}\n`);

    // Enroll in the course
    const enrollment = await Enrollment.create({
      user: user._id,
      course: course._id,
      notesCompleted: false,
      pdfCompleted: false,
      playlistCompleted: false,
      guidanceCompleted: false,
      fullName: user.name
    });

    console.log(`✓ Created enrollment\n`);
    console.log(`  Initial Progress: ${enrollment.progress}%\n`);

    // Complete all resources
    console.log('⏳ Completing all resources...\n');
    
    enrollment.notesCompleted = true;
    console.log(`  1. Notes completed - Progress: ${enrollment.progress}%`);
    
    enrollment.pdfCompleted = true;
    console.log(`  2. PDF completed - Progress: ${enrollment.progress}%`);
    
    enrollment.playlistCompleted = true;
    console.log(`  3. Playlist completed - Progress: ${enrollment.progress}%`);
    
    enrollment.guidanceCompleted = true;
    console.log(`  4. Guidance completed - Progress: ${enrollment.progress}%`);

    await enrollment.save();

    console.log(`\n✓ User completed all resources - Progress: ${enrollment.progress}%\n`);

    // Now the frontend would call POST /api/certificates/issue
    // Check if certificate is created
    const certificateCollection = mongoose.connection.collection('certificates');
    const cert = await certificateCollection.findOne({ user: user._id, enrollment: enrollment._id });

    if (cert) {
      console.log('✓ Certificate automatically created!');
      console.log(`  Certificate #: ${cert.certificateNumber}\n`);
    } else {
      console.log('⚠ Certificate NOT created yet.');
      console.log('The frontend should call POST /api/certificates/issue with this enrollmentId\n');
      console.log(`To test manually:\n`);
      console.log(`1. Login with: ${uniqueEmail} / password123`);
      console.log(`2. Enroll in the course`);
      console.log(`3. Complete all resources`);
      console.log(`4. Check Certificates page\n`);
    }

    console.log(`\n🔑 TEST CREDENTIALS:`);
    console.log(`   Email: ${uniqueEmail}`);
    console.log(`   Password: password123`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createBrandNewUser();
