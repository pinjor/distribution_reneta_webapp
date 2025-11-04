# Swift Distribution Hub - Setup Guide

## Quick Start

### 1. Prerequisites
- Docker Desktop installed and running
- Git installed

### 2. Clone and Setup
```bash
git clone <your-repo-url>
cd swift-distro-hub
```

### 3. Start All Services
```bash
docker-compose up --build
```

### 4. Access the Application
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Architecture

The application consists of 4 main Docker containers:

1. **PostgreSQL** - Database server on port 5432
2. **Redis** - Caching layer on port 6379
3. **FastAPI Backend** - REST API on port 8000
4. **React Frontend** - Web interface on port 8080
5. **Nginx** - Reverse proxy on port 80

## Services Overview

### Database Services
- **PostgreSQL**: Stores all application data
  - Database: swift_distro_hub
  - User: swift_user
  - Password: swift_password
  - Port: 5432

- **Redis**: Caching layer for performance
  - Persistence: AOF enabled
  - Port: 6379

### Application Services
- **Backend (FastAPI)**:
  - Python 3.11
  - SQLAlchemy ORM
  - Redis caching
  - Auto-reload in development
  - Port: 8000

- **Frontend (React)**:
  - Vite build tool
  - TypeScript
  - shadcn/ui components
  - Tailwind CSS
  - Port: 8080

- **Nginx**:
  - Routes `/api/*` to backend
  - Routes `/` to frontend
  - CORS handling
  - Port: 80

## API Endpoints

All endpoints are under `/api` prefix:

### Masters
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company
- `GET /api/depots` - List depots
- `GET /api/employees` - List employees
- `GET /api/customers` - List customers
- `GET /api/vendors` - List vendors
- `GET /api/products` - List products
- `GET /api/vehicles` - List vehicles
- `GET /api/drivers` - List drivers

### Stock Operations
- `GET /api/stock/receipts` - Stock receipts
- `GET /api/stock/issuances` - Stock issuances
- `GET /api/stock/adjustments` - Stock adjustments
- `GET /api/stock/maintenance` - Stock ledger

### Distribution
- `GET /api/vehicle/loadings` - Vehicle loadings
- `GET /api/routes` - Routes

### Dashboard & Analytics
- `GET /api/dashboard/kpis` - Dashboard metrics
- `GET /api/analytics/sales-trend` - Sales analytics
- `GET /api/billing/invoices` - Invoices

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development
```bash
npm install
npm run dev
```

## Troubleshooting

### Port Conflicts
If ports are already in use, edit `docker-compose.yml` to change:
- PostgreSQL: 5432
- Redis: 6379
- Backend: 8000
- Frontend: 8080
- Nginx: 80

### Database Reset
```bash
docker-compose down -v
docker-compose up --build
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild Containers
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

1. Update environment variables in `docker-compose.yml`
2. Set strong passwords and secret keys
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure database backups
6. Set up monitoring and logging

## Sample Data

The database comes pre-populated with:
- Sample companies and depots
- Sample products (Paracetamol, Amoxicillin, etc.)
- Sample customers and vendors

## Support

For issues or questions, contact the development team.

