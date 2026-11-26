import datetime
import re
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Appointment

BUSINESS_START_HOUR = 9   # 9:00 AM
BUSINESS_END_HOUR = 19    # 7:00 PM (last 1-hr slot starts at 6:00 PM)
SLOT_DURATION_MINUTES = 60
ACTIVE_APPOINTMENT_STATUSES = ("Confirmed", "Scheduled")

RESCHEDULE_KEYWORDS = [
    "reschedule", "re-schedule", "change appointment", "change my appointment",
    "change the appointment", "change my visit", "change visit", "change date",
    "change the date", "change time", "change the time", "change the scheduled time",
    "change scheduled time", "change slot", "move my visit", "move my appointment",
    "move the appointment", "postpone", "prepone", "another day", "another time",
    "different day", "different time", "instead", "shift my visit", "shift appointment",
    "can we meet", "can i come", "update appointment", "update my visit",
    # Hindi
    "बदलना", "बदल", "रीशेड्यूल", "दूसरा समय", "दूसरा दिन", "आगे बढ़ा", "समय बदल", "तारीख बदल",
    "badalna", "badal", "samay badal", "tareekh badal",
    # Telugu
    "మార్చాలి", "మార్చు", "రీషెడ్యూల్", "వేరే సమయం", "వేరే రోజు", "సమయం మార్చ", "తేదీ మార్చ",
    "marchali", "marchandi", "time march",
    # Kannada
    "ಬದಲಾಯಿಸ", "ರೀಶೆಡ್ಯೂಲ್", "ಬೇರೆ ಸಮಯ", "ಬೇರೆ ದಿನ", "ಸಮಯ ಬದಲ", "ದಿನಾಂಕ ಬದಲ",
    "badalayis", "badalisi",
    # Tamil
    "மாற்ற", "மாற்று", "வேறு நேரம்", "வேறு நாள்", "நேரம் மாற்ற", "தேதி மாற்ற",
    "maatra", "maatru"
]

WEEKDAY_MAP = {
    "monday": 0, "mon": 0, "सोमवार": 0, "సోమవారం": 0, "ಸೋಮವಾರ": 0, "திங்கள்": 0,
    "tuesday": 1, "tue": 1, "tues": 1, "मंगलवार": 1, "మంగళవారం": 1, "ಮಂಗಳವಾರ": 1, "செவ்வாய்": 1,
    "wednesday": 2, "wed": 2, "बुधवार": 2, "బుధవారం": 2, "ಬುಧವಾರ": 2, "புதன்": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3, "गुरुवार": 3, "గురువారం": 3, "ಗುರುವಾರ": 3, "வியாழன்": 3,
    "friday": 4, "fri": 4, "शुक्रवार": 4, "శుక్రవారం": 4, "ಶುಕ್ರವಾರ": 4, "வெள்ளி": 4,
    "saturday": 5, "sat": 5, "शनिवार": 5, "శనివారం": 5, "ಶನಿವಾರ": 5, "சனி": 5,
    "sunday": 6, "sun": 6, "रविवार": 6, "ఆదివారం": 6, "ಭಾನುವಾರ": 6, "ஞாயிறு": 6,
}

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def get_local_now() -> datetime.datetime:
    """Return current naive local datetime (consistent with SQLite Appointment.date_time storage)."""
    return datetime.datetime.now().replace(second=0, microsecond=0)


def detect_reschedule_intent(text: str, profile: Optional[Dict[str, Any]] = None) -> bool:
    """Detect whether the customer is asking to reschedule or change an existing appointment."""
    if not text:
        return False
    low = text.lower().strip()

    # Direct reschedule phrases
    if any(kw in low for kw in RESCHEDULE_KEYWORDS):
        return True

    # Pattern like "change to Friday", "make it 4 PM", "can we do tomorrow", "switch to Sunday"
    if re.search(r'\b(change|switch|move|make\s+it|shift|reschedule)\b.*\b(to|on|at|for)\b', low):
        # Exclude email/phone/name corrections
        if not any(w in low for w in ["email", "phone", "number", "name", "@", "dot"]):
            return True

    # If customer already has a booked appointment and mentions a new date/time with "instead" or "rather"
    prof = profile or {}
    has_booking = bool(
        prof.get("appointment_id")
        or prof.get("conv_state") in ["BOOKED", "CLOSING"]
        or (prof.get("booking_ready") and prof.get("visit_slot"))
    )
    if has_booking:
        parsed = parse_date_time_components(text)
        if (parsed["has_date"] or parsed["has_time"]) and any(
            w in low for w in ["instead", "change", "actually", "rather", "prefer", "move", "shift", "can we"]
        ):
            return True

    return False


