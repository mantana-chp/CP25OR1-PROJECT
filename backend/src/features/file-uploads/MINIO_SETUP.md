# MinIO Object Storage Setup Guide

## 📋 Overview

MinIO has been integrated into your backend for secure file storage (pet profile pictures and attachments). This implementation uses **presigned URLs** for direct client-to-storage uploads, following production best practices.

---

## 🏗️ Architecture

```
Mobile App → Backend (Generate Presigned URL) → Mobile App → MinIO (Direct Upload)
                                                ↓
                                         Database (Save metadata)
```

### Key Features:
- ✅ **Docker network isolation**: MinIO not exposed to public internet
- ✅ **Presigned URLs**: Secure, time-limited upload/download URLs
- ✅ **Client-side compression**: Images compressed before upload
- ✅ **UUID-based naming**: Prevents filename collisions
- ✅ **Automatic cleanup**: Old images deleted when replacing

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
npm install minio
```

### Step 2: Update Environment Variables

Copy the MinIO configuration from `.env.example` to your `.env` file:

**For Local Development (`npm run dev` + Docker MinIO):**
```bash
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_ENDPOINT=localhost                 # Backend runs on host, reaches MinIO via localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=dev-pet-attachments
MINIO_PUBLIC_URL=http://localhost:9000
```

**For Production (VM - backend + MinIO both in Docker):**
```bash
MINIO_ROOT_USER=your_secure_username
MINIO_ROOT_PASSWORD=your_secure_password
MINIO_ENDPOINT=minio                    # Docker service name (internal network)
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=dev-pet-attachments    # or prod-pet-attachments
MINIO_PUBLIC_URL=https://yourdomain.com/storage  # Proxied through Nginx
```

> **Key:** Use `localhost` when backend runs outside Docker, use `minio` when backend runs inside Docker.

### Step 3: Run Database Migration

```bash
npx prisma migrate dev --name add_pet_profile_image
```

This adds the `profile_image_key` column to the `pets` table.

### Step 4: Start Services

#### Local Development (MinIO via Docker Desktop):

Use the separate local compose file that runs **only MinIO** with ports exposed:

```bash
cd backend
docker compose -f docker-compose.local.yml up -d
```

Then start the backend normally:
```bash
npm run dev
```

- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001 (login: `admin` / `minioadmin123`)
- The bucket is created automatically on backend startup.

> **Note:** MinIO init is non-blocking — if MinIO is not running, the server still starts but upload features won't work.

#### Production (VM):

MinIO ports are NOT exposed in `docker-compose.yml` (backend connects internally via Docker network):

```bash
docker compose up -d
```

---

## 🧪 Testing the Implementation

### Test 1: Request Upload URL

**Request:**
```http
POST http://localhost:3000/api/v1/uploads/request-url
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "fileName": "my-dog.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1048576,
  "category": "pet-profile",
  "entityId": "YOUR_PET_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "http://localhost:9000/pet-attachments/pet-images/...",
    "objectKey": "pet-images/USER_ID/PET_ID/UUID.jpg",
    "expiresIn": 300,
    "instructions": {
      "method": "PUT",
      "headers": {
        "Content-Type": "image/jpeg"
      }
    }
  }
}
```

### Test 2: Upload File Directly to MinIO

```bash
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: image/jpeg" \
  --upload-file /path/to/your/image.jpg
```

Or using JavaScript:
```javascript
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'image/jpeg',
  },
  body: imageBlob,
});
```

### Test 3: Update Pet Profile Picture

**Request:**
```http
PUT http://localhost:3000/api/v1/pets/me/YOUR_PET_ID/profile-image
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "objectKey": "pet-images/USER_ID/PET_ID/UUID.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PET_ID",
    "pet_name": "Buddy",
    "profile_image_url": "http://localhost:9000/pet-attachments/...",
    ...
  }
}
```

### Test 4: Get Pet Profile (with image URL)

```http
GET http://localhost:3000/api/v1/pets/me/YOUR_PET_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

The response will include a presigned `profile_image_url` valid for 1 hour.

### Test 5: Delete Profile Picture

