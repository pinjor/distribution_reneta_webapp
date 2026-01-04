# Docker Setup Guide for Swift Distribution Hub

This guide provides comprehensive instructions for setting up and running the Swift Distribution Hub frontend and backend using Docker.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine + Docker Compose** (Linux)
- **Git** (for cloning the repository)
- At least **4GB RAM** available for Docker
- At least **10GB free disk space**

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd distribution_reneta_webapp
```

### 2. Start All Services

```bash
# Windows
start.bat

# Linux/macOS
./start.sh

# Or manually
docker-compose up --build
```

### 3. Access the Application

- **Frontend (via Nginx)**: http://localhost
- **Frontend (Direct)**: http://localhost:8080
- **Backend API**: http://localhost/api
- **Backend API Docs**: http://localhost/api/docs
- **PostgreSQL**: localhost:55432
- **Redis**: localhost:6379

## Docker Services Overview

### 1. PostgreSQL Database
- **Container**: `swift_distro_postgres`
- **Port**: 55432 (host) → 5432 (container)
- **Database**: `swift_distro_hub`
- **User**: `swift_user`
- **Password**: `swift_password`
- **Data Persistence**: Docker volume `postgres_data`

### 2. Redis Cache
- **Container**: `swift_distro_redis`
- **Port**: 6379
- **Data Persistence**: Docker volume `redis_data`

### 3. Backend API (FastAPI)
- **Container**: `swift_distro_api`
- **Internal Port**: 8000
- **Framework**: FastAPI (Python 3.11)
- **Auto-reload**: Enabled for development
- **Health Check**: Available at `/health`

### 4. Frontend (React + Vite)
- **Container**: `swift_distro_frontend`
- **Port**: 8080
- **Framework**: React 18 + TypeScript + Vite
- **Hot Module Replacement**: Enabled
- **Development Server**: Vite dev server with HMR

### 5. Nginx Reverse Proxy
- **Container**: `swift_distro_nginx`
- **Port**: 80
- **Purpose**: Routes requests to frontend and backend
- **Configuration**: `nginx/nginx.conf` and `nginx/conf.d/default.conf`

## Environment Variables

### Frontend Environment Variables

Create a `.env` file in the project root (optional, defaults are used):

```env
VITE_API_URL=http://localhost/api
```

### Backend Environment Variables

Backend environment variables are set in `docker-compose.yml`:

```yaml
environment:
  - DATABASE_URL=postgresql://swift_user:swift_password@postgres:5432/swift_distro_hub
  - REDIS_URL=redis://redis:6379/0
  - SECRET_KEY=your-secret-key-change-in-production
  - CORS_ORIGINS=http://localhost,http://localhost:80,http://localhost:8080
```

**⚠️ Important**: Change `SECRET_KEY` in production!

## Development Workflow

### Starting Services

```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Start specific service
docker-compose up frontend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Stop specific service
docker-compose stop frontend
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 frontend
```

### Accessing Containers

```bash
# Frontend container
docker exec -it swift_distro_frontend sh

# Backend container
docker exec -it swift_distro_api bash

# PostgreSQL
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub

# Redis
docker exec -it swift_distro_redis redis-cli
```

## Frontend Development

### Hot Module Replacement (HMR)

The frontend is configured with Vite HMR for instant updates:

1. Edit files in `src/` directory
2. Changes are automatically reflected in the browser
3. No need to rebuild or restart

### Volume Mounts

The following directories are mounted as volumes for live editing:

- `./src` → `/app/src`
- `./public` → `/app/public`
- `./vite.config.ts` → `/app/vite.config.ts`
- Configuration files (package.json, tsconfig, etc.)

**Note**: `node_modules` is NOT mounted, using container's installed packages.

### Installing New Dependencies

If you need to install new npm packages:

```bash
# Option 1: Install in container
docker exec -it swift_distro_frontend npm install <package-name>

# Option 2: Install locally and rebuild
npm install <package-name>
docker-compose up --build frontend
```

### Building for Production

```bash
# Build production frontend
docker exec -it swift_distro_frontend npm run build

# Or create a production Dockerfile
# (See Production Deployment section)
```

## Backend Development

### Auto-reload

The backend uses `uvicorn --reload` for automatic code reloading:

1. Edit Python files in `backend/` directory
2. Changes are automatically detected and server restarts
3. No need to rebuild container

### Database Migrations

```bash
# Run migrations
docker exec -it swift_distro_api python backend/db/run_migration.py

