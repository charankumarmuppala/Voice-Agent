from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from app.services.email_service import send_booking_email_in_background
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
import datetime
import uuid
from typing import List, Optional

from app.database import get_db
from app.models import CallSession, ChatMessage, Property, Lead, Appointment, CallRecord
from app.schemas import (
    CallStartRequest,
    CallStartResponse,
    CallMessageRequest,
    CallMessageResponse,
    CallEndRequest,
    CallEndResponse,
    CallSessionItem,
    CallSessionDetailResponse,
    PropertyResponse
)
from app.services.gemini_service import gemini_sales_service

router = APIRouter(prefix="/calls", tags=["AI Voice Agent"])

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def _save_appointment_if_needed(session, final_profile, ended_time, session_id, notes, db):
    """Save appointment + lead when booking is confirmed. Prevents duplicates and stores confirmed contact details."""
    booking_ready = final_profile.get("booking_ready", False)
    visit_interest = final_profile.get("visit_interest", "")
    visit_slot = final_profile.get("visit_slot")

    should_book = booking_ready or (
        visit_interest in ["Interested", "Requested"]
    )
    if not should_book:
        return None

    cust_phone = session.customer_phone or final_profile.get("customer_phone")
    has_real_phone = bool(cust_phone and cust_phone not in ["+91 98450 12345", "", None])
    phone_confirmed = bool(final_profile.get("phone_confirmed") or has_real_phone)
    effective_phone = cust_phone if has_real_phone else None

    cust_email = final_profile.get("customer_email")
    email_confirmed = bool(final_profile.get("email_confirmed") and cust_email)
    effective_email = cust_email if email_confirmed else None

    # 1. If an appointment for this session was already created, update it instead of creating duplicates
    existing_for_session = db.query(Appointment).filter(
        Appointment.notes.ilike(f"%{session_id}%")
    ).first()

    if existing_for_session:
        if phone_confirmed and effective_phone and existing_for_session.customer_phone != effective_phone:
            existing_for_session.customer_phone = effective_phone
            existing_for_session.phone_confirmed = True
            if existing_for_session.lead_id:
                lead = db.query(Lead).filter(Lead.lead_id == existing_for_session.lead_id).first()
                if lead:
                    lead.phone = effective_phone
                    if session.customer_name and session.customer_name not in ["Prospective Buyer", "Valued Buyer"]:
                        lead.name = session.customer_name
        if email_confirmed and effective_email and existing_for_session.customer_email != effective_email:
            existing_for_session.customer_email = effective_email
            existing_for_session.email_confirmed = True
            if existing_for_session.lead_id:
                lead = db.query(Lead).filter(Lead.lead_id == existing_for_session.lead_id).first()
                if lead:
                    lead.email = effective_email
        if session.customer_name and session.customer_name not in ["Prospective Buyer", "Valued Buyer"]:
            existing_for_session.customer_name = session.customer_name
        return existing_for_session

    # Determine slot datetime
    raw_dt = final_profile.get("visit_date_iso") or final_profile.get("visit_slot")
    if raw_dt:
        try:
            slot_dt = datetime.datetime.fromisoformat(str(raw_dt))
        except Exception:
            slot_dt = ended_time + datetime.timedelta(days=2)
    else:
        slot_dt = ended_time + datetime.timedelta(days=2)

    # Find best matching property
    loc = final_profile.get("location") or "Whitefield"
    prop_name = final_profile.get("property_name") or ""
    if not prop_name:
        q = db.query(Property)
        if loc.lower() != "all":
            q = q.filter(Property.location.ilike(f"%{loc}%"))
        bhk = final_profile.get("bhk")
        if bhk:
            q = q.filter(Property.bhk == bhk)
        p = q.first()
        prop_name = p.name if p else "DreamSpace Realty Property"
        if p:
            loc = p.location

    # Duplicate check: same phone + property within 30 min window (if real phone)
    if has_real_phone:
        start_window = slot_dt - datetime.timedelta(minutes=30)
        end_window = slot_dt + datetime.timedelta(minutes=30)
        existing = db.query(Appointment).filter(
            Appointment.customer_phone == effective_phone,
            Appointment.property_name == prop_name,
            Appointment.date_time >= start_window,
            Appointment.date_time <= end_window
        ).first()
        if existing:
            return existing

    # Ensure Lead exists
    lead = None
    if has_real_phone:
        lead = db.query(Lead).filter(Lead.phone == effective_phone).first()

    if not lead:
        lead = Lead(
            lead_id=f"LEAD-{uuid.uuid4().hex[:8].upper()}",
            name=session.customer_name,
            phone=effective_phone,
            email=effective_email,
            preferred_location=loc,
            preferred_bhk=final_profile.get("bhk"),
            budget_min=None,
            budget_max=None,
            lead_score=final_profile.get("lead_score", 85),
            sentiment=final_profile.get("sentiment", "Positive"),
            status="Visit Scheduled",
            notes=f"Session {session_id}"
        )
        db.add(lead)
        db.flush()
    else:
        lead.status = "Visit Scheduled"
        if effective_email and not lead.email:
            lead.email = effective_email
        if session.customer_name and session.customer_name not in ["Prospective Buyer", "Valued Buyer"]:
            lead.name = session.customer_name

    appointment = Appointment(
        appointment_id=f"APT-{uuid.uuid4().hex[:8].upper()}",
        lead_id=lead.lead_id if lead else None,
        customer_name=session.customer_name,
        customer_phone=effective_phone,
        customer_email=effective_email,
        phone_confirmed=1 if phone_confirmed else 0,
        email_confirmed=1 if email_confirmed else 0,
        email_status="Pending",
        property_name=prop_name,
        location=loc,
        date_time=slot_dt,
        status="Confirmed",
        notes=notes or f"Booked via voice call {session_id}. Slot: {visit_slot or 'TBD'}",
        created_at=utcnow()
    )
    db.add(appointment)
    db.flush()
    return appointment


