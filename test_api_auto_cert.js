const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');

// Models
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
  fullName: String,
  progress: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAutoCreateCertificate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/smartcoursehub');
    console.log('\n✅ Connected to MongoDB\n');

    // Create test user
    const testEmail = `apitest${Date.now()}@test.com`;
    const testPassword = 'password123';
    const user = await User.create({
      name: 'API Test User',
      email: testEmail,
      password: await bcrypt.hash(testPassword, 10),
      role: 'student'
    });

    console.log(`✅ Created test user: ${testEmail}\n`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Get a course
    const course = await Course.findOne();
    if (!course) {
      console.log('❌ No courses found');
      process.exit(1);
    }

    // Create enrollment via API (simulating frontend registration)
    console.log('📝 Creating enrollment via API...\n');
    const enrollmentRes = await makeRequest(
      'POST',
      `/api/courses/${course._id}/enroll`,
      { fullName: user.name, phone: '1234567890', college: 'Test College', semester: '1' },
      token
    );

    if (enrollmentRes.status !== 201) {
      console.log(`❌ Failed to create enrollment: ${enrollmentRes.status}`);
      console.log(enrollmentRes.data);
      process.exit(1);
    }

    const enrollmentId = enrollmentRes.data._id;
    console.log(`✅ Enrollment created: ${enrollmentId}\n`);

    // Mark resources as complete
    console.log('📚 Marking resources as complete...\n');

    const resources = ['notes', 'pdf', 'playlist', 'guidance'];
    for (const resourceType of resources) {
      const res = await makeRequest(
        'PATCH',
        `/api/enrollments/${enrollmentId}/complete`,
        { type: resourceType },
        token
      );

      if (res.status === 200) {
        console.log(`✅ ${resourceType.toUpperCase()} completed - Progress: ${res.data.progress}%`);
      } else {
        console.log(`❌ Failed to mark ${resourceType} complete`);
      }

      // Wait a moment between requests
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n⏳ Waiting for certificate creation...\n');
    await new Promise(r => setTimeout(r, 1000));

    // Check if certificate was created
    const certificateCollection = mongoose.connection.collection('certificates');
    const cert = await certificateCollection.findOne({
      user: user._id,
      enrollment: enrollmentId
    });

    if (cert) {
      console.log('🎉 SUCCESS! Certificate auto-created on 100% completion!\n');
      console.log(`   Certificate #: ${cert.certificateNumber}`);
      console.log(`   Course: ${cert.courseName}`);
      console.log(`   User: ${cert.userName}\n`);
    } else {
      console.log('⚠ Certificate NOT found in database\n');
      console.log('Checking enrollment...');
      const enrollment = await Enrollment.findById(enrollmentId);
      console.log(`Enrollment progress: ${enrollment.progress}%`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

setTimeout(() => {
  testAutoCreateCertificate();
}, 1000); // Wait for server to be ready
