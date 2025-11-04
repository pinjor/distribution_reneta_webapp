@echo off
echo Connecting to PostgreSQL...
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub

