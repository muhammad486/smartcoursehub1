const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
if (!process.env.JWT_SECRET) {
  console.warn('[SERVER] WARNING: JWT_SECRET not set. Using development fallback secret. Do NOT use in production.');
}

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
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// ---------- AUTH ROUTES ----------

// User / Admin register (role optional, default user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

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
      role: 'user'
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
    // Force price to 0 to keep resources free
    const body = { ...req.body, price: 0, createdBy: req.user._id };
    const course = await Course.create(body);
    res.status(201).json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating course' });
  }
});

// Update course (admin)
app.put('/api/courses/:id', protect, adminOnly, async (req, res) => {
  try {
    // Force course price to 0 to keep resources free
    const safeBody = { ...req.body };
    if ('price' in safeBody) safeBody.price = 0;
    const updated = await Course.findByIdAndUpdate(req.params.id, safeBody, { new: true });
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

    // Get course to check price
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Create free enrollment (resources are free)
    const enrollment = await Enrollment.create({
      user: req.user._id,
      course: courseId,
      fullName,
      phone,
      college,
      semester,
      additionalNotes,
      paymentRequired: false,
      paymentAmount: 0,
      paymentStatus: 'completed'
    });

    console.log(`[ENROLL] New enrollment created: ${enrollment._id}, Payment Required: ${enrollment.paymentRequired}`);
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
    }).populate('course');

    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Block progress updates when payment is required but not completed
    if (enrollment.paymentRequired && enrollment.paymentStatus !== 'completed') {
      return res.status(403).json({ message: 'Payment required to update progress or access resources' });
    }

    enrollment.progress = progress;
    await enrollment.save();

    // AUTO-CREATE CERTIFICATE if progress reaches 100%
    if (progress === 100) {
      console.log('[AUTO-CERT] Progress reached 100% - checking for existing certificate');
      const existing = await Certificate.findOne({
        user: req.user._id,
        enrollment: enrollment._id
      });
      
      if (!existing) {
          console.log('[AUTO-CERT] Creating automatic certificate for user:', req.user._id);
          try {
            const certNum = await createUniqueCertificateNumber();
            await Certificate.create({
              user: req.user._id,
              course: enrollment.course._id,
              enrollment: enrollment._id,
              certificateNumber: certNum,
              courseName: enrollment.course.title,
              userName: enrollment.fullName || req.user.name,
              completionDate: new Date()
            });
            console.log('[AUTO-CERT] Certificate auto-created successfully');
          } catch (certErr) {
            console.error('[AUTO-CERT] Error creating certificate:', certErr && certErr.message ? certErr.message : certErr);
            // Don't fail the request, just log the error
          }
        }
    }

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

// Generate a unique certificate number (retries if collision)
const createUniqueCertificateNumber = async (attempts = 5) => {
  for (let i = 0; i < attempts; i++) {
    const num = generateCertificateNumber();
    const exists = await Certificate.findOne({ certificateNumber: num }).lean();
    if (!exists) return num;
    console.warn('[CERT] Collision on certificateNumber, retrying...');
  }
  throw new Error('Unable to generate unique certificate number');
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
    console.log('[CERT] POST /api/certificates/issue - Request received');
    const { enrollmentId } = req.body;
    console.log('[CERT] enrollmentId:', enrollmentId, 'userId:', req.user._id);

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      user: req.user._id
    }).populate('course');

    console.log('[CERT] Enrollment lookup:', enrollment ? 'FOUND' : 'NOT FOUND');
    if (!enrollment) {
      console.log('[CERT] Enrollment not found - returning 404');
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    console.log('[CERT] Progress check:', enrollment.progress);
    // Only issue if progress is 100%
    if (enrollment.progress !== 100) {
      console.log('[CERT] Progress not 100 - returning 400');
      return res.status(400).json({ message: 'Course must be 100% complete to receive certificate' });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      user: req.user._id,
      enrollment: enrollmentId
    });

    console.log('[CERT] Existing certificate check:', existing ? 'EXISTS' : 'NOT EXISTS');
    if (existing) {
      console.log('[CERT] Returning existing certificate:', existing._id);
      return res.json(existing); // Return existing certificate
    }

    // Create new certificate with unique number
    console.log('[CERT] Creating new certificate...');
    try {
      const certNum = await createUniqueCertificateNumber();
      const certificate = await Certificate.create({
        user: req.user._id,
        course: enrollment.course._id,
        enrollment: enrollmentId,
        certificateNumber: certNum,
        courseName: enrollment.course.title,
        userName: enrollment.fullName || req.user.name,
        completionDate: new Date()
      });

      console.log('[CERT] Certificate created successfully:', certificate._id);
      return res.status(201).json(certificate);
    } catch (createErr) {
      console.error('[CERT] Error creating certificate:', createErr && createErr.message ? createErr.message : createErr);
      return res.status(500).json({ message: 'Error creating certificate', error: createErr.message || String(createErr) });
    }
  } catch (err) {
    console.error('[CERT] ERROR:', err.message);
    console.error(err);
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

// Generate and download certificate as PDF
app.get('/api/certificates/:id/download-pdf', protect, async (req, res) => {
  try {
    let certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('course').populate('enrollment').populate('user');

    // ensure proper population
    if (certificate && (!certificate.course || !certificate.enrollment)) {
      certificate = await Certificate.findById(req.params.id).populate('course').populate('enrollment').populate('user');
    }

    if (!certificate) {
      console.error('[PDF] Certificate not found for id:', req.params.id);
      return res.status(404).json({ message: 'Certificate not found' });
    }

    let enrollment = certificate.enrollment;
    let course = certificate.course;

    // Fallback values when referenced docs can't be populated (deleted or missing)
    const fallbackCourseName = certificate.courseName || (course && course.title) || 'Course';
    const fallbackUserName = certificate.userName || (certificate.user && certificate.user.name) || 'Student';

    if (!enrollment || !course) {
      console.warn('[PDF] Incomplete population for certificate, will use fallback fields', { certId: req.params.id, enrollment: !!enrollment, course: !!course });
      // continue and generate PDF using stored certificate fields
    }

    // Generate PDF using PDFKit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.certificateNumber}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Certificate Design
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Add decorative border
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2)).stroke();
    doc.rect(margin + 5, margin + 5, contentWidth - 10, pageHeight - (margin * 2) - 10).stroke();

    // Add decorative header
    doc.fillColor('#1e40af')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text('CERTIFICATE OF COMPLETION', margin, margin + 40, { align: 'center', width: contentWidth });

    // Add decorative line
    doc.moveTo(margin + 100, margin + 90)
      .lineTo(pageWidth - margin - 100, margin + 90)
      .stroke();

    // Main content
    doc.fillColor('#000000')
      .fontSize(14)
      .font('Helvetica')
      .text('This is to certify that', margin, margin + 120, { align: 'center', width: contentWidth });

    // Student Name (large and bold)
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(certificate.userName, margin, margin + 160, { align: 'center', width: contentWidth });

    // Has successfully completed
    doc.fillColor('#000000')
      .fontSize(14)
      .font('Helvetica')
      .text('has successfully completed the course:', margin, margin + 220, { align: 'center', width: contentWidth });

    // Course Name (bold)
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(course.title, margin, margin + 270, { align: 'center', width: contentWidth });

    // Completion Details
    doc.fillColor('#000000')
      .fontSize(12)
      .font('Helvetica')
      .text('Completion Details:', margin + 40, margin + 340);

    let yPos = margin + 360;
    const completionItems = [];

    if (enrollment) {
      if (enrollment.notesCompleted) completionItems.push('✓ Course Notes - Completed');
      if (enrollment.pdfCompleted) completionItems.push('✓ Course PDF - Completed');
      if (enrollment.playlistCompleted) completionItems.push('✓ YouTube Playlist - Completed');
      if (enrollment.guidanceCompleted) completionItems.push('✓ Course Guidance - Completed');
    }

    completionItems.forEach((item) => {
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text((course && course.title) || fallbackCourseName, margin, margin + 270, { align: 'center', width: contentWidth });
    });

    // Progress Bar Visual
    yPos += 10;
    doc.fontSize(11)
      .font('Helvetica')
      .text('Overall Progress: 100%', margin + 40, yPos);
    yPos += 15;

    // Draw progress bar
    doc.rect(margin + 60, yPos, 200, 15).stroke();
    doc.fillColor('#10b981').rect(margin + 60, yPos, 200, 15).fill();
    doc.fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('100%', margin + 160, yPos + 2, { align: 'center', width: 80 });

    // Certificate Number and Date
    yPos += 50;
    doc.fillColor('#000000')
      .fontSize(10)
      .font('Helvetica')
      .text(`Certificate Number: ${certificate.certificateNumber}`, margin + 40, yPos);
    
    const completionDate = certificate.completionDate
      ? new Date(certificate.completionDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';
    
    yPos += 20;
    doc.text(`Date of Completion: ${completionDate}`, margin + 40, yPos);

    yPos += 20;
    doc.text(`Issued At: ${new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 40, yPos);

    // Signature section
    yPos = pageHeight - margin - 80;
    doc.fontSize(10)
      .text('______________________', margin + 40, yPos);
    
    doc.fontSize(9)
      .text('SmartCourseHub', margin + 40, yPos + 15);
    
    doc.text('Official Seal', margin + 40, yPos + 30);

    // Footer
    doc.fontSize(8)
      .fillColor('#666666')
      .text('This certificate is awarded in recognition of successful completion of the course.', margin, pageHeight - margin - 20, { align: 'center', width: contentWidth });

    // Finalize PDF and handle completion
    doc.on('end', async () => {
      try {
        certificate.status = 'downloaded';
        certificate.downloadedAt = new Date();
        await certificate.save();
        console.log('[PDF] Certificate PDF generated and marked as downloaded');
      } catch (err) {
        console.error('[PDF] Error marking certificate as downloaded:', err && err.message ? err.message : err);
      }
    });

    doc.on('error', (streamErr) => {
      console.error('[PDF] Stream error while generating PDF:', streamErr && streamErr.message ? streamErr.message : streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error generating PDF', error: streamErr.message || String(streamErr) });
      }
    });

    doc.end();

  } catch (err) {
    console.error('[PDF] Error generating certificate:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating certificate PDF', error: err.message });
    }
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

// ---------- PAYMENT ROUTES ----------

// Configuration for UPI - set your actual UPI ID via environment variable
// If not provided, treat payments as not configured to avoid showing a dummy UPI
const UPI_ID = process.env.UPI_ID || null; // e.g., yourname@googlepay
const MERCHANT_NAME = 'SmartCourseHub';

// Public endpoint to let frontend detect if payments are configured
app.get('/api/payments/config', (req, res) => {
  try {
    res.json({ paymentEnabled: !!UPI_ID });
  } catch (err) {
    console.error('[PAYMENT] Config error:', err);
    res.status(500).json({ paymentEnabled: false });
  }
});

// Get QR code for payment
app.get('/api/payments/qr/:enrollmentId', protect, async (req, res) => {
  try {
    console.log('[PAYMENT] QR code request for enrollment:', req.params.enrollmentId);
    
    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      user: req.user._id
    }).populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    if (enrollment.paymentAmount === 0) {
      return res.status(400).json({ message: 'This course is free' });
    }

    // Ensure UPI is configured
    if (!UPI_ID) {
      console.warn('[PAYMENT] UPI_ID not configured in environment');
      return res.status(503).json({ message: 'Payment gateway not configured. Please contact admin.' });
    }

    // Generate UPI string for Google Pay
    // Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=NOTE&tr=REFERENCE
    const referenceId = `SC-${enrollment._id.toString().slice(-8)}-${Date.now().toString().slice(-4)}`;
    const upiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${enrollment.paymentAmount}&tn=${encodeURIComponent(`Course: ${enrollment.course.title}`)}&tr=${referenceId}`;

    console.log('[PAYMENT] Generating QR for:', upiString);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(upiString);

    res.json({
      qrCode,
      referenceId,
      amount: enrollment.paymentAmount,
      courseName: enrollment.course.title,
      upiId: UPI_ID,
      merchantName: MERCHANT_NAME
    });
  } catch (err) {
    console.error('[PAYMENT] QR Error:', err.message);
    res.status(500).json({ message: 'Error generating QR code' });
  }
});

// Verify payment (admin confirms after receiving payment)
app.post('/api/payments/verify/:enrollmentId', protect, async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    console.log('[PAYMENT] Verifying payment for enrollment:', req.params.enrollmentId);

    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      user: req.user._id
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already verified' });
    }

    // Mark payment as pending verification
    // (In production, you would verify with payment gateway here)
    enrollment.paymentStatus = 'completed';
    enrollment.transactionId = transactionId || `MANUAL-${Date.now()}`;
    enrollment.paidAt = new Date();
    await enrollment.save();

    console.log('[PAYMENT] Payment marked as completed:', enrollment._id);

    res.json({
      message: 'Payment verified successfully',
      enrollment
    });
  } catch (err) {
    console.error('[PAYMENT] Verification Error:', err.message);
    res.status(500).json({ message: 'Error verifying payment' });
  }
});

