"""Script to create a test user with hashed password"""
from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import Employee

def create_test_users():
    db = SessionLocal()
    try:
        # Check if admin user exists
        existing = db.query(Employee).filter(Employee.email == "admin@swiftdistro.com").first()
        if existing:
            print("Test users already exist")
            return
        
        # Create test users
        users = [
            {
                "employee_id": "EMP-001",
                "first_name": "Admin",
                "last_name": "User",
                "email": "admin@swiftdistro.com",
                "password": "admin123",
                "phone": "+91-9876543210",
                "department": "IT",
                "designation": "System Administrator",
                "role": "admin",
                "depot_id": 1
            },
            {
                "employee_id": "EMP-002",
                "first_name": "John",
                "last_name": "Smith",
                "email": "john.smith@swiftdistro.com",
                "password": "admin123",
                "phone": "+91-9876543211",
                "department": "Warehouse",
                "designation": "Manager",
                "role": "manager",
                "depot_id": 1
            },
            {
                "employee_id": "EMP-003",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "email": "sarah.johnson@swiftdistro.com",
                "password": "admin123",
                "phone": "+91-9876543212",
                "department": "Distribution",
                "designation": "Supervisor",
                "role": "user",
                "depot_id": 1
            }
        ]
        
        for user_data in users:
            password = user_data.pop("password")
            hashed_password = get_password_hash(password)
            
            employee = Employee(
                **user_data,
                hashed_password=hashed_password,
                is_active=True
            )
            db.add(employee)
        
        db.commit()
        print("Test users created successfully!")
        
    except Exception as e:
        print(f"Error creating test users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()

