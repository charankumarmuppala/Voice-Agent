from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import datetime

from app.database import get_db
from app.models import Property
from app.schemas import (
    PropertyResponse,
    PropertyListResponse,
    PropertyStatsResponse,
    LocationStat,
    BhkStat,
    PropertyTypeStat,
    HealthResponse
)

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint confirming API status and database connectivity."""
    db_status = "connected"
    try:
        db.execute(func.now()).scalar()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "EstateVoice AI Backend",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "database": db_status
    }

@router.get("/properties/stats", response_model=PropertyStatsResponse, tags=["Properties"])
def get_property_stats(db: Session = Depends(get_db)):
    """Get aggregated statistics across the property inventory."""
    total_properties = db.query(Property).count()
    if total_properties == 0:
        return {
            "total_properties": 0,
            "avg_price": 0.0,
            "min_price": 0.0,
            "max_price": 0.0,
            "locations_count": 0,
            "location_distribution": [],
            "bhk_distribution": [],
            "type_distribution": [],
            "ready_to_move_count": 0,
            "under_construction_count": 0
        }

    # Average, min, max price
    price_stats = db.query(
        func.avg(Property.price),
        func.min(Property.price),
        func.max(Property.price)
    ).first()

    avg_price = float(price_stats[0] or 0.0)
    min_price = float(price_stats[1] or 0.0)
    max_price = float(price_stats[2] or 0.0)

    # Location distribution
    location_rows = db.query(
        Property.location,
        func.count(Property.id),
        func.avg(Property.price)
    ).group_by(Property.location).all()

    location_distribution = [
        LocationStat(location=loc, count=cnt, avg_price=round(float(avg_p), 2))
        for loc, cnt, avg_p in location_rows
    ]

    # BHK distribution
    bhk_rows = db.query(
        Property.bhk,
        func.count(Property.id)
    ).group_by(Property.bhk).order_by(Property.bhk).all()

    bhk_distribution = [
        BhkStat(bhk=bhk, count=cnt)
        for bhk, cnt in bhk_rows
    ]

    # Property Type distribution
    type_rows = db.query(
        Property.property_type,
        func.count(Property.id)
    ).group_by(Property.property_type).all()

    type_distribution = [
        PropertyTypeStat(property_type=pt, count=cnt)
        for pt, cnt in type_rows
    ]

    # Availability counts
    ready_count = db.query(Property).filter(Property.availability == "Ready to Move").count()
    under_construction_count = db.query(Property).filter(Property.availability == "Under Construction").count()

    return {
        "total_properties": total_properties,
        "avg_price": round(avg_price, 2),
        "min_price": min_price,
        "max_price": max_price,
        "locations_count": len(location_distribution),
        "location_distribution": location_distribution,
        "bhk_distribution": bhk_distribution,
        "type_distribution": type_distribution,
        "ready_to_move_count": ready_count,
        "under_construction_count": under_construction_count
    }

@router.get("/properties", response_model=PropertyListResponse, tags=["Properties"])
def get_properties(
    search: Optional[str] = Query(None, description="Search keyword in name or description"),
    location: Optional[str] = Query(None, description="Filter by location (e.g., Whitefield, Electronic City)"),
    bhk: Optional[int] = Query(None, description="Filter by BHK number"),
    min_price: Optional[float] = Query(None, description="Minimum price in INR"),
    max_price: Optional[float] = Query(None, description="Maximum price in INR"),
    property_type: Optional[str] = Query(None, description="Filter by property type (Apartment, Villa, etc.)"),
    availability: Optional[str] = Query(None, description="Filter by availability status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(30, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """Retrieve list of properties with search and filtering capabilities."""
    query = db.query(Property)

    # Search filter (name, description, location)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Property.name.ilike(search_term),
                Property.description.ilike(search_term),
                Property.location.ilike(search_term)
            )
        )

    # Location filter (case-insensitive substring or exact)
    if location and location.lower() != "all":
        query = query.filter(Property.location.ilike(f"%{location.strip()}%"))

    # BHK filter
    if bhk is not None and bhk > 0:
        query = query.filter(Property.bhk == bhk)

    # Budget filter
    if min_price is not None:
        query = query.filter(Property.price >= min_price)
    if max_price is not None:
        query = query.filter(Property.price <= max_price)

    # Property Type filter
    if property_type and property_type.lower() != "all":
        query = query.filter(Property.property_type.ilike(f"%{property_type.strip()}%"))

    # Availability filter
    if availability and availability.lower() != "all":
        query = query.filter(Property.availability.ilike(f"%{availability.strip()}%"))

    total = query.count()
    properties = query.order_by(Property.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "properties": properties
    }

@router.get("/properties/{id_or_property_id}", response_model=PropertyResponse, tags=["Properties"])
def get_property(id_or_property_id: str, db: Session = Depends(get_db)):
    """Retrieve single property details by integer id or string property_id."""
    prop = None
    if id_or_property_id.isdigit():
        prop = db.query(Property).filter(Property.id == int(id_or_property_id)).first()
    
    if not prop:
        prop = db.query(Property).filter(Property.property_id.ilike(id_or_property_id.strip())).first()

    if not prop:
        raise HTTPException(status_code=404, detail=f"Property '{id_or_property_id}' not found")

    return prop
