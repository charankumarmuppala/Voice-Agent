import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple, TypedDict
from langgraph.graph import StateGraph, END

from app.services.brochure_service import format_inr_text

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    current_message: str
    history: List[Dict[str, str]]
    profile: Dict[str, Any]
    language: str
    rag_properties: List[Any]
    is_exact_match: bool
    reply: str
    next_action: str
    db: Any


def format_inr(amount: float) -> str:
    return format_inr_text(amount)


def format_phone_digits_readback(phone: str) -> str:
    """Formats phone number into digit-by-digit spaced string for clear spoken TTS speech."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return " ".join(list(digits))


def spell_out_email(email: str) -> str:
    """Formats email into letter-by-letter spoken representation."""
    if not email or "@" not in email:
        return email or ""
    parts = email.split("@")
    local = parts[0]
    domain = parts[1]

    def format_part(p: str) -> str:
        tokens = []
        for ch in p:
            if ch == ".":
                tokens.append("dot")
            elif ch == "-":
                tokens.append("dash")
            elif ch == "_":
                tokens.append("underscore")
            elif ch.isalnum():
                tokens.append(ch.lower())
        return " ".join(tokens)

    local_spoken = format_part(local)
    domain_spoken = format_part(domain)
    return f"{local_spoken} at {domain_spoken}"


def parse_spoken_digits_phone(text: str) -> Optional[str]:
    """
    Parses individually spoken digits (e.g. 'nine eight four five zero one two three four five'
    or '9 8 4 5 0 1 2 3 4 5' or standard '+91 9845012345').
    """
    word_to_digit = {
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
        "oh": "0", "sunya": "0", "ek": "1", "do": "2", "teen": "3",
        "char": "4", "paanch": "5", "chhah": "6", "saat": "7", "aath": "8", "nau": "9",
        "ondu": "1", "eradu": "2", "mooru": "3", "naalku": "4", "aidu": "5",
        "aaru": "6", "elu": "7", "entu": "8", "ombattu": "9", "sonne": "0",
        "okati": "1", "rendu": "2", "moodu": "3", "naalugu": "4", "aidhu": "5",
        "aaru": "6", "yedu": "7", "enimidi": "8", "tommidi": "9", "sunna": "0"
    }

    tokens = re.findall(r'[a-zA-Z0-9+]+', text.lower())
    digits = []
    for t in tokens:
        if t in word_to_digit:
            digits.append(word_to_digit[t])
        elif t.isdigit():
            digits.extend(list(t))

    phone_str = "".join(digits)
    if len(phone_str) == 12 and phone_str.startswith("91"):
        phone_str = phone_str[2:]

    if len(phone_str) == 10 and phone_str[0] in "6789":
        return f"+91 {phone_str}"
    return None


def parse_spoken_or_typed_email(text: str) -> Optional[Tuple[str, str]]:
    """Converts spoken letters, 'at', 'dot', 'underscore', 'hyphen' or standard typed email."""
    if not text:
        return None
    raw = text.strip()
    low = raw.lower()

    # 1. Standard email pattern in raw or low text
    std_match = re.search(r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', raw)
    if std_match:
        email = std_match.group(1).lower()
        return email, spell_out_email(email)

    # 2. Spoken email parsing (e.g. "rohan at gmail dot com", "k a v i t a dot r a o at gmail dot com")
    spoken = low
    # Normalize spoken delimiters
    spoken = re.sub(r'\s*(?:\[at\]|\bat\b|@)\s*', '@', spoken)
    spoken = re.sub(r'\s*(?:\[dot\]|\bdot\b|\bpoint\b|\.)\s*', '.', spoken)
    spoken = re.sub(r'\s*(?:underscore|_)\s*', '_', spoken)
    spoken = re.sub(r'\s*(?:dash|hyphen|-)\s*', '-', spoken)

    if '@' in spoken and '.' in spoken:
        parts = spoken.split('@', 1)
        if len(parts) == 2:
            local_raw, domain_raw = parts[0], parts[1]

            # Strip conversational preambles from local part
            local_clean = re.sub(r'^(?:actually\s+no|no|nope|wrong|that\'?s\s+wrong|sorry|not\s+that)[,\.\s]+', '', local_raw.strip(), flags=re.I)
            local_clean = re.sub(r'.*?\b(?:email\s*(?:id|address)?\s*(?:is|:)|it\s*is|it\'?s|send\s+to|use)\s*', '', local_clean, flags=re.I)
            local_clean = local_clean.strip()

            # Clean trailing filler from domain part
            domain_clean = re.sub(r'\b(?:please|thanks|thank\s+you|okay|ok)\b.*$', '', domain_raw, flags=re.I).strip()

            def collapse_tokens(s):
                words = s.strip().split()
                result = []
                buf = ""
                for w in words:
                    if len(w) == 1 and w.isalnum():
                        buf += w
                    else:
                        if buf:
                            result.append(buf)
                            buf = ""
                        result.append(w)
                if buf:
                    result.append(buf)
                joined = "".join(result)
                joined = re.sub(r'\s*([._-])\s*', r'\1', joined)
                joined = re.sub(r'\s+', '', joined)
                return joined.strip('._-')

            clean_local = collapse_tokens(local_clean)
            clean_domain = collapse_tokens(domain_clean)
            candidate = f"{clean_local}@{clean_domain}"
            candidate = re.sub(r'[^a-z0-9._%+-@]', '', candidate)

            if re.match(r'^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$', candidate):
                return candidate, spell_out_email(candidate)

    return None


# ─── LANGGRAPH NODES ──────────────────────────────────────────────────────────

def extract_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Extract customer name, requirements, contact details, or corrections."""
    msg = state["current_message"]
    low = msg.lower()
    prof = dict(state.get("profile") or {})

    # Check for phone
    phone_candidate = parse_spoken_digits_phone(msg)
    if phone_candidate:
        prof["unconfirmed_phone"] = phone_candidate
        prof["customer_phone"] = phone_candidate

    # Check for email
    email_tuple = parse_spoken_or_typed_email(msg)
    if email_tuple:
        prof["unconfirmed_email"] = email_tuple[0]
        prof["email_spelling"] = email_tuple[1]

    # Location
    for loc in ["whitefield", "electronic city", "sarjapur", "hebbal", "yelahanka"]:
        if loc in low:
            prof["location"] = loc.title()
            break
    if any(w in low for w in ["anywhere", "any location", "no preference", "all locations", "all bangalore", "ఎక్కడైనా", "ಎಲ್ಲಿಯಾದರೂ", "कहीं भी"]):
        prof["location"] = "all"

    # BHK
    bhk_m = re.search(r'(\d)\s*(?:bhk|bed|bedroom|ಬಿಎಚ್‌ಕೆ|బిహెచ్‌కె|बीएचके)', low)
    if bhk_m:
        prof["bhk"] = int(bhk_m.group(1))

    # Budget
    b_match = re.search(r'(\d+(?:\.\d+)?\s*(?:cr|crore|crores|lakh|lakhs|lac|lacs|కోట్లు|లక్షలు|ಕೋಟಿ|ಲಕ್ಷ|करोड़|लाख))', low)
    if b_match:
        prof["budget"] = b_match.group(1)

    # Visit request
    visit_words = [
        "visit", "see", "tour", "saturday", "sunday", "tomorrow", "book", "schedule",
        "భేటి", "విజిట్", "చూడాలి", "చూద్దాం", "శనివారం", "ఆదివారం",
        "ಭೇಟಿ", "ವಿಜಿಟ್", "ನೋಡಬೇಕು", "ಶನಿವಾರ", "ಭಾನುವಾರ",
        "विजिट", "दौरा", "देखना", "शनिवार", "रविवार"
    ]
    if any(w in low for w in visit_words):
        prof["visit_interest"] = "Requested"
        prof["lead_score"] = 92
        slot = "Saturday 11:00 AM" if any(w in low for w in ["saturday", "శనివారం", "ಶನಿವಾರ", "शनिवार"]) else (
            "Sunday 11:00 AM" if any(w in low for w in ["sunday", "ఆదివారం", "ಭಾನುವಾರ", "रविवार"]) else "Tomorrow 11:00 AM"
        )
        prof["visit_slot"] = slot
        prof["booking_ready"] = True

    for p_name in ["Prestige Willow Park", "Assetz Marq", "Sobha Dream Acres", "Brigade Horizon", "Godrej Royale Woods"]:
        if p_name.lower() in low:
            prof["property_name"] = p_name
            break

    return {"profile": prof}


