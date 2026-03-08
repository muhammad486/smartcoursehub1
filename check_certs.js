const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  course: mongoose.Schema.Types.ObjectId,
  enrollment: mongoose.Schema.Types.ObjectId,
  certificateNumber: String,
  courseName: String,
  userName: String,
  completionDate: Date,
  status: String
});

const Certificate = mongoose.model('Certificate', certificateSchema);

mongoose.connect('mongodb://localhost:27017/smartcoursehub').then(() => {
  Certificate.find({}).then(certs => {
    console.log(`\n✓ Total certificates in DB: ${certs.length}\n`);
    certs.forEach((cert, idx) => {
      console.log(`${idx + 1}. User: ${cert.userName}`);
      console.log(`   Course: ${cert.courseName}`);
      console.log(`   Certificate #: ${cert.certificateNumber}`);
      console.log(`   Date: ${cert.completionDate}\n`);
    });
    process.exit(0);
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