@router.post("/start", response_model=CallStartResponse)
def start_call(req: CallStartRequest, db: Session = Depends(get_db)):
    """Start a new voice/chat sales call session with EstateVoice AI."""
    session_id = f"CALL-{uuid.uuid4().hex[:8].upper()}"
    customer_name = req.customer_name or "Prospective Buyer"
    customer_phone = req.customer_phone or None

    greeting = gemini_sales_service.get_initial_greeting(req.language, customer_name)

    initial_profile = {
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "language": req.language,
        "conv_state": "GREET",
        "location": None,
        "budget": None,
        "bhk": None,
        "property_type": None,
        "timeline": None,
        "visit_interest": "Unknown",
        "visit_slot": None,
        "visit_date_iso": None,
        "property_name": None,
        "booking_ready": False,
        "call_ended": False,
        "sentiment": "Positive",
        "lead_score": 75,
        "intent": "Inquiring about Bangalore properties"
    }

    session = CallSession(
        session_id=session_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        language=req.language,
        status="in_progress",
        extracted_profile=initial_profile,
        started_at=utcnow()
    )
    db.add(session)
    db.flush()

    # Record initial greeting message
    system_msg = ChatMessage(
        session_id=session_id,
        role="model",
        content=greeting,
        created_at=utcnow()
    )
    db.add(system_msg)
    db.commit()

    return {
        "session_id": session_id,
        "greeting": greeting,
        "language": req.language,
        "initial_profile": initial_profile
    }

