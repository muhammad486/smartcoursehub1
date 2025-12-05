# Certificate of Completion - API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
All certificate endpoints require JWT authentication via the `protect` middleware.
Include the token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. List User Certificates

**GET** `/api/certificates`

Retrieves all certificates earned by the authenticated user.

#### Request
```
GET /api/certificates
Authorization: Bearer <JWT_TOKEN>
```

#### Response (200 OK)
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "user": "507f1f77bcf86cd799439012",
    "course": {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Data Structures"
    },
    "enrollment": "507f1f77bcf86cd799439014",
    "certificateNumber": "CERT-1704923847352-A3X9K2B",
    "courseName": "Data Structures",
    "userName": "John Doe",
    "completionDate": "2024-01-10T10:30:00.000Z",
    "issuedAt": "2024-01-10T10:32:15.000Z",
    "status": "issued",
    "downloadedAt": null
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "user": "507f1f77bcf86cd799439012",
    "course": {
      "_id": "507f1f77bcf86cd799439016",
      "title": "Algorithms"
    },
    "enrollment": "507f1f77bcf86cd799439017",
    "certificateNumber": "CERT-1704924915762-K7M2P9W",
    "courseName": "Algorithms",
    "userName": "John Doe",
    "completionDate": "2024-01-11T14:20:00.000Z",
    "issuedAt": "2024-01-11T14:22:30.000Z",
    "status": "downloaded",
    "downloadedAt": "2024-01-11T15:00:00.000Z"
  }
]
```

#### Error Responses
- **401 Unauthorized** - Invalid or missing token
  ```json
  { "message": "Unauthorized" }
  ```
- **500 Internal Server Error** - Server error
  ```json
  { "message": "Error fetching certificates" }
  ```

#### Notes
- Returns certificates sorted by `issuedAt` in descending order (newest first)
- Populates course title
- Returns empty array if user has no certificates

---

### 2. Issue Certificate

**POST** `/api/certificates/issue`

Issues a new certificate when a user completes a course (reaches 100% progress).

#### Request
```
POST /api/certificates/issue
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "enrollmentId": "507f1f77bcf86cd799439014"
}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| enrollmentId | string | Yes | MongoDB ObjectId of the enrollment |

#### Response (201 Created)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "course": "507f1f77bcf86cd799439013",
  "enrollment": "507f1f77bcf86cd799439014",
  "certificateNumber": "CERT-1704923847352-A3X9K2B",
  "courseName": "Data Structures",
  "userName": "John Doe",
  "completionDate": "2024-01-10T10:30:00.000Z",
  "issuedAt": "2024-01-10T10:32:15.000Z",
  "status": "issued",
  "downloadedAt": null
}
```

#### Response (200 OK - Already Exists)
If certificate already issued for this enrollment, returns the existing certificate:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "course": "507f1f77bcf86cd799439013",
  "enrollment": "507f1f77bcf86cd799439014",
  "certificateNumber": "CERT-1704923847352-A3X9K2B",
  "courseName": "Data Structures",
  "userName": "John Doe",
  "completionDate": "2024-01-10T10:30:00.000Z",
  "issuedAt": "2024-01-10T10:32:15.000Z",
  "status": "issued",
  "downloadedAt": null
}
```

#### Error Responses
- **400 Bad Request** - Progress not 100%
  ```json
  { "message": "Course must be 100% complete to receive certificate" }
  ```
- **404 Not Found** - Enrollment not found or doesn't belong to user
  ```json
  { "message": "Enrollment not found" }
  ```
- **401 Unauthorized** - Invalid or missing token
  ```json
  { "message": "Unauthorized" }
  ```
- **500 Internal Server Error** - Server error
  ```json
  { "message": "Error issuing certificate" }
  ```

#### Notes
- Only creates certificate if enrollment progress === 100%
- Prevents duplicate certificates (returns existing if already issued)
- Certificate number is automatically generated
- Course name and user name captured from enrollment and user data
- Completion date captured from enrollment completion time
- Default status is "issued"

---

### 3. Get Certificate Details

**GET** `/api/certificates/:id`

Retrieves details of a specific certificate by ID.

#### Request
```
GET /api/certificates/507f1f77bcf86cd799439011
Authorization: Bearer <JWT_TOKEN>
```

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId of the certificate |

#### Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "course": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Data Structures",
    "category": "Computer Science"
  },
  "enrollment": "507f1f77bcf86cd799439014",
  "certificateNumber": "CERT-1704923847352-A3X9K2B",
  "courseName": "Data Structures",
  "userName": "John Doe",
  "completionDate": "2024-01-10T10:30:00.000Z",
  "issuedAt": "2024-01-10T10:32:15.000Z",
  "status": "issued",
  "downloadedAt": null
}
```

#### Error Responses
- **404 Not Found** - Certificate not found or belongs to different user
  ```json
  { "message": "Certificate not found" }
  ```
- **401 Unauthorized** - Invalid or missing token
  ```json
  { "message": "Unauthorized" }
  ```
- **500 Internal Server Error** - Server error
  ```json
  { "message": "Error fetching certificate" }
  ```

#### Notes
- Only returns certificates belonging to the authenticated user
- Populates full user and course details
- Can be used to display certificate details on a detail page

---

### 4. Mark Certificate as Downloaded

**PATCH** `/api/certificates/:id/download`

Marks a certificate as downloaded and records the download timestamp.

#### Request
```
PATCH /api/certificates/507f1f77bcf86cd799439011/download
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{}
```

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId of the certificate |

#### Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439012",
  "course": "507f1f77bcf86cd799439013",
  "enrollment": "507f1f77bcf86cd799439014",
  "certificateNumber": "CERT-1704923847352-A3X9K2B",
  "courseName": "Data Structures",
  "userName": "John Doe",
  "completionDate": "2024-01-10T10:30:00.000Z",
  "issuedAt": "2024-01-10T10:32:15.000Z",
  "status": "downloaded",
  "downloadedAt": "2024-01-11T15:30:00.000Z"
}
```

