# Swift Distribution Hub

A comprehensive warehouse distribution management system with full-stack implementation using FastAPI, PostgreSQL, Redis, React, and Docker.

## Architecture

- **Frontend**: React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Reverse Proxy**: Nginx
- **Containerization**: Docker & Docker Compose

## Features

### Warehouse Management
- Stock Receipt & Issuance
- Stock Maintenance & Adjustments
- Batch Management
- Expiry Tracking
- Inventory Monitoring

### Distribution Management
- Vehicle Management
- Driver Management
- Route Planning
- Vehicle Loading
- Delivery Tracking

### Master Data
- Companies & Depots
- Employees
- Customers & Vendors
- Products & Materials
- Shipping Points

### Business Operations
- Dashboard & Analytics
- Billing & Invoicing
- Approvals & Workflows
- Reporting

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git

## Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd swift-distro-hub
```

2. **Start all services**
```bash
# Windows
start.bat

# Linux/macOS
./start.sh

# Or manually
docker-compose up --build
```

3. **Access the application**
- Frontend: http://localhost:80
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Nginx: http://localhost (proxies both frontend and backend)

## Useful Commands

```bash
# Start services
start.bat          # Windows
./start.sh         # Linux/macOS

# Stop services
stop.bat           # Windows
./stop.sh          # Linux/macOS

# View logs
logs.bat [service] # Windows
./logs.sh [service]# Linux/macOS

# Connect to database
db.bat             # Windows
./db.sh            # Linux/macOS

# Connect to Redis
redis-cli.bat      # Windows
./redis-cli.sh     # Linux/macOS

# Full docker-compose commands
docker-compose up --build        # Start
docker-compose down              # Stop
docker-compose logs -f [service] # Logs
docker-compose ps                # Status
```

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
npm install
npm run dev
```

## Docker Services

- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **FastAPI Backend**: Port 8000
- **React Frontend**: Port 8080
- **Nginx**: Port 80

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: Secret key for security
- `CORS_ORIGINS`: Allowed CORS origins

### Frontend
- `VITE_API_URL`: Backend API URL

## API Endpoints

All API endpoints are prefixed with `/api`:
- `/api/dashboard` - Dashboard KPIs and metrics
- `/api/companies` - Company management
- `/api/depots` - Depot management
- `/api/employees` - Employee management
- `/api/customers` - Customer management
- `/api/vendors` - Vendor management
- `/api/products` - Product management
- `/api/vehicles` - Vehicle management
- `/api/drivers` - Driver management
- `/api/stock/receipts` - Stock receipts
- `/api/stock/issuances` - Stock issuances
- `/api/stock/adjustments` - Stock adjustments
- `/api/vehicle/loadings` - Vehicle loadings
- `/api/billing` - Billing and invoicing
- `/api/analytics` - Analytics and reports

Full API documentation available at `/docs` when running the backend.

## Database Schema

The application uses PostgreSQL with the following main entities:
- Companies & Depots
- Employees
- Customers & Vendors
- Products & Materials
- Vehicles & Drivers
- Stock Ledger
- Stock Operations (Receipts, Issuances, Adjustments)
- Vehicle Loadings
- Routes
- Invoices

See `backend/db/init.sql` for complete schema definition.

## Production Deployment

1. Update environment variables for production
2. Set secure passwords and secret keys
3. Configure proper CORS origins
4. Use Docker Compose production configuration
5. Set up SSL/TLS certificates
6. Configure backup strategy for PostgreSQL

## License

Proprietary - All Rights Reserved

## Documentation

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide
- **[CHECKLIST.md](CHECKLIST.md)** - Verification checklist
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - Migration summary
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[LOCAL_SETUP.md](LOCAL_SETUP.md)** - Local development without Docker
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variables guide
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview

## Support

For issues and questions, please contact the development team.
