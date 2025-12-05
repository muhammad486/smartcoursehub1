const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  college: { type: String, required: true },
  semester: { type: String, required: true },
  additionalNotes: { type: String },
  progress: { type: Number, default: 0 }, // 0–100
  createdAt: { type: Date, default: Date.now },
  notesCompleted: { type: Boolean, default: false },
pdfCompleted: { type: Boolean, default: false },
playlistCompleted: { type: Boolean, default: false },
guidanceCompleted: { type: Boolean, default: false },
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);