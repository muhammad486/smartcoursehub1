# Payment Configuration

## UPI Setup for Google Pay

To enable payments in SmartCourseHub, you need to set your UPI ID.

### Option 1: Environment Variable (Recommended)
Add to your `.env` file:
```
UPI_ID=your_upi_id@googlepay
```

Example:
```
UPI_ID=yourname@upi
```

### Option 2: Direct Edit
Edit `server.js` line ~716:
```javascript
const UPI_ID = process.env.UPI_ID || 'your_upi_id@upi';
```

Replace `your_upi_id@upi` with your actual UPI ID.

## Finding Your UPI ID

### Google Pay UPI ID:
1. Open Google Pay
2. Go to Settings
3. Click on your account
4. Find your UPI ID (usually: yourname@upi or phonenumber@upi)

### Other UPI Providers:
- PhonePe: yourname@ybl
- PayTM: yourname@paytm
- BHIM: XXXX@okaxis or similar

## QR Code Generation

The system automatically generates QR codes that include:
- Your UPI ID
- Course price (in INR)
- Transaction reference
- Course name

## Payment Flow

1. User enrolls in paid course
2. Frontend shows payment page with QR code
3. User scans QR with Google Pay / UPI app
4. User completes payment
5. Backend marks payment as completed
6. User gets access to course materials
7. Certificate auto-generates when course is 100% complete

## API Endpoints

### Get QR Code
```
GET /api/payments/qr/:enrollmentId
Authorization: Bearer token
```

### Verify Payment
```
POST /api/payments/verify/:enrollmentId
Authorization: Bearer token
Body: { transactionId: "TXN123" }
```

### Check Payment Status
```
GET /api/payments/status/:enrollmentId
Authorization: Bearer token
```

## Admin Endpoints

### Set Course Price
```
PATCH /api/admin/courses/:courseId/price
Authorization: Bearer admin_token
Body: { price: 499 }
```

### View All Payments
```
GET /api/admin/payments
Authorization: Bearer admin_token
```

---

**Important:** Keep your UPI ID secure. Don't commit it to public repositories.
