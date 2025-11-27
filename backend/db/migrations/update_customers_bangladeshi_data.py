"""
Update all customers with Bangladeshi phone numbers and addresses.

This script updates all existing customers in the database with:
- Bangladeshi mobile numbers (format: 01XXXXXXXXX)
- Bangladeshi addresses

Run with:
    cd backend
    python -m db.migrations.update_customers_bangladeshi_data
"""

from app.database import SessionLocal
from app import models
import random

# Bangladeshi cities and districts
BANGLADESH_CITIES = [
    "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", 
    "Barisal", "Rangpur", "Mymensingh", "Comilla", "Jessore",
    "Narayanganj", "Gazipur", "Bogra", "Dinajpur", "Cox's Bazar",
    "Kushtia", "Rajbari", "Faridpur", "Tangail", "Jamalpur"
]

# Sample Bangladeshi addresses by city
CITY_ADDRESSES = {
    "Dhaka": [
        "Gulshan-2, Dhaka-1212",
        "Dhanmondi, Dhaka-1205",
        "Banani, Dhaka-1213",
        "Uttara, Dhaka-1230",
        "Mirpur, Dhaka-1216",
        "Wari, Dhaka-1203",
        "Old Dhaka, Dhaka-1100",
        "Tejgaon, Dhaka-1208",
        "Mohakhali, Dhaka-1212",
        "Rampura, Dhaka-1219"
    ],
    "Chattogram": [
        "Agrabad, Chattogram-4100",
        "Halishahar, Chattogram-4228",
        "Pahartali, Chattogram-4202",
        "Kotwali, Chattogram-4000",
        "Double Mooring, Chattogram-4100",
        "Bakalia, Chattogram-4209",
        "Bayezid Bostami, Chattogram-4211",
        "Chandgaon, Chattogram-4212"
    ],
    "Khulna": [
        "KDA Avenue, Khulna-9100",
        "Sonadanga, Khulna-9100",
        "Khalishpur, Khulna-9202",
        "Daulatpur, Khulna-9203",
        "Khan Jahan Ali Road, Khulna-9100"
    ],
    "Rajshahi": [
        "Shibganj, Rajshahi-6200",
        "Boalia, Rajshahi-6100",
        "Motihar, Rajshahi-6200",
        "Kazla, Rajshahi-6200"
    ],
    "Sylhet": [
        "Zindabazar, Sylhet-3100",
        "Amborkhana, Sylhet-3100",
        "Kumarpara, Sylhet-3100",
        "Shahjalal Upashahar, Sylhet-3100"
    ],
    "Barisal": [
        "Sadar Road, Barisal-8200",
        "Nathullabad, Barisal-8200",
        "Kawnia, Barisal-8200"
    ],
    "Rangpur": [
        "Kotwali, Rangpur-5400",
        "Mithapukur, Rangpur-5400",
        "Pirgacha, Rangpur-5400"
    ],
    "Mymensingh": [
        "Sadar, Mymensingh-2200",
        "Bhaluka, Mymensingh-2240",
        "Muktagachha, Mymensingh-2250"
    ],
    "Comilla": [
        "Kandirpar, Comilla-3500",
        "Chowdhury Bazar, Comilla-3500",
        "Sadar Dakkhin, Comilla-3500"
    ],
    "Jessore": [
        "Chanchra, Jessore-7400",
        "Benapole, Jessore-7430",
        "Keshabpur, Jessore-7450"
    ],
    "Narayanganj": [
        "Bandar, Narayanganj-1400",
        "Fatullah, Narayanganj-1420",
        "Rupganj, Narayanganj-1460"
    ],
    "Gazipur": [
        "Kaliakair, Gazipur-1750",
        "Kapasia, Gazipur-1740",
        "Sreepur, Gazipur-1741"
    ],
    "Bogra": [
        "Sadar, Bogra-5800",
        "Shajahanpur, Bogra-5800",
        "Adamdighi, Bogra-5850"
    ],
    "Dinajpur": [
        "Sadar, Dinajpur-5200",
        "Birampur, Dinajpur-5250",
        "Birganj, Dinajpur-5270"
    ],
    "Cox's Bazar": [
        "Sadar, Cox's Bazar-4700",
        "Teknaf, Cox's Bazar-4760",
        "Ukhia, Cox's Bazar-4750"
    ],
    "Kushtia": [
        "Sadar, Kushtia-7000",
        "Kumarkhali, Kushtia-7040",
        "Bheramara, Kushtia-7041"
    ],
    "Rajbari": [
        "Sadar, Rajbari-7700",
        "Baliakandi, Rajbari-7730",
        "Goalandaghat, Rajbari-7740"
    ],
    "Faridpur": [
        "Sadar, Faridpur-7800",
        "Boalmari, Faridpur-7850",
        "Nagarkanda, Faridpur-7870"
    ],
    "Tangail": [
        "Sadar, Tangail-1900",
        "Ghatail, Tangail-1980",
        "Kalihati, Tangail-1920"
    ],
    "Jamalpur": [
        "Sadar, Jamalpur-2000",
        "Melandaha, Jamalpur-2010",
        "Islampur, Jamalpur-2020"
    ]
}