#### Error Responses
- **404 Not Found** - Certificate not found or belongs to different user
  ```json
  { "message": "Certificate not found" }
  ```
- **401 Unauthorized** - Invalid or missing token
  ```json
  { "message": "Unauthorized" }
  ```
- **500 Internal Server Error** - Server error
  ```json
  { "message": "Error updating certificate" }
  ```

#### Notes
- Updates certificate status to "downloaded"
- Records current timestamp in downloadedAt field
- Only updates certificates belonging to the authenticated user
- Used to track when users download their certificates

---

## Certificate Object Schema

```typescript
interface Certificate {
  _id: ObjectId;              // MongoDB ObjectId
  user: ObjectId;             // Reference to User
  course: ObjectId;           // Reference to Course
  enrollment: ObjectId;       // Reference to Enrollment
  certificateNumber: string;  // Unique certificate ID (CERT-{timestamp}-{random})
  courseName: string;         // Course title at time of issue
  userName: string;           // User name at time of issue
  completionDate: Date;       // When course was completed (100%)
  issuedAt: Date;            // When certificate was issued (default: now)
  status: 'issued' | 'downloaded'; // Certificate status (default: issued)
  downloadedAt?: Date;        // When certificate was downloaded (optional)
  __v?: number;               // Mongoose version field
}
```

---

## Certificate Number Format

```
CERT-{UNIX_TIMESTAMP}-{RANDOM_SUFFIX}
```

**Example**: `CERT-1704923847352-A3X9K2B`

- `CERT-` - Prefix
- `1704923847352` - Unix timestamp in milliseconds
- `A3X9K2B` - 8-character random alphanumeric suffix

---

## Usage Examples

### Example 1: Fetch All Certificates

```javascript
async function getCertificates() {
  const response = await fetch('http://localhost:5000/api/certificates', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.ok) {
    const certificates = await response.json();
    console.log('Certificates:', certificates);
  } else {
    console.error('Error:', await response.json());
  }
}
```

### Example 2: Issue Certificate

```javascript
async function issueCertificate(enrollmentId) {
  const response = await fetch('http://localhost:5000/api/certificates/issue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ enrollmentId })
  });
  
  if (response.ok || response.status === 201) {
    const certificate = await response.json();
    console.log('Certificate issued:', certificate);
  } else {
    console.error('Error:', await response.json());
  }
}
```

### Example 3: Download Certificate

```javascript
async function downloadCertificate(certificateId) {
  const response = await fetch(
    `http://localhost:5000/api/certificates/${certificateId}/download`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (response.ok) {
    const updated = await response.json();
    console.log('Certificate marked as downloaded:', updated);
  } else {
    console.error('Error:', await response.json());
  }
}
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "message": "Error description"
}
```

### HTTP Status Codes
- **200 OK** - Request successful
- **201 Created** - Certificate created
- **400 Bad Request** - Invalid input (e.g., progress not 100%)
- **401 Unauthorized** - Missing or invalid authentication
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

---

## Security Considerations

1. **Authentication Required** - All endpoints require valid JWT token
2. **User Isolation** - Users can only access their own certificates
3. **Ownership Verification** - System verifies certificate belongs to request user
4. **Enrollment Validation** - Only issues certificates for user's own enrollments
5. **Progress Validation** - Only creates certificate when progress === 100%

---

## Rate Limiting

No specific rate limiting implemented. Consider adding in production:
- GET /api/certificates - 100 requests/minute
- POST /api/certificates/issue - 10 requests/minute
- GET /api/certificates/:id - 100 requests/minute
- PATCH /api/certificates/:id/download - 50 requests/minute

---

## Monitoring & Logging

Recommended events to log:
- Certificate issued (user, course, certificate number)
- Certificate viewed (user, certificate ID)
- Certificate downloaded (user, certificate ID)
- Duplicate certificate attempt (user, enrollment ID)
- Failed certificate issuance (user, enrollment ID, reason)

---

## Database Queries

### Get certificates by user
```javascript
Certificate.find({ user: userId })
  .populate('course', 'title')
  .sort({ issuedAt: -1 })
```

### Get certificate by number
```javascript
Certificate.findOne({ certificateNumber: 'CERT-...' })
```

### Get downloaded certificates
```javascript
Certificate.find({ status: 'downloaded' })
```

### Count certificates by user
```javascript
Certificate.countDocuments({ user: userId })
```

---

## Integration Points

### Frontend Integration
- Call `GET /api/certificates` when CertificatesView component mounts
- Call `POST /api/certificates/issue` when enrollment reaches 100%
- Call `PATCH /api/certificates/:id/download` when download button clicked

### Backend Integration
- Issue certificate automatically in progress update endpoint
- Track certificate events in analytics
- Include certificates in user export/data requests
- Consider certificates in user deletion

---

## Future Enhancements

1. **PDF Generation** - Generate downloadable PDF certificates
2. **Email Delivery** - Send certificate via email when issued
3. **Social Sharing** - Share certificate badges on social media
4. **Certificate Verification** - Public endpoint to verify certificate authenticity
5. **Expiration** - Add expiration dates to certificates
6. **Revocation** - Ability to revoke certificates if needed
7. **Batch Operations** - Issue/download multiple certificates at once
8. **Analytics** - Track certification rates per course

---

**Last Updated**: January 2024
**Version**: 1.0
**Status**: Production Ready
