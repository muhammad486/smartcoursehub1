const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/smartcoursehub';
const API_URL = 'http://localhost:5000';

let token = '';

async function fetchAPI(method, path, body = null, authToken = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    options.headers.Authorization = `Bearer ${authToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    // Step 1: Login as test user
    console.log('\n1. Logging in...');
    const loginData = await fetchAPI('POST', '/api/auth/login', {
      email: 'mudassir3@gmail.com',
      password: 'password123'
    });
    token = loginData.token;
    console.log('✅ Logged in, token:', token.substring(0, 20) + '...');

    // Step 2: Get enrollments at 100% progress
    console.log('\n2. Fetching enrollments...');
    const enrollments = await fetchAPI('GET', '/api/enrollments', null, token);
    
    const enrollment100 = enrollments.find(e => e.progress === 100);
    if (!enrollment100) {
      console.log('❌ No enrollment at 100%');
      return;
    }
    
    console.log('✅ Found enrollment at 100%:');
    console.log('  - ID:', enrollment100._id);
    console.log('  - Course:', enrollment100.course?.title);
    console.log('  - Progress:', enrollment100.progress);

    // Step 3: Call certificate issue endpoint
    console.log('\n3. Calling POST /api/certificates/issue...');
    console.log('   Sending enrollmentId:', enrollment100._id);
    const certData = await fetchAPI('POST', '/api/certificates/issue', 
      { enrollmentId: enrollment100._id }, 
      token
    );
    
    console.log('✅ Certificate response received');
    console.log('   Certificate ID:', certData._id);
    console.log('   Certificate number:', certData.certificateNumber);

    // Step 4: Check if certificate exists in DB
    console.log('\n4. Checking database...');
    const Certificate = require('../models/Certificate');
    
    const certCount = await Certificate.countDocuments();
    console.log('Total certificates in DB:', certCount);
    
    const userCerts = await Certificate.find({ user: loginData.userId });
    console.log('User certificates:', userCerts.length);
    userCerts.forEach((c, i) => {
      console.log(`  [${i+1}] ${c.certificateNumber} - ${c.courseName}`);
    });

    console.log('\n✅ Test complete - check server logs for detailed output');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