```http
DELETE http://localhost:3000/api/v1/pets/me/YOUR_PET_ID/profile-image
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔧 Production Configuration

### Nginx Reverse Proxy Setup

Add this to your Nginx configuration to proxy MinIO:

```nginx
# MinIO API proxy (for presigned URLs)
location /storage/ {
    proxy_pass http://minio:9000/pet-attachments/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Increase timeouts for large files
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_read_timeout 300;
    send_timeout 300;
    
    # Allow large file uploads
    client_max_body_size 10M;
}
```

Update `.env` for production:
```bash
MINIO_PUBLIC_URL=https://yourdomain.com/storage
```

---

## 📁 Object Storage Structure

```
dev-pet-attachments/           # (or prod-pet-attachments)
├── pet-images/
│   └── {userId}/
│       └── {petId}/
│           └── {uuid}.jpg
└── attachments/
    └── {userId}/
        └── {petId}/
            └── {reminderId}/
                └── {uuid}.pdf
```

---

## 🔒 Security Features

1. **No public bucket access**: All files private, accessed via presigned URLs
2. **Time-limited URLs**: Upload URLs expire in 5 minutes, download URLs in 1 hour
3. **File validation**:
   - File type whitelist (JPEG, PNG, WebP, PDF)
   - Max size: 10MB
   - Extension/MIME type matching
4. **Authorization checks**: User ownership verified before generating URLs
5. **UUID-based naming**: Prevents path traversal attacks

---

## 📱 Mobile App Integration

### Upload Flow:

```typescript
// 1. Compress image on client
const compressedImage = await compressImage(originalImage, {
  maxWidth: 1024,
  quality: 0.8,
});

// 2. Request presigned URL
const uploadResponse = await fetch('/api/v1/uploads/request-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileName: 'profile.jpg',
    fileType: 'image/jpeg',
    fileSize: compressedImage.size,
    category: 'pet-profile',
    entityId: petId,
  }),
});

const { uploadUrl, objectKey } = await uploadResponse.json();

// 3. Upload directly to MinIO
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'image/jpeg',
  },
  body: compressedImage,
});

// 4. Update pet profile with object key
await fetch(`/api/v1/pets/me/${petId}/profile-image`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ objectKey }),
});
```

---

## 🐛 Troubleshooting

### Issue: "getaddrinfo ENOTFOUND minio"

**Cause:** Backend is running outside Docker (e.g. `npm run dev`) but `MINIO_ENDPOINT=minio`.
**Solution:** Set `MINIO_ENDPOINT=localhost` in `.env` for local development.

### Issue: "Connection refused" when backend tries to connect to MinIO

**Solution:** Ensure the MinIO container is running:
- Local: `docker compose -f docker-compose.local.yml up -d` (container name: `minio-local`)
- VM: `docker compose up -d` (container name: `minio`)

### Issue: Upload URL doesn't work from mobile app

**Solution:** Check `MINIO_PUBLIC_URL` is accessible from the mobile device. For local testing, use your machine's IP instead of `localhost`.

### Issue: "File not found" after upload

**Solution:** Ensure the upload actually succeeded. Check MinIO logs:
```bash
# Local
docker logs minio-local
# VM
docker logs minio
```

### Issue: Images not loading in production

**Solution:** Verify Nginx proxy configuration and that `MINIO_PUBLIC_URL` matches your domain.

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/uploads/request-url` | POST | Get presigned upload URL |
| `/api/v1/uploads/confirm` | POST | Verify upload completion |
| `/api/v1/uploads/download?key=` | GET | Get download URL |
| `/api/v1/pets/me/:id/profile-image` | PUT | Update pet profile picture |
| `/api/v1/pets/me/:id/profile-image` | DELETE | Delete pet profile picture |
| `/api/v1/pets/me/:id` | GET | Get pet (includes image URL) |

---

## 🎯 Next Steps

1. ✅ **Implement client-side compression** in your mobile app
2. ✅ **Add loading states** during upload
3. ✅ **Handle upload failures** with retry logic
4. 🔄 **Consider adding**: 
   - Image thumbnail generation
   - File hash checking for duplicates
   - Upload progress tracking
   - Batch upload for multiple files

---

## 📝 Notes

- Presigned URLs are generated on-demand and never stored
- Old profile images are automatically deleted when replaced
- MinIO bucket is created automatically on first startup
- All file operations are logged for debugging

---

**Happy coding! 🚀**
