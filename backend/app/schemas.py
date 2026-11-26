from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class PropertyBase(BaseModel):
    property_id: str
    name: str
    location: str
    property_type: str
    bhk: int
    price: float
    area: float
    amenities: List[str] = []
    availability: str = "Ready to Move"
    description: str
    image_url: str

class PropertyCreate(PropertyBase):
    pass

class PropertyResponse(PropertyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None

class PropertyListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    properties: List[PropertyResponse]

class LocationStat(BaseModel):
    location: str
    count: int
    avg_price: float

class BhkStat(BaseModel):
    bhk: int
    count: int

class PropertyTypeStat(BaseModel):
    property_type: str
    count: int

class PropertyStatsResponse(BaseModel):
    total_properties: int
    avg_price: float
    min_price: float
    max_price: float
    locations_count: int
    location_distribution: List[LocationStat]
    bhk_distribution: List[BhkStat]
    type_distribution: List[PropertyTypeStat]
    ready_to_move_count: int
    under_construction_count: int

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime
    database: str

# ----------------- Phase 2 Call Schemas -----------------

class CallStartRequest(BaseModel):
    language: str = "English"  # English, Hindi, Kannada, Telugu, Tamil
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class CallStartResponse(BaseModel):
    session_id: str
    greeting: str
    language: str
    initial_profile: Dict[str, Any]

class CallMessageRequest(BaseModel):
    message: str

class CallMessageResponse(BaseModel):
    session_id: str
    reply: str
    extracted_profile: Dict[str, Any]
    recommended_properties: List[PropertyResponse] = []
    appointment_id: Optional[str] = None
    call_ended: Optional[bool] = False
    detected_language: Optional[str] = "English"
    timestamp: datetime

class CallEndRequest(BaseModel):
    notes: Optional[str] = None

class CallEndResponse(BaseModel):
    session_id: str
    summary: str
    outcome: str
    duration_seconds: int
    final_profile: Dict[str, Any]

class VoiceMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class VoiceEndRequest(BaseModel):
    session_id: Optional[str] = None
    notes: Optional[str] = None

class VoiceStatusResponse(BaseModel):
    status: str
    service: str
    gemini_model: str
    supported_languages: List[str]


class ChatMessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CallSessionItem(BaseModel):
    id: int
    session_id: str
    customer_name: str
    customer_phone: str
    language: str
    status: str
    summary: Optional[str] = None
    outcome: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int
    extracted_profile: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

class CallSessionDetailResponse(CallSessionItem):
    messages: List[ChatMessageResponse] = []