def rag_search_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Automatically query SQLite properties based on extracted criteria."""
    from app.services.gemini_service import search_rag_properties
    db = state.get("db")
    prof = state.get("profile") or {}
    rag_props, is_exact = search_rag_properties(db, prof, state["current_message"])
    return {
        "rag_properties": rag_props,
        "is_exact_match": is_exact
    }


def recommendation_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Verbally speak the best matching properties in the exact same turn."""
    props = state.get("rag_properties") or []
    lang = state.get("language", "English")
    is_exact = state.get("is_exact_match", True)
    prof = dict(state.get("profile") or {})
    prof["conv_state"] = "RECOMMEND"

    if not props:
        reply = "I couldn't find an exact match in our current inventory. Would you like me to look in nearby areas?"
        return {"reply": reply, "profile": prof}

    p1 = props[0]
    p1_price = format_inr(p1.price)
    prof["property_name"] = p1.name

    if "kannada" in lang.lower():
        reply = f"ನಿಮ್ಮ ಅವಶ್ಯಕತೆಗೆ ತಕ್ಕಂತೆ {p1.location}ದಲ್ಲಿರುವ {p1.name} ಲಭ್ಯವಿದೆ, ಇದರ ಬೆಲೆ {p1_price}. ಈ ವಾರಾಂತ್ಯದಲ್ಲಿ ಸೈಟ್ ಭೇಟಿಯನ್ನು ನಿಗದಿಪಡಿಸೋಣವೇ?"
    elif "hindi" in lang.lower():
        reply = f"आपकी पसंद के अनुसार {p1.location} में {p1.name} उपलब्ध है, जिसकी कीमत {p1_price} है। क्या आप इस वीकेंड साइट विजिट बुक करना चाहेंगे?"
    elif "telugu" in lang.lower():
        reply = f"మీ అవసరాలకు తగినట్లుగా {p1.location} లో {p1.name} అందుబాటులో ఉంది, ధర {p1_price}. ఈ వారాంతంలో సైట్ విజిట్ బుక్ చేద్దామా?"
    elif "tamil" in lang.lower():
        reply = f"உங்கள் விருப்பத்திற்கேற்ப {p1.location} ல் உள்ள {p1.name} கிடைக்கிறது, இதன் விலை {p1_price}. இந்த வார இறுதியில் தளப் பார்வையை பதிவு செய்யலாமா?"
    else:
        p2_text = ""
        if len(props) > 1 and is_exact:
            p2 = props[1]
            p2_text = f", as well as {p2.name} at {format_inr(p2.price)}"
        reply = f"I found the best matching properties for you: {p1.name} in {p1.location} at {p1_price}{p2_text}. Would you like to schedule a site visit to tour the property?"

    return {"reply": reply, "profile": prof}


