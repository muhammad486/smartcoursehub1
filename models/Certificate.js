const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  issuedAt: { type: Date, default: Date.now },
  certificateNumber: { type: String, unique: true }, // Unique certificate ID
  courseName: { type: String },
  userName: { type: String },
  completionDate: { type: Date },
  status: { type: String, enum: ['issued', 'downloaded'], default: 'issued' },
  downloadedAt: { type: Date }
});

module.exports = mongoose.model('Certificate', certificateSchema);