# Or connect to database directly
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub
```

### Seeding Data

```bash
# Seed master data
docker exec -it swift_distro_api python backend/db/seed_master_data.py

# Seed other data (see backend/db/ directory)
docker exec -it swift_distro_api python backend/db/seed_<script_name>.py
```

## Troubleshooting

### Frontend Issues

**Problem**: Frontend not loading or showing errors

**Solutions**:
1. Check if container is running: `docker-compose ps`
2. Check logs: `docker-compose logs frontend`
3. Verify port 8080 is not in use: `netstat -an | grep 8080`
4. Rebuild frontend: `docker-compose up --build frontend`

**Problem**: HMR not working

**Solutions**:
1. Check browser console for WebSocket errors
2. Verify nginx configuration for WebSocket support
3. Try accessing frontend directly: http://localhost:8080
4. Check `vite.config.ts` HMR settings

**Problem**: API calls failing

**Solutions**:
1. Verify `VITE_API_URL` environment variable
2. Check backend is running: `docker-compose logs backend`
3. Test API directly: `curl http://localhost/api/health`
4. Check nginx logs: `docker-compose logs nginx`

### Backend Issues

**Problem**: Backend not starting

**Solutions**:
1. Check database connection: `docker-compose logs postgres`
2. Check Redis connection: `docker-compose logs redis`
3. Verify environment variables in `docker-compose.yml`
4. Check backend logs: `docker-compose logs backend`

**Problem**: Database connection errors

**Solutions**:
1. Wait for PostgreSQL to be healthy (healthcheck)
2. Verify database credentials in `docker-compose.yml`
3. Check if database exists: `docker exec -it swift_distro_postgres psql -U swift_user -l`
4. Initialize database: `docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -f /path/to/init.sql`

### Network Issues

**Problem**: Containers can't communicate

**Solutions**:
1. Verify all services are on `swift_network`: `docker network inspect swift_distro_swift_network`
2. Check service names match (use service names, not container names)
3. Restart network: `docker-compose down && docker-compose up`

### Port Conflicts

**Problem**: Port already in use

**Solutions**:
1. Find process using port: `netstat -ano | findstr :80` (Windows) or `lsof -i :80` (Linux/Mac)
2. Change port in `docker-compose.yml`:
   ```yaml
   ports:
     - "8081:8080"  # Use 8081 instead of 8080
   ```
3. Update nginx configuration if port changed

## Production Deployment

### Building Production Images

```bash
# Build production frontend
docker build -f Dockerfile.frontend.prod -t swift-distro-frontend:prod .

# Build production backend
docker build -f backend/Dockerfile.prod -t swift-distro-backend:prod ./backend
```

### Production Considerations

1. **Environment Variables**: Use `.env` file or secrets management
2. **Security**: Change all default passwords and secret keys
3. **SSL/TLS**: Configure HTTPS with certificates
4. **Database Backups**: Set up automated backups
5. **Monitoring**: Add logging and monitoring solutions
6. **Resource Limits**: Set CPU and memory limits in `docker-compose.yml`

## Useful Commands

```bash
# View running containers
docker-compose ps

# View resource usage
docker stats

# Clean up unused resources
docker system prune

# Remove all containers and volumes
docker-compose down -v

# Restart specific service
docker-compose restart frontend

# Execute command in container
docker exec -it swift_distro_frontend npm run build

# Copy file from container
docker cp swift_distro_frontend:/app/dist ./local-dist

# View container logs (last 50 lines)
docker logs --tail 50 swift_distro_frontend
```

## File Structure

```
.
├── docker-compose.yml          # Main Docker Compose configuration
├── Dockerfile.frontend         # Frontend Docker image
├── backend/
│   └── Dockerfile             # Backend Docker image
├── nginx/
│   ├── nginx.conf              # Nginx main configuration
│   └── conf.d/
│       └── default.conf       # Nginx server configuration
├── src/                        # Frontend source code (mounted)
├── public/                     # Frontend public files (mounted)
└── .env                        # Environment variables (create this)
```

## Next Steps

1. **Initialize Database**: Run initialization scripts
2. **Seed Data**: Populate with master data
3. **Create Test User**: Use `backend/create_test_user.py`
4. **Access Application**: Open http://localhost in browser
5. **Review API Docs**: Check http://localhost/api/docs

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review this documentation
- Check project README.md
- Contact development team

