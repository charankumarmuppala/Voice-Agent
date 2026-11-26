from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import datetime
import uuid

from app.database import get_db
from app.models import Appointment, Lead

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


# ─── Helper: convert DB row ──────────────────────────────────────────────────
def appt_to_dict(a: Appointment) -> dict:
    return a.to_dict() if hasattr(a, "to_dict") else {
        "id": a.id,
        "appointment_id": a.appointment_id,
        "lead_id": a.lead_id,
        "customer_name": a.customer_name,
        "customer_phone": a.customer_phone,
        "customer_email": getattr(a, "customer_email", None),
        "email_status": getattr(a, "email_status", "Pending"),
        "email_sent_at": a.email_sent_at.isoformat() if getattr(a, "email_sent_at", None) else None,
        "email_error": getattr(a, "email_error", None),
        "property_name": a.property_name,
        "location": a.location,
        "date_time": a.date_time.isoformat() if a.date_time else None,
        "status": a.status,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None
    }


def lead_to_dict(l: Lead) -> dict:
    return {
        "id": l.id,
        "lead_id": l.lead_id,
        "name": l.name,
        "phone": l.phone,
        "email": l.email,
        "preferred_location": l.preferred_location,
        "preferred_bhk": l.preferred_bhk,
        "budget_min": l.budget_min,
        "budget_max": l.budget_max,
        "lead_score": l.lead_score,
        "sentiment": l.sentiment,
        "status": l.status,
        "notes": l.notes,
        "created_at": l.created_at.isoformat() if l.created_at else None
    }


# ─── GET /api/appointments ───────────────────────────────────────────────────
@router.get("")
def list_appointments(db: Session = Depends(get_db)):
    rows = db.query(Appointment).order_by(desc(Appointment.created_at)).all()
    return [appt_to_dict(a) for a in rows]


# ─── POST /api/appointments ──────────────────────────────────────────────────
@router.post("", status_code=201)
def create_appointment(payload: dict, db: Session = Depends(get_db)):
    """Create a new appointment (from voice agent or manual form)."""
    customer_phone = payload.get("customer_phone", "")
    property_name = payload.get("property_name", "")

    # Parse date_time
    raw_dt = payload.get("date_time") or payload.get("visit_date_iso")
    if raw_dt:
        try:
            slot_dt = datetime.datetime.fromisoformat(raw_dt)
        except Exception:
            slot_dt = utcnow() + datetime.timedelta(days=2)
    else:
        slot_dt = utcnow() + datetime.timedelta(days=2)

    # Duplicate check: same phone + property + date within 30 min window
    start_window = slot_dt - datetime.timedelta(minutes=30)
    end_window = slot_dt + datetime.timedelta(minutes=30)
    existing = db.query(Appointment).filter(
        Appointment.customer_phone == customer_phone,
        Appointment.property_name == property_name,
        Appointment.date_time >= start_window,
        Appointment.date_time <= end_window
    ).first()
    if existing:
        return appt_to_dict(existing)  # Return existing instead of duplicate

    # Ensure/create Lead
    lead = db.query(Lead).filter(Lead.phone == customer_phone).first()
    if not lead:
        lead = Lead(
            lead_id=f"LEAD-{uuid.uuid4().hex[:8].upper()}",
            name=payload.get("customer_name", "Prospective Buyer"),
            phone=customer_phone,
            email=payload.get("email"),
            preferred_location=payload.get("location"),
            preferred_bhk=payload.get("bhk"),
            budget_min=None,
            budget_max=None,
            lead_score=payload.get("lead_score", 75),
            sentiment=payload.get("sentiment", "Positive"),
            status="Visit Scheduled",
            notes=payload.get("notes"),
        )
        db.add(lead)
        db.flush()
    else:
        lead.status = "Visit Scheduled"

    appointment = Appointment(
        appointment_id=f"APT-{uuid.uuid4().hex[:8].upper()}",
        lead_id=lead.lead_id,
        customer_name=payload.get("customer_name", "Prospective Buyer"),
        customer_phone=customer_phone,
        property_name=property_name,
        location=payload.get("location", ""),
        date_time=slot_dt,
        status="Confirmed",
        notes=payload.get("notes", ""),
        created_at=utcnow()
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appt_to_dict(appointment)


# ─── GET /api/appointments/{appointment_id} ──────────────────────────────────
@router.get("/{appointment_id}")
def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(
        Appointment.appointment_id == appointment_id
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt_to_dict(a)


# ─── GET /api/leads ──────────────────────────────────────────────────────────
leads_router = APIRouter(prefix="/leads", tags=["Leads"])


@leads_router.get("")
def list_leads(db: Session = Depends(get_db)):
    rows = db.query(Lead).order_by(desc(Lead.created_at)).all()
    return [lead_to_dict(l) for l in rows]
