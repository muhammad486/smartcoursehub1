const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const http = require('http');

async function testPdfGeneration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get any certificate
    const cert = await Certificate.findOne().limit(1);
    
    if (!cert) {
      console.log('No certificates found in database');
      process.exit(1);
    }

    console.log('\n[TEST] Testing PDF generation for certificate:');
    console.log('  - Certificate ID:', cert._id);
    console.log('  - User ID:', cert.user);
    console.log('  - Course:', cert.courseName);

    // Create a user object for JWT
    const user = await User.findById(cert.user);
    
    // Generate JWT token for the user
    const token = jwt.sign({ 
      id: user._id, 
      email: user.email, 
      name: user.name 
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Make HTTP request to PDF endpoint
    console.log('\n[TEST] Requesting PDF from server...');
    const url = `http://127.0.0.1:5000/api/certificates/${cert._id}/download-pdf`;
    
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/certificates/${cert._id}/download-pdf`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      console.log('[TEST] Response Status:', res.statusCode);
      console.log('[TEST] Content-Type:', res.headers['content-type']);

      if (res.statusCode === 200) {
        // Save PDF to file
        const filename = `certificate_${cert.certificateNumber}.pdf`;
        const filepath = require('path').join(__dirname, 'scripts', filename);
        const fileStream = fs.createWriteStream(filepath);
        
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
          console.log(`\n✅ PDF generated successfully!`);
          console.log(`   Saved to: ${filepath}`);
          console.log(`   File size: ${fs.statSync(filepath).size} bytes`);
          
          // Verify certificate was marked as downloaded
          setTimeout(async () => {
            const updated = await Certificate.findById(cert._id);
            console.log(`   Certificate status: ${updated.status}`);
            console.log(`   Downloaded at: ${updated.downloadedAt}`);
            
            await mongoose.disconnect();
            process.exit(0);
          }, 1000);
        });
      } else {
        console.log('[TEST] ❌ Error: Invalid response status');
        res.on('data', (chunk) => console.log(chunk.toString()));
        process.exit(1);
      }
    });

    req.on('error', (err) => {
      console.error('[TEST] ❌ Request error:', err.message);
      process.exit(1);
    });

    req.end();

  } catch (err) {
    console.error('[TEST] ❌ Error:', err.message);
    process.exit(1);
  }
}

testPdfGeneration();