// Get payment status
app.get('/api/payments/status/:enrollmentId', protect, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      _id: req.params.enrollmentId,
      user: req.user._id
    }).populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json({
      enrollmentId: enrollment._id,
      paymentRequired: enrollment.paymentRequired,
      paymentStatus: enrollment.paymentStatus,
      paymentAmount: enrollment.paymentAmount,
      courseName: enrollment.course.title,
      paidAt: enrollment.paidAt,
      transactionId: enrollment.transactionId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching payment status' });
  }
});

// Admin: Set course price
app.patch('/api/admin/courses/:id/price', protect, adminOnly, async (req, res) => {
  try {
    const { price } = req.body;

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { price },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    console.log(`[ADMIN] Course price updated: ${course.title} = ₹${price}`);

    res.json({
      message: 'Price updated successfully',
      course
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating price' });
  }
});

// Admin: View all payments
app.get('/api/admin/payments', protect, adminOnly, async (req, res) => {
  try {
    const payments = await Enrollment.find({ paymentRequired: true })
      .populate('user', 'name email')
      .populate('course', 'title price')
      .sort({ createdAt: -1 });

    const summary = {
      totalPayments: payments.length,
      completed: payments.filter(p => p.paymentStatus === 'completed').length,
      pending: payments.filter(p => p.paymentStatus === 'pending').length,
      totalAmount: payments
        .filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => sum + (p.paymentAmount || 0), 0)
    };

    res.json({
      summary,
      payments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching payments' });
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

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

function calculateProgress(e) {
  // Now support 5 resource types: notes, pdf, playlist, video, guidance
  const total = 5;
  let completed = 0;
  if (e.notesCompleted) completed++;
  if (e.pdfCompleted) completed++;
  if (e.playlistCompleted) completed++;
  if (e.videoCompleted) completed++;
  if (e.guidanceCompleted) completed++;
  return Math.round((completed / total) * 100);
}

// Mark resource as complete (auto-calculates progress)
app.patch('/api/enrollments/:id/complete', protect, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('course');

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Prevent completing resources when payment pending
    if (enrollment.paymentRequired && enrollment.paymentStatus !== 'completed') {
      return res.status(403).json({ message: 'Payment required to complete resources for this course' });
    }

    const { type } = req.body;

    if (type === "notes") enrollment.notesCompleted = true;
    if (type === "pdf") enrollment.pdfCompleted = true;
    if (type === "playlist") enrollment.playlistCompleted = true;
    if (type === "video") enrollment.videoCompleted = true;
    if (type === "guidance") enrollment.guidanceCompleted = true;

    // auto calculate progress
    enrollment.progress = calculateProgress(enrollment);

    await enrollment.save();

    // AUTO-CREATE CERTIFICATE if progress reaches 100%
    if (enrollment.progress === 100) {
      console.log('[AUTO-CERT] Progress reached 100% - checking for existing certificate');
      const existing = await Certificate.findOne({
        user: req.user._id,
        enrollment: enrollment._id
      });
      
        if (!existing) {
          console.log('[AUTO-CERT] Creating automatic certificate for user:', req.user._id);
          try {
            const certNum = await createUniqueCertificateNumber();
            await Certificate.create({
              user: req.user._id,
              course: enrollment.course._id,
              enrollment: enrollment._id,
              certificateNumber: certNum,
              courseName: enrollment.course.title,
              userName: enrollment.fullName || req.user.name,
              completionDate: new Date()
            });
            console.log('[AUTO-CERT] Certificate auto-created successfully');
          } catch (certErr) {
            console.error('[AUTO-CERT] Error creating certificate:', certErr && certErr.message ? certErr.message : certErr);
            // Don't fail the request, just log the error
          }
        }
    }

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating progress" });
  }
});

// Admin-only: create another admin user (useful for admin management)
app.post('/api/admin/create-admin', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const emailLower = email.toLowerCase();
    const exists = await User.findOne({ email: emailLower });
    if (exists) return res.status(400).json({ message: 'This email is already registered' });

    const adminUser = await User.create({
      name: name.trim(),
      email: emailLower,
      password,
      role: 'admin'
    });

    res.status(201).json({
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      token: generateToken(adminUser._id, adminUser.role)
    });
  } catch (err) {
    console.error('[ADMIN] Error creating admin:', err);
    res.status(500).json({ message: 'Error creating admin' });
  }
});