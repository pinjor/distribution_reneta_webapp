# Getting Started with Swift Distribution Hub

Welcome to Swift Distribution Hub! This guide will help you get up and running quickly.

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- **Docker Desktop** installed and running
- **Git** installed

### Step 1: Start the Application

**Windows:**
```bash
start.bat
```

**Linux/macOS:**
```bash
./start.sh
```

**Manual:**
```bash
docker-compose up --build
```

### Step 2: Access the Application

Open your browser and go to:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

That's it! The application should be running.

---

## 📚 What's Running?

Your Docker Compose setup includes:

1. **PostgreSQL** (Port 5432) - Database
2. **Redis** (Port 6379) - Cache
3. **FastAPI Backend** (Port 8000) - API Server
4. **React Frontend** (Port 8080) - Web App
5. **Nginx** (Port 80) - Reverse Proxy

---

## 🛠️ Common Commands

### Start/Stop Services

```bash
# Start everything
start.bat           # Windows
./start.sh          # Linux/macOS

# Stop everything
stop.bat            # Windows
./stop.sh           # Linux/macOS
```

### View Logs

```bash
# All services
logs.bat            # Windows
./logs.sh           # Linux/macOS

# Specific service
logs.bat backend    # Windows
./logs.sh backend   # Linux/macOS
```

### Access Services

```bash
# Database
db.bat              # Windows
./db.sh             # Linux/macOS

# Redis
redis-cli.bat       # Windows
./redis-cli.sh      # Linux/macOS
```

---

## 🧪 Testing the Setup

### 1. Check Health

```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### 2. Check API

```bash
curl http://localhost:8000/api/companies
# Should return: JSON array of companies
```

### 3. Check Frontend

Open http://localhost in your browser - you should see the application.

### 4. Check API Docs

Open http://localhost:8000/docs - you should see Swagger UI.

---

## 📖 Next Steps

### Explore the Application

1. **Dashboard** - Overview of operations
2. **Stock Management** - Receipts, issuances, adjustments
3. **Distribution** - Vehicles, drivers, routes
4. **Masters** - Companies, customers, products
5. **Analytics** - Reports and insights

### Develop

- **Backend**: See [LOCAL_SETUP.md](LOCAL_SETUP.md)
- **Frontend**: Run `npm run dev` in project root
- **API**: Check http://localhost:8000/docs

### Deploy

- **Production**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Checklist**: See [CHECKLIST.md](CHECKLIST.md)

---

## ❓ Troubleshooting

### Docker Not Starting

```bash
# Check Docker is running
docker --version

# Restart Docker Desktop
# Then try again:
docker-compose down -v
docker-compose up --build
```

### Services Not Starting

```bash
# Check logs
logs.bat            # Windows
./logs.sh           # Linux/macOS

# Restart specific service
docker-compose restart backend
```

### Database Connection Error

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Check nginx logs
docker-compose logs nginx
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Main documentation |
| [CHECKLIST.md](CHECKLIST.md) | Verification checklist |
| [SETUP.md](SETUP.md) | Detailed setup |
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Local development |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment |
| [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md) | Migration summary |

---

## 🎉 You're Ready!

The Swift Distribution Hub is now running successfully. Explore the application, check out the API documentation, and start building amazing features!

**Questions?** Check the documentation or contact the team.

Happy coding! 🚀

