from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import uuid

from app.database import get_db
from app.models import CallSession, ChatMessage, Property, Lead, Appointment, CallRecord
from app.schemas import (
    CallStartRequest,
    CallStartResponse,
    CallMessageRequest,
    CallMessageResponse,
    CallEndRequest,
    CallEndResponse,
    CallSessionDetailResponse,
    VoiceMessageRequest,
    VoiceEndRequest,
    VoiceStatusResponse
)
from app.services.gemini_service import gemini_sales_service

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

@router.get("/status", response_model=VoiceStatusResponse)
def get_voice_status():
    """Check AI voice assistant status and active Gemini models."""
    return {
        "status": "online",
        "service": "EstateVoice AI - DreamSpace Sales Assistant",
        "gemini_model": "gemini-3.5-flash-lite",
        "supported_languages": ["English", "Hindi", "Kannada"]
    }

@router.post("/start", response_model=CallStartResponse)
def start_voice_session(req: CallStartRequest, db: Session = Depends(get_db)):
    """Initialize a voice conversation session with EstateVoice AI."""
    session_id = f"CALL-{uuid.uuid4().hex[:8].upper()}"
    customer_name = req.customer_name or "Prospective Buyer"
    customer_phone = req.customer_phone or "+91 98450 12345"

    greeting = gemini_sales_service.get_initial_greeting(req.language, customer_name)

    initial_profile = {
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "language": req.language,
        "location": None,
        "budget": None,
        "bhk": None,
        "timeline": None,
        "visit_interest": "Unknown",
        "visit_slot": None,
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

@router.post("/message", response_model=CallMessageResponse)
def send_voice_message_body(req: VoiceMessageRequest, db: Session = Depends(get_db)):
    """Process user message when session_id is in request body."""
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id is required in request body")
    return _process_user_message(req.session_id, req.message, db)

@router.post("/{session_id}/message", response_model=CallMessageResponse)
def send_voice_message_path(session_id: str, req: CallMessageRequest, db: Session = Depends(get_db)):
    """Process user message when session_id is in URL path."""
    return _process_user_message(session_id, req.message, db)

def _process_user_message(session_id: str, user_text_raw: str, db: Session):
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Voice session '{session_id}' not found")

    user_text = user_text_raw.strip()
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

    # 3. Call Gemini Sales Service
    current_profile = session.extracted_profile or {}
    gemini_result = gemini_sales_service.generate_sales_response(
        current_message=user_text,
        history=history,
        current_profile=current_profile,
        language=session.language,
        db=db,
        session_id=session_id
    )

    agent_reply = gemini_result["reply"]
    updated_profile = gemini_result["extracted_profile"]

    # 4. Save agent message
    agent_msg = ChatMessage(
        session_id=session_id,
        role="model",
        content=agent_reply,
        created_at=utcnow()
    )
    db.add(agent_msg)

    # 5. Update session profile and customer name if detected
    if updated_profile.get("customer_name") and session.customer_name in ["Prospective Buyer", "Valued Buyer"]:
        session.customer_name = updated_profile["customer_name"]

    session.extracted_profile = updated_profile
    db.commit()

    # 6. Fetch recommended properties
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
        "timestamp": utcnow()
    }

@router.post("/end", response_model=CallEndResponse)
def end_voice_session_body(req: VoiceEndRequest, db: Session = Depends(get_db)):
    """End call when session_id is in request body."""
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id is required in request body")
    return _process_end_session(req.session_id, req.notes, db)

@router.post("/{session_id}/end", response_model=CallEndResponse)
def end_voice_session_path(session_id: str, req: Optional[CallEndRequest] = None, db: Session = Depends(get_db)):
    """End call when session_id is in URL path."""
    notes = req.notes if req else None
    return _process_end_session(session_id, notes, db)

def _process_end_session(session_id: str, notes: Optional[str], db: Session):
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Voice session '{session_id}' not found")

    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past_messages]
    final_profile = session.extracted_profile or {}

    summary_data = gemini_sales_service.generate_call_summary(history, final_profile)
    summary_text = summary_data["summary"]
    outcome_text = summary_data["outcome"]

    ended_time = utcnow()
    duration_sec = 0
    if session.started_at:
        started = session.started_at.replace(tzinfo=datetime.timezone.utc) if session.started_at.tzinfo is None else session.started_at
        duration_sec = max(10, int((ended_time - started).total_seconds()))

    session.status = "completed"
    session.ended_at = ended_time
    session.duration_seconds = duration_sec
    session.summary = summary_text
    session.outcome = outcome_text

    call_record = CallRecord(
        call_id=session_id,
        customer_name=session.customer_name,
        customer_phone=session.customer_phone,
        duration_seconds=duration_sec,
        language=session.language,
        sentiment=final_profile.get("sentiment", "Positive"),
        summary=summary_text,
        transcript=history,
        outcome=outcome_text,
        created_at=ended_time
    )
    db.add(call_record)

    if outcome_text == "Visit Scheduled" or final_profile.get("visit_interest") in ["Interested", "Requested"]:
        loc = final_profile.get("location") or "Whitefield"
        matching_prop = db.query(Property).filter(Property.location.ilike(f"%{loc}%")).first()
        prop_name = matching_prop.name if matching_prop else "Prestige Willow Park"

        appointment = Appointment(
            appointment_id=f"APT-{uuid.uuid4().hex[:6].upper()}",
            customer_name=session.customer_name,
            customer_phone=session.customer_phone,
            property_name=prop_name,
            location=loc,
            date_time=ended_time + datetime.timedelta(days=2),
            status="Confirmed",
            notes=f"Auto-scheduled from voice call {session_id}. Slot: {final_profile.get('visit_slot') or 'Weekend'}"
        )
        db.add(appointment)

    db.commit()

    return {
        "session_id": session_id,
        "summary": summary_text,
        "outcome": outcome_text,
        "duration_seconds": duration_sec,
        "final_profile": final_profile
    }

@router.get("/history/{session_id}", response_model=CallSessionDetailResponse)
@router.get("/{session_id}", response_model=CallSessionDetailResponse)
def get_voice_history(session_id: str, db: Session = Depends(get_db)):
    """Retrieve full conversation history, transcripts and customer profile for a session."""
    session = db.query(CallSession).filter(CallSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Voice session '{session_id}' not found")
    return session
