import json
import os
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Property, Lead, Appointment, CallRecord
import datetime

PROPERTIES_DATA = [
    {
        "property_id": "PROP-BLR-001",
        "name": "Prestige Willow Park",
        "location": "Whitefield",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 14500000.0,
        "area": 1780.0,
        "amenities": ["Swimming Pool", "Clubhouse", "Gymnasium", "24/7 Security", "Children's Play Area", "Badminton Court"],
        "availability": "Ready to Move",
        "description": "Luxurious 3 BHK apartment situated near ITPL Whitefield with panoramic skyline views, Italian marble flooring, and smart home automation.",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-002",
        "name": "Godrej Royale Woods",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 8200000.0,
        "area": 1150.0,
        "amenities": ["Infinity Pool", "Yoga Deck", "Covered Parking", "Jogging Track", "Power Backup", "EV Charging"],
        "availability": "Ready to Move",
        "description": "Contemporary 2 BHK home strategically located 5 minutes from Electronic City Phase 1 tech parks. Features modular kitchen and spacious balconies.",
        "image_url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-003",
        "name": "Sobha Lake Haven Luxury Villas",
        "location": "Sarjapur",
        "property_type": "Villa",
        "bhk": 4,
        "price": 38500000.0,
        "area": 3650.0,
        "amenities": ["Private Garden", "Private Pool", "Clubhouse", "Tennis Court", "Home Theatre Room", "Solar Power"],
        "availability": "Under Construction",
        "description": "Exclusive lakeside 4 BHK independent villa along Sarjapur Road. Designed with Spanish colonial architecture, double-height living room, and private jacuzzi.",
        "image_url": "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-004",
        "name": "Brigade Horizon Sky Penthouse",
        "location": "Hebbal",
        "property_type": "Penthouse",
        "bhk": 4,
        "price": 42000000.0,
        "area": 4100.0,
        "amenities": ["Rooftop Infinity Pool", "Sky Lounge", "Concierge Service", "Helipad Access", "Steam & Sauna", "4 Car Parkings"],
        "availability": "Ready to Move",
        "description": "Breathtaking top-floor 4 BHK penthouse overlooking Hebbal Lake and the Bellary Road corridor. Fast access to Kempegowda International Airport.",
        "image_url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-005",
        "name": "Puravankara Palm Vista",
        "location": "Yelahanka",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 7600000.0,
        "area": 1210.0,
        "amenities": ["Clubhouse", "Squash Court", "Pet Park", "Senior Citizen Corner", "24/7 Security", "Library"],
        "availability": "Ready to Move",
        "description": "Tranquil 2 BHK apartment nestled amidst greenery in North Bangalore's prime residential hub. Close to Canadian International School.",
        "image_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-006",
        "name": "Assetz Marq Serenity",
        "location": "Whitefield",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 16800000.0,
        "area": 1920.0,
        "amenities": ["Olympic Size Pool", "Indoor Badminton", "Organic Farm Garden", "Co-working Lounge", "Gym"],
        "availability": "Under Construction",
        "description": "Premium 3 BHK home in a 22-acre sustainable township with over 80% open spaces, right off Whitefield-Hosakote highway.",
        "image_url": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-007",
        "name": "Concorde Silicon Elite",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 1,
        "price": 4900000.0,
        "area": 680.0,
        "amenities": ["Gym", "High-speed Elevators", "CCTV Surveillance", "Rooftop Terrace", "Power Backup"],
        "availability": "Ready to Move",
        "description": "High-yield, compact 1 BHK apartment tailored for IT professionals. Walkable to Infosys and Wipro gate with metro station 400m away.",
        "image_url": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-008",
        "name": "Mana Capitol Green Oasis",
        "location": "Sarjapur",
        "property_type": "Duplex",
        "bhk": 3,
        "price": 21500000.0,
        "area": 2400.0,
        "amenities": ["Private Terrace", "Heated Pool", "Banquet Hall", "Cricket Pitch", "Children Play Area"],
        "availability": "Ready to Move",
        "description": "Ultra-modern 3 BHK duplex penthouse-style unit with double-height ceiling, private terrace garden, and smart biometric access.",
        "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-009",
        "name": "SNN Clermont Luxury Suites",
        "location": "Hebbal",
        "property_type": "Apartment",
        "bhk": 4,
        "price": 31000000.0,
        "area": 2980.0,
        "amenities": ["Equestrian Club", "7-Star Clubhouse", "Temperature Controlled Pool", "Spa & Wellness", "Wine Cellar"],
        "availability": "Ready to Move",
        "description": "Palatial 4 BHK residence in an iconic high-rise complex designed around equestrian lifestyle themes. Minutes from Manyata Tech Park.",
        "image_url": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-010",
        "name": "Arvind Bel Air Meadows",
        "location": "Yelahanka",
        "property_type": "Villa",
        "bhk": 4,
        "price": 34000000.0,
        "area": 3300.0,
        "amenities": ["Private Lawn", "Gated Security", "Solar Water Heating", "Clubhouse", "Multipurpose Hall"],
        "availability": "Under Construction",
        "description": "Bespoke 4 BHK gated community villa with private backyard, courtyard, modern architecture, and tranquil surroundings near Kogilu.",
        "image_url": "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-011",
        "name": "Total Environment Windmills Walk",
        "location": "Whitefield",
        "property_type": "Apartment",
        "bhk": 4,
        "price": 36000000.0,
        "area": 3450.0,
        "amenities": ["Earth Sheltered Living", "Terrace Gardens", "Wooden Deck", "Artisanal Clubhouse", "Microbrewery Access"],
        "availability": "Ready to Move",
        "description": "Signature handcrafted home featuring landscaped earth gardens on every level, natural stone, exposed brick finishes, and bespoke woodwork.",
        "image_url": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-012",
        "name": "Shriram Summit Tech Park Heights",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 6800000.0,
        "area": 1080.0,
        "amenities": ["Swimming Pool", "Table Tennis", "Community Hall", "Children Play Zone", "24/7 Security"],
        "availability": "Ready to Move",
        "description": "Affordable yet stylish 2 BHK home with excellent cross-ventilation and zero space wastage. High rental demand zone in E-City.",
        "image_url": "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-013",
        "name": "Bren Starlight Boulevard",
        "location": "Sarjapur",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 13900000.0,
        "area": 1690.0,
        "amenities": ["Football Turf", "Skating Rink", "Clubhouse", "Swimming Pool", "Gym", "Amphitheatre"],
        "availability": "Ready to Move",
        "description": "Sport-inspired 3 BHK luxury residence located right off Sarjapur-ORR junction. High speed internet cabling, 3-tier security.",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-014",
        "name": "L&T Raintree Boulevard",
        "location": "Hebbal",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 22500000.0,
        "area": 1980.0,
        "amenities": ["65,000 Sqft Clubhouse", "Retail Arcade", "Tennis Academy", "Swimming Complex", "EV Charging"],
        "availability": "Ready to Move",
        "description": "65-acre mixed-use township development by L&T with majestic trees, lakeside parklands, and proximity to Sahakar Nagar retail hub.",
        "image_url": "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-015",
        "name": "Vaishnavi Serene Urban Homes",
        "location": "Yelahanka",
        "property_type": "Apartment",
        "bhk": 1,
        "price": 4600000.0,
        "area": 640.0,
        "amenities": ["Modular Gym", "Jogging Loop", "Green Courtyard", "Co-working Space", "Power Backup"],
        "availability": "Ready to Move",
        "description": "Compact smart 1 BHK built using advanced off-site precast technology. Ideal investment property near Bengaluru International Airport road.",
        "image_url": "https://images.unsplash.com/photo-1502005229762-ee152da915ba?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-016",
        "name": "Embassy Grove Boulevard",
        "location": "Whitefield",
        "property_type": "Villa",
        "bhk": 4,
        "price": 45000000.0,
        "area": 4200.0,
        "amenities": ["Private Infinity Pool", "Smart Automation", "Servant Quarters", "Clubhouse", "Double Garage"],
        "availability": "Ready to Move",
        "description": "Ultra-exclusive 4 BHK villa with private pool, personal garden patio, and custom Italian fittings inside a secluded enclave in Whitefield.",
        "image_url": "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-017",
        "name": "Sobha Silicon Oasis Palms",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 12800000.0,
        "area": 1610.0,
        "amenities": ["Tropical Lagoon Pool", "Badminton Court", "Gymnasium", "Kids Play Area", "24/7 Power"],
        "availability": "Ready to Move",
        "description": "Resort-styled 3 BHK tropical development featuring a man-made water stream, clubhouse, and unmatched construction quality by Sobha.",
        "image_url": "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-018",
        "name": "Rohan Iksha Eco Homes",
        "location": "Sarjapur",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 9400000.0,
        "area": 1280.0,
        "amenities": ["Rainwater Harvesting", "Zero Waste Facility", "Clubhouse", "Swimming Pool", "Green Walkways"],
        "availability": "Ready to Move",
        "description": "Eco-friendly 2 BHK crafted with Rohan's PLUS concept (Poor Ventilation & Light, Utmost Privacy, Sensible Space). Close to Bellandur ORR.",
        "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-019",
        "name": "Godrej Platinum Panorama",
        "location": "Hebbal",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 27500000.0,
        "area": 2240.0,
        "amenities": ["IGBC Platinum Certified", "Heated Pool", "Sky Lounge", "EV Charging", "Concierge"],
        "availability": "Ready to Move",
        "description": "Double-glazed energy efficient 3 BHK offering uninterrupted views of Hebbal lake. Exceptional indoor air quality and luxury finishes.",
        "image_url": "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-020",
        "name": "Purva Venezia Venice Enclave",
        "location": "Yelahanka",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 14200000.0,
        "area": 1720.0,
        "amenities": ["Venetian Waterways", "Gondola Canal", "Grand Clubhouse", "Tennis Court", "Sauna & Spa"],
        "availability": "Ready to Move",
        "description": "Italian Venice-themed 3 BHK residences featuring sparkling water canals, arched bridges, and world-class leisure amenities.",
        "image_url": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-021",
        "name": "Brigade Cosmopolis Horizon",
        "location": "Whitefield",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 11800000.0,
        "area": 1360.0,
        "amenities": ["Urban Forest", "Zen Garden", "Rooftop Swimming Pool", "Squash Court", "Gym"],
        "availability": "Ready to Move",
        "description": "Cosmopolitan living with international landscape architecture on Whitefield Main Road. Steps away from Forum Shantiniketan Mall.",
        "image_url": "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-022",
        "name": "Ajmera Infinity Greens",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 11200000.0,
        "area": 1540.0,
        "amenities": ["Clubhouse", "Swimming Pool", "Cricket Pitch", "Supermarket Onsite", "Children Play Area"],
        "availability": "Ready to Move",
        "description": "Vibrant 3 BHK apartment in an established township with supermarkets, pharmacy, ATM and day care right inside the campus.",
        "image_url": "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-023",
        "name": "SJR Palazza Signature",
        "location": "Sarjapur",
        "property_type": "Penthouse",
        "bhk": 4,
        "price": 28500000.0,
        "area": 3100.0,
        "amenities": ["Private Rooftop Terrace", "Barbecue Deck", "Infinity Pool", "Clubhouse", "Gym"],
        "availability": "Under Construction",
        "description": "Stunning 4 BHK penthouse with dual terraces, open layout, master suite with walk-in closet, and sweeping views of East Bangalore.",
        "image_url": "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-024",
        "name": "Brigade Caladium Prime",
        "location": "Hebbal",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 25000000.0,
        "area": 2100.0,
        "amenities": ["Curved Architecture", "Clubhouse", "Rooftop Swimming Pool", "Fitness Centre", "Valet Parking"],
        "availability": "Ready to Move",
        "description": "Architectural marvel with waterdrop-inspired glass facades on Bellary Road. Only 2 apartments per floor ensuring extreme privacy.",
        "image_url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-025",
        "name": "Godrej Avenues Skyline",
        "location": "Yelahanka",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 8900000.0,
        "area": 1260.0,
        "amenities": ["Sky Lounge at 14th Floor", "50-seater Cinema", "Swimming Pool", "Gym", "Pharmacy"],
        "availability": "Ready to Move",
        "description": "High-rise 2 BHK home featuring 3-tier safety infrastructure and sky lounge overlooking sprawling greenery in Yelahanka Doddaballapur highway.",
        "image_url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-026",
        "name": "Provident Capella Pods",
        "location": "Whitefield",
        "property_type": "Studio Apartment",
        "bhk": 1,
        "price": 4200000.0,
        "area": 520.0,
        "amenities": ["Tech Pods", "Gaming Arcade", "Library", "Swimming Pool", "Rooftop Dining"],
        "availability": "Ready to Move",
        "description": "Designed for digital nomads and young techies. Fully smart wired studio unit close to Whitefield railway and upcoming Purple Line metro.",
        "image_url": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-027",
        "name": "GM Infinite E-City Town",
        "location": "Electronic City",
        "property_type": "Apartment",
        "bhk": 2,
        "price": 5900000.0,
        "area": 980.0,
        "amenities": ["Multi-tier Clubhouse", "Jogging Track", "Amphitheatre", "Cricket Pitch", "Security"],
        "availability": "Ready to Move",
        "description": "Neoclassical European architecture inspired township with over 100 amenities and very low maintenance costs in Electronic City Phase 1.",
        "image_url": "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-028",
        "name": "Confident Leo Manor",
        "location": "Sarjapur",
        "property_type": "Villa",
        "bhk": 3,
        "price": 23500000.0,
        "area": 2650.0,
        "amenities": ["Private Lawn", "Gated Security", "Solar Lighting", "Clubhouse", "Swimming Pool"],
        "availability": "Ready to Move",
        "description": "Cosy independent 3 BHK villa with dedicated garden and car parking in a serene gated colony near Gear International School, Sarjapur.",
        "image_url": "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-029",
        "name": "RMZ Galleria Grand",
        "location": "Yelahanka",
        "property_type": "Apartment",
        "bhk": 3,
        "price": 18200000.0,
        "area": 1890.0,
        "amenities": ["Attached Mall Access", "Multiplex", "Food Court", "Sky Club", "Heated Pool"],
        "availability": "Ready to Move",
        "description": "Prime integrated development sitting right above RMZ Galleria Mall. Direct lift access to shopping, dining, and IMAX multiplex.",
        "image_url": "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1000&q=80"
    },
    {
        "property_id": "PROP-BLR-030",
        "name": "Prestige White Meadows Grandeur",
        "location": "Whitefield",
        "property_type": "Villa",
        "bhk": 5,
        "price": 55000000.0,
        "area": 5400.0,
        "amenities": ["Private Infinity Pool", "Private Elevator", "Landscaped Courtyard", "4-Car Garage", "Clubhouse", "Steam & Sauna"],
        "availability": "Ready to Move",
        "description": "Bangalore's most prestigious luxury address in Whitefield. Ultra-luxurious triplex 5 BHK royal villa with heated indoor swimming pool and personal elevator.",
        "image_url": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80"
    }
]

def seed_database():
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Write properties.json
    os.makedirs("./data", exist_ok=True)
    json_path = "./data/properties.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(PROPERTIES_DATA, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(PROPERTIES_DATA)} properties to {json_path}")

    # 3. Insert or update in SQLite DB
    db: Session = SessionLocal()
    try:
        count = 0
        for p_data in PROPERTIES_DATA:
            existing = db.query(Property).filter(Property.property_id == p_data["property_id"]).first()
            if not existing:
                prop = Property(
                    property_id=p_data["property_id"],
                    name=p_data["name"],
                    location=p_data["location"],
                    property_type=p_data["property_type"],
                    bhk=p_data["bhk"],
                    price=p_data["price"],
                    area=p_data["area"],
                    amenities=p_data["amenities"],
                    availability=p_data["availability"],
                    description=p_data["description"],
                    image_url=p_data["image_url"]
                )
                db.add(prop)
                count += 1
            else:
                for k, v in p_data.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"Database seeded with {count} new properties (Total: {db.query(Property).count()}).")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