def parse_date_time_components(
    text: str,
    base_dt: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    """
    Parse date and time independently from natural language across English and Indian languages.
    Detects invalid times (e.g., 25:00, 14 PM) and past relative dates (yesterday).
    """
    now = base_dt or get_local_now()
    low = (text or "").lower().strip()

    parsed_date: Optional[datetime.date] = None
    parsed_time: Optional[datetime.time] = None
    has_date = False
    has_time = False
    invalid_time = False
    invalid_date = False

    # ── 1. Parse Date ──────────────────────────────────────────────────────────
    if any(w in low for w in ["yesterday", "कल बीता", "నిన్న", "ನಿನ್ನೆ", "நேற்று"]):
        parsed_date = now.date() - datetime.timedelta(days=1)
        has_date = True
    elif any(w in low for w in ["day after tomorrow", "परसों", "ఎల్లుండి", "ನಾಡಿದ್ದು", "நாளை மறுநாள்"]):
        parsed_date = now.date() + datetime.timedelta(days=2)
        has_date = True
    elif any(w in low for w in ["tomorrow", "రేపు", "ನಾಳೆ", "நாளை"]) or re.search(r'\bkal\b|कल', low):
        parsed_date = now.date() + datetime.timedelta(days=1)
        has_date = True
    elif any(w in low for w in ["today", "ఈరోజు", "ఇవాళ", "ಇಂದು", "இன்று", "आज"]):
        parsed_date = now.date()
        has_date = True

    # ISO date YYYY-MM-DD
    if not has_date:
        iso_match = re.search(r'\b(20\d{2})-(\d{1,2})-(\d{1,2})\b', low)
        if iso_match:
            try:
                parsed_date = datetime.date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
                has_date = True
            except ValueError:
                invalid_date = True
                has_date = True

    # DD/MM/YYYY or DD-MM-YYYY
    if not has_date:
        dmy_match = re.search(r'\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](20\d{2}|\d{2}))?\b', low)
        if dmy_match:
            day_v, mon_v = int(dmy_match.group(1)), int(dmy_match.group(2))
            yr_raw = dmy_match.group(3)
            yr_v = int(yr_raw) if yr_raw else now.year
            if yr_v < 100:
                yr_v += 2000
            try:
                parsed_date = datetime.date(yr_v, mon_v, day_v)
                has_date = True
            except ValueError:
                invalid_date = True
                has_date = True

    # Month name + day (e.g., "Nov 28", "28th November")
    if not has_date:
        m1 = re.search(r'\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b', low)
        m2 = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:,?\s*(20\d{2}))?\b', low)
        if m1 and m1.group(1) in MONTH_MAP:
            try:
                yr_v = int(m1.group(3)) if m1.group(3) else now.year
                parsed_date = datetime.date(yr_v, MONTH_MAP[m1.group(1)], int(m1.group(2)))
                has_date = True
            except ValueError:
                invalid_date = True
                has_date = True
        elif m2 and m2.group(2) in MONTH_MAP:
            try:
                yr_v = int(m2.group(3)) if m2.group(3) else now.year
                parsed_date = datetime.date(yr_v, MONTH_MAP[m2.group(2)], int(m2.group(1)))
                has_date = True
            except ValueError:
                invalid_date = True
                has_date = True

    # Weekday name
    if not has_date:
        for w_name, target_wd in WEEKDAY_MAP.items():
            if (w_name.isascii() and re.search(r'\b' + re.escape(w_name) + r'\b', low)) or (not w_name.isascii() and w_name in low):
                days_ahead = (target_wd - now.weekday()) % 7
                if "last " in low:
                    days_back = (now.weekday() - target_wd) % 7 or 7
                    parsed_date = now.date() - datetime.timedelta(days=days_back)
                else:
                    if days_ahead == 0 and "next " in low:
                        days_ahead = 7
                    elif days_ahead == 0:
                        days_ahead = 7
                    elif "next " in low and days_ahead < 7:
                        days_ahead += 0
                    parsed_date = now.date() + datetime.timedelta(days=days_ahead)
                has_date = True
                break

    # ── 2. Parse Time ──────────────────────────────────────────────────────────
    # Match "11:30 AM", "4 PM", "16:00", "25:00", "4.30 pm"
    time_match = re.search(r'\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b', low)
    if time_match:
        hr = int(time_match.group(1))
        mn = int(time_match.group(2) or 0)
        ampm = time_match.group(3).replace(".", "")
        if hr < 1 or hr > 12 or mn > 59:
            invalid_time = True
            has_time = True
        else:
            if ampm == "pm" and hr != 12:
                hr += 12
            elif ampm == "am" and hr == 12:
                hr = 0
            parsed_time = datetime.time(hr, mn)
            has_time = True
    else:
        # 24-hour HH:MM (exclude dates already matched)
        t24 = re.search(r'(?<![\d/\-])\b(\d{1,2}):(\d{2})\b(?![/\-]\d)', low)
        if t24:
            hr = int(t24.group(1))
            mn = int(t24.group(2))
            if hr > 23 or mn > 59:
                invalid_time = True
                has_time = True
            else:
                parsed_time = datetime.time(hr, mn)
                has_time = True
        else:
            # Spoken time of day
            if "morning" in low or "सुबह" in low or "ఉదయం" in low or "ಬೆಳಗ್ಗೆ" in low or "காலை" in low:
                parsed_time = datetime.time(10, 0)
                has_time = True
            elif "noon" in low or "midday" in low:
                parsed_time = datetime.time(12, 0)
                has_time = True
            elif "afternoon" in low or "दोपहर" in low or "మధ్యాహ్నం" in low or "ಮಧ್ಯಾಹ್ನ" in low or "மதியம்" in low:
                parsed_time = datetime.time(14, 0)
                has_time = True
            elif "evening" in low or "शाम" in low or "సాయంత్రం" in low or "ಸಂಜೆ" in low or "மாலை" in low:
                parsed_time = datetime.time(17, 0)
                has_time = True
            elif "night" in low or "midnight" in low or "रात" in low or "రాత్రి" in low or "ರಾತ್ರಿ" in low or "இரவு" in low:
                parsed_time = datetime.time(21, 0)  # Intentionally outside business hours
                has_time = True

    return {
        "date": parsed_date,
        "time": parsed_time,
        "has_date": has_date,
        "has_time": has_time,
        "invalid_time": invalid_time,
        "invalid_date": invalid_date,
    }


