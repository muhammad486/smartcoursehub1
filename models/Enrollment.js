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
  videoCompleted: { type: Boolean, default: false },
  guidanceCompleted: { type: Boolean, default: false },
  // Payment fields
  paymentRequired: { type: Boolean, default: false }, // true if course has price
  paymentAmount: { type: Number, default: 0 }, // Amount paid in INR
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentId: { type: String }, // Transaction reference ID
  transactionId: { type: String }, // UPI transaction ID
  paidAt: { type: Date }, // When payment was completed
  paymentMethod: { type: String, default: 'upi' } // UPI payment method
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);