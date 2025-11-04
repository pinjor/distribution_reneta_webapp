# Local Development Setup (Without Docker)

This guide helps you set up the Swift Distribution Hub for local development without Docker.

## Prerequisites

1. **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
2. **Node.js 20+** - [Download Node.js](https://nodejs.org/)
3. **PostgreSQL 16+** - [Download PostgreSQL](https://www.postgresql.org/download/)
4. **Redis 7+** - [Download Redis](https://redis.io/download)

## Setup Steps

### 1. Install PostgreSQL

#### Windows
```bash
# Download and install from postgresql.org
# Default port: 5432
# Remember the postgres user password
```

#### Linux
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE swift_distro_hub;
CREATE USER swift_user WITH PASSWORD 'swift_password';
GRANT ALL PRIVILEGES ON DATABASE swift_distro_hub TO swift_user;
ALTER USER swift_user CREATEDB;

# Exit psql
\q
```

### 3. Initialize Database Schema

```bash
# Windows
psql -U swift_user -d swift_distro_hub -f backend\db\init.sql

# Linux/macOS
psql -U swift_user -d swift_distro_hub -f backend/db/init.sql
```

### 4. Install and Start Redis

#### Windows
```bash
# Download from https://redis.io/download
# Extract and run: redis-server
```

#### Linux
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS
```bash
brew install redis
brew services start redis
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 5. Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://swift_user:swift_password@localhost:5432/swift_distro_hub
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:8080,http://localhost:80
EOF

# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 6. Set Up Frontend

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8000/api
EOF

# Start frontend server
npm run dev
```

Frontend will be available at: http://localhost:8080

## Verification

### Check Backend
```bash
# Test API
curl http://localhost:8000/health
# Should return: {"status":"healthy"}

# Test database connection
curl http://localhost:8000/api/companies
# Should return array of companies
```

### Check Frontend
Open http://localhost:8080 in your browser

### Check Database
```bash
psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM companies;"
# Should return: 1 (or more)
```

### Check Redis
```bash
redis-cli
127.0.0.1:6379> KEYS *
127.0.0.1:6379> QUIT
```

## Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
# Windows:
Get-Service -Name postgresql*
# Linux:
sudo systemctl status postgresql
# macOS:
brew services list
```

**Redis connection error:**
```bash
# Check Redis is running
redis-cli ping
```

**Import errors:**
```bash
# Make sure you're in the backend directory
cd backend
# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Issues

**API connection error:**
```bash
# Check VITE_API_URL in .env
cat .env
# Make sure backend is running
curl http://localhost:8000/health
```

**Build errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Backend
```bash
cd backend
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows
uvicorn main:app --reload
```

### Frontend
```bash
npm run dev
```

### Database Changes
```bash
# If you modify models, restart backend to apply changes
# Database tables are auto-created by SQLAlchemy
```

### Testing Changes
1. Make changes to backend code
2. Save file (auto-reload enabled)
3. Make changes to frontend code
4. Save file (auto-reload enabled)
5. Test in browser

## Useful Commands

```bash
# Backend
python test_backend.py           # Test imports
cd backend && python run_dev.py  # Start dev server

# Frontend
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Lint code

# Database
psql -U swift_user -d swift_distro_hub  # Connect to DB
\l                     # List databases
\dt                    # List tables
SELECT * FROM companies;  # Query

# Redis
redis-cli              # Connect
KEYS *                 # List keys
GET key_name          # Get value
FLUSHALL              # Clear all keys
```

## IDE Setup

### VS Code Extensions
- Python
- Pylance
- SQLAlchemy
- ESLint
- Tailwind CSS IntelliSense
- Prettier

### Recommended Settings
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true
}
```

## Next Steps

Once local setup is working:
1. Start developing features
2. Run tests as you develop
3. Use API docs at http://localhost:8000/docs
4. Check logs for debugging
5. Commit changes frequently

## Getting Help

- Check logs: Backend logs in terminal, Frontend logs in terminal
- Check database: Use psql to query
- Check Redis: Use redis-cli
- Check API: Use http://localhost:8000/docs

