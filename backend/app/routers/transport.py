from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
import io
from haversine import haversine, Unit

from app.database import get_db
from app.models import (
    Vehicle, Driver, Route, RouteStop, Trip, TransportExpense, Order
)
import app.models as models
from app.schemas import (
    VehicleCreate, VehicleUpdate, Vehicle as VehicleSchema,
    DriverCreate, DriverUpdate, Driver as DriverSchema,
    RouteStopCreate, RouteStop as RouteStopSchema,
    TripCreate, TripUpdate, Trip as TripSchema, TripWithDetails,
    TransportExpenseCreate, TransportExpenseUpdate, TransportExpense as TransportExpenseSchema,
    TripAssignmentRequest, TripAssignmentResponse, TransportReportRequest, TransportReportResponse
)

router = APIRouter()


# ============ Vehicle Management ============

@router.get("/vehicles", response_model=List[VehicleSchema])
def get_vehicles(
    skip: int = 0,
    limit: int = 100,
    depot_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all vehicles with optional filters"""
    query = db.query(Vehicle)
    
    if depot_id:
        query = query.filter(Vehicle.depot_id == depot_id)
    if status:
        query = query.filter(Vehicle.status == status)
    
    vehicles = query.offset(skip).limit(limit).all()
    return vehicles

@router.get("/vehicles/{vehicle_id}", response_model=VehicleSchema)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Get a specific vehicle"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@router.post("/vehicles", response_model=VehicleSchema)
def create_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    """Create a new vehicle"""
    # Check if vehicle_id already exists
    existing = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle.vehicle_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle ID already exists")
    
    # Check if registration_number already exists
    existing_reg = db.query(Vehicle).filter(Vehicle.registration_number == vehicle.registration_number).first()
    if existing_reg:
        raise HTTPException(status_code=400, detail="Registration number already exists")
    
    db_vehicle = Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.put("/vehicles/{vehicle_id}", response_model=VehicleSchema)
def update_vehicle(vehicle_id: int, vehicle: VehicleUpdate, db: Session = Depends(get_db)):
    """Update a vehicle"""
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_data = vehicle.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vehicle, field, value)
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Delete a vehicle (soft delete by setting is_active=False)"""
    db_vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    db_vehicle.is_active = False
    db.commit()
    return {"message": "Vehicle deleted successfully"}


# ============ Driver Management ============

@router.get("/drivers", response_model=List[DriverSchema])
def get_drivers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all drivers with optional filters"""
    query = db.query(Driver)
    
    if status:
        query = query.filter(Driver.status == status)
    
    drivers = query.offset(skip).limit(limit).all()
    return drivers

@router.get("/drivers/{driver_id}", response_model=DriverSchema)
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    """Get a specific driver"""
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.post("/drivers", response_model=DriverSchema)
def create_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    """Create a new driver"""
    # Check if driver_id already exists
    existing = db.query(Driver).filter(Driver.driver_id == driver.driver_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Driver ID already exists")
    
    # Check if license_number already exists
    existing_license = db.query(Driver).filter(Driver.license_number == driver.license_number).first()
    if existing_license:
        raise HTTPException(status_code=400, detail="License number already exists")
    
    db_driver = Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.put("/drivers/{driver_id}", response_model=DriverSchema)
def update_driver(driver_id: int, driver: DriverUpdate, db: Session = Depends(get_db)):
    """Update a driver"""
    db_driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = driver.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_driver, field, value)
    
    db.commit()
    db.refresh(db_driver)
    return db_driver

@router.delete("/drivers/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    """Delete a driver (soft delete by setting is_active=False)"""
    db_driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    db_driver.is_active = False
    db.commit()
    return {"message": "Driver deleted successfully"}


# ============ Route Stops Management ============

@router.get("/routes/{route_id}/stops", response_model=List[RouteStopSchema])
def get_route_stops(route_id: int, db: Session = Depends(get_db)):
    """Get all stops for a route, ordered by sequence"""
    stops = db.query(RouteStop).filter(
        RouteStop.route_id == route_id
    ).order_by(RouteStop.stop_sequence).all()
    return stops

@router.post("/routes/{route_id}/stops", response_model=RouteStopSchema)
def create_route_stop(route_id: int, stop: RouteStopCreate, db: Session = Depends(get_db)):
    """Create a route stop"""
    # Verify route exists
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    stop_data = stop.model_dump()
    stop_data["route_id"] = route_id
    db_stop = RouteStop(**stop_data)
    db.add(db_stop)
    db.commit()
    db.refresh(db_stop)
    return db_stop

@router.delete("/routes/stops/{stop_id}")
def delete_route_stop(stop_id: int, db: Session = Depends(get_db)):
    """Delete a route stop"""
    db_stop = db.query(RouteStop).filter(RouteStop.id == stop_id).first()
    if not db_stop:
        raise HTTPException(status_code=404, detail="Route stop not found")
    
    db.delete(db_stop)
    db.commit()
    return {"message": "Route stop deleted successfully"}


# ============ Distance Calculation ============

def calculate_route_distance(route_id: int, db: Session) -> float:
    """Calculate total distance of a route using Haversine formula"""
    stops = db.query(RouteStop).filter(
        RouteStop.route_id == route_id
    ).order_by(RouteStop.stop_sequence).all()
    
    if len(stops) < 2:
        return 0.0
    
    total_distance = 0.0
    for i in range(len(stops) - 1):
        stop1 = stops[i]
        stop2 = stops[i + 1]
        
        if stop1.latitude and stop1.longitude and stop2.latitude and stop2.longitude:
            point1 = (float(stop1.latitude), float(stop1.longitude))
            point2 = (float(stop2.latitude), float(stop2.longitude))
            distance_km = haversine(point1, point2, unit=Unit.KILOMETERS)
            total_distance += distance_km
    
    return round(total_distance, 2)


@router.get("/routes/{route_id}/distance")
def get_route_distance(route_id: int, db: Session = Depends(get_db)):
    """Calculate and return route distance"""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    distance = calculate_route_distance(route_id, db)
    return {"route_id": route_id, "route_name": route.name, "distance_km": distance}


# ============ Trip Management ============

def generate_trip_number(db: Session) -> str:
    """Generate unique trip number"""
    today = date.today()
    year = today.strftime("%Y")
    month = today.strftime("%m")
    
    # Get count of trips today
    count = db.query(func.count(Trip.id)).filter(
        func.date(Trip.created_at) == today
    ).scalar() or 0
    
    trip_number = f"TRP-{year}{month}-{str(count + 1).zfill(4)}"
    return trip_number

@router.post("/trips/backfill-from-orders")
def backfill_trips_from_orders(db: Session = Depends(get_db)):
    """Create trips for existing orders that have loading numbers but no trips"""
    from datetime import date
    from sqlalchemy import func
    
    # Get all orders with loading numbers that don't have trips
    orders_with_loading = db.query(Order).filter(
        Order.loading_number.isnot(None),
        Order.assigned_vehicle.isnot(None),
        Order.assigned_to.isnot(None)
    ).all()
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    for order in orders_with_loading:
        # Check if trip already exists for this order
        existing_trip = db.query(Trip).filter(Trip.delivery_id == order.id).first()
        if existing_trip:
            skipped_count += 1
            continue
        
        try:
            # Get vehicle
            vehicle = db.query(Vehicle).filter(Vehicle.id == order.assigned_vehicle).first()
            if not vehicle:
                error_count += 1
                continue
            
            # Find route by route_code
            route = None
            if order.route_code:
                route = db.query(Route).filter(Route.route_id == order.route_code).first()
            
            # Find driver - try to match by employee name
            driver = None
            employee = db.query(models.Employee).filter(models.Employee.id == order.assigned_to).first()
            
            if employee:
                # Try to find driver by matching first name and last name
                driver = db.query(Driver).filter(
                    Driver.first_name == employee.first_name,
                    Driver.last_name == employee.last_name
                ).first()
            
            # If no match, get any available driver
            if not driver:
                driver = db.query(Driver).filter(Driver.status == "Available", Driver.is_active == True).first()
            
            # If still no driver, get any active driver
            if not driver:
                driver = db.query(Driver).filter(Driver.is_active == True).first()
            
            # Only create trip if we have route and driver
            if route and driver:
                # Calculate distance
                distance_km = calculate_route_distance(route.id, db)
                
                # Calculate estimated fuel cost
                estimated_fuel_cost = 0.0
                if vehicle.fuel_rate and distance_km > 0:
                    estimated_fuel_cost = float(vehicle.fuel_rate) * distance_km
                
                # Generate trip number
                trip_number = generate_trip_number(db)
                
                # Create trip
                trip_data = {
                    "trip_number": trip_number,
                    "delivery_id": order.id,
                    "vehicle_id": vehicle.id,
                    "driver_id": driver.id,
                    "route_id": route.id,
                    "trip_date": order.loading_date or order.delivery_date or date.today(),
                    "distance_km": distance_km,
                    "estimated_fuel_cost": estimated_fuel_cost,
                    "status": "Scheduled",
                    "notes": f"Backfilled from existing order. Loading Number: {order.loading_number}"
                }
                
                db_trip = Trip(**trip_data)
                db.add(db_trip)
                db.flush()
                
                # Create auto-calculated fuel expense
                if estimated_fuel_cost > 0:
                    fuel_expense = TransportExpense(
                        trip_id=db_trip.id,
                        expense_type="fuel",
                        amount=estimated_fuel_cost,
                        description=f"Auto-calculated fuel cost for {distance_km} km (Loading: {order.loading_number})",
                        expense_date=order.loading_date or order.delivery_date or date.today(),
                        is_auto_calculated=True
                    )
                    db.add(fuel_expense)
                
                created_count += 1
            else:
                error_count += 1
                print(f"Skipping order {order.id}: route={route is not None}, driver={driver is not None}")
        
        except Exception as e:
            error_count += 1
            print(f"Error creating trip for order {order.id}: {str(e)}")
            db.rollback()
            continue
    
    db.commit()
    
    return {
        "message": f"Backfill completed: {created_count} trips created, {skipped_count} skipped (already exist), {error_count} errors",
        "created": created_count,
        "skipped": skipped_count,
        "errors": error_count
    }

@router.get("/trips", response_model=List[TripWithDetails])
def get_trips(
    skip: int = 0,
    limit: int = 100,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    route_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all trips with optional filters"""
    query = db.query(Trip)
    
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    if route_id:
        query = query.filter(Trip.route_id == route_id)
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    if status:
        query = query.filter(Trip.status == status)
    
    trips = query.order_by(Trip.trip_date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for trip in trips:
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()
        
        # Calculate total expenses
        total_expenses = db.query(func.sum(TransportExpense.amount)).filter(
            TransportExpense.trip_id == trip.id
        ).scalar() or 0
        
        # Get route
        route = db.query(Route).filter(Route.id == trip.route_id).first()
        
        # Get order details if delivery_id exists
        order = None
        if trip.delivery_id:
            order = db.query(Order).filter(Order.id == trip.delivery_id).first()
        
        trip_dict = {
            "id": trip.id,
            "trip_number": trip.trip_number,
            "delivery_id": trip.delivery_id,
            "vehicle_id": trip.vehicle_id,
            "driver_id": trip.driver_id,
            "route_id": trip.route_id,
            "trip_date": trip.trip_date,
            "distance_km": float(trip.distance_km) if trip.distance_km else None,
            "estimated_fuel_cost": float(trip.estimated_fuel_cost) if trip.estimated_fuel_cost else None,
            "actual_fuel_cost": float(trip.actual_fuel_cost) if trip.actual_fuel_cost else None,
            "status": trip.status,
            "start_time": trip.start_time,
            "end_time": trip.end_time,
            "notes": trip.notes,
            "created_at": trip.created_at,
            "updated_at": trip.updated_at,
            "vehicle": VehicleSchema.model_validate(vehicle) if vehicle else None,
            "driver": DriverSchema.model_validate(driver) if driver else None,
            "route": {
                "id": route.id,
                "name": route.name,
                "route_id": route.route_id
            } if route else None,
            "route_name": route.name if route else None,
            "order": {
                "id": order.id,
                "memo_number": order.memo_number,
                "loading_number": order.loading_number,
                "customer_name": order.customer_name,
                "route_code": order.route_code,
                "route_name": order.route_name,
            } if order else None,
            "total_expenses": float(total_expenses),
        }
        
        result.append(TripWithDetails(**trip_dict))
    
    return result

@router.get("/trips/{trip_id}", response_model=TripWithDetails)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    """Get a specific trip with details"""
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()
    route = db.query(Route).filter(Route.id == trip.route_id).first()
    
    # Get order details if delivery_id exists
    order = None
    if trip.delivery_id:
        order = db.query(Order).filter(Order.id == trip.delivery_id).first()
    
    total_expenses = db.query(func.sum(TransportExpense.amount)).filter(
        TransportExpense.trip_id == trip.id
    ).scalar() or 0
    
    trip_dict = {
        "id": trip.id,
        "trip_number": trip.trip_number,
        "delivery_id": trip.delivery_id,
        "vehicle_id": trip.vehicle_id,
        "driver_id": trip.driver_id,
        "route_id": trip.route_id,
        "trip_date": trip.trip_date,
        "distance_km": float(trip.distance_km) if trip.distance_km else None,
        "estimated_fuel_cost": float(trip.estimated_fuel_cost) if trip.estimated_fuel_cost else None,
        "actual_fuel_cost": float(trip.actual_fuel_cost) if trip.actual_fuel_cost else None,
        "status": trip.status,
        "start_time": trip.start_time,
        "end_time": trip.end_time,
        "notes": trip.notes,
        "created_at": trip.created_at,
        "updated_at": trip.updated_at,
        "vehicle": VehicleSchema.model_validate(vehicle) if vehicle else None,
        "driver": DriverSchema.model_validate(driver) if driver else None,
        "route": {
            "id": route.id,
            "name": route.name,
            "route_id": route.route_id
        } if route else None,
        "route_name": route.name if route else None,
        "order": {
            "id": order.id,
            "memo_number": order.memo_number,
            "loading_number": order.loading_number,
            "customer_name": order.customer_name,
            "route_code": order.route_code,
            "route_name": order.route_name,
        } if order else None,
        "total_expenses": float(total_expenses),
    }
    
    return TripWithDetails(**trip_dict)

@router.post("/trips/assign", response_model=TripAssignmentResponse)
def assign_trip(assignment: TripAssignmentRequest, db: Session = Depends(get_db)):
    """Assign vehicle and driver to a route/delivery with automatic distance and cost calculation"""
    # Verify vehicle exists
    vehicle = db.query(Vehicle).filter(Vehicle.id == assignment.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Verify driver exists
    driver = db.query(Driver).filter(Driver.id == assignment.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Verify route exists
    route = db.query(Route).filter(Route.id == assignment.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Calculate distance
    distance_km = calculate_route_distance(assignment.route_id, db)
    
    # Calculate estimated fuel cost
    estimated_fuel_cost = 0.0
    if vehicle.fuel_rate and distance_km > 0:
        estimated_fuel_cost = float(vehicle.fuel_rate) * distance_km
    
    # Generate trip number
    trip_number = generate_trip_number(db)
    
    # Create trip
    trip_data = {
        "trip_number": trip_number,
        "delivery_id": assignment.delivery_id,
        "vehicle_id": assignment.vehicle_id,
        "driver_id": assignment.driver_id,
        "route_id": assignment.route_id,
        "trip_date": assignment.trip_date,
        "distance_km": distance_km,
        "estimated_fuel_cost": estimated_fuel_cost,
        "status": "Scheduled",
        "notes": assignment.notes
    }
    
    db_trip = Trip(**trip_data)
    db.add(db_trip)
    
    # Create auto-calculated fuel expense
    if estimated_fuel_cost > 0:
        fuel_expense = TransportExpense(
            trip_id=None,  # Will be set after commit
            expense_type="fuel",
            amount=estimated_fuel_cost,
            description=f"Auto-calculated fuel cost for {distance_km} km",
            expense_date=assignment.trip_date,
            is_auto_calculated=True
        )
        db.add(fuel_expense)
    
    db.commit()
    db.refresh(db_trip)
    
    # Update fuel expense with trip_id
    if estimated_fuel_cost > 0:
        fuel_expense.trip_id = db_trip.id
        db.commit()
    
    # Update order if delivery_id is provided
    if assignment.delivery_id:
        order = db.query(Order).filter(Order.id == assignment.delivery_id).first()
        if order:
            order.assigned_vehicle = assignment.vehicle_id
            db.commit()
    
    return TripAssignmentResponse(
        trip=TripSchema.model_validate(db_trip),
        calculated_distance=distance_km,
        estimated_fuel_cost=estimated_fuel_cost,
        message=f"Trip assigned successfully. Distance: {distance_km} km, Estimated fuel cost: ৳{estimated_fuel_cost:.2f}"
    )

@router.put("/trips/{trip_id}", response_model=TripSchema)
def update_trip(trip_id: int, trip: TripUpdate, db: Session = Depends(get_db)):
    """Update a trip"""
    db_trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_data = trip.model_dump(exclude_unset=True)
    
    # Recalculate distance and fuel cost if route changed
    if "route_id" in update_data:
        new_distance = calculate_route_distance(update_data["route_id"], db)
        update_data["distance_km"] = new_distance
        
        vehicle = db.query(Vehicle).filter(Vehicle.id == db_trip.vehicle_id).first()
        if vehicle and vehicle.fuel_rate:
            update_data["estimated_fuel_cost"] = float(vehicle.fuel_rate) * new_distance
    
    for field, value in update_data.items():
        setattr(db_trip, field, value)
    
    db.commit()
    db.refresh(db_trip)
    return db_trip

@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    """Delete a trip"""
    db_trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(db_trip)
    db.commit()
    return {"message": "Trip deleted successfully"}


# ============ Expense Management ============

@router.get("/expenses", response_model=List[TransportExpenseSchema])
def get_expenses(route_id: Optional[int] = None, trip_number: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all expenses, optionally filtered by route or trip number"""
    query = db.query(TransportExpense)
    if route_id:
        query = query.filter(TransportExpense.route_id == route_id)
    if trip_number:
        query = query.filter(TransportExpense.trip_number == trip_number)
    return query.order_by(TransportExpense.expense_date.desc()).all()

@router.get("/trips/{trip_id}/expenses", response_model=List[TransportExpenseSchema])
def get_trip_expenses(trip_id: int, db: Session = Depends(get_db)):
    """Get all expenses for a trip (legacy endpoint)"""
    expenses = db.query(TransportExpense).filter(
        TransportExpense.trip_id == trip_id
    ).order_by(TransportExpense.expense_date).all()
    return expenses

@router.post("/expenses", response_model=TransportExpenseSchema)
def create_expense(expense: TransportExpenseCreate, db: Session = Depends(get_db)):
    """Create a new expense (route-based or trip-based)"""
    expense_data = expense.model_dump()
    
    # If trip_number is provided, try to find the trip
    if expense_data.get("trip_number") and not expense_data.get("trip_id"):
        trip = db.query(Trip).filter(Trip.trip_number == expense_data["trip_number"]).first()
        if trip:
            expense_data["trip_id"] = trip.id
            if not expense_data.get("route_id"):
                expense_data["route_id"] = trip.route_id
    
    db_expense = TransportExpense(**expense_data)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.post("/trips/{trip_id}/expenses", response_model=TransportExpenseSchema)
def create_expense_legacy(trip_id: int, expense: TransportExpenseCreate, db: Session = Depends(get_db)):
    """Create an expense for a trip (legacy endpoint)"""
    # Verify trip exists
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    expense_data = expense.model_dump()
    expense_data["trip_id"] = trip_id
    expense_data["trip_number"] = trip.trip_number
    if not expense_data.get("route_id"):
        expense_data["route_id"] = trip.route_id
    db_expense = TransportExpense(**expense_data)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.put("/expenses/{expense_id}", response_model=TransportExpenseSchema)
def update_expense(expense_id: int, expense: TransportExpenseUpdate, db: Session = Depends(get_db)):
    """Update an expense"""
    db_expense = db.query(TransportExpense).filter(TransportExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = expense.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Delete an expense"""
    db_expense = db.query(TransportExpense).filter(TransportExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted successfully"}


# ============ Reports ============

@router.get("/reports", response_model=TransportReportResponse)
def get_transport_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    route_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get transport report with analytics"""
    query = db.query(Trip)
    
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    if route_id:
        query = query.filter(Trip.route_id == route_id)
    
    trips = query.all()
    
    # Calculate totals
    total_trips = len(trips)
    total_distance = sum(float(trip.distance_km or 0) for trip in trips)
    total_fuel_cost = sum(float(trip.estimated_fuel_cost or 0) for trip in trips)
    
    # Calculate total expenses by trip_number
    trip_numbers = [trip.trip_number for trip in trips if trip.trip_number]
    if trip_numbers:
        total_expenses = db.query(func.sum(TransportExpense.amount)).filter(
            TransportExpense.trip_number.in_(trip_numbers)
        ).scalar() or 0
    else:
        total_expenses = 0
    
    # Also include expenses by trip_id for backward compatibility
    trip_ids = [trip.id for trip in trips]
    if trip_ids:
        expenses_by_trip_id = db.query(func.sum(TransportExpense.amount)).filter(
            TransportExpense.trip_id.in_(trip_ids)
        ).scalar() or 0
        total_expenses = float(total_expenses) + float(expenses_by_trip_id)
    
    # Trips by vehicle
    if trip_ids:
        trips_by_vehicle = db.query(
            Vehicle.id,
            Vehicle.vehicle_id,
            Vehicle.registration_number,
            func.count(Trip.id).label("trip_count"),
            func.sum(Trip.distance_km).label("total_distance"),
            func.sum(Trip.estimated_fuel_cost).label("total_fuel_cost")
        ).join(Trip, Vehicle.id == Trip.vehicle_id).filter(
            Trip.id.in_(trip_ids)
        ).group_by(Vehicle.id, Vehicle.vehicle_id, Vehicle.registration_number).all()
    else:
        trips_by_vehicle = []
    
    trips_by_vehicle_list = [
        {
            "vehicle_id": v.vehicle_id,
            "registration_number": v.registration_number,
            "trip_count": v.trip_count,
            "total_distance": float(v.total_distance or 0),
            "total_fuel_cost": float(v.total_fuel_cost or 0)
        }
        for v in trips_by_vehicle
    ]
    
    # Trips by driver
    if trip_ids:
        trips_by_driver = db.query(
            Driver.id,
            Driver.driver_id,
            Driver.first_name,
            Driver.last_name,
            func.count(Trip.id).label("trip_count"),
            func.sum(Trip.distance_km).label("total_distance"),
            func.sum(Trip.estimated_fuel_cost).label("total_fuel_cost")
        ).join(Trip, Driver.id == Trip.driver_id).filter(
            Trip.id.in_(trip_ids)
        ).group_by(Driver.id, Driver.driver_id, Driver.first_name, Driver.last_name).all()
    else:
        trips_by_driver = []
    
    trips_by_driver_list = [
        {
            "driver_id": d.driver_id,
            "driver_name": f"{d.first_name} {d.last_name or ''}".strip(),
            "trip_count": d.trip_count,
            "total_distance": float(d.total_distance or 0),
            "total_fuel_cost": float(d.total_fuel_cost or 0)
        }
        for d in trips_by_driver
    ]
    
    # Monthly stats
    if trip_ids:
        monthly_stats = db.query(
            func.date_trunc('month', Trip.trip_date).label("month"),
            func.count(Trip.id).label("trip_count"),
            func.sum(Trip.distance_km).label("total_distance"),
            func.sum(Trip.estimated_fuel_cost).label("total_fuel_cost")
        ).filter(
            Trip.id.in_(trip_ids)
        ).group_by(func.date_trunc('month', Trip.trip_date)).order_by(
            func.date_trunc('month', Trip.trip_date)
        ).all()
    else:
        monthly_stats = []
    
    monthly_stats_list = [
        {
            "month": str(m.month),
            "trip_count": m.trip_count,
            "total_distance": float(m.total_distance or 0),
            "total_fuel_cost": float(m.total_fuel_cost or 0)
        }
        for m in monthly_stats
    ]
    
    # Expenses by trip number
    expenses_by_trip = []
    trip_numbers = [trip.trip_number for trip in trips if trip.trip_number]
    if trip_numbers:
        expenses_query = db.query(
            TransportExpense.trip_number,
            func.sum(TransportExpense.amount).label("total_amount"),
            func.count(TransportExpense.id).label("expense_count")
        ).filter(
            TransportExpense.trip_number.in_(trip_numbers)
        ).group_by(TransportExpense.trip_number).all()
        
        expenses_by_trip = [
            {
                "trip_number": e.trip_number,
                "total_amount": float(e.total_amount or 0),
                "expense_count": e.expense_count
            }
            for e in expenses_query
        ]
    
    return TransportReportResponse(
        total_trips=total_trips,
        total_distance=round(total_distance, 2),
        total_fuel_cost=round(total_fuel_cost, 2),
        total_expenses=float(total_expenses),
        trips_by_vehicle=trips_by_vehicle_list,
        trips_by_driver=trips_by_driver_list,
        monthly_stats=monthly_stats_list,
        expenses_by_trip=expenses_by_trip
    )


# ============ PDF Report Generation ============

@router.get("/reports/vehicle-expenses")
def get_vehicle_expense_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get expense report grouped by vehicle"""
    from sqlalchemy import func
    
    # Get trips with filters
    query = db.query(Trip)
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    
    trips = query.all()
    trip_numbers = [trip.trip_number for trip in trips if trip.trip_number]
    
    if not trip_numbers:
        return {
            "vehicles": [],
            "total_expenses": 0,
            "summary": {}
        }
    
    # Get expenses by vehicle
    expenses_by_vehicle = db.query(
        Vehicle.id,
        Vehicle.vehicle_id,
        Vehicle.registration_number,
        Vehicle.model,
        Vehicle.vehicle_type,
        func.sum(TransportExpense.amount).label("total_expenses"),
        func.count(TransportExpense.id).label("expense_count"),
        func.count(func.distinct(TransportExpense.trip_number)).label("trip_count")
    ).join(Trip, Vehicle.id == Trip.vehicle_id).join(
        TransportExpense, TransportExpense.trip_number == Trip.trip_number
    ).filter(
        TransportExpense.trip_number.in_(trip_numbers)
    ).group_by(
        Vehicle.id, Vehicle.vehicle_id, Vehicle.registration_number, Vehicle.model, Vehicle.vehicle_type
    ).all()
    
    vehicles_list = [
        {
            "vehicle_id": v.vehicle_id,
            "registration_number": v.registration_number,
            "model": v.model,
            "vehicle_type": v.vehicle_type,
            "total_expenses": float(v.total_expenses or 0),
            "expense_count": v.expense_count,
            "trip_count": v.trip_count
        }
        for v in expenses_by_vehicle
    ]
    
    total_expenses = sum(v["total_expenses"] for v in vehicles_list)
    
    return {
        "vehicles": vehicles_list,
        "total_expenses": total_expenses,
        "summary": {
            "total_vehicles": len(vehicles_list),
            "total_trips": sum(v["trip_count"] for v in vehicles_list),
            "total_expenses": total_expenses
        }
    }

@router.get("/reports/driver-expenses")
def get_driver_expense_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    driver_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get expense report grouped by driver"""
    from sqlalchemy import func
    
    # Get trips with filters
    query = db.query(Trip)
    if start_date:
        query = query.filter(Trip.trip_date >= start_date)
    if end_date:
        query = query.filter(Trip.trip_date <= end_date)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    
    trips = query.all()
    trip_numbers = [trip.trip_number for trip in trips if trip.trip_number]
    
    if not trip_numbers:
        return {
            "drivers": [],
            "total_expenses": 0,
            "summary": {}
        }
    
    # Get expenses by driver
    expenses_by_driver = db.query(
        Driver.id,
        Driver.driver_id,
        Driver.first_name,
        Driver.last_name,
        Driver.license_number,
        func.sum(TransportExpense.amount).label("total_expenses"),
        func.count(TransportExpense.id).label("expense_count"),
        func.count(func.distinct(TransportExpense.trip_number)).label("trip_count")
    ).join(Trip, Driver.id == Trip.driver_id).join(
        TransportExpense, TransportExpense.trip_number == Trip.trip_number
    ).filter(
        TransportExpense.trip_number.in_(trip_numbers)
    ).group_by(
        Driver.id, Driver.driver_id, Driver.first_name, Driver.last_name, Driver.license_number
    ).all()
    
    drivers_list = [
        {
            "driver_id": d.driver_id,
            "driver_name": f"{d.first_name} {d.last_name or ''}".strip(),
            "license_number": d.license_number,
            "total_expenses": float(d.total_expenses or 0),
            "expense_count": d.expense_count,
            "trip_count": d.trip_count
        }
        for d in expenses_by_driver
    ]
    
    total_expenses = sum(d["total_expenses"] for d in drivers_list)
    
    return {
        "drivers": drivers_list,
        "total_expenses": total_expenses,
        "summary": {
            "total_drivers": len(drivers_list),
            "total_trips": sum(d["trip_count"] for d in drivers_list),
            "total_expenses": total_expenses
        }
    }

@router.get("/reports/pdf")
def generate_pdf_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    route_id: Optional[int] = None,
    report_type: Optional[str] = None,  # general, vehicle, driver
    db: Session = Depends(get_db)
):
    """Generate PDF report for transport expenses"""
    if not report_type:
        report_type = "general"
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
    )
    
    # Handle different report types
    if report_type == "vehicle":
        vehicle_report = get_vehicle_expense_report(start_date, end_date, vehicle_id, db)
        title = Paragraph("Vehicle Expense Report", title_style)
        elements.append(title)
        date_text = f"Period: {start_date or 'All time'} to {end_date or 'Present'}"
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 0.2*inch))
        
        if vehicle_report.get("vehicles"):
            vehicle_data = [['Vehicle ID', 'Registration', 'Model', 'Type', 'Trips', 'Expenses', 'Total (৳)']]
            for v in vehicle_report["vehicles"]:
                vehicle_data.append([
                    v['vehicle_id'],
                    v['registration_number'],
                    v.get('model', '-'),
                    v.get('vehicle_type', '-'),
                    str(v['trip_count']),
                    str(v['expense_count']),
                    f"{v['total_expenses']:.2f}"
                ])
            vehicle_table = Table(vehicle_data, colWidths=[1*inch, 1.5*inch, 1.2*inch, 1*inch, 0.8*inch, 0.8*inch, 1*inch])
            vehicle_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(vehicle_table)
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph(f"Total Expenses: ৳{vehicle_report['total_expenses']:.2f}", styles['Heading2']))
    
    elif report_type == "driver":
        driver_report = get_driver_expense_report(start_date, end_date, driver_id, db)
        title = Paragraph("Driver Expense Report", title_style)
        elements.append(title)
        date_text = f"Period: {start_date or 'All time'} to {end_date or 'Present'}"
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 0.2*inch))
        
        if driver_report.get("drivers"):
            driver_data = [['Driver ID', 'Name', 'License', 'Trips', 'Expenses', 'Total (৳)']]
            for d in driver_report["drivers"]:
                driver_data.append([
                    d['driver_id'],
                    d['driver_name'],
                    d.get('license_number', '-'),
                    str(d['trip_count']),
                    str(d['expense_count']),
                    f"{d['total_expenses']:.2f}"
                ])
            driver_table = Table(driver_data, colWidths=[1*inch, 2*inch, 1.5*inch, 0.8*inch, 0.8*inch, 1*inch])
            driver_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(driver_table)
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph(f"Total Expenses: ৳{driver_report['total_expenses']:.2f}", styles['Heading2']))
    
    else:
        # General report
        report_data = get_transport_report(
            start_date=start_date,
            end_date=end_date,
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            route_id=route_id,
            db=db
        )
        title = Paragraph("Transport Management Report", title_style)
        elements.append(title)
        date_text = f"Period: {start_date or 'All time'} to {end_date or 'Present'}"
        elements.append(Paragraph(date_text, styles['Normal']))
        elements.append(Spacer(1, 0.2*inch))
        
        # Summary
        summary_data = [
            ['Metric', 'Value'],
            ['Total Trips', str(report_data.total_trips)],
            ['Total Distance (km)', f"{report_data.total_distance:.2f}"],
            ['Total Fuel Cost (৳)', f"{report_data.total_fuel_cost:.2f}"],
            ['Total Expenses (৳)', f"{report_data.total_expenses:.2f}"],
        ]
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Trips by Vehicle
    if report_data.trips_by_vehicle:
        elements.append(Paragraph("Trips by Vehicle", styles['Heading2']))
        vehicle_data = [['Vehicle ID', 'Registration', 'Trips', 'Distance (km)', 'Fuel Cost (৳)']]
        for v in report_data.trips_by_vehicle:
            vehicle_data.append([
                v['vehicle_id'],
                v['registration_number'],
                str(v['trip_count']),
                f"{v['total_distance']:.2f}",
                f"{v['total_fuel_cost']:.2f}"
            ])
        vehicle_table = Table(vehicle_data, colWidths=[1.2*inch, 1.5*inch, 0.8*inch, 1*inch, 1*inch])
        vehicle_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(vehicle_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Trips by Driver
    if report_data.trips_by_driver:
        elements.append(Paragraph("Trips by Driver", styles['Heading2']))
        driver_data = [['Driver ID', 'Driver Name', 'Trips', 'Distance (km)', 'Fuel Cost (৳)']]
        for d in report_data.trips_by_driver:
            driver_data.append([
                d['driver_id'],
                d['driver_name'],
                str(d['trip_count']),
                f"{d['total_distance']:.2f}",
                f"{d['total_fuel_cost']:.2f}"
            ])
        driver_table = Table(driver_data, colWidths=[1.2*inch, 1.5*inch, 0.8*inch, 1*inch, 1*inch])
        driver_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(driver_table)
        elements.append(Spacer(1, 0.3*inch))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Generate filename
    filename = f"{report_type}_expense_report_{start_date or 'all'}_{end_date or 'present'}.pdf"
    
    return StreamingResponse(
        io.BytesIO(buffer.read()),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

