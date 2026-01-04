# Docker Troubleshooting Guide

## Common Issues and Solutions

### 1. Container Name Conflicts

**Error:**
```
Error response from daemon: Conflict. The container name "/swift_distro_redis" is already in use
```

**Solution:**

**Option A: Use cleanup script**
```bash
# Windows PowerShell
.\cleanup.bat

# Linux/macOS
./cleanup.sh
```

**Option B: Manual cleanup**
```bash
# Stop and remove all containers
docker-compose down

# Or remove specific containers
docker rm -f swift_distro_redis swift_distro_postgres swift_distro_frontend swift_distro_api swift_distro_nginx
```

**Option C: Use updated start script**
The `start.bat` and `start.sh` scripts now automatically clean up before starting:
```bash
# Windows PowerShell
.\start.bat

# Linux/macOS
./start.sh
```

### 2. PowerShell Script Execution

**Error:**
```
start.bat : The term 'start.bat' is not recognized
```

**Solution:**
In PowerShell, you need to use `.\` prefix:
```powershell
.\start.bat
.\cleanup.bat
```

Or use Command Prompt (cmd.exe) instead:
```cmd
start.bat
cleanup.bat
```

### 3. Docker Compose Version Warning

**Warning:**
```
the attribute `version` is obsolete, it will be ignored
```

**Solution:**
This has been fixed! The `version: '3.8'` line has been removed from `docker-compose.yml` as it's no longer needed in newer Docker Compose versions.

### 4. Port Already in Use

**Error:**
```
Error: bind: address already in use
```

**Solution:**

**Find what's using the port:**
```bash
# Windows
netstat -ano | findstr :80
netstat -ano | findstr :8080

# Linux/macOS
lsof -i :80
lsof -i :8080
```

**Stop the process or change the port in docker-compose.yml:**
```yaml
ports:
  - "8081:8080"  # Use different port
```

### 5. Containers Not Starting

**Check container status:**
```bash
docker-compose ps
docker ps -a
```

**View logs:**
```bash
docker-compose logs frontend
docker-compose logs backend
docker-compose logs nginx
```

**Restart specific service:**
```bash
docker-compose restart frontend
docker-compose up --build frontend
```

### 6. Frontend Not Loading

**Check if frontend container is running:**
```bash
docker-compose ps frontend
```

**Check frontend logs:**
```bash
docker-compose logs -f frontend
```

**Access frontend directly:**
- Try http://localhost:8080 (direct access)
- Try http://localhost (via nginx)

**Rebuild frontend:**
```bash
docker-compose up --build frontend
```

### 7. Backend API Errors

**Check backend logs:**
```bash
docker-compose logs -f backend
```

**Test API directly:**
```bash
curl http://localhost/api/health
```

**Check database connection:**
```bash
docker-compose logs postgres
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT 1;"
```

**Check Redis connection:**
```bash
docker exec -it swift_distro_redis redis-cli ping
```

### 8. Network Issues

**Check network:**
```bash
docker network ls
docker network inspect distribution_reneta_webapp_swift_network
```

**Recreate network:**
```bash
docker-compose down
docker network prune
docker-compose up
```

### 9. Volume Issues

**List volumes:**
```bash
docker volume ls
```

**Remove volumes (⚠️ deletes data):**
```bash
docker-compose down -v
```

**Inspect volume:**
```bash
docker volume inspect distribution_reneta_webapp_postgres_data
```

### 10. Build Issues

**Clear build cache:**
```bash
docker-compose build --no-cache frontend
docker-compose build --no-cache backend
```

**Remove all images and rebuild:**
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

### 11. Permission Issues (Linux/macOS)

**Fix permissions:**
```bash
chmod +x start.sh
chmod +x cleanup.sh
chmod +x stop.sh
```

### 12. Windows-Specific Issues

**Docker Desktop not running:**
- Open Docker Desktop application
- Wait for it to fully start
- Check system tray for Docker icon

**WSL2 issues:**
- Ensure WSL2 is enabled
- Update WSL2: `wsl --update`
- Restart Docker Desktop

**File sharing issues:**
- Docker Desktop → Settings → Resources → File Sharing
- Add your project directory to shared folders

## Quick Diagnostic Commands

```bash
# Check Docker is running
docker ps

# Check all containers
docker-compose ps

# Check all logs
docker-compose logs

# Check resource usage
docker stats

# Check Docker version
docker --version
docker-compose --version

# Check network connectivity
docker exec -it swift_distro_frontend ping backend
docker exec -it swift_distro_api ping postgres
```

## Complete Reset

If nothing works, do a complete reset:

```bash
# Stop everything
docker-compose down -v

# Remove all containers
docker ps -a --filter "name=swift_distro" -q | xargs docker rm -f

# Remove all images
docker images | grep distribution_reneta_webapp | awk '{print $3}' | xargs docker rmi -f

# Clean up
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## Getting Help

1. Check logs: `docker-compose logs -f`
2. Check container status: `docker-compose ps`
3. Review this troubleshooting guide
4. Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed setup
5. Review Docker Desktop logs (Windows/Mac)