def generate_bangladeshi_phone():
    """Generate a valid Bangladeshi mobile number"""
    # Bangladeshi mobile prefixes: 013, 014, 015, 016, 017, 018, 019
    prefixes = ['013', '014', '015', '016', '017', '018', '019']
    prefix = random.choice(prefixes)
    # Generate 8 random digits
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    return f"0{prefix[1:]}{suffix}"  # Format: 01XXXXXXXXX

def get_address_for_city(city):
    """Get a random address for a given city"""
    if city in CITY_ADDRESSES:
        return random.choice(CITY_ADDRESSES[city])
    # Default address format if city not found
    return f"Main Road, {city}"

def update_customers():
    """Update all customers with Bangladeshi phone numbers and addresses"""
    db = SessionLocal()
    try:
        # Get all customers
        customers = db.query(models.Customer).all()
        
        if not customers:
            print("No customers found in database.")
            return
        
        print(f"Found {len(customers)} customers. Updating with Bangladeshi data...")
        
        updated_count = 0
        for customer in customers:
            # Update phone number if not already a Bangladeshi number
            current_phone = customer.phone or ""
            if not current_phone.startswith(("01", "+8801", "8801")):
                customer.phone = generate_bangladeshi_phone()
                print(f"  Updated {customer.name} ({customer.code}): Phone = {customer.phone}")
            
            # Update address if not already a Bangladeshi address
            if not customer.address or len(customer.address.strip()) == 0:
                # Determine city from existing city field or pick random
                city = customer.city or random.choice(BANGLADESH_CITIES)
                customer.address = get_address_for_city(city)
                customer.city = city
                print(f"  Updated {customer.name} ({customer.code}): Address = {customer.address}, City = {city}")
            
            # Ensure city is set
            if not customer.city:
                customer.city = random.choice(BANGLADESH_CITIES)
            
            # Ensure state is set (Bangladesh divisions)
            if not customer.state:
                # Map cities to divisions
                division_map = {
                    "Dhaka": "Dhaka", "Gazipur": "Dhaka", "Narayanganj": "Dhaka",
                    "Chattogram": "Chattogram", "Cox's Bazar": "Chattogram", "Comilla": "Chattogram",
                    "Khulna": "Khulna", "Jessore": "Khulna", "Kushtia": "Khulna",
                    "Rajshahi": "Rajshahi", "Bogra": "Rajshahi", "Dinajpur": "Rajshahi",
                    "Sylhet": "Sylhet",
                    "Barisal": "Barisal",
                    "Rangpur": "Rangpur",
                    "Mymensingh": "Mymensingh", "Jamalpur": "Mymensingh", "Tangail": "Mymensingh",
                    "Rajbari": "Dhaka", "Faridpur": "Dhaka"
                }
                customer.state = division_map.get(customer.city, "Dhaka")
            
            updated_count += 1
        
        db.commit()
        print(f"\n✅ Successfully updated {updated_count} customers with Bangladeshi phone numbers and addresses.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating customers: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_customers()

