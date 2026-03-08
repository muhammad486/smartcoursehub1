const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Certificate = require('./models/Certificate');
const { protect, adminOnly } = require('./middleware/authMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static React frontend
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error', err));

// Seed default admin
const seedAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    const admin = new User({
      name: 'Admin',
      email: 'admin@smartcoursehub.com',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('Default admin created: admin@smartcoursehub.com / admin123');
  }
};
seedAdmin();

// Helper: validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Helper: generate token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ---------- AUTH ROUTES ----------

// User / Admin register (role optional, default user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Invalid email format. Please enter a valid email address.' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });

    if (name.trim().length < 2)
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'This email is already registered. Please login or use a different email.' });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: role === 'admin' ? 'admin' : 'user'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Register error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    if (!isValidEmail(email))
      return res.status(400).json({ message: 'Invalid email format' });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error' });
  }
});

// ---------- COURSE ROUTES ----------

// Get all courses with search & filter
app.get('/api/courses', async (req, res) => {
  try {
    const { search, level, category, sort } = req.query;

    let query = {};

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Sort
    let sortObj = { createdAt: -1 }; // default: newest first
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'rating') sortObj = { averageRating: -1 };

    const courses = await Course.find(query).sort(sortObj);
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// Create course (admin)
app.post('/api/courses', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating course' });
  }
});

// Update course (admin)
app.put('/api/courses/:id', protect, adminOnly, async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating course' });
  }
});

// Delete course (admin)
app.delete('/api/courses/:id', protect, adminOnly, async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting course' });
  }
});

// ---------- ENROLLMENT ROUTES ----------

// Enroll in course (user)
app.post('/api/courses/:id/enroll', protect, async (req, res) => {
  try {
    const courseId = req.params.id;
    const { fullName, phone, college, semester, additionalNotes } = req.body;

    // Validate required fields
    if (!fullName || !phone || !college || !semester) {
      return res.status(400).json({ message: 'All fields (fullName, phone, college, semester) are required' });
    }

    const exists = await Enrollment.findOne({ user: req.user._id, course: courseId });
    if (exists) return res.status(400).json({ message: 'You are already enrolled in this course' });

    const enrollment = await Enrollment.create({
      user: req.user._id,
      course: courseId,
      fullName,
      phone,
      college,
      semester,
      additionalNotes
    });

    res.status(201).json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error enrolling' });
  }
});

// Get logged-in user's enrollments
app.get('/api/enrollments/my', protect, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user._id })
      .populate('course')
      .sort({ createdAt: -1 });
    res.json(enrollments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching enrollments' });
  }
});

// Update progress (user)
app.patch('/api/enrollments/:id/progress', protect, async (req, res) => {
  try {
    const { progress } = req.body;
    const enrollment = await Enrollment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    enrollment.progress = progress;
    await enrollment.save();

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating progress' });
  }
});

// Admin: see all enrollments
app.get('/api/admin/enrollments', protect, adminOnly, async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('user', 'name email')
      .populate('course', 'title');
    res.json(enrollments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching admin enrollments' });
  }
});

// ---------- RATINGS & REVIEWS ----------

// Add or update review for a course (user)
app.post('/api/courses/:id/review', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if user already reviewed this course
    const existingReview = course.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.review = review || '';
      existingReview.createdAt = new Date();
    } else {
      // Add new review
      course.ratings.push({
        user: req.user._id,
        rating,
        review: review || ''
      });
    }

    // Recalculate average rating
    const avg = course.ratings.reduce((sum, r) => sum + r.rating, 0) / course.ratings.length;
    course.averageRating = Math.round(avg * 10) / 10;
    course.totalRatings = course.ratings.length;

    await course.save();
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error posting review' });
  }
});

