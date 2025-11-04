# Environment Variables Setup

## Frontend Environment

Create a `.env` file in the project root:

```bash
# .env
VITE_API_URL=http://localhost:8000/api
```

For Docker setup:
```bash
# .env
VITE_API_URL=http://localhost/api
```

## Backend Environment

Backend environment variables are set in `docker-compose.yml`. For local development, create `backend/.env`:

```bash
# backend/.env
DATABASE_URL=postgresql://swift_user:swift_password@localhost:5432/swift_distro_hub
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev-secret-key-change-in-production
CORS_ORIGINS=http://localhost:8080,http://localhost:80
```

## Production Environment

For production, update values in `docker-compose.yml`:

```yaml
environment:
  - DATABASE_URL=postgresql://swift_user:STRONG_PASSWORD@postgres:5432/swift_distro_hub
  - REDIS_URL=redis://redis:6379/0
  - SECRET_KEY=generate-strong-random-key-here
  - CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

## Security Notes

- Never commit `.env` files to version control
- Use strong, randomly generated secrets in production
- Rotate secrets regularly
- Use environment-specific values