def contact_node(state: AgentState) -> Dict[str, Any]:
    """Node 4: Validate, read back phone digits and email spelling for explicit confirmation."""
    prof = dict(state.get("profile") or {})
    msg = state["current_message"]
    low = msg.lower()
    lang = state.get("language", "English")
    is_aff = any(w in low for w in ["yes", "correct", "right", "sure", "ha", "haan", "sari", "avunu", "seri", "ಹೌದು", "సరే", "हाँ", "சரி"])
    is_neg = any(w in low for w in ["no", "not", "wrong", "change", "nahi", "illa", "vaddhu", "இல்லை", "ಇಲ್ಲ", "नहीं"])

    pname = prof.get("property_name") or "the property"
    slot = prof.get("visit_slot") or "Saturday 11:00 AM"

    # 1. Phone collection & readback
    if not prof.get("phone_confirmed"):
        phone_in_msg = parse_spoken_digits_phone(msg)
        if phone_in_msg:
            prof["unconfirmed_phone"] = phone_in_msg
            prof["customer_phone"] = phone_in_msg
            readback = format_phone_digits_readback(phone_in_msg)
            reply = f"Thank you! To ensure we have your correct number, let me read it back: {readback}. Is that correct?"
        elif prof.get("unconfirmed_phone"):
            if is_aff and not is_neg:
                prof["phone_confirmed"] = True
                prof["customer_phone"] = prof["unconfirmed_phone"]
                prof["conv_state"] = "COLLECT_EMAIL"
                reply = "Thank you for confirming your phone number! Could you please share your email address so we can send the visit confirmation and property brochure? Feel free to spell it letter by letter."
            elif is_neg and not is_aff:
                prof["unconfirmed_phone"] = None
                prof["customer_phone"] = None
                reply = "No problem! Could you please tell me your correct 10-digit phone number?"
            else:
                readback = format_phone_digits_readback(prof["unconfirmed_phone"])
                reply = f"Thank you! To ensure we have your correct number, let me read it back: {readback}. Is that correct?"
        else:
            prof["conv_state"] = "COLLECT_PHONE"
            reply = f"Your visit to {pname} on {slot} is scheduled! May I have your 10-digit phone number to send the confirmation pass?"
        return {"reply": reply, "profile": prof}

    # 2. Email collection & readback
    if not prof.get("email_confirmed"):
        email_in_msg = parse_spoken_or_typed_email(msg)
        if email_in_msg:
            prof["unconfirmed_email"] = email_in_msg[0]
            prof["email_spelling"] = email_in_msg[1]
            reply = f"Thank you! Let me confirm your email address spelling: {email_in_msg[1]} ({email_in_msg[0]}). Is that correct?"
        elif prof.get("unconfirmed_email"):
            if is_aff and not is_neg:
                prof["email_confirmed"] = True
                prof["customer_email"] = prof["unconfirmed_email"]
                prof["conv_state"] = "BOOKED"
                prof["booking_ready"] = True
                reply = f"Thank you! Your email {prof['customer_email']} is confirmed. Your visit to {pname} on {slot} has been officially booked, and your property brochure has been sent to your inbox. Is there anything else I can help you with?"
            elif is_neg and not is_aff:
                prof["unconfirmed_email"] = None
                prof["email_spelling"] = None
                reply = "Understood. Please tell or spell out your correct email address, including the domain like gmail dot com."
            else:
                em_spell = prof.get("email_spelling") or spell_out_email(prof["unconfirmed_email"])
                em_val = prof["unconfirmed_email"]
                reply = f"Thank you! Let me confirm your email address spelling: {em_spell} ({em_val}). Is that correct?"
        else:
            prof["conv_state"] = "COLLECT_EMAIL"
            reply = "Could you please share your email address to receive your official property brochure and visit pass? You can spell it letter by letter if needed."
        return {"reply": reply, "profile": prof}

    # Both confirmed
    reply = f"Your visit to {pname} on {slot} is registered! Is there anything else I can help you with?"
    return {"reply": reply, "profile": prof}


