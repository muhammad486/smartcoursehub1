# Certificate of Completion - Test Scenarios

## Test Environment Setup
- Server: http://localhost:5000
- Database: MongoDB (local or cloud)
- Browser: Any modern browser (Chrome, Firefox, Edge, Safari)

---

## Test Scenario 1: Basic Certificate Earning

### Prerequisites
- No prior enrollments or certificates
- Logged in as a regular student user
- At least one course available in the system

### Test Steps
1. Navigate to "Courses" page
2. Select any course
3. Click "Register" button
4. Fill registration form:
   - Full Name: Test Student
   - Phone: 1234567890
   - College: Test University
   - Semester: 1
   - Additional Notes: (optional)
5. Click "Submit Registration"

### Expected Results
✅ Success message appears: "Successfully registered for course!"
✅ Course is added to "My Courses" page
✅ Progress shows 0% initially
✅ Resources tab becomes accessible

### Continuation Steps
6. Click "Resources" tab in course detail
7. Click on first resource (Notes link)
   - Notes should open in new tab
   - Progress updates to 25%
8. Return to main app
9. Click second resource (PDF link)
   - PDF should open in new tab
   - Progress updates to 50%
10. Return to main app
11. Click third resource (YouTube Playlist link)
    - Playlist should open in new tab
    - Progress updates to 75%
12. Return to main app
13. Click fourth resource (Guidance link)
    - Guidance should open in new tab
    - **Alert appears: "🎉 Congratulations! You've earned a Certificate of Completion!"**
    - Progress updates to 100%
    - Completion should trigger automatic certificate issuance

### Final Verification
14. Check "My Courses" page
    ✅ Course card shows gold "Certified" badge in top-right corner
    ✅ Progress bar shows 100%

