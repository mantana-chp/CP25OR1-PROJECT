# MinIO Production Deployment Checklist

## 🚀 Pre-Deployment

### 1. Environment Configuration
- [ ] Set strong `MINIO_ROOT_USER` (not default `minioadmin`)
- [ ] Set strong `MINIO_ROOT_PASSWORD` (min 8 characters)
- [ ] Set `MINIO_PUBLIC_URL` to your domain (e.g., `https://yourdomain.com/storage`)
- [ ] Set `MINIO_ENDPOINT=minio` (Docker service name)
- [ ] Set `MINIO_USE_SSL=false` (internal communication)
- [ ] Set `MINIO_BUCKET_NAME` to `dev-pet-attachments` or `prod-pet-attachments`

### 2. Docker Configuration
- [ ] **DO NOT expose MinIO ports** in `docker-compose.yml`:
  ```yaml
  # Keep these lines commented out:
  # ports:
  #   - "9000:9000"
  #   - "9001:9001"
  ```
- [ ] Verify MinIO and backend are on same Docker network (`app_net`)
- [ ] Ensure persistent volume is configured: `minio_data`

### 3. Database Migration
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Verify `profile_image_key` column exists in `pets` table

> **Note:** The bucket is created automatically when the backend starts. No manual bucket creation needed.

### 4. Nginx Reverse Proxy
- [ ] Add MinIO proxy configuration (see below)
- [ ] Test Nginx config: `nginx -t`
- [ ] Reload Nginx: `systemctl reload nginx`

---

## 🔧 Nginx Configuration

Add to your Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Existing SSL configuration...
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO Storage Proxy (NEW)
    location /storage/ {
        # Proxy to MinIO internal endpoint
        # Adjust bucket name to match MINIO_BUCKET_NAME (dev-pet-attachments or prod-pet-attachments)
        proxy_pass http://minio:9000/dev-pet-attachments/;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for large files
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
        
        # Large file uploads
        client_max_body_size 10M;
        
        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }
}
```

**Important:** Make sure Nginx can resolve `minio` hostname (it should if both are on `app_net` network).

---

## 🔒 Security Checklist

### MinIO Security
- [ ] Changed default credentials
- [ ] MinIO not accessible from public internet
- [ ] All buckets are private (no public read)
- [ ] Presigned URLs expire (5 min for PUT, 1 hour for GET)

### Application Security
- [ ] File type validation enabled (JPEG, PNG, WebP, PDF only)
- [ ] File size limit enforced (5MB max)
- [ ] User authorization checked before URL generation
- [ ] UUID-based object keys (no user-supplied filenames)
- [ ] MIME type vs extension validation

### Network Security
- [ ] MinIO only accessible via backend and Nginx
- [ ] TLS enabled on Nginx (public-facing)
- [ ] Internal Docker network isolated
- [ ] No direct access to MinIO ports

---

## 🧪 Post-Deployment Testing

### 1. Test Upload Flow (Production)

```bash
# Replace with your production domain
API_URL="https://yourdomain.com/api/v1"
TOKEN="your_jwt_token"
PET_ID="your_pet_id"

# Request upload URL
curl -X POST "$API_URL/uploads/request-url" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "fileType": "image/jpeg",
    "fileSize": 100000,
    "category": "pet-profile",
    "entityId": "'$PET_ID'"
  }'
```

Verify response contains `uploadUrl` starting with `https://yourdomain.com/storage/`

### 2. Upload Test File

```bash
# Use uploadUrl from previous step
curl -X PUT "UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --upload-file test_image.jpg
```

Should return HTTP 200.

### 3. Update Pet Profile

```bash
curl -X PUT "$API_URL/pets/me/$PET_ID/profile-image" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objectKey": "OBJECT_KEY_FROM_STEP_1"
  }'
```

### 4. Verify Image URL

```bash
curl -X GET "$API_URL/pets/me/$PET_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Check `profile_image_url` starts with `https://yourdomain.com/storage/`

### 5. Download Test

```bash
curl -X GET "PROFILE_IMAGE_URL" --output test_download.jpg
```

Should download the image successfully.

---

## 📊 Monitoring

### MinIO Health Check
```bash
docker exec backend wget -qO- http://minio:9000/minio/health/live
```

