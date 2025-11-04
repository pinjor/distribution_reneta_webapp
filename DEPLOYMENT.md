# Deployment Guide

## Production Deployment Checklist

### 1. Environment Configuration

#### Backend Environment Variables
Create `backend/.env`:
```bash
DATABASE_URL=postgresql://swift_user:STRONG_PASSWORD@postgres:5432/swift_distro_hub
REDIS_URL=redis://redis:6379/0
SECRET_KEY=generate-strong-secret-key-here
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

#### Frontend Environment Variables
Create `.env.production`:
```bash
VITE_API_URL=https://api.yourdomain.com/api
```

### 2. Docker Compose Production Override

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_backup:/backups
  
  backend:
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      SECRET_KEY: ${SECRET_KEY}
      CORS_ORIGINS: ${CORS_ORIGINS}
    restart: always
  
  frontend:
    build:
      args:
        NODE_ENV: production
    restart: always
  
  nginx:
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    restart: always

volumes:
  postgres_backup:
```

### 3. SSL/TLS Configuration

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update `nginx/conf.d/default.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. Database Backup Configuration

Create backup script `scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/swift_distro_$TIMESTAMP.sql"

docker exec swift_distro_postgres pg_dump -U swift_user swift_distro_hub > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "swift_distro_*.sql" -mtime +30 -delete
```

Schedule with cron:
```bash
0 2 * * * /path/to/scripts/backup.sh
```

### 5. Monitoring Setup

#### Add monitoring to docker-compose:
```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

### 6. Security Hardening

1. **Update Default Passwords**
   - Change all default database passwords
   - Use strong, randomly generated secrets

2. **Firewall Configuration**
   - Only expose ports 80, 443 externally
   - Restrict database access to internal network

3. **Rate Limiting**
   Add to nginx:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20;
```

4. **Security Headers**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### 7. Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Build and start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Run migrations (if any)
docker-compose exec backend alembic upgrade head

# 4. Check logs
docker-compose logs -f

# 5. Verify health
curl https://yourdomain.com/health
```

### 8. Rollback Procedure

```bash
# 1. Stop services
docker-compose down

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Restart with previous version
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 9. Performance Optimization

#### Database
```sql
-- Add indexes for common queries
CREATE INDEX idx_stock_ledger_product_depot ON stock_ledger(product_id, depot_id);
CREATE INDEX idx_stock_receipts_date ON stock_receipts(receipt_date);
```

#### Redis
```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

#### Nginx
```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 10. Maintenance Window

```bash
# Put application in maintenance mode
docker-compose exec nginx mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
docker-compose exec nginx nginx -s reload

# Perform maintenance
# ...

# Restore service
docker-compose exec nginx mv /etc/nginx/conf.d/default.conf.bak /etc/nginx/conf.d/default.conf
docker-compose exec nginx nginx -s reload
```

## Cloud Deployment Options

### AWS
- Use RDS for PostgreSQL
- Use ElastiCache for Redis
- Use ECS or EKS for containers
- Use CloudFront for CDN
- Use Route 53 for DNS

### Azure
- Use Azure Database for PostgreSQL
- Use Azure Cache for Redis
- Use Azure Container Instances or AKS
- Use Azure Front Door

### Google Cloud
- Use Cloud SQL for PostgreSQL
- Use Memorystore for Redis
- Use Cloud Run or GKE
- Use Cloud CDN

## Support Contacts

- Production Support: [email]
- DevOps Team: [email]
- Emergency Hotline: [phone]

