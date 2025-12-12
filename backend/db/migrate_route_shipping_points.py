#!/usr/bin/env python3
"""
Migration script to add route shipping points table and update transport expenses
"""
import os
import sys
import subprocess

# Get database connection details from environment or use defaults
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "swift_distro_hub")
DB_USER = os.getenv("DB_USER", "swift_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "swift_password")

def run_migration():
    """Run the migration SQL file"""
    migration_file = os.path.join(
        os.path.dirname(__file__),
        "migrations",
        "add_route_shipping_points_and_expense_updates.sql"
    )
    
    if not os.path.exists(migration_file):
        print(f"Error: Migration file not found: {migration_file}")
        sys.exit(1)
    
    # Use docker exec to run psql inside the container
    docker_cmd = [
        "docker", "exec", "-i", "swift_distro_db",
        "psql", "-U", DB_USER, "-d", DB_NAME, "-f", "/tmp/migration.sql"
    ]
    
    # Copy file to container first
    copy_cmd = [
        "docker", "cp", migration_file, f"swift_distro_db:/tmp/migration.sql"
    ]
    
    print("Copying migration file to container...")
    try:
        subprocess.run(copy_cmd, check=True)
        print("✓ Migration file copied")
    except subprocess.CalledProcessError as e:
        print(f"Error copying file: {e}")
        sys.exit(1)
    
    print("Running migration...")
    try:
        result = subprocess.run(docker_cmd, check=True, capture_output=True, text=True)
        print("✓ Migration completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running migration: {e}")
        if e.stderr:
            print(f"Error output: {e.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    print("Starting migration: Add Route Shipping Points and Update Transport Expenses")
    print("=" * 70)
    run_migration()
    print("=" * 70)
    print("Migration completed!")