// Get reviews for a course
app.get('/api/courses/:id/reviews', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('ratings.user', 'name email');

    if (!course) return res.status(404).json({ message: 'Course not found' });

    res.json({
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
      ratings: course.ratings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// ---------- CERTIFICATES ----------

// Helper function to generate unique certificate number
const generateCertificateNumber = () => {
  return 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Get user's certificates
app.get('/api/certificates', protect, async (req, res) => {
  try {
    const certificates = await Certificate.find({ user: req.user._id })
      .populate('course', 'title')
      .sort({ issuedAt: -1 });
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});

// Issue certificate (called when enrollment reaches 100%)
app.post('/api/certificates/issue', protect, async (req, res) => {
  try {
    console.log('\n======= CERTIFICATE ISSUE REQUEST =======');
    const { enrollmentId } = req.body;
    console.log('enrollmentId:', enrollmentId);
    console.log('user._id:', req.user._id);

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      user: req.user._id
    }).populate('course');

    console.log('Enrollment found?:', !!enrollment);
    if (!enrollment) {
      console.log('❌ Enrollment not found');
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    console.log('Enrollment progress:', enrollment.progress);
    if (enrollment.progress !== 100) {
      console.log('❌ Progress not 100%, got:', enrollment.progress);
      return res.status(400).json({ message: 'Course must be 100% complete to receive certificate' });
    }

    const existing = await Certificate.findOne({
      user: req.user._id,
      enrollment: enrollmentId
    });

    if (existing) {
      console.log('Certificate already exists');
      return res.json(existing);
    }

    const certNumber = generateCertificateNumber();
    console.log('Creating certificate with number:', certNumber);

    const certificate = await Certificate.create({
      user: req.user._id,
      course: enrollment.course._id,
      enrollment: enrollmentId,
      certificateNumber: certNumber,
      courseName: enrollment.course.title,
      userName: enrollment.fullName || req.user.name,
      completionDate: new Date()
    });

    console.log('✅ Certificate created:', certificate._id);
    console.log('======= END CERTIFICATE ISSUE =======\n');
    res.status(201).json(certificate);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.log('======= END CERTIFICATE ISSUE (ERROR) =======\n');
    res.status(500).json({ message: 'Error issuing certificate', error: err.message });
  }
});

// Get single certificate details
app.get('/api/certificates/:id', protect, async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('course').populate('user', 'name email');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching certificate' });
  }
});

// Mark certificate as downloaded
app.patch('/api/certificates/:id/download', protect, async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    certificate.status = 'downloaded';
    certificate.downloadedAt = new Date();
    await certificate.save();

    res.json(certificate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating certificate' });
  }
});

// ---------- ADMIN ANALYTICS ----------

// Get admin analytics dashboard data
app.get('/api/admin/analytics', protect, adminOnly, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'user' });
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();

    const enrollments = await Enrollment.find();
    const avgProgressOverall = enrollments.length > 0
      ? Math.round((enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length) * 10) / 10
      : 0;

    const avgEnrollmentsPerCourse = totalCourses > 0
      ? Math.round((totalEnrollments / totalCourses) * 10) / 10
      : 0;

    // Completion rate: enrollments with 100% progress
    const completedEnrollments = enrollments.filter(e => e.progress === 100).length;
    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    res.json({
      totalStudents,
      totalCourses,
      totalEnrollments,
      avgProgressOverall,
      avgEnrollmentsPerCourse,
      completionRate,
      completedEnrollments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// Fallback: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Handle listen errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port or use a different PORT.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

function calculateProgress(e) {
  let progress = 0;
  if (e.notesCompleted) progress += 25;
  if (e.pdfCompleted) progress += 25;
  if (e.playlistCompleted) progress += 25;
  if (e.guidanceCompleted) progress += 25;
  return progress;
}

// Mark resource as complete (auto-calculates progress)
app.patch('/api/enrollments/:id/complete', protect, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const { type } = req.body;

    if (type === "notes") enrollment.notesCompleted = true;
    if (type === "pdf") enrollment.pdfCompleted = true;
    if (type === "playlist") enrollment.playlistCompleted = true;
    if (type === "guidance") enrollment.guidanceCompleted = true;

    // auto calculate progress
    enrollment.progress = calculateProgress(enrollment);

    await enrollment.save();

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating progress" });
  }
});