Expected output: `OK`

### Check MinIO Container
```bash
docker ps | grep minio
```

Should show status as "Up".

### View MinIO Logs
```bash
docker logs --tail 100 minio
```

Look for errors or warnings.

### Check Storage Usage
```bash
docker exec minio du -sh /data
```

---

## 🔄 Backup Strategy

### Manual Backup
```bash
# Create backup directory
mkdir -p /backups/minio/$(date +%Y-%m-%d)

# Copy MinIO data volume
docker run --rm \
  -v minio_data:/data \
  -v /backups/minio/$(date +%Y-%m-%d):/backup \
  alpine tar czf /backup/minio_backup.tar.gz -C /data .
```

### Automated Backup (Cron)
Add to crontab:
```bash
# Daily MinIO backup at 2 AM
0 2 * * * /path/to/backup_minio.sh
```

Create `/path/to/backup_minio.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/minio/$(date +\%Y-\%m-\%d)"
mkdir -p $BACKUP_DIR

docker run --rm \
  -v minio_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/minio_backup.tar.gz -C /data .

# Keep only last 7 days
find /backups/minio -type d -mtime +7 -exec rm -rf {} +
```

---

## 🚨 Disaster Recovery

### Restore from Backup
```bash
# Stop containers
docker-compose down

# Restore data
docker run --rm \
  -v minio_data:/data \
  -v /backups/minio/2026-02-25:/backup \
  alpine sh -c "cd /data && tar xzf /backup/minio_backup.tar.gz"

# Restart containers
docker-compose up -d
```

---

## 📈 Performance Tuning

### Increase Upload Size Limit (if needed)
In Nginx:
```nginx
client_max_body_size 20M;  # Increase from 10M
```

In backend `.env`:
Update validation in `upload-schema.ts` if needed.

### Enable Compression
In Nginx:
```nginx
gzip on;
gzip_types image/jpeg image/png;
gzip_min_length 1000;
```

---

## 🐛 Troubleshooting Production Issues

### Issue: "getaddrinfo ENOTFOUND minio"
**Cause:** Backend is running outside Docker (e.g. local `npm run dev`) but `MINIO_ENDPOINT=minio`
**Fix:** Set `MINIO_ENDPOINT=localhost` for local dev, `minio` for production Docker

### Issue: Upload URLs return 404
**Cause:** Nginx proxy not configured correctly
**Fix:** Verify `/storage/` location in Nginx config

### Issue: Presigned URLs have wrong domain
**Cause:** `MINIO_PUBLIC_URL` not set correctly
**Fix:** Set to `https://yourdomain.com/storage` in `.env`

### Issue: Images not loading
**Cause:** CORS or security headers blocking
**Fix:** Check Nginx headers and browser console

### Issue: "Connection refused" errors
**Cause:** Backend can't reach MinIO
**Fix:** Verify both on same Docker network, check `MINIO_ENDPOINT=minio`

---

## 📝 Production Environment Variables

Final `.env` configuration for production:

```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/dbname

# JWT
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_here
REFRESH_TOKEN_EXPIRES_IN=30d

# MinIO (PRODUCTION)
MINIO_ROOT_USER=your_secure_username
MINIO_ROOT_PASSWORD=your_secure_password_min_8_chars
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=dev-pet-attachments    # or prod-pet-attachments
MINIO_PUBLIC_URL=https://yourdomain.com/storage

# Other services...
```

---

## ✅ Go-Live Checklist

Before enabling to users:
- [ ] All environment variables set correctly
- [ ] Docker containers running (minio, backend, postgres, nginx)
- [ ] Database migration applied
- [ ] Nginx configuration active
- [ ] SSL certificate valid
- [ ] Upload flow tested end-to-end
- [ ] Download URLs working
- [ ] Image URLs expire correctly (test after 1 hour)
- [ ] Backups configured
- [ ] Monitoring in place
- [ ] Error logging working

---

## 📞 Support Resources

- MinIO Docs: https://min.io/docs/minio/linux/index.html
- Docker Compose: https://docs.docker.com/compose/
- Nginx Proxy: https://nginx.org/en/docs/

---

**Last Updated:** February 2026