15. Navigate to "Certificates" page (click sidebar link)
    ✅ CertificatesView page loads
    ✅ Certificate appears in list with:
       - Course name
       - Certificate number (CERT-...)
       - Completion date (today's date)
       - Download button

---

## Test Scenario 2: Multiple Certificates

### Prerequisites
- At least 2 courses available
- Same student from Test Scenario 1

### Test Steps
1. On "Certificates" page, note the count (should be 1)
2. Go to "Courses" page
3. Register for second course (different from first)
4. Complete all 4 resources in second course
5. Return to "Certificates" page

### Expected Results
✅ Certificate count updates (shows 2 earned)
✅ Both certificates appear in list:
   - First certificate from Test Scenario 1
   - New certificate from second course
✅ Each certificate has unique:
   - Certificate number
   - Completion date
   - Course name
✅ Certificates sorted by newest first

---

## Test Scenario 3: Certificate Download

### Prerequisites
- At least 1 certificate earned (from Test Scenario 1 or 2)
- On "Certificates" page

### Test Steps
1. Locate any certificate in the list
2. Click "Download" button on that certificate
3. Note the alert and certificate status

### Expected Results
✅ Alert shows: "Certificate marked as downloaded!"
✅ Certificate status changes to "downloaded"
✅ downloadedAt timestamp is recorded

---

## Test Scenario 4: Certificate Page Navigation

### Prerequisites
- Logged in as student user
- At least 1 certificate earned

### Test Steps
1. Verify "Certificates" appears in left sidebar
2. Check that icon shows certificate symbol (fa-certificate)
3. Click "Certificates" link in sidebar
4. Verify page loads correctly

### Expected Results
✅ "Certificates" nav item visible in sidebar (only for non-admin)
✅ Link navigates to certificates page
✅ Page title shows "My Certificates"
✅ Subtitle shows "View and download your certificates of completion."
✅ Certificate badge appears next to page title showing count

---

## Test Scenario 5: Empty Certificate State

### Prerequisites
- Logged in as new student with no certificates
- No enrollments

### Test Steps
1. Navigate to "Certificates" page
2. Observe the page state

### Expected Results
✅ "Certificates" page loads without errors
✅ Status badge shows "0 earned"
✅ Empty state message displays:
   "No certificates yet. Complete a course (100% progress) to earn a certificate!"

---

## Test Scenario 6: Progress Tracking without Certificate

### Prerequisites
- Logged in as student
- Enrolled in a course but not yet completed

### Test Steps
1. Enroll in a new course
2. Click 2 out of 4 resources (50% progress)
3. Navigate to "Certificates" page
4. Check for certificate

### Expected Results
✅ Certificate does NOT appear (not yet earned)
✅ On "Progress" page, course shows 50% completion
✅ No "Certified" badge on course card
✅ Certificate will only appear after reaching 100%

---

## Test Scenario 7: Certificate Details API

### Prerequisites
- At least 1 certificate earned
- Logged in student user

### Test Steps (Manual API Testing)
1. Open browser developer console (F12)
2. Go to Network tab
3. Navigate to "Certificates" page
4. Observe network requests

### Expected Results
✅ API calls made:
   - GET /api/certificates - Returns array of certificates
   - Status: 200 OK
✅ Response includes:
   - Certificate ID (_id)
   - User ID
   - Course ID
   - Course title (populated)
   - Certificate number
   - Completion date
   - Issued date
   - Status

---

## Test Scenario 8: Certificate Badge Display

### Prerequisites
- Enrolled in and completed a course (100% progress)
- Certificate earned

### Test Steps
1. Go to "My Courses" page
2. Look for the completed course card

### Expected Results
✅ Gold gradient badge appears in top-right corner
✅ Badge shows certificate icon (fa-certificate)
✅ Badge text says "Certified"
✅ Badge styling:
   - Gold background (linear-gradient(#FFD700, #FFA500))
   - Dark text color
   - Box shadow for emphasis
   - Professional appearance

---

## Test Scenario 9: Certificate Uniqueness

### Prerequisites
- Completed a course and earned certificate

### Test Steps
1. Try to manually trigger certificate endpoint twice
   - First call: Should create certificate (HTTP 201)
   - Second call with same enrollment: Should return existing certificate (HTTP 200)

### Expected Results
✅ First call creates certificate (HTTP 201)
✅ Unique certificate number generated
✅ Second call returns same certificate (no duplicate)
✅ Can verify by checking certificate count (stays at 1, doesn't increase to 2)

---

## Test Scenario 10: Admin User Isolation

### Prerequisites
- Multiple user types (student and admin)

### Test Steps
1. Enroll in course and earn certificate as student
2. Log out and log in as admin user
3. Try to access Certificates page

### Expected Results
✅ "Certificates" link NOT visible in admin sidebar
✅ Admin cannot access certificates page via URL
✅ Admin dashboard shows different pages (Courses, Enrollments, Analytics)
✅ Each user's certificates are isolated (admin can't see student certificates)

---

## Test Scenario 11: Error Handling

### Prerequisites
- System with potential error conditions

### Test Steps
1. Network failure during certificate issuance
   - Temporarily disable network
   - Try to complete course
   - Re-enable network

2. Invalid enrollment scenario
   - Try to issue certificate for non-existent enrollment
   - Try to access certificate with wrong user ID

### Expected Results
✅ Graceful error messages displayed
✅ No server crashes
✅ User informed of issues
✅ Can retry operations

---

## Test Scenario 12: Certificate Display Responsiveness

### Prerequisites
- Multiple certificates earned
- Various device sizes

### Test Steps
1. View certificates on desktop (1920x1080)
2. Resize browser to tablet width (768px)
3. Resize browser to mobile width (375px)

### Expected Results
✅ Certificate cards display correctly on all sizes
✅ Layout responsive and readable
✅ Download button accessible on all devices
✅ Certificate information visible
✅ No text overflow or layout issues

---

## Test Scenario 13: Concurrent Operations

### Prerequisites
- Multiple courses and resources

### Test Steps
1. Open two browser windows/tabs (same user logged in)
2. In window 1: Navigate to course detail
3. In window 2: Navigate to Certificates page
4. In window 1: Complete course (click all resources)
5. In window 2: Refresh Certificates page

### Expected Results
✅ No conflicts or data corruption
✅ Certificate appears in window 2 after refresh
✅ Both windows show correct data
✅ Session remains valid across both tabs

---

## Test Scenario 14: Date Formatting

### Prerequisites
- Multiple certificates earned on different dates

### Test Steps
1. Go to Certificates page
2. Observe completion dates displayed

### Expected Results
✅ Dates formatted using toLocaleDateString()
✅ Format matches user's locale
   - US: M/D/YYYY
   - EU: D/M/YYYY
   - Other locales: Appropriate format
✅ Dates are readable and consistent

---

## Test Scenario 15: Session Persistence

### Prerequisites
- Certificate earned
- Logged-in session

### Test Steps
1. Earn a certificate
2. Refresh page (F5)
3. Navigate to Certificates page

### Expected Results
✅ Certificate still visible after page refresh
✅ Session remains authenticated
✅ Certificate data persists
✅ No re-login required

---

## Regression Tests

### Verify Existing Features Still Work
- [ ] Course search/filter/sort
- [ ] Course ratings still functional
- [ ] Admin analytics still work
- [ ] Progress tracking still works
- [ ] Email validation still works
- [ ] Resource access control still works
- [ ] User authentication still works
- [ ] Registration form still works
- [ ] My Courses page displays correctly
- [ ] Progress page calculations correct

---

## Performance Tests

### Test Steps
1. Load Certificates page with 50+ certificates
2. Measure page load time
3. Measure API response time for GET /api/certificates

### Expected Results
✅ Page loads in < 2 seconds
✅ API responds in < 500ms
✅ No memory leaks
✅ UI remains responsive

---

## Data Integrity Tests

### Test Steps
1. Complete course and earn certificate
2. Check database directly
3. Verify all fields are correctly populated

### Expected Results
✅ User reference correct
✅ Course reference correct
✅ Enrollment reference correct
✅ Certificate number unique and formatted correctly
✅ Dates recorded accurately
✅ Status field set to "issued"

---

## Summary

All test scenarios should pass without errors. The Certificate of Completion feature should:
- ✅ Automatically issue certificates at 100% progress
- ✅ Display certificates in dedicated page
- ✅ Show badges on completed courses
- ✅ Store unique certificate data
- ✅ Handle errors gracefully
- ✅ Maintain data integrity
- ✅ Provide good user experience
- ✅ Work across all devices and browsers