def format_date_human(d: datetime.date) -> str:
    return d.strftime("%A, %d %b %Y")


def format_time_human(t: datetime.time) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def format_slot_human(dt: datetime.datetime) -> str:
    return f"{format_date_human(dt.date())} at {format_time_human(dt.time())}"


def validate_slot(
    db: Optional[Session],
    candidate_dt: datetime.datetime,
    exclude_appointment_id: Optional[str] = None,
    now_dt: Optional[datetime.datetime] = None,
) -> Tuple[bool, str, Optional[datetime.datetime]]:
    """
    Validate a candidate appointment datetime against:
    - Past dates and times
    - Business working hours (9:00 AM - 7:00 PM)
    - Existing & overlapping appointments (excluding customer's own existing appointment)
    Returns (is_valid, reason_code, suggested_alternative_dt).
    """
    now = now_dt or get_local_now()

    # 1. Past date/time check
    if candidate_dt <= now:
        alt = find_next_available_slot(
            db,
            max(candidate_dt.date(), now.date()),
            exclude_appointment_id=exclude_appointment_id,
            now_dt=now,
            preferred_hour=candidate_dt.hour
        )
        return False, "past_datetime", alt

    # 2. Business working hours check (09:00 <= time < 19:00)
    if candidate_dt.hour < BUSINESS_START_HOUR or candidate_dt.hour >= BUSINESS_END_HOUR:
        alt = find_next_available_slot(
            db,
            candidate_dt.date(),
            exclude_appointment_id=exclude_appointment_id,
            now_dt=now,
            preferred_hour=10 if candidate_dt.hour < BUSINESS_START_HOUR else 18
        )
        return False, "outside_business_hours", alt

    # 3. Conflict / overlap check against DB appointments
    if db is not None and has_slot_conflict(db, candidate_dt, exclude_appointment_id):
        alt = find_next_available_slot(
            db,
            candidate_dt.date(),
            exclude_appointment_id=exclude_appointment_id,
            now_dt=now,
            preferred_hour=candidate_dt.hour
        )
        return False, "slot_booked", alt

    return True, "available", None


def has_slot_conflict(
    db: Session,
    candidate_dt: datetime.datetime,
    exclude_appointment_id: Optional[str] = None,
) -> bool:
    """Check if any active appointment overlaps within +/- 59 minutes of candidate_dt."""
    window_start = candidate_dt - datetime.timedelta(minutes=SLOT_DURATION_MINUTES - 1)
    window_end = candidate_dt + datetime.timedelta(minutes=SLOT_DURATION_MINUTES - 1)

    query = db.query(Appointment).filter(
        Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
        Appointment.date_time >= window_start,
        Appointment.date_time <= window_end,
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.appointment_id != exclude_appointment_id)

    return query.first() is not None