def closing_node(state: AgentState) -> Dict[str, Any]:
    """Node 5: Answers questions or gracefully ends call with warm female thank you."""
    prof = dict(state.get("profile") or {})
    low = state["current_message"].lower()
    lang = state.get("language", "English")

    is_question = any(q in low for q in ["?", "what", "where", "how", "pool", "gym", "amenit", "cost", "price", "clubhouse"])
    if is_question:
        pname = prof.get("property_name", "the property")
        slot = prof.get("visit_slot", "this weekend")
        if "pool" in low or "clubhouse" in low:
            reply = f"Yes, {pname} features a luxury swimming pool, clubhouse, and landscaped amenities. Since your visit is scheduled for {slot}, you can tour all facilities in person! Is there anything else I can help you with?"
        else:
            reply = f"Certainly! {pname} offers premium fittings, 24/7 security, and ready convenience. Is there anything else I can help you with?"
        return {"reply": reply, "profile": prof}

    # Closing
    prof["call_ended"] = True
    prof["conv_state"] = "CLOSING"

    if "kannada" in lang.lower():
        reply = "ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿ ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದ. ಒಳ್ಳೆಯ ದಿನವಾಗಲಿ!"
    elif "hindi" in lang.lower():
        reply = "DreamSpace Properties चुनने के लिए बहुत धन्यवाद! हम आपकी विजिट पर मिलने के लिए उत्सुक हैं। आपका दिन शुभ हो। अलविदा!"
    elif "telugu" in lang.lower():
        reply = "డ్రీమ్‌స్పేస్ రియల్టీని ఎంచుకున్నందుకు చాలా ధన్యవాదాలు! మీ సైట్ విజిట్‌లో కలుద్దాం. సెలవు!"
    elif "tamil" in lang.lower():
        reply = "ட்ரீம்ஸ்பேஸ் ரியாலிட்டியைத் தேர்ந்தெடுத்ததற்கு மிக்க நன்றி! உங்கள் நாள் சிறப்பாக அமையட்டும். வணக்கம்!"
    else:
        reply = "Thank you for choosing DreamSpace Properties! We look forward to your visit. Have a wonderful day. Goodbye!"

    return {"reply": reply, "profile": prof}


