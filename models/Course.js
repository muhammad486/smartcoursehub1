const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  shortDescription: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  category: { type: String, default: 'Computer Science' },
  notesUrl: { type: String },
  pdfUrl: { type: String },
  youtubePlaylistUrl: { type: String },
  videoUrl: { type: String },
  guidance: { type: String },
  projects: { type: String },
  price: { type: Number, default: 0 }, // Course price in INR (0 = free)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  // Ratings & Reviews
  ratings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 }
});

module.exports = mongoose.model('Course', courseSchema);