def find_next_available_slot(
    db: Optional[Session],
    target_date: datetime.date,
    exclude_appointment_id: Optional[str] = None,
    now_dt: Optional[datetime.datetime] = None,
    preferred_hour: Optional[int] = None,
) -> datetime.datetime:
    """Find the nearest available 1-hour slot within business hours (9 AM - 6 PM)."""
    now = now_dt or get_local_now()
    base_hours = list(range(BUSINESS_START_HOUR, BUSINESS_END_HOUR))
    if preferred_hour is not None and BUSINESS_START_HOUR <= preferred_hour < BUSINESS_END_HOUR:
        # Order hours closest to preferred_hour, preferring later slots first
        ordered_hours = sorted(base_hours, key=lambda h: (abs(h - preferred_hour), 0 if h > preferred_hour else 1))
    else:
        ordered_hours = [11, 10, 14, 15, 16, 17, 9, 12, 13, 18]

    for day_offset in range(0, 14):
        check_date = target_date + datetime.timedelta(days=day_offset)
        hours_to_try = ordered_hours if day_offset == 0 else [10, 11, 12, 14, 15, 16, 17, 9, 18]
        for hr in hours_to_try:
            cand = datetime.datetime.combine(check_date, datetime.time(hr, 0))
            if cand <= now:
                continue
            if db is None or not has_slot_conflict(db, cand, exclude_appointment_id):
                return cand

    return datetime.datetime.combine(target_date + datetime.timedelta(days=1), datetime.time(11, 0))


def find_customer_appointment(
    db: Optional[Session],
    session_id: Optional[str] = None,
    appointment_id: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_email: Optional[str] = None,
) -> Optional[Appointment]:
    """Retrieve the customer's existing active appointment by ID, session, phone, or email."""
    if db is None:
        return None

    if appointment_id:
        appt = db.query(Appointment).filter(
            Appointment.appointment_id == appointment_id,
            Appointment.status != "Cancelled",
        ).first()
        if appt:
            return appt

    if session_id:
        appt = db.query(Appointment).filter(
            Appointment.notes.ilike(f"%{session_id}%"),
            Appointment.status != "Cancelled",
        ).order_by(desc(Appointment.created_at)).first()
        if appt:
            return appt

    if customer_phone and customer_phone not in ("+91 98450 12345", "", None):
        appt = db.query(Appointment).filter(
            Appointment.customer_phone == customer_phone,
            Appointment.status != "Cancelled",
        ).order_by(desc(Appointment.created_at)).first()
        if appt:
            return appt

    if customer_email and "@" in str(customer_email):
        appt = db.query(Appointment).filter(
            Appointment.customer_email == customer_email,
            Appointment.status != "Cancelled",
        ).order_by(desc(Appointment.created_at)).first()
        if appt:
            return appt

    return None


def reschedule_appointment_in_db(
    db: Session,
    appointment: Appointment,
    new_dt: datetime.datetime,
    session_id: Optional[str] = None,
    now_dt: Optional[datetime.datetime] = None,
) -> Tuple[bool, str, Optional[datetime.datetime]]:
    """
    Atomically validate and update an existing appointment record.
    Excludes the appointment itself from conflict checking and never creates a duplicate.
    Keeps the original appointment unchanged if validation fails.
    """
    is_valid, reason, alt_dt = validate_slot(
        db=db,
        candidate_dt=new_dt,
        exclude_appointment_id=appointment.appointment_id,
        now_dt=now_dt,
    )
    if not is_valid:
        return False, reason, alt_dt

    slot_label = format_slot_human(new_dt)
    appointment.date_time = new_dt
    appointment.status = "Confirmed"
    appointment.email_status = "Pending"

    session_tag = f"Session {session_id}" if session_id and (not appointment.notes or session_id not in appointment.notes) else ""
    resched_note = f"Rescheduled to {slot_label}."
    existing_notes = (appointment.notes or "").strip()
    if session_tag and session_tag not in existing_notes:
        appointment.notes = f"{existing_notes} | {session_tag} | {resched_note}".strip(" |")
    else:
        appointment.notes = f"{existing_notes} | {resched_note}".strip(" |")

    db.flush()
    return True, "rescheduled", None


