import datetime
from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, index=True)
    location = Column(String(100), nullable=False, index=True)
    property_type = Column(String(50), nullable=False, index=True)
    bhk = Column(Integer, nullable=False, index=True)
    price = Column(Float, nullable=False, index=True)  # In INR
    area = Column(Float, nullable=False)  # In sq ft
    amenities = Column(JSON, nullable=False, default=list)  # Stored as JSON array
    availability = Column(String(50), nullable=False, default="Ready to Move")
    description = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "property_id": self.property_id,
            "name": self.name,
            "location": self.location,
            "property_type": self.property_type,
            "bhk": self.bhk,
            "price": self.price,
            "area": self.area,
            "amenities": self.amenities if isinstance(self.amenities, list) else [],
            "availability": self.availability,
            "description": self.description,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    customer_name = Column(String(150), default="Valued Buyer")
    customer_phone = Column(String(50), nullable=True, default=None)
    language = Column(String(50), default="English")
    status = Column(String(50), default="in_progress")  # in_progress, completed, ended
    extracted_profile = Column(JSON, default=dict)
    summary = Column(Text, nullable=True)
    outcome = Column(String(100), default="In Discussion")
    started_at = Column(DateTime, default=utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.id")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "language": self.language,
            "status": self.status,
            "extracted_profile": self.extracted_profile or {},
            "summary": self.summary,
            "outcome": self.outcome,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds
        }

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("call_sessions.session_id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user", "model", "system"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    session = relationship("CallSession", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(150), nullable=True)
    preferred_location = Column(String(100), nullable=True)
    preferred_bhk = Column(Integer, nullable=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    lead_score = Column(Integer, default=75)  # 0-100
    sentiment = Column(String(50), default="Positive")  # Positive, Neutral, Hesitant
    status = Column(String(50), default="New")  # New, Contacted, Visit Scheduled, Converted
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(String(50), unique=True, index=True, nullable=False)
    lead_id = Column(String(50), nullable=True)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=True)
    customer_email = Column(String(150), nullable=True)
    email_status = Column(String(50), default="Pending")  # Pending, Sent, Failed
    email_sent_at = Column(DateTime, nullable=True)
    email_error = Column(Text, nullable=True)
    phone_confirmed = Column(Integer, default=0)
    email_confirmed = Column(Integer, default=0)
    property_name = Column(String(200), nullable=False)
    location = Column(String(100), nullable=False)
    date_time = Column(DateTime, nullable=False)
    status = Column(String(50), default="Confirmed")  # Scheduled, Confirmed, Completed, Cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "lead_id": self.lead_id,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "customer_email": self.customer_email,
            "email_status": self.email_status,
            "email_sent_at": self.email_sent_at.isoformat() if self.email_sent_at else None,
            "email_error": self.email_error,
            "phone_confirmed": bool(self.phone_confirmed),
            "email_confirmed": bool(self.email_confirmed),
            "property_name": self.property_name,
            "location": self.location,
            "date_time": self.date_time.isoformat() if self.date_time else None,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CallRecord(Base):
    __tablename__ = "call_records"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String(50), unique=True, index=True, nullable=False)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=True)
    duration_seconds = Column(Integer, default=0)
    language = Column(String(50), default="English")
    sentiment = Column(String(50), default="Positive")
    summary = Column(Text, nullable=True)
    transcript = Column(JSON, nullable=True)
    outcome = Column(String(100), default="Visit Scheduled")
    created_at = Column(DateTime, default=utcnow)

# Aliases for alternative naming conventions
ConversationSession = CallSession
ConversationMessage = ChatMessage