# ─── ROUTER CONDITIONAL EDGES ────────────────────────────────────────────────

def route_conversation(state: AgentState) -> str:
    """Decides which LangGraph node handles the next action based on state."""
    msg = state["current_message"].lower()
    prof = state.get("profile") or {}

    closing_triggers = [
        "no", "nothing", "nope", "bye", "goodbye", "that's all", "thank you",
        "thanks", "done", "nahi", "shukriya", "dhanyavaad", "अलविदा", "नहीं", "शुक्रिया",
        "ಧನ್ಯವಾದ", "ಇಲ್ಲ", "సెలవు", "వద్దు", "ధన్యవాదాలు"
    ]
    is_q = any(q in msg for q in ["?", "what", "where", "how", "pool", "gym", "price", "amenit"])
    is_correction = any(w in msg for w in ["wrong", "correction", "email is", "phone is", "number is", "actually", "@", "dot", "change", "mistake"])

    if is_correction:
        return "contact_node"

    # If call is in booked stage and user has follow-up or closing
    if (prof.get("conv_state") in ["BOOKED", "CLOSING"] or (prof.get("phone_confirmed") and prof.get("email_confirmed"))):
        return "closing_node"

    # If user says goodbye or no thanks at any point
    if any(w in msg for w in closing_triggers) and not is_q and prof.get("conv_state") in ["RECOMMEND", "BOOKED", "CLOSING", "COLLECT_EMAIL", "CONFIRM_EMAIL"]:
        return "closing_node"

    # If criteria are present (location, BHK, budget) and user hasn't explicitly booked a visit slot
    has_criteria = bool(prof.get("location") and (prof.get("bhk") or prof.get("budget")))
    visit_booking_in_msg = any(w in msg for w in ["book", "schedule", "sunday", "saturday", "tomorrow", "confirm visit", "book visit", "schedule visit", "భేటి", "విజిట్", "ವಿಜಿಟ್", "विजिट"])

    if has_criteria and not visit_booking_in_msg:
        return "rag_search_node"

    # If visit is requested or contact collection active
    if prof.get("visit_interest") in ["Requested", "Interested"] or prof.get("conv_state") in ["COLLECT_PHONE", "CONFIRM_PHONE", "COLLECT_EMAIL", "CONFIRM_EMAIL"]:
        return "contact_node"

    # If criteria are present (location, BHK, budget), route to RAG search then recommendation
    if has_criteria or prof.get("conv_state") in ["RECOMMEND", "CONFIG"]:
        return "rag_search_node"

    # Default fallback to recommendation/RAG
    return "rag_search_node"


# ─── BUILD GRAPH ─────────────────────────────────────────────────────────────

def build_estatevoice_graph():
    builder = StateGraph(AgentState)

    builder.add_node("extract_node", extract_node)
    builder.add_node("rag_search_node", rag_search_node)
    builder.add_node("recommendation_node", recommendation_node)
    builder.add_node("contact_node", contact_node)
    builder.add_node("closing_node", closing_node)

    builder.set_entry_point("extract_node")

    builder.add_conditional_edges(
        "extract_node",
        route_conversation,
        {
            "rag_search_node": "rag_search_node",
            "contact_node": "contact_node",
            "closing_node": "closing_node"
        }
    )

    builder.add_edge("rag_search_node", "recommendation_node")
    builder.add_edge("recommendation_node", END)
    builder.add_edge("contact_node", END)
    builder.add_edge("closing_node", END)

    return builder.compile()


conversation_graph = build_estatevoice_graph()