def get_reschedule_message(
    msg_type: str,
    language: str = "English",
    date_str: str = "",
    time_str: str = "",
    alt_str: str = "",
) -> str:
    """Localized, natural responses for every step of the rescheduling workflow."""
    lang = (language or "English").lower()

    if msg_type == "ask_when":
        if "hindi" in lang:
            return "जी बिल्कुल! आप अपनी प्रॉपर्टी विजिट को कब रीशेड्यूल करना चाहेंगे?"
        if "telugu" in lang:
            return "తప్పకుండా! మీరు మీ ప్రాపర్టీ విజిట్‌ను ఎప్పుడు రీషెడ్యూల్ చేయాలనుకుంటున్నారు?"
        if "kannada" in lang:
            return "ಖಂಡಿತ! ನಿಮ್ಮ ಪ್ರಾಪರ್ಟಿ ಭೇಟಿಯನ್ನು ನೀವು ಯಾವಾಗ ರೀಶೆಡ್ಯೂಲ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?"
        if "tamil" in lang:
            return "கண்டிப்பாக! உங்கள் சொத்து பார்வையை எப்போது மாற்ற விரும்புகிறீர்கள்?"
        return "Yes, of course! When would you like to reschedule your property visit?"

    if msg_type == "ask_time":
        if "hindi" in lang:
            return f"जी, {date_str} के लिए आप कौन सा समय पसंद करेंगे? हम सुबह 9:00 बजे से शाम 7:00 बजे तक उपलब्ध हैं।"
        if "telugu" in lang:
            return f"సరే, {date_str} కోసం మీరు ఏ సమయాన్ని కోరుకుంటున్నారు? మా బృందం ఉదయం 9:00 నుండి సాయంత్రం 7:00 వరకు అందుబాటులో ఉంటుంది."
        if "kannada" in lang:
            return f"ಸರಿ, {date_str} ರಂದು ನಿಮಗೆ ಯಾವ ಸಮಯ ಅನುಕೂಲವಾಗುತ್ತದೆ? ನಾವು ಬೆಳಗ್ಗೆ 9:00 ರಿಂದ ಸಂಜೆ 7:00 ರವರೆಗೆ ಲಭ್ಯವಿರುತ್ತೇವೆ."
        if "tamil" in lang:
            return f"சரி, {date_str} அன்று எந்த நேரம் உங்களுக்கு வசதியாக இருக்கும்? காலை 9:00 மணி முதல் மாலை 7:00 மணி வரை நாங்கள் கிடைப்போம்."
        return f"Got it, {date_str}. What time would you prefer for your visit? Our team is available between 9:00 AM and 7:00 PM."

    if msg_type == "ask_date":
        if "hindi" in lang:
            return f"जी, {time_str} ठीक है। आप किस तारीख को विजिट रीशेड्यूल करना चाहेंगे?"
        if "telugu" in lang:
            return f"సరే, {time_str} బాగుంది. మీరు ఏ తేదీకి విజిట్‌ను మార్చాలనుకుంటున్నారు?"
        if "kannada" in lang:
            return f"ಸರಿ, {time_str} ಸೂಕ್ತವಾಗಿದೆ. ಯಾವ ದಿನಾಂಕಕ್ಕೆ ಭೇಟಿಯನ್ನು ಬದಲಾಯಿಸಬೇಕು?"
        if "tamil" in lang:
            return f"சரி, {time_str} சரியாக இருக்கும். எந்த தேதிக்கு பார்வையை மாற்ற விரும்புகிறீர்கள்?"
        return f"Sure, {time_str} works. Which date would you like to reschedule your visit to?"

    if msg_type == "success":
        if "hindi" in lang:
            return f"आपकी अपॉइंटमेंट सफलतापूर्वक {date_str} को {time_str} पर रीशेड्यूल कर दी गई है।"
        if "telugu" in lang:
            return f"మీ అపాయింట్‌మెంట్ విజయవంతంగా {date_str}న {time_str}కు రీషెడ్యూల్ చేయబడింది."
        if "kannada" in lang:
            return f"ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ {date_str} ರಂದು {time_str} ಕ್ಕೆ ರೀಶೆಡ್ಯೂಲ್ ಆಗಿದೆ."
        if "tamil" in lang:
            return f"உங்கள் சந்திப்பு {date_str} அன்று {time_str} மணிக்கு வெற்றிகரமாக மாற்றப்பட்டுள்ளது."
        return f"Your appointment has been successfully rescheduled to {date_str} at {time_str}."

    if msg_type == "slot_booked":
        if "hindi" in lang:
            return f"दुर्भाग्य से, वह समय स्लॉट पहले से बुक है। क्या {alt_str} आपके लिए उपयुक्त रहेगा?"
        if "telugu" in lang:
            return f"క్షమించండి, ఆ సమయం ఇప్పటికే బుక్ అయింది. {alt_str} మీకు అనుకూలంగా ఉంటుందా?"
        if "kannada" in lang:
            return f"ಕ್ಷಮಿಸಿ, ಆ ಸಮಯ ಈಗಾಗಲೇ ಬುಕ್ ಆಗಿದೆ. {alt_str} ನಿಮಗೆ ಅನುಕೂಲವಾಗುತ್ತದೆಯೇ?"
        if "tamil" in lang:
            return f"மன்னிக்கவும், அந்த நேரம் ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளது. {alt_str} உங்களுக்கு வசதியாக இருக்குமா?"
        return f"Unfortunately, that time slot is already booked. Would {alt_str} work for you?"

    if msg_type == "outside_business_hours":
        if "hindi" in lang:
            return f"हमारी प्रॉपर्टी विजिट सुबह 9:00 बजे से शाम 7:00 बजे के बीच उपलब्ध होती हैं। क्या {alt_str} आपके लिए उपयुक्त रहेगा?"
        if "telugu" in lang:
            return f"మా ప్రాపర్టీ విజిట్లు ఉదయం 9:00 నుండి సాయంత్రం 7:00 గంటల మధ్య మాత్రమే ఉంటాయి. {alt_str} మీకు సరిపోతుందా?"
        if "kannada" in lang:
            return f"ನಮ್ಮ ಪ್ರಾಪರ್ಟಿ ಭೇಟಿಗಳು ಬೆಳಗ್ಗೆ 9:00 ರಿಂದ ಸಂಜೆ 7:00 ರವರೆಗೆ ಮಾತ್ರ ಲಭ್ಯವಿರುತ್ತವೆ. {alt_str} ನಿಮಗೆ ಅನುಕೂಲವಾಗುತ್ತದೆಯೇ?"
        if "tamil" in lang:
            return f"எங்கள் சொத்து பார்வைகள் காலை 9:00 மணி முதல் மாலை 7:00 மணி வரை மட்டுமே கிடைக்கும். {alt_str} உங்களுக்கு வசதியாக இருக்குமா?"
        return f"Our property visits are available between 9:00 AM and 7:00 PM. Would {alt_str} work for you?"

    if msg_type == "past_datetime":
        if "hindi" in lang:
            return f"वह तारीख या समय बीत चुका है। क्या {alt_str} आपके लिए उपयुक्त रहेगा?"
        if "telugu" in lang:
            return f"ఆ తేదీ లేదా సమయం గడిచిపోయింది. {alt_str} మీకు అనుకూలంగా ఉంటుందా?"
        if "kannada" in lang:
            return f"ಆ ದಿನಾಂಕ ಅಥವಾ ಸಮಯ ಈಗಾಗಲೇ ಕಳೆದಿದೆ. {alt_str} ನಿಮಗೆ ಅನುಕೂಲವಾಗುತ್ತದೆಯೇ?"
        if "tamil" in lang:
            return f"அந்த தேதி அல்லது நேரம் கடந்துவிட்டது. {alt_str} உங்களுக்கு வசதியாக இருக்குமா?"
        return f"That date or time is in the past. Would {alt_str} work for you?"

    if msg_type == "invalid_time":
        if "hindi" in lang:
            return "कृपया सुबह 9:00 बजे से शाम 7:00 बजे के बीच का एक मान्य समय बताएं, जैसे 11:00 AM या 4:00 PM।"
        if "telugu" in lang:
            return "దయచేసి ఉదయం 9:00 నుండి సాయంత్రం 7:00 మధ్య సరైన సమయాన్ని చెప్పండి, ఉదాహరణకు 11:00 AM లేదా 4:00 PM."
        if "kannada" in lang:
            return "ದಯವಿಟ್ಟು ಬೆಳಗ್ಗೆ 9:00 ರಿಂದ ಸಂಜೆ 7:00 ರೊಳಗಿನ ಸರಿಯಾದ ಸಮಯವನ್ನು ತಿಳಿಸಿ, ಉದಾಹರಣೆಗೆ 11:00 AM ಅಥವಾ 4:00 PM."
        if "tamil" in lang:
            return "தயவுசெய்து காலை 9:00 முதல் மாலை 7:00 மணிக்குள் ஒரு சரியான நேரத்தைத் தெரிவிக்கவும், உதாரணமாக 11:00 AM அல்லது 4:00 PM."
        return "I couldn't recognize that time. Could you please provide a valid time between 9:00 AM and 7:00 PM, such as 11:00 AM or 4:00 PM?"

    if msg_type == "no_appointment":
        if "hindi" in lang:
            return "मुझे आपके लिए कोई सक्रिय अपॉइंटमेंट नहीं मिला। क्या आप नई प्रॉपर्टी विजिट बुक करना चाहेंगे?"
        if "telugu" in lang:
            return "మీ పేరు మీద యాక్టివ్ అపాయింట్‌మెంట్ ఏదీ కనుగొనబడలేదు. మీరు కొత్త ప్రాపర్టీ విజిట్ బుక్ చేయాలనుకుంటున్నారా?"
        if "kannada" in lang:
            return "ನಿಮ್ಮ ಹೆಸರಿನಲ್ಲಿ ಯಾವುದೇ ಸಕ್ರಿಯ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಕಂಡುಬಂದಿಲ್ಲ. ಹೊಸ ಪ್ರಾಪರ್ಟಿ ಭೇಟಿಯನ್ನು ಬುಕ್ ಮಾಡಲು ಬಯಸುವಿರಾ?"
        if "tamil" in lang:
            return "உங்கள் பெயரில் செயலில் உள்ள சந்திப்பு எதுவும் கிடைக்கவில்லை. புதிய சொத்து பார்வையை பதிவு செய்ய விரும்புகிறீர்களா?"
        return "I couldn't find an existing active appointment to reschedule. Would you like to book a new property visit?"

    return "Yes, of course! When would you like to reschedule your property visit?"


