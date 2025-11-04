@echo off
if "%1"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %1
)

