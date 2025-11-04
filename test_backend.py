#!/usr/bin/env python
"""
Quick test script to verify backend setup
"""
import sys
import importlib

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        import fastapi
        print("✓ FastAPI imported successfully")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False
    
    try:
        import sqlalchemy
        print("✓ SQLAlchemy imported successfully")
    except ImportError as e:
        print(f"✗ SQLAlchemy import failed: {e}")
        return False
    
    try:
        import redis
        print("✓ Redis imported successfully")
    except ImportError as e:
        print(f"✗ Redis import failed: {e}")
        return False
    
    try:
        import pydantic
        print("✓ Pydantic imported successfully")
    except ImportError as e:
        print(f"✗ Pydantic import failed: {e}")
        return False
    
    # Test app imports
    try:
        sys.path.insert(0, 'backend')
        from app.database import get_db, Base, engine
        print("✓ Database module imported successfully")
        
        from app.models import Company, Depot, Employee
        print("✓ Models imported successfully")
        
        from app.schemas import Company as CompanySchema
        print("✓ Schemas imported successfully")
        
    except ImportError as e:
        print(f"✗ App imports failed: {e}")
        return False
    
    print("\n✅ All imports successful!")
    return True

def test_main_app():
    """Test main app initialization"""
    print("\nTesting main app...")
    
    try:
        sys.path.insert(0, 'backend')
        from main import app
        
        if app:
            print("✓ FastAPI app initialized successfully")
            print(f"  Title: {app.title}")
            print(f"  Version: {app.version}")
            return True
        else:
            print("✗ App is None")
            return False
    except Exception as e:
        print(f"✗ App initialization failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Swift Distribution Hub - Backend Test")
    print("=" * 50)
    
    if test_imports() and test_main_app():
        print("\n" + "=" * 50)
        print("✅ Backend setup is valid!")
        print("=" * 50)
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print("❌ Backend setup has issues")
        print("=" * 50)
        sys.exit(1)