def handle_reschedule_turn(
    current_message: str,
    profile: Dict[str, Any],
    language: str = "English",
    db: Optional[Session] = None,
    session_id: Optional[str] = None,
    now_dt: Optional[datetime.datetime] = None,
) -> Dict[str, Any]:
    """
    Deterministic state machine for RESCHEDULE_APPOINTMENT intent.
    Maintains separate target variables (`reschedule_target_date`, `reschedule_target_time`,
    `suggested_alternative_iso`) so previously collected `visit_slot` never overrides new requests.
    """
    updated = dict(profile or {})
    updated["language"] = language
    updated["rescheduled_just_now"] = False
    low = (current_message or "").lower().strip()

    # 1. Retrieve existing appointment
    appt = find_customer_appointment(
        db=db,
        session_id=session_id,
        appointment_id=updated.get("appointment_id"),
        customer_phone=updated.get("customer_phone"),
        customer_email=updated.get("customer_email"),
    )
    if appt is None:
        for k in ("reschedule_active", "reschedule_target_date", "reschedule_target_time", "suggested_alternative_iso"):
            updated.pop(k, None)
        return {
            "reply": get_reschedule_message("no_appointment", language),
            "profile": updated,
            "next_action": "NO_APPOINTMENT",
        }

    updated["appointment_id"] = appt.appointment_id

    # 2. Check if customer is accepting a suggested alternative slot
    is_affirmative = any(
        re.search(r'\b' + re.escape(w) + r'\b', low) if w.isascii() else (w in low)
        for w in [
            "yes", "yeah", "yep", "sure", "ok", "okay", "fine", "works", "that works",
            "haan", "ha", "theek", "avunu", "sare", "sari", "haudu", "aamaam",
            "ಹೌದು", "ಸರಿ", "సరే", "అవును", "हाँ", "ठीक", "சரி", "ஆம்"
        ]
    )
    is_negative = any(
        re.search(r'\b' + re.escape(w) + r'\b', low) if w.isascii() else (w in low)
        for w in ["no", "nope", "nahi", "nahin", "illa", "illai", "kaadu", "వద్దు", "ಇಲ್ಲ", "नहीं", "இல்லை"]
    )

    if updated.get("suggested_alternative_iso") and is_affirmative and not is_negative:
        alt_dt = datetime.datetime.fromisoformat(updated["suggested_alternative_iso"])
        ok, reason, next_alt = reschedule_appointment_in_db(
            db=db, appointment=appt, new_dt=alt_dt, session_id=session_id, now_dt=now_dt
        )
        if ok:
            updated["visit_slot"] = format_slot_human(alt_dt)
            updated["visit_date_iso"] = alt_dt.isoformat()
            updated["rescheduled_just_now"] = True
            updated["conv_state"] = "BOOKED"
            for k in ("reschedule_active", "reschedule_target_date", "reschedule_target_time", "suggested_alternative_iso"):
                updated.pop(k, None)
            return {
                "reply": get_reschedule_message(
                    "success",
                    language,
                    date_str=format_date_human(alt_dt.date()),
                    time_str=format_time_human(alt_dt.time()),
                ),
                "profile": updated,
                "next_action": "RESCHEDULED",
            }
        updated["suggested_alternative_iso"] = next_alt.isoformat() if next_alt else None
        updated["conv_state"] = "RESCHEDULE_ALTERNATIVE"
        return {
            "reply": get_reschedule_message(
                reason,
                language,
                alt_str=format_slot_human(next_alt) if next_alt else "",
            ),
            "profile": updated,
            "next_action": "RESCHEDULE_CONFLICT",
        }

    # 3. Parse new date and time independently
    parsed = parse_date_time_components(current_message, base_dt=now_dt)
    updated["reschedule_active"] = True

    if parsed["invalid_time"] or parsed["invalid_date"]:
        updated["conv_state"] = "RESCHEDULE_TIME"
        return {
            "reply": get_reschedule_message("invalid_time", language),
            "profile": updated,
            "next_action": "RESCHEDULE_INVALID_TIME",
        }

    if parsed["has_date"] and parsed["date"]:
        updated["reschedule_target_date"] = parsed["date"].isoformat()
        updated.pop("suggested_alternative_iso", None)
    if parsed["has_time"] and parsed["time"]:
        updated["reschedule_target_time"] = parsed["time"].strftime("%H:%M")
        updated.pop("suggested_alternative_iso", None)

    target_date_str = updated.get("reschedule_target_date")
    target_time_str = updated.get("reschedule_target_time")

    # 4. Ask for missing date or time
    if not target_date_str and not target_time_str:
        updated["conv_state"] = "RESCHEDULE_WHEN"
        return {
            "reply": get_reschedule_message("ask_when", language),
            "profile": updated,
            "next_action": "RESCHEDULE_ASK_WHEN",
        }

    if target_date_str and not target_time_str:
        d_obj = datetime.date.fromisoformat(target_date_str)
        updated["conv_state"] = "RESCHEDULE_TIME"
        return {
            "reply": get_reschedule_message("ask_time", language, date_str=format_date_human(d_obj)),
            "profile": updated,
            "next_action": "RESCHEDULE_ASK_TIME",
        }

    if target_time_str and not target_date_str:
        t_obj = datetime.datetime.strptime(target_time_str, "%H:%M").time()
        updated["conv_state"] = "RESCHEDULE_DATE"
        return {
            "reply": get_reschedule_message("ask_date", language, time_str=format_time_human(t_obj)),
            "profile": updated,
            "next_action": "RESCHEDULE_ASK_DATE",
        }

    # 5. Both date and time are present -> validate & atomically update existing appointment
    d_obj = datetime.date.fromisoformat(target_date_str)
    t_obj = datetime.datetime.strptime(target_time_str, "%H:%M").time()
    new_dt = datetime.datetime.combine(d_obj, t_obj)

    ok, reason, alt_dt = reschedule_appointment_in_db(
        db=db, appointment=appt, new_dt=new_dt, session_id=session_id, now_dt=now_dt
    )
    if ok:
        updated["visit_slot"] = format_slot_human(new_dt)
        updated["visit_date_iso"] = new_dt.isoformat()
        updated["rescheduled_just_now"] = True
        updated["conv_state"] = "BOOKED"
        for k in ("reschedule_active", "reschedule_target_date", "reschedule_target_time", "suggested_alternative_iso"):
            updated.pop(k, None)
        return {
            "reply": get_reschedule_message(
                "success",
                language,
                date_str=format_date_human(d_obj),
                time_str=format_time_human(t_obj),
            ),
            "profile": updated,
            "next_action": "RESCHEDULED",
        }

    # Validation failed: preserve original appointment unchanged and suggest alternative
    if reason == "past_datetime":
        updated.pop("reschedule_target_date", None)
        updated.pop("reschedule_target_time", None)
    elif reason == "outside_business_hours":
        updated.pop("reschedule_target_time", None)
    elif reason == "slot_booked":
        updated.pop("reschedule_target_time", None)

    updated["suggested_alternative_iso"] = alt_dt.isoformat() if alt_dt else None
    updated["conv_state"] = "RESCHEDULE_ALTERNATIVE"
    return {
        "reply": get_reschedule_message(
            reason,
            language,
            alt_str=format_slot_human(alt_dt) if alt_dt else "",
        ),
        "profile": updated,
        "next_action": "RESCHEDULE_CONFLICT",
    }
