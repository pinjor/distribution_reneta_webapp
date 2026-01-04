# Quick Start - Docker Setup

## 🚀 Get Started in 3 Steps

### 1. Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- Ensure Docker is running

### 2. Start the Application

**Windows:**
```bash
start.bat
```

**Linux/macOS:**
```bash
./start.sh
```

**Or manually:**
```bash
docker-compose up --build
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Frontend (Direct)**: http://localhost:8080
- **API Documentation**: http://localhost/api/docs
- **Backend Health**: http://localhost/api/health

## 📋 What's Running?

| Service | Container Name | Port | URL |
|---------|---------------|------|-----|
| Frontend | swift_distro_frontend | 8080 | http://localhost:8080 |
| Backend API | swift_distro_api | 8000 (internal) | http://localhost/api |
| Nginx | swift_distro_nginx | 80 | http://localhost |
| PostgreSQL | swift_distro_postgres | 55432 | localhost:55432 |
| Redis | swift_distro_redis | 6379 | localhost:6379 |

## 🔧 Common Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Restart a service
docker-compose restart frontend

# Rebuild after dependency changes
docker-compose up --build frontend
```

## 🐛 Troubleshooting

### Frontend not loading?
```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend
```

### API calls failing?
```bash
# Check backend logs
docker-compose logs backend

# Test API directly
curl http://localhost/api/health

# Check nginx logs
docker-compose logs nginx
```

### Port already in use?
- Change port in `docker-compose.yml`:
  ```yaml
  ports:
    - "8081:8080"  # Use different port
  ```

## 📚 More Information

- **Full Docker Guide**: See [DOCKER_SETUP.md](DOCKER_SETUP.md)
- **Local Setup (No Docker)**: See [LOCAL_SETUP.md](LOCAL_SETUP.md)
- **Project README**: See [README.md](README.md)

## ✅ Next Steps

1. Wait for all containers to start (check with `docker-compose ps`)
2. Initialize database (if first time): `docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -f /path/to/init.sql`
3. Seed data: `docker exec -it swift_distro_api python backend/db/seed_master_data.py`
4. Create test user: `docker exec -it swift_distro_api python backend/create_test_user.py`
5. Open http://localhost in your browser

## 🎉 You're Ready!

The application should now be running. If you encounter any issues, check the logs or refer to the full documentation.