@router.post("/{session_id}/message", response_model=CallMessageResponse)
def send_call_message(session_id: str, req: CallMessageRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Send user speech/text message to Gemini, get sales response and updated profile."""
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Call session '{session_id}' not found")

    user_text = req.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=user_text,
        created_at=utcnow()
    )
    db.add(user_msg)
    db.flush()

    # 2. Retrieve history
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past_messages]

    # 3. Call Gemini Sales Service with DB for real-time RAG property retrieval
    current_profile = session.extracted_profile or {}
    gemini_result = gemini_sales_service.generate_sales_response(
        current_message=user_text,
        history=history,
        current_profile=current_profile,
        language=session.language,
        db=db
    )

    agent_reply = gemini_result["reply"]
    updated_profile = gemini_result["extracted_profile"]
    recommended_props = gemini_result.get("recommended_properties") or []
    detected_lang = gemini_result.get("detected_language") or updated_profile.get("language") or session.language
    session.language = detected_lang

    # 4. Save agent message
    agent_msg = ChatMessage(
        session_id=session_id,
        role="model",
        content=agent_reply,
        created_at=utcnow()
    )
    db.add(agent_msg)

    # 5. Update session profile and customer name/phone if detected
    if updated_profile.get("customer_name") and session.customer_name in ["Prospective Buyer", "Valued Buyer", None]:
        session.customer_name = updated_profile["customer_name"]
    if updated_profile.get("customer_phone") and updated_profile["customer_phone"] not in ["+91 98450 12345", None]:
        session.customer_phone = updated_profile["customer_phone"]
        # Update any appointment and lead created earlier for this session
        session_appts = db.query(Appointment).filter(Appointment.notes.ilike(f"%{session_id}%")).all()
        for appt in session_appts:
            appt.customer_phone = updated_profile["customer_phone"]
            if updated_profile.get("phone_confirmed") or updated_profile.get("conv_state") in ["BOOKED", "CLOSING"]:
                appt.phone_confirmed = 1
            if session.customer_name and session.customer_name not in ["Prospective Buyer", "Valued Buyer"]:
                appt.customer_name = session.customer_name
            if appt.lead_id:
                lead = db.query(Lead).filter(Lead.lead_id == appt.lead_id).first()
                if lead:
                    lead.phone = updated_profile["customer_phone"]
                    if session.customer_name and session.customer_name not in ["Prospective Buyer", "Valued Buyer"]:
                        lead.name = session.customer_name

    if updated_profile.get("customer_email") or (updated_profile.get("unconfirmed_email") and updated_profile.get("email_confirmed")):
        confirmed_em = updated_profile.get("customer_email") or updated_profile.get("unconfirmed_email")
        session_appts = db.query(Appointment).filter(Appointment.notes.ilike(f"%{session_id}%")).all()
        for appt in session_appts:
            appt.customer_email = confirmed_em
            if updated_profile.get("email_confirmed"):
                appt.email_confirmed = 1
            if appt.lead_id:
                lead = db.query(Lead).filter(Lead.lead_id == appt.lead_id).first()
                if lead:
                    lead.email = confirmed_em

    session.extracted_profile = updated_profile

    # 5b. If booking_ready or visit requested, save or update appointment immediately (don't wait for call end)
    appointment_id = None
    if updated_profile.get("booking_ready") or updated_profile.get("visit_interest") in ["Interested", "Requested"]:
        appt = _save_appointment_if_needed(session, updated_profile, utcnow(), session_id, None, db)
        if appt:
            appointment_id = appt.appointment_id
            if updated_profile.get("email_confirmed") and appt.customer_email and appt.email_status != "Sent":
                background_tasks.add_task(send_booking_email_in_background, appt.appointment_id)

    db.commit()

    # 5c. If call_ended by Gemini, auto-mark session as completed
    call_just_ended = updated_profile.get("call_ended", False)
    if call_just_ended and session.status == "in_progress":
        session.status = "completed"
        session.ended_at = utcnow()
        db.commit()

    # 6. Fallback properties if RAG did not return specific matches
    if not recommended_props:
        loc = updated_profile.get("location")
        bhk = updated_profile.get("bhk")
        query = db.query(Property)
        if loc and loc.lower() != "all":
            query = query.filter(Property.location.ilike(f"%{loc}%"))
        if bhk and isinstance(bhk, int) and bhk > 0:
            query = query.filter(Property.bhk == bhk)
        recommended_props = query.limit(3).all()
        if not recommended_props:
            recommended_props = db.query(Property).limit(3).all()

    return {
        "session_id": session_id,
        "reply": agent_reply,
        "extracted_profile": updated_profile,
        "recommended_properties": recommended_props,
        "appointment_id": appointment_id,
        "call_ended": call_just_ended,
        "detected_language": detected_lang,
        "timestamp": utcnow()
    }

@router.post("/{session_id}/end", response_model=CallEndResponse)
def end_call(session_id: str, background_tasks: BackgroundTasks, req: Optional[CallEndRequest] = None, db: Session = Depends(get_db)):
    """End the call session, compute summary and outcome, update CRM records."""
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Call session '{session_id}' not found")

    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past_messages]

    final_profile = session.extracted_profile or {}

    # Generate summary & outcome
    summary_data = gemini_sales_service.generate_call_summary(history, final_profile)
    summary_text = summary_data["summary"]
    outcome_text = summary_data["outcome"]

    # Calculate duration
    ended_time = utcnow()
    duration_sec = 0
    if session.started_at:
        # Convert naive to aware if necessary
        started = session.started_at.replace(tzinfo=datetime.timezone.utc) if session.started_at.tzinfo is None else session.started_at
        duration_sec = max(10, int((ended_time - started).total_seconds()))

    session.status = "completed"
    session.ended_at = ended_time
    session.duration_seconds = duration_sec
    session.summary = summary_text
    session.outcome = outcome_text

    # Record in CallRecord for backward compatibility / reporting (prevent duplicate)
    call_record = db.query(CallRecord).filter(CallRecord.call_id == session_id).first()
    safe_phone = session.customer_phone or updated_profile.get("customer_phone") if 'updated_profile' in locals() else session.customer_phone
    if not safe_phone:
        safe_phone = "Not Provided"
    if not call_record:
        call_record = CallRecord(
            call_id=session_id,
            customer_name=session.customer_name or "Prospective Buyer",
            customer_phone=safe_phone,
            duration_seconds=duration_sec,
            language=session.language or "English",
            sentiment=final_profile.get("sentiment", "Positive"),
            summary=summary_text,
            transcript=history,
            outcome=outcome_text,
            created_at=ended_time
        )
        db.add(call_record)
    else:
        call_record.duration_seconds = duration_sec
        call_record.summary = summary_text
        call_record.outcome = outcome_text
        call_record.transcript = history
        call_record.customer_name = session.customer_name or "Prospective Buyer"
        call_record.customer_phone = safe_phone

    # If booking_ready or visit was requested with a slot, save Appointment + Lead
    notes = req.notes if req else None
    saved_appt = _save_appointment_if_needed(session, final_profile, ended_time, session_id, notes, db)
    if saved_appt and final_profile.get("email_confirmed") and saved_appt.customer_email and saved_appt.email_status != "Sent":
        background_tasks.add_task(send_booking_email_in_background, saved_appt.appointment_id)

    db.commit()

    return {
        "session_id": session_id,
        "summary": summary_text,
        "outcome": outcome_text,
        "duration_seconds": duration_sec,
        "final_profile": final_profile
    }

@router.get("", response_model=List[CallSessionItem])
def list_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all previous call sessions with status and summaries."""
    calls = (
        db.query(CallSession)
        .order_by(desc(CallSession.started_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return calls

@router.get("/{session_id}", response_model=CallSessionDetailResponse)
def get_call_details(session_id: str, db: Session = Depends(get_db)):
    """Retrieve full transcript and profile for a specific call session."""
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Call session '{session_id}' not found")
    return session
