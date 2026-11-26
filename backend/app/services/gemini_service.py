import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger(__name__)

CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
]

PROPERTY_INVENTORY_CONTEXT = """
VERIFIED DREAMSPACE PROPERTIES BANGALORE PORTFOLIO (DO NOT INVENT PROPERTIES OUTSIDE THIS LIST):
1. Prestige Willow Park | Whitefield | 3 BHK Apartment | ₹1.45 Cr | Ready to Move | Near ITPL, pool & clubhouse
2. Godrej Royale Woods | Electronic City | 2 BHK Apartment | ₹82 Lakhs | Ready to Move | 5 mins from Phase 1 IT parks
3. Sobha Lake Haven Luxury Villas | Sarjapur | 4 BHK Villa | ₹3.85 Cr | Under Construction | Private garden & pool
4. Brigade Horizon Sky Penthouse | Hebbal | 4 BHK Penthouse | ₹4.20 Cr | Ready to Move | Lake view, airport road
5. Puravankara Palm Vista | Yelahanka | 2 BHK Apartment | ₹76 Lakhs | Ready to Move | Near Canadian Intl School
6. Assetz Marq Serenity | Whitefield | 3 BHK Apartment | ₹1.68 Cr | Under Construction | 22-acre township
7. Concorde Silicon Elite | Electronic City | 1 BHK Apartment | ₹49 Lakhs | Ready to Move | Near Infosys & metro
8. Mana Capitol Green Oasis | Sarjapur | 3 BHK Duplex | ₹2.15 Cr | Ready to Move | Private terrace garden
9. SNN Clermont Luxury Suites | Hebbal | 4 BHK Apartment | ₹3.10 Cr | Ready to Move | Equestrian theme, 7-star club
10. Arvind Bel Air Meadows | Yelahanka | 4 BHK Villa | ₹3.40 Cr | Under Construction | Gated community private lawn
11. Total Environment Windmills Walk | Whitefield | 4 BHK Apartment | ₹3.60 Cr | Ready to Move | Handcrafted earth gardens
12. Shriram Summit Tech Park Heights | Electronic City | 2 BHK Apartment | ₹68 Lakhs | Ready to Move | Zero space wastage
13. Bren Starlight Boulevard | Sarjapur | 3 BHK Apartment | ₹1.39 Cr | Ready to Move | Sports township off ORR
14. L&T Raintree Boulevard | Hebbal | 3 BHK Apartment | ₹2.25 Cr | Ready to Move | 65-acre township, Sahakar Nagar
15. Vaishnavi Serene Urban Homes | Yelahanka | 1 BHK Apartment | ₹46 Lakhs | Ready to Move | Precast smart home
16. Embassy Grove Boulevard | Whitefield | 4 BHK Villa | ₹4.50 Cr | Ready to Move | Private pool, custom Italian fittings
17. Sobha Silicon Oasis Palms | Electronic City | 3 BHK Apartment | ₹1.28 Cr | Ready to Move | Tropical lagoon pool
18. Rohan Iksha Eco Homes | Sarjapur | 2 BHK Apartment | ₹94 Lakhs | Ready to Move | Eco-friendly near Bellandur
19. Godrej Platinum Panorama | Hebbal | 3 BHK Apartment | ₹2.75 Cr | Ready to Move | Double glazed energy efficient
20. Purva Venezia Venice Enclave | Yelahanka | 3 BHK Apartment | ₹1.42 Cr | Ready to Move | Italian Venice waterways
"""

SYSTEM_INSTRUCTION = f"""
You are the AI Real Estate Sales Assistant for DreamSpace Properties, Bangalore.
Tagline: "Turning conversations into property visits."

## CONVERSATION STATE MACHINE & INTELLIGENT EXTRACTION
- Extract multiple requirements from a single sentence (name, location, budget, bhk, property type, visit interest).
- Advance directly to the state matching the current information.
- Remember previous answers and NEVER ask unnecessary or already-answered questions.
- Once location, budget, and/or BHK are collected:
  * Automatically explain the best matching properties from the verified inventory with their name, location, and price.
  * Do NOT just say "Let me check" or wait for another customer message.
  * If no exact match exists, state this clearly and ask permission to suggest alternatives. Never invent properties.
  * Ask if the customer would like to schedule a property visit.
- CONTACT DETAILS & CONFIRMATION WORKFLOW:
  * Never automatically assume or generate contact details.
  * When a visit is scheduled, ask for the customer's phone number.
  * Read back the phone number digit-by-digit and request confirmation.
  * Once the phone number is confirmed, ask for the customer's email address.
  * If the email is unclear, ask the customer to spell it letter by letter.
  * Read back the complete email spelling letter by letter and ask for confirmation.
  * Only after both phone and email are confirmed, confirm the booking and send the brochure, then ask: "Is there anything else I can help you with?"
  * Never claim an email was sent if delivery failed or not configured.
- If customer asks further questions after booking (e.g. amenities, pricing, handover), answer them naturally and always conclude with: "Is there anything else I can help you with?"
- If customer says no, goodbye, or thank you, speak a warm polite goodbye and set call_ended = true.

## MULTILINGUAL & NATIVE SCRIPT RULES
Supported languages (in priority order):
1. English (en-IN)
2. Hindi (hi-IN)
3. Kannada (kn-IN)
4. Telugu (te-IN)
5. Tamil (ta-IN)

- Detect the customer's conversational language automatically.
- Understand mixed-language sentences (e.g. Telugu-English, Hindi-English).
- Do not switch languages just because customer mentions English proper nouns or loanwords.
- Regional languages MUST be in their native scripts:
  * Telugu in Telugu script (తెలుగు)
  * Kannada in Kannada script (ಕನ್ನಡ)
  * Hindi in Devanagari script (हिन्दी)
  * Tamil in Tamil script (தமிழ்)
  * English in English
- Keep replies SHORT (1-3 sentences max) for natural female voice synthesis.

{PROPERTY_INVENTORY_CONTEXT}

## OUTPUT FORMAT
Respond with ONLY valid JSON:
{{
  "reply": "Spoken response (1-3 sentences in the detected native language script, no markdown)",
  "detected_language": "English|Hindi|Kannada|Telugu|Tamil",
  "conv_state": "GREET|LOCATION|BUDGET|CONFIG|RECOMMEND|VISIT|COLLECT|CONFIRM|BOOKED|CLOSING",
  "customer_name": "detected name or null",
  "customer_phone": "detected phone number or null",
  "location": "detected location or 'all' or null",
  "budget": "detected budget string or null",
  "bhk": 1/2/3/4/5 or null,
  "property_type": "Apartment|Villa|Penthouse|Independent House or null",
  "timeline": "detected timeline or null",
  "visit_interest": "Interested|Requested|Not Interested|Unknown",
  "visit_slot": "detected slot e.g. Saturday 11 AM or null",
  "visit_date_iso": "ISO date-time or null",
  "property_name": "property name customer wants to visit or null",
  "booking_ready": true/false,
  "call_ended": true/false,
  "sentiment": "Positive|Neutral|Hesitant",
  "lead_score": integer 10-100,
  "intent": "short 3-5 word summary"
}}
"""


def detect_language_from_text(text: str, current_lang: str = "English") -> str:
    """
    Detects spoken language from text, supporting mixed sentences, transliterations, and Indian scripts.
    Preserves Indian language context even when English proper nouns or loanwords (e.g. Prestige, 3 BHK, 1.5 Cr) are used.
    """
    if not text:
        return current_lang or "English"

    # 1. Unicode Indian script detection (100% certainty)
    if re.search(r'[\u0C00-\u0C7F]', text):
        return "Telugu"
    if re.search(r'[\u0C80-\u0CFF]', text):
        return "Kannada"
    if re.search(r'[\u0900-\u097F]', text):
        return "Hindi"
    if re.search(r'[\u0B80-\u0BFF]', text):
        return "Tamil"

    low = text.lower()

    # 2. Explicit language switch requests
    if any(p in low for p in [
        "speak in telugu", "talk in telugu", "in telugu", "telugu lo matladu", "telugu lo matladandi", "telugu please"
    ]):
        return "Telugu"
    if any(p in low for p in [
        "speak in hindi", "talk in hindi", "in hindi", "hindi me bolo", "hindi me baat karo", "hindi please"
    ]):
        return "Hindi"
    if any(p in low for p in [
        "speak in kannada", "talk in kannada", "in kannada", "kannada dalli mathadi", "kannada please"
    ]):
        return "Kannada"
    if any(p in low for p in [
        "speak in tamil", "talk in tamil", "in tamil", "tamil la pesunga", "tamil please"
    ]):
        return "Tamil"
    if any(p in low for p in [
        "speak in english", "talk in english", "in english please", "switch to english", "can we speak in english",
        "let us speak in english", "english please"
    ]):
        return "English"

    # 3. High-weight language markers (Romanized / Spoken)
    telugu_markers = [
        "naku", "naaku", "kavali", "kaavali", "chudali", "choodali", "kudurthunda", "kudurutunda",
        "kudurtundi", "kudurthundi", "cheppandi", "telusukovalani", "undaa", "undi", "unna", "unnayi",
        "entha", "yenta", "ekkada", "yekkada", "vaddu", "chaalu", "dhanyavadalu", "chuddam", "cheddam",
        "illu", "manchi", "chesukondi", "chesukovalani", "meeru", "mariyu", "leka", "daggara", "kuda",
        "kani", "gurinchi", "kosam", "avunu", "kaadu", "sare", "peru", "naa peru", "eppudu", "yeppudu",
        "matladandi", "matladutunnam", "cheppu", "emiti", "yemiti", "chustunnanu", "chustunnam",
        "chusa", "chusam", "repu", "ivvala", "ee roju", "pettandi", "ivvandi", "choopandi", "chupandi"
    ]
    hindi_markers = [
        "mujhe", "chahiye", "kitna", "kitne", "kahan", "kaha", "dekhna", "dekhne", "bataiye", "batao",
        "shukriya", "dhanyawad", "nahin", "nahi", "theek", "theek hai", "acha", "achha", "ghar", "makaan",
        "kaunsa", "karna", "karenge", "mera", "meri", "mere", "naam", "mera naam", "budget hai", "mein",
        "me", "par", "ka", "ki", "ke", "aur", "ya", "lekin", "jo", "ko", "se", "hai", "hote", "kal",
        "aaj", "subah", "shaam", "dekh raha", "dekh rahi", "mil sakta", "milega", "hoga", "sunte", "sunai"
    ]
    kannada_markers = [
        "nanage", "beku", "bekagide", "eshtu", "elli", "yelli", "nodbeku", "ideya", "ide", "hegidhe",
        "saku", "beda", "dhanyavada", "mane", "tumba", "namaskara", "madona", "banni", "nanna", "hesaru",
        "nanna hesaru", "alli", "inda", "mattu", "athava", "hatthira", "bagge", "adare", "haudu", "illa",
        "nale", "ivatthu", "noduttiddene", "kodi", "kanisutta", "kelasa"
    ]
    tamil_markers = [
        "enakku", "vendum", "venum", "evvalavu", "yenge", "enge", "paarka", "paakkanum", "nandri",
        "veedu", "vanakkam", "en peyar", "yen peyar", "il", "la", "mattum", "alladhu", "kithe",
        "patri", "aamaam", "illai", "seri", "selavu", "naalai", "indru", "parkkiren", "sollunga"
    ]

    t_score = sum(1 for m in telugu_markers if re.search(r'\b' + re.escape(m) + r'\b', low))
    h_score = sum(1 for m in hindi_markers if re.search(r'\b' + re.escape(m) + r'\b', low))
    k_score = sum(1 for m in kannada_markers if re.search(r'\b' + re.escape(m) + r'\b', low))
    ta_score = sum(1 for m in tamil_markers if re.search(r'\b' + re.escape(m) + r'\b', low))

    scores = {"Telugu": t_score, "Hindi": h_score, "Kannada": k_score, "Tamil": ta_score}
    max_lang, max_score = max(scores.items(), key=lambda x: x[1])

    # If distinct Indian language markers are present, switch to that language regardless of English loanwords!
    if max_score > 0:
        return max_lang

    # 4. Standard English phrase starters / intent cues
    english_starters = [
        "i am looking", "looking for", "i want to", "can you", "what is the", "could you",
        "tell me about", "my name is", "we are looking", "is there any", "how much is",
        "can i visit", "let us schedule", "can we book", "would like to", "i need a",
        "do you have", "show me", "please send", "schedule a visit", "book an appointment"
    ]
    if any(p in low for p in english_starters):
        return "English"

    # Default to current session language
    return current_lang or "English"


def parse_budget_inr(text: Optional[str]) -> Optional[float]:
    """Parses budget strings into numerical INR floats (e.g. 1.5 crore, 1.5 karod, 5 crores, 70 lakhs, 70 lacs)."""
    if not text:
        return None
    low = str(text).lower()

    # Crores / Karod / Krod / Koti
    cr_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:cr|crore|crores|karod|krod|koti|కోట్లు|ಕೋಟಿ|करोड़|करोड)', low)
    if cr_match:
        return float(cr_match.group(1)) * 10_000_000.0

    # Lakhs / Lacs / Lac
    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs|lac|lacs|laksh|laksha|లక్షలు|లక్ష|ಲಕ್ಷ|लाख)', low)
    if lakh_match:
        return float(lakh_match.group(1)) * 100_000.0

    num_match = re.search(r'\b(\d{6,8})\b', low)
    if num_match:
        return float(num_match.group(1))

    return None


def format_inr(val: float) -> str:
    """Formats numeric INR into human-readable Crores or Lakhs."""
    if val >= 10_000_000:
        cr = val / 10_000_000
        return f"₹{cr:.2f} Cr".rstrip('0').rstrip('.')
    elif val >= 100_000:
        lakh = val / 100_000
        return f"₹{lakh:.1f} Lakhs".rstrip('0').rstrip('.')
    return f"₹{int(val):,}"


def spell_out_email(email: str) -> str:
    """Spells out an email letter-by-letter for spoken read-back confirmation."""
    if not email or "@" not in email:
        return email or ""
    local_part, domain_part = email.split("@", 1)

    def spell_segment(seg: str) -> str:
        parts = []
        for ch in seg:
            if ch == ".":
                parts.append("dot")
            elif ch == "-":
                parts.append("hyphen")
            elif ch == "_":
                parts.append("underscore")
            elif ch.isalnum():
                parts.append(ch.lower())
        return " ".join(parts)

    return f"{spell_segment(local_part)} at {domain_part.replace('.', ' dot ')}"


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


def extract_email_and_spelling(text: str) -> Optional[Tuple[str, str]]:
    """Extracts an email address from text (standard format or spoken/spelled format)."""
    return parse_spoken_or_typed_email(text)


def format_phone_digits_readback(phone: str) -> str:
    """Formats phone number into digit-by-digit spaced string for clear TTS speech."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return " ".join(list(digits))


def extract_all_requirements(message: str, existing_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Extracts multiple customer requirements from a single sentence and merges with profile."""
    low = message.lower().strip()
    updated = dict(existing_profile or {})

    # 1. Name extraction
    name_patterns = [
        r'(?:my name is|i am|this is|myself|i\'m|call me|name is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)',
        r'(?:ನನ್ನ ಹೆಸರು|ಹೆಸರು)\s+([a-zA-Z\u0C80-\u0CFF]+(?:\s+[a-zA-Z\u0C80-\u0CFF]+)?)',
        r'(?:నా పేరు|పేరు)\s+([a-zA-Z\u0C00-\u0C7F]+(?:\s+[a-zA-Z\u0C00-\u0C7F]+)?)',
        r'(?:मेरा नाम|नाम)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)'
    ]
    name_found = False
    stop_words = {'and', 'i', 'im', 'am', 'looking', 'want', 'need', 'here', 'from', 'searching', 'interested', 'buyer', 'please', 'sir', 'madam', 'my', 'the', 'a', 'an'}
    for pat in name_patterns:
        m = re.search(pat, message, re.IGNORECASE)
        if m:
            parts = m.group(1).strip().split()
            if len(parts) == 2 and parts[1].lower() in stop_words:
                candidate = parts[0].title()
            else:
                candidate = " ".join(parts).title()
            if candidate.lower() not in stop_words and len(candidate) >= 2:
                updated["customer_name"] = candidate
                name_found = True
                break

    # Standalone name input (e.g. customer responds "Charan" or "Charan Kumar" to "May I know your name?")
    curr_name = updated.get("customer_name")
    if not name_found and (not curr_name or curr_name in ["Prospective Buyer", "Valued Buyer", ""]):
        words = message.strip().split()
        if 1 <= len(words) <= 3:
            candidate = " ".join(words).strip()
            non_name_tokens = [
                "hello", "hi", "hey", "namaskara", "namaste", "vanakkam", "yes", "no", "yeah", "yep", "nope",
                "sure", "ok", "okay", "whitefield", "sarjapur", "hebbal", "yelahanka", "electronic city",
                "apartment", "villa", "penthouse", "bhk", "crore", "karod", "lakh", "lacs", "cr", "budget", "price", "visit"
            ]
            if not any(token in low for token in non_name_tokens) and re.match(r'^[a-zA-Z\s]+$', candidate):
                updated["customer_name"] = candidate.title()

    # 2. Location extraction
    for loc in ["whitefield", "electronic city", "sarjapur", "hebbal", "yelahanka"]:
        if loc in low:
            updated["location"] = loc.title()
            break
    if any(w in low for w in ["anywhere", "any location", "no preference", "all locations", "all bangalore", "ఎక్కడైనా", "ಎಲ್ಲಿಯಾದರೂ", "कहीं भी"]):
        updated["location"] = "all"

    # 3. BHK extraction (supports 3BHK, 3 BHK, three bhk, etc.)
    bhk_match = re.search(r'(\d)\s*(?:bhk|bed|bedroom|ಬಿಎಚ್‌ಕೆ|బిహెచ్‌కె|बीएचके)', low)
    if bhk_match:
        updated["bhk"] = int(bhk_match.group(1))
    else:
        word_to_num = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5}
        wm = re.search(r'\b(one|two|three|four|five)\s*(?:bhk|bed|bedroom)', low)
        if wm:
            updated["bhk"] = word_to_num[wm.group(1).lower()]

    # 4. Budget extraction (e.g. 1.5 crore, 1.5 karod, 5 crores, 70 lakhs, 70 lacs)
    num_val = parse_budget_inr(message)
    if num_val:
        updated["budget_num"] = num_val
        updated["budget"] = format_inr(num_val)

    # 5. Property type extraction
    if "villa" in low:
        updated["property_type"] = "Villa"
    elif "penthouse" in low:
        updated["property_type"] = "Penthouse"
    elif "duplex" in low:
        updated["property_type"] = "Duplex"
    elif any(w in low for w in ["apartment", "flat", "society"]):
        updated["property_type"] = "Apartment"

    # 6. Timeline extraction
    if any(w in low for w in ["immediate", "ready to move", "this month", "urgent"]):
        updated["timeline"] = "Immediate"
    elif any(w in low for w in ["next month", "1 month"]):
        updated["timeline"] = "Within 1 Month"
    elif any(w in low for w in ["3 months", "few months"]):
        updated["timeline"] = "2-3 Months"

    # 7. Phone extraction
    spoken_p = parse_spoken_digits_phone(message)
    if spoken_p:
        updated["unconfirmed_phone"] = spoken_p
    else:
        phone_match = re.search(r'(\+91[\s-]?)?[6-9]\d{9}', message) or re.search(r'\b[6-9](?:\s*\d){9}\b', message)
        if phone_match:
            raw_digits = re.sub(r'\D', '', phone_match.group(0))
            if len(raw_digits) == 12 and raw_digits.startswith("91"):
                raw_digits = raw_digits[2:]
            if len(raw_digits) == 10:
                formatted_p = "+91 " + raw_digits
                updated["unconfirmed_phone"] = formatted_p

    # 7b. Email extraction
    em_tuple = parse_spoken_or_typed_email(message)
    if em_tuple:
        updated["unconfirmed_email"] = em_tuple[0]
        updated["email_spelling"] = em_tuple[1]

    # 8. Visit request extraction (skip if rescheduling so old visit_slot is not overwritten)
    from app.services.appointment_service import detect_reschedule_intent
    is_rescheduling = bool(updated.get("reschedule_active")) or detect_reschedule_intent(message, updated)
    if not is_rescheduling:
        explicit_book_phrases = [
            "book visit", "schedule visit", "book a visit", "schedule a visit", "book appointment", "schedule appointment",
            "book tour", "schedule tour", "tour the property", "book a site visit", "schedule a site visit"
        ]
        curr_state = updated.get("conv_state", "")
        is_recommending = curr_state in ["RECOMMEND", "VISIT", "COLLECT_PHONE", "CONFIRM_PHONE"]

        has_explicit_booking = any(p in low for p in explicit_book_phrases)
        has_timing_in_recommend = is_recommending and any(w in low for w in ["visit", "saturday", "sunday", "tomorrow", "this weekend", "yes", "sure", "ok", "okay", "శనివారం", "ఆదివారం", "ಶನಿವಾರ", "ಭಾನುವಾರ", "शनिवार", "रविवार"])

        if has_explicit_booking or has_timing_in_recommend:
            updated["visit_interest"] = "Requested"
            updated["lead_score"] = 92
            slot = "Saturday 11:00 AM" if ("saturday" in low or "శనివారం" in low or "ಶನಿವಾರ" in low or "शनिवार" in low) else (
                "Sunday 11:00 AM" if ("sunday" in low or "ఆదివారం" in low or "ಭಾನುವಾರ" in low or "रविवार" in low) else "Tomorrow 11:00 AM"
            )
            updated["visit_slot"] = slot
            updated["booking_ready"] = True

    # 9. Property Name extraction
    for p_name in ["Prestige Willow Park", "Assetz Marq", "Sobha Dream Acres", "Brigade Horizon", "Godrej Royale Woods"]:
        if p_name.lower() in low:
            updated["property_name"] = p_name

    return updated


def determine_missing_field_and_action(profile: Dict[str, Any], language: str = "English") -> Tuple[str, Optional[str]]:
    """
    Checks profile for missing requirements in strict order:
    1. customer_name
    2. location
    3. bhk and budget
    4. bhk
    5. budget
    If all 4 are present, returns ("ALL_COLLECTED", None).
    """
    name = profile.get("customer_name")
    name_known = bool(name and name not in ["Prospective Buyer", "Valued Buyer", "", "None"])

    location = profile.get("location")
    bhk = profile.get("bhk")
    budget = profile.get("budget") or profile.get("budget_num")

    lang_lower = (language or "English").lower()
    is_te = "telugu" in lang_lower
    is_kn = "kannada" in lang_lower
    is_hi = "hindi" in lang_lower
    is_ta = "tamil" in lang_lower

    if not name_known:
        if is_te:
            return "MISSING_NAME", "నమస్కారం! డ్రీమ్‌స్పేస్ రియల్టీకి స్వాగతం. మీ పేరు తెలుసుకోవచ్చా?"
        elif is_kn:
            return "MISSING_NAME", "ನಮಸ್ಕಾರ! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಹೆಸರೇನು ದಯವಿಟ್ಟು ತಿಳಿಸುವಿರಾ?"
        elif is_hi:
            return "MISSING_NAME", "नमस्ते! ड्रीमस्पेस रियल्टी में आपका स्वागत है। क्या मैं आपका नाम जान सकती हूँ?"
        elif is_ta:
            return "MISSING_NAME", "வணக்கம்! ட்ரீம்ஸ்பேஸ் ரியாலிட்டிக்கு வரவேற்கிறோம். உங்கள் பெயரைத் தெரிந்து கொள்ளலாமா?"
        else:
            return "MISSING_NAME", "Namaskara! Welcome to DreamSpace Properties. May I know your name?"

    if not location:
        if is_te:
            return "MISSING_LOCATION", f"ధన్యవాదాలు {name} గారు! బెంగళూరులో ఏ ప్రాంతంలో ఇల్లు చూస్తున్నారు? వైట్‌ఫీల్డ్, ఎలక్ట్రానిక్ సిటీ, సర్జాపూర్, హెబ్బాల్ లేదా యలహంక?"
        elif is_kn:
            return "MISSING_LOCATION", f"ಧನ್ಯವಾದಗಳು {name} ಅವರೇ! ಬೆಂಗಳೂರಿನ ಯಾವ ಭಾಗದಲ್ಲಿ ಮನೆ ಬೇಕು? ವೈಟ್‌ಫೀಲ್ಡ್, ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ, ಸರ್ಜಾಪುರ ಅಥವಾ ಹೆಬ್ಬಾಳ?"
        elif is_hi:
            return "MISSING_LOCATION", f"धन्यवाद {name} जी! आप बैंगलोर के किस क्षेत्र में घर देख रहे हैं - Whitefield, Electronic City, Sarjapur या Hebbal?"
        elif is_ta:
            return "MISSING_LOCATION", f"நன்றி {name}! பெங்களூரில் எந்த பகுதியில் வீடு பார்க்கிறீர்கள்? Whitefield, Electronic City, Sarjapur, Hebbal அல்லது Yelahanka?"
        else:
            return "MISSING_LOCATION", f"Thank you {name}! Which location in Bangalore are you looking to buy a home in? We have verified properties in Whitefield, Electronic City, Sarjapur, Hebbal, and Yelahanka."

    if not bhk and not budget:
        if is_te:
            return "MISSING_BHK_AND_BUDGET", f"చాలా మంచిది {name} గారు! మీకు ఎన్ని BHK ఇల్లు కావాలి, మరియు మీ అంచనా బడ్జెట్ ఎంత?"
        elif is_kn:
            return "MISSING_BHK_AND_BUDGET", f"ಉತ್ತಮ {name} ಅವರೇ! ನೀವು ಎಷ್ಟು BHK ಮನೆ ಹುಡುಕುತ್ತಿದ್ದೀರಿ, ಮತ್ತು ನಿಮ್ಮ ಅಂದಾಜು ಬಜೆಟ್ ಎಷ್ಟು?"
        elif is_hi:
            return "MISSING_BHK_AND_BUDGET", f"बहुत अच्छा {name} जी! आपको कितने BHK का घर चाहिए और आपका अनुमानित बजट कितना है?"
        elif is_ta:
            return "MISSING_BHK_AND_BUDGET", f"அருமை {name}! உங்களுக்கு எத்தனை BHK வீடு வேண்டும், மற்றும் உங்கள் தோராயமான பட்ஜெட் என்ன?"
        else:
            return "MISSING_BHK_AND_BUDGET", f"Great {name}! How many BHK are you looking for, and what is your approximate budget?"

    if not bhk:
        if is_te:
            return "MISSING_BHK", f"మీకు ఎన్ని BHK ఇల్లు కావాలి, {name} గారు?"
        elif is_kn:
            return "MISSING_BHK", f"ನೀವು ಎಷ್ಟು BHK ಮನೆ ಹುಡುಕುತ್ತಿದ್ದೀರಿ, {name} ಅವರೇ?"
        elif is_hi:
            return "MISSING_BHK", f"{name} जी, आप कितने BHK का घर देख रहे हैं?"
        elif is_ta:
            return "MISSING_BHK", f"{name}, உங்களுக்கு எத்தனை BHK வீடு வேண்டும்?"
        else:
            return "MISSING_BHK", f"How many BHK are you looking for, {name}?"

    if not budget:
        loc_str = location if location != "all" else "Bangalore"
        if is_te:
            return "MISSING_BUDGET", f"{loc_str}లో మీ ఇంటి కోసం మీ అంచనా బడ్జెట్ ఎంత?"
        elif is_kn:
            return "MISSING_BUDGET", f"{loc_str}ನಲ್ಲಿ ನಿಮ್ಮ ಮನೆಗೆ ನಿಮ್ಮ ಅಂದಾಜು ಬಜೆಟ್ ಎಷ್ಟು?"
        elif is_hi:
            return "MISSING_BUDGET", f"{loc_str} में आपके घर के लिए आपका अनुमानित बजट कितना है?"
        elif is_ta:
            return "MISSING_BUDGET", f"{loc_str} ல் உங்கள் வீட்டிற்கான தோராயமான பட்ஜெட் என்ன?"
        else:
            return "MISSING_BUDGET", f"What is your approximate budget for your home in {loc_str}?"

    return "ALL_COLLECTED", None


def generate_recommendation_reply(rag_properties: List[Any], is_exact: bool, profile: Dict[str, Any], language: str = "English") -> str:
    lang_lower = (language or "English").lower()
    is_te = "telugu" in lang_lower
    is_kn = "kannada" in lang_lower
    is_hi = "hindi" in lang_lower
    is_ta = "tamil" in lang_lower

    if not rag_properties:
        loc = profile.get("location") or "Bangalore"
        if is_te:
            return f"{loc}లో ప్రస్తుతానికి సరిపోయే ప్రాపర్టీలు లభ్యం కాలేదు. సమీపంలోని ఇతర ప్రాపర్టీలను చూడమంటారా?"
        elif is_kn:
            return f"{loc}ನಲ್ಲಿ ಸದ್ಯಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಾಪರ್ಟಿಗಳು ಲಭ್ಯವಿಲ್ಲ. ಹತ್ತಿರದ ಇತರ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?"
        elif is_hi:
            return f"{loc} में फिलहाल कोई प्रॉपर्टी उपलब्ध नहीं है। क्या आप आस-पास के अन्य विकल्प देखना चाहेंगे?"
        else:
            return f"I couldn't find exact properties in {loc} right now. Would you like me to suggest nearby alternatives?"

    p1 = rag_properties[0]
    p1_price = format_inr(p1.price)

    if is_exact:
        p2 = rag_properties[1] if len(rag_properties) > 1 else None
        p2_info = f", and {p2.name} at {format_inr(p2.price)}" if p2 else ""
        p2_info_te = f", మరియు {p2.name} {format_inr(p2.price)}కి" if p2 else ""
        p2_info_kn = f" ಮತ್ತು {p2.name} {format_inr(p2.price)}ಗೆ" if p2 else ""
        p2_info_hi = f" और {p2.name} {format_inr(p2.price)} में" if p2 else ""

        if is_te:
            return f"మీ అవసరాలకు తగినట్లుగా, {p1.location}లో {p1.name} {p1.bhk} BHK ప్రాపర్టీ {p1_price}కి{p2_info_te} అందుబాటులో ఉన్నాయి. మీరు సైట్ విజిట్ షెడ్యూల్ చేయాలనుకుంటున్నారా?"
        elif is_kn:
            return f"ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕಂತೆ, {p1.location}ನಲ್ಲಿ {p1.name} {p1.bhk} BHK ಪ್ರಾಪರ್ಟಿ {p1_price}ಗೆ{p2_info_kn} ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆಯಾಗಿದೆ. ನೀವು ಸೈಟ್ ಭೇಟಿ ನೀಡಲು ಬಯಸುತ್ತೀರಾ?"
        elif is_hi:
            return f"आपकी पसंद के अनुसार, {p1.location} में {p1.name} {p1.bhk} BHK प्रॉपर्टी {p1_price} में{p2_info_hi} उपलब्ध है। क्या आप साइट विजिट करना चाहेंगे?"
        elif is_ta:
            return f"உங்கள் விருப்பத்திற்கேற்ப, {p1.location} ல் உள்ள {p1.name} {p1.bhk} BHK சொத்து {p1_price} க்கு கிடைக்கிறது. தளப் பார்வையை பதிவு செய்யலாமா?"
        else:
            return f"Based on your requirements, I recommend {p1.name} in {p1.location} offering {p1.bhk} BHK at {p1_price}{p2_info}. Would you like to schedule a site visit?"
    else:
        loc = profile.get("location", "Bangalore")
        bhk = profile.get("bhk", "specified")
        b_str = profile.get("budget", "")
        if is_te:
            return f"ప్రస్తుతం {loc}లో {b_str} బడ్జెట్‌లో సరిగ్గా సరిపోయే {bhk} BHK ప్రాపర్టీ లేదు. అయితే {p1.location}లో {p1.name} {p1_price}కి అందుబాటులో ఉంది. ప్రత్యామ్నాయ ఆప్షన్లను చూడమంటారా?"
        elif is_kn:
            return f"ಪ್ರಸ್ತುತ {loc}ನಲ್ಲಿ {b_str} ಬಜೆಟ್‌ಗೆ {bhk} BHK ಪ್ರಾಪರ್ಟಿ ಲಭ್ಯವಿಲ್ಲ. ಆದರೆ {p1.location}ನಲ್ಲಿ {p1.name} {p1_price}ಗೆ ಲಭ್ಯವಿದೆ. ಪರ್ಯಾಯ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?"
        elif is_hi:
            return f"वर्तमान में {loc} में आपके {b_str} बजट में कोई प्रॉपर्टी उपलब्ध नहीं है। हालांकि {p1.location} में {p1.name} {p1_price} में उपलब्ध है। क्या आप अन्य विकल्प देखना चाहेंगे?"
        else:
            return f"We currently do not have a {bhk} BHK in {loc} within {b_str}. However, I found {p1.name} in {p1.location} at {p1_price}. Would you like me to explore nearby alternatives?"


def is_closing_message(txt: str) -> bool:
    low_t = txt.lower()
    if any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in ["yes", "correct", "right", "sure", "haan", "ha", "avunu", "sari", "ಹೌದು", "हाँ", "ಸరే", "சரி"]):
        return False
    if any(w in low_t for w in ["wrong", "correction", "email is", "phone is", "number is", "@", "dot", "change", "mistake", "actually"]):
        return False
    if "?" in low_t:
        return False
    closing_phrases = [
        "bye", "goodbye", "alvida", "अलविदा", "సెలవు", "that's all", "thats all",
        "no thanks", "no, thanks", "no thank you", "nothing else", "nothing more",
        "that will be all", "all good", "no more", "नहीं, शुक्रिया", "नहीं शुक्रिया",
        "शुक्रिया", "ಧನ್ಯವಾದ", "ಇಲ್ಲ ಧನ್ಯವಾದ", "వద్దు ಧನ್ಯవాదాలు", "చాలా ధನ್ಯవాదాలు"
    ]
    if any(p in low_t for p in closing_phrases):
        return True
    single_closers = ["no", "nope", "nothing", "nahi", "nahin", "ಇಲ್ಲ", "వద్దు", "இல்லை"]
    return any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in single_closers)


def search_rag_properties(db, profile: Dict[str, Any], query_text: str = "") -> Tuple[List[Any], bool]:
    """Queries the SQLite database using extracted criteria.
    Returns (matching_properties, is_exact_match).
    """
    if not db:
        return [], False

    from app.models import Property
    loc = profile.get("location")
    bhk = profile.get("bhk")
    budget_raw = profile.get("budget")
    max_budget = profile.get("budget_num") or parse_budget_inr(budget_raw)

    query = db.query(Property)

    if loc and loc.lower() != "all":
        query = query.filter(Property.location.ilike(f"%{loc}%"))
    if bhk and isinstance(bhk, int) and bhk > 0:
        query = query.filter(Property.bhk == bhk)
    if max_budget:
        query = query.filter(Property.price <= max_budget * 1.05)

    matches = query.order_by(Property.price.asc()).limit(4).all()
    if matches:
        return matches, True

    # If no exact match: provide closest alternatives without pretending they match
    alt_query = db.query(Property)
    if loc and loc.lower() != "all":
        alt_query = alt_query.filter(Property.location.ilike(f"%{loc}%"))
    elif bhk:
        alt_query = alt_query.filter(Property.bhk == bhk)
    alternatives = alt_query.order_by(Property.price.asc()).limit(3).all()
    if not alternatives:
        alternatives = db.query(Property).limit(3).all()

    return alternatives, False


class GeminiSalesService:
    def __init__(self):
        self._client = None

    def get_client(self):
        if self._client is None and settings.GEMINI_API_KEY:
            self._client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options=types.HttpOptions(
                    timeout=15000,
                    retry_options=types.HttpRetryOptions(attempts=1)
                )
            )
        return self._client

    def get_initial_greeting(self, language: str = "English", customer_name: Optional[str] = None) -> str:
        name_known = customer_name and customer_name not in ["Prospective Buyer", "Valued Buyer", ""]
        lang_lower = (language or "").lower()

        if "telugu" in lang_lower:
            if name_known:
                return f"నమస్కారం {customer_name}! డ్రీమ్‌స్పేస్ రియల్టీకి స్వాగతం. మీరు బెంగళూరులో ఏ ప్రాంతంలో ఇల్లు లేదా ఫ్లాట్ కోసం చూస్తున్నారు?"
            return "నమస్కారం! డ్రీమ్‌స్పేస్ రియల్టీ బెంగళూరుకు స్వాగతం. నేను మీ AI సేల్స్ అసిస్టెంట్‌ని. మీ పేరు తెలుసుకోవచ్చా?"
        elif "kannada" in lang_lower:
            if name_known:
                return f"ನಮಸ್ಕಾರ {customer_name}! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿಗೆ ಸ್ವಾಗತ. ನೀವು ಬೆಂಗಳೂರಿನ ಯಾವ ಭಾಗದಲ್ಲಿ ಮನೆ ಹುಡುಕುತ್ತಿದ್ದೀರಿ?"
            return "ನಮಸ್ಕಾರ! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿ ಬೆಂಗಳೂರಿಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ AI ಸೇಲ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್. ನಿಮ್ಮ ಹೆಸರೇನು ದಯವಿಟ್ಟು ತಿಳಿಸುವಿರಾ?"
        elif "hindi" in lang_lower:
            if name_known:
                return f"नमस्ते {customer_name}! ड्रीमस्पेस रियल्टी बैंगलोर में आपका स्वागत है। आप बैंगलोर के किस इलाके में घर देख रहे हैं?"
            return "नमस्ते! ड्रीमस्पेस रियल्टी बैंगलोर में आपका स्वागत है। मैं आपकी AI सेल्स असिस्टेंट हूँ। क्या मैं आपका नाम जान सकती हूँ?"
        elif "tamil" in lang_lower:
            if name_known:
                return f"வணக்கம் {customer_name}! ட்ரீம்ஸ்பே斯 ரியாலிட்டிக்கு வரவேற்கிறோம். பெங்களூரில் எந்த பகுதியில் வீடு பார்க்கிறீர்கள்?"
            return "வணக்கம்! ட்ரீம்ஸ்பேஸ் ரியாலிட்டி பெங்களூருக்கு வரவேற்கிறோம். நான் உங்கள் AI விற்பனை உதவியாளர். உங்கள் பெயரைத் தெரிந்து கொள்ளலாமா?"
        else:
            if name_known:
                return f"Namaskara {customer_name}! Welcome to DreamSpace Properties. Which area in Bangalore are you looking to buy a home in?"
            return "Namaskara! Welcome to DreamSpace Properties. May I know your name?"

    def _get_closing_reply(self, language: str) -> str:
        lang_lower = (language or "English").lower()
        if "telugu" in lang_lower:
            return "డ్రీమ్‌స్పేస్ రియల్టీని ఎంచుకున్నందుకు చాలా ధన్యవాదాలు! మీ సైట్ విజిట్‌లో మిమ్మల్ని కలవడానికి వేచి చూస్తున్నాము. మంచి రోజు కావాలని కోరుకుంటున్నాము. సెలవు!"
        elif "kannada" in lang_lower:
            return "ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿ ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದ. ಒಳ್ಳೆಯ ದಿನವಾಗಲಿ!"
        elif "hindi" in lang_lower:
            return "DreamSpace Properties चुनने के लिए बहुत धन्यवाद! हम आपकी विजिट पर मिलने के लिए उत्सुक हैं। आपका दिन शुभ हो। अलविदा!"
        elif "tamil" in lang_lower:
            return "ட்ரீம்ஸ்பேஸ் ரியாலிட்டியைத் தேர்ந்தெடுத்ததற்கு மிக்க நன்றி! உங்கள் நாள் சிறப்பாக அமையட்டும். வணக்கம்!"
        else:
            return "Thank you for choosing DreamSpace Properties! We look forward to your visit. Have a wonderful day. Goodbye!"

    def _get_collect_phone_reply(self, prop: str, slot: str, language: str) -> str:
        lang_lower = (language or "English").lower()
        if "telugu" in lang_lower:
            return f"{prop} కోసం {slot}న మీ విజిట్ షెడ్యూల్ చేయబడింది! కన్ఫర్మేషన్ వివరాలు పంపడానికి మీ మొబైల్ నంబర్ తెలియజేస్తారా?"
        elif "kannada" in lang_lower:
            return f"{slot}ಗೆ {prop} ಭೇಟಿ ನಿಗದಿಯಾಗಿದೆ! ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಲು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸುವಿರಾ?"
        elif "hindi" in lang_lower:
            return f"{prop} के लिए {slot} की आपकी विजिट तय हो गई है! कन्फर्मेशन भेजने के लिए क्या मुझे आपका मोबाइल नंबर मिल सकता है?"
        elif "tamil" in lang_lower:
            return f"{prop} பார்க்க {slot} பதிவு செய்யப்பட்டுள்ளது! உறுதிப்படுத்தல் அனுப்ப உங்கள் மொபைல் எண்ணைத் தெரிவிப்பீர்களா?"
        else:
            return f"Your visit to {prop} on {slot} is scheduled! May I have your phone number to send the confirmation details?"

    def _process_turn(
        self,
        current_message: str,
        merged_profile: Dict[str, Any],
        current_profile: Dict[str, Any],
        active_lang: str,
        rag_properties: List[Any],
        is_exact: bool,
        db=None,
        model_reply: Optional[str] = None
    ) -> Dict[str, Any]:
        low = current_message.lower()
        is_te = "telugu" in active_lang.lower()
        is_kn = "kannada" in active_lang.lower()
        is_hi = "hindi" in active_lang.lower()
        is_ta = "tamil" in active_lang.lower()

        # 1. Closing Intent Check
        is_q = "?" in low
        if is_closing_message(current_message) and not is_q:
            merged_profile["call_ended"] = True
            merged_profile["conv_state"] = "CLOSING"
            reply_txt = self._get_closing_reply(active_lang)
            next_action = "CLOSING"
            diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
            return {
                "reply": reply_txt,
                "extracted_profile": merged_profile,
                "extracted_diff": diff,
                "next_action": next_action,
                "detected_language": active_lang,
                "recommended_properties": rag_properties
            }

        # 2. Contact Details & Booking Confirmation Workflow
        state = merged_profile.get("conv_state", "GREET")
        is_affirmative = any(w in low for w in [
            "yes", "yeah", "yep", "sure", "correct", "that's correct", "thats correct", "that is correct",
            "right", "exact", "exactly", "haan", "sahi", "sahi hai", "theek",
            "avunu", "haudu", "sare", "sari", "aamaam", "confirm", "ok", "okay"
        ])
        is_negative = any(w in low for w in [
            "no", "nope", "wrong", "incorrect", "change", "nahi", "nahin", "kaadu", "illa", "illai"
        ])

        new_email_info = extract_email_and_spelling(current_message)
        new_phone_match = re.search(r'(\+91[\s-]?)?[6-9]\d{9}', current_message) or re.search(r'\b[6-9](?:\s*\d){9}\b', current_message)

        slot = merged_profile.get("visit_slot") or "Saturday 11:00 AM"
        pname = merged_profile.get("property_name") or (rag_properties[0].name if rag_properties else "Prestige Willow Park")

        # Handle explicit phone number submission
        if new_phone_match and (state in ["COLLECT_PHONE", "CONFIRM_PHONE", "RECOMMEND", "VISIT"] or not merged_profile.get("phone_confirmed") or "number is" in low or "phone is" in low):
            clean_d = re.sub(r'\D', '', new_phone_match.group(0))
            if len(clean_d) == 12 and clean_d.startswith("91"):
                clean_d = clean_d[2:]
            if len(clean_d) == 10:
                formatted_p = "+91 " + clean_d
                merged_profile["unconfirmed_phone"] = formatted_p
                merged_profile["customer_phone"] = formatted_p
                merged_profile["conv_state"] = "CONFIRM_PHONE"
                digits_spaced = " ".join(list(clean_d))
                if is_te:
                    reply_txt = f"ధన్యవాదాలు! నేను మీ ఫోన్ నంబర్‌ను {digits_spaced} ({clean_d}) గా నమోదు చేసుకున్నాను. ఇది సరైనదేనా?"
                elif is_kn:
                    reply_txt = f"ಧನ್ಯವಾದಗಳು! ನಾನು ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು {digits_spaced} ({clean_d}) ಎಂದು ದಾಖಲಿಸಿಕೊಂಡಿದ್ದೇನೆ. ಇದು ಸರಿಯೇ?"
                elif is_hi:
                    reply_txt = f"धन्यवाद! मैंने आपका फ़ोन नंबर {digits_spaced} ({clean_d}) दर्ज किया है। क्या यह सही है?"
                elif is_ta:
                    reply_txt = f"நன்றி! உங்கள் தொலைபேசி எண் {digits_spaced} ({clean_d}) என பதிவாகியுள்ளது. ఇది சரியானதா?"
                else:
                    reply_txt = f"Thank you! I have noted your phone number as {digits_spaced} ({clean_d}). Is that correct?"
                next_action = "CONFIRM_PHONE"
                diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
                return {
                    "reply": reply_txt,
                    "extracted_profile": merged_profile,
                    "extracted_diff": diff,
                    "next_action": next_action,
                    "detected_language": active_lang,
                    "recommended_properties": rag_properties
                }

        # Handle phone confirmation
        if (state == "CONFIRM_PHONE" or (merged_profile.get("unconfirmed_phone") and not merged_profile.get("phone_confirmed"))) and is_affirmative and not is_negative:
            merged_profile["phone_confirmed"] = True
            merged_profile["customer_phone"] = merged_profile.get("unconfirmed_phone") or merged_profile.get("customer_phone")
            if new_email_info:
                em_val, em_spell = new_email_info
                merged_profile["unconfirmed_email"] = em_val
                merged_profile["email_spelling"] = em_spell
                merged_profile["conv_state"] = "CONFIRM_EMAIL"
                if is_te:
                    reply_txt = f"మీ ఫోన్ నంబర్ కన్ఫర్మ్ అయింది! మీ ఇమెయిల్ స్పెల్లింగ్: {em_spell} ({em_val}). ఇది సరైనదేనా?"
                elif is_kn:
                    reply_txt = f"ಫೋನ್ ಸಂಖ್ಯೆ ಖಚಿತವಾಗಿದೆ! ನಿಮ್ಮ ಇಮೇಲ್ ಸ್ಪೆಲ್ಲಿಂಗ್: {em_spell} ({em_val}). ಇದು ಸರಿಯೇ?"
                elif is_hi:
                    reply_txt = f"फ़ोन नंबर कन्फर्म हो गया! आपके ईमेल की स्पेलिंग: {em_spell} ({em_val})। क्या यह सही है?"
                elif is_ta:
                    reply_txt = f"தொலைபேசி எண் உறுதியானது! உங்கள் மின்னஞ்சல்: {em_spell} ({em_val}). இது சரியானதா?"
                else:
                    reply_txt = f"Phone number confirmed! Let me verify your email address spelling: {em_spell} ({em_val}). Did I get that right?"
                next_action = "CONFIRM_EMAIL"
            else:
                merged_profile["conv_state"] = "COLLECT_EMAIL"
                if is_te:
                    reply_txt = "మీ ఫోన్ నంబర్ కన్ఫర్మ్ చేసినందుకు ధన్యవాదాలు! మీ విజిట్ వివరాలు మరియు బ్రోచర్ పంపడానికి దయచేసి మీ ఇమెయిల్ అడ్రస్ చెప్పగలరా? కావాలంటే అక్షరం వారీగా చెప్పవచ్చు."
                elif is_kn:
                    reply_txt = "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ಖಚಿತಪಡಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ಭೇಟಿ ದೃಢೀಕರಣ ಮತ್ತು ಬ್ರೋಷರ್ ಕಳುಹಿಸಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ತಿಳಿಸುವಿರಾ? ಅಕ್ಷರಶಃ ಕೂಡ ಹೇಳಬಹುದು."
                elif is_hi:
                    reply_txt = "फ़ोन नंबर कन्फर्म करने के लिए धन्यवाद! बुकिंग कन्फर्मेशन और ब्रोशर भेजने के लिए कृपया अपना ईमेल एड्रेस बताएं। आप स्पेलिंग भी बोल सकते हैं।"
                elif is_ta:
                    reply_txt = "தொலைபேசி எண் உறுதிப்படுத்தியதற்கு நன்றி! பார்வை உறுதிப்படுத்தல் மற்றும் புரோஷர் அனுப்ப உங்கள் மின்னஞ்சல் முகவரியைத் தெரிவிக்கவும்."
                else:
                    reply_txt = "Thank you for confirming your phone number! Could you please share your email address so we can send the visit confirmation and property brochure? Feel free to spell it letter by letter if needed."
                next_action = "COLLECT_EMAIL"

            diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
            return {
                "reply": reply_txt,
                "extracted_profile": merged_profile,
                "extracted_diff": diff,
                "next_action": next_action,
                "detected_language": active_lang,
                "recommended_properties": rag_properties
            }

        # Handle explicit email submission
        if new_email_info and (state in ["COLLECT_EMAIL", "CONFIRM_EMAIL", "CONFIRM_PHONE"] or not merged_profile.get("email_confirmed") or "email is" in low or "@" in low or "dot" in low):
            em_val, em_spell = new_email_info
            merged_profile["unconfirmed_email"] = em_val
            merged_profile["email_spelling"] = em_spell
            merged_profile["conv_state"] = "CONFIRM_EMAIL"
            if is_te:
                reply_txt = f"ధన్యవాదాలు! మీ ఇమెయిల్ స్పెల్లింగ్: {em_spell} ({em_val}). ఇది సరైనదేనా?"
            elif is_kn:
                reply_txt = f"ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಇಮೇಲ್ ಸ್ಪೆಲ್ಲಿಂಗ್: {em_spell} ({em_val}). ಇದು ಸರಿಯೇ?"
            elif is_hi:
                reply_txt = f"धन्यवाद! आपके ईमेल की स्पेलिंग: {em_spell} ({em_val})। क्या यह सही है?"
            elif is_ta:
                reply_txt = f"நன்றி! உங்கள் மின்னஞ்சல்: {em_spell} ({em_val}). இது சரியானதா?"
            else:
                reply_txt = f"Thank you! Let me confirm your email address spelling: {em_spell} ({em_val}). Is that correct?"
            next_action = "CONFIRM_EMAIL"
            diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
            return {
                "reply": reply_txt,
                "extracted_profile": merged_profile,
                "extracted_diff": diff,
                "next_action": next_action,
                "detected_language": active_lang,
                "recommended_properties": rag_properties
            }

        # Handle email confirmation
        if (state == "CONFIRM_EMAIL" or (merged_profile.get("unconfirmed_email") and not merged_profile.get("email_confirmed"))) and is_affirmative and not is_negative:
            merged_profile["email_confirmed"] = True
            merged_profile["customer_email"] = merged_profile.get("unconfirmed_email") or merged_profile.get("customer_email")
            merged_profile["conv_state"] = "BOOKED"
            merged_profile["booking_ready"] = True

            from app.config import settings
            smtp_active = bool(settings.SMTP_USER and settings.SMTP_PASSWORD and settings.SMTP_USER != "your_email@gmail.com")

            if is_te:
                reply_txt = f"చాలా ధన్యవాదాలు! {pname} కొరకు {slot}న మీ విజిట్ మరియు ఇమెయిల్ {merged_profile['customer_email']} కన్ఫర్మ్ అయ్యాయి. నేను మీకు ఇంకేమైనా సహాయం చేయగలనా?"
            elif is_kn:
                reply_txt = f"ತುಂಬಾ ಧನ್ಯವಾದಗಳು! {slot}ಗೆ {pname} ಭೇಟಿ ಮತ್ತು ಇಮೇಲ್ {merged_profile['customer_email']} ಖಚಿತವಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಮಾಡಬೇಕೇ?"
            elif is_hi:
                reply_txt = f"बहुत धन्यवाद! {pname} के लिए {slot} की आपकी विजिट और ईमेल {merged_profile['customer_email']} कन्फर्म हो गए हैं। क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूँ?"
            elif is_ta:
                reply_txt = f"நன்றி! {pname} பார்வை {slot} உறுதிப்படுத்தப்பட்டு புரோஷர் {merged_profile['customer_email']} க்கு அனுப்பப்படுகிறது. நான் உங்களுக்கு வேறு ஏதேனும் உதவி செய்ய வேண்டுமா?"
            else:
                if smtp_active:
                    reply_txt = f"Thank you! Your email {merged_profile['customer_email']} is confirmed. Your visit to {pname} on {slot} has been officially booked, and your property brochure has been sent to your inbox. Is there anything else I can help you with?"
                else:
                    reply_txt = f"Thank you! Your email {merged_profile['customer_email']} is confirmed. Your visit to {pname} on {slot} has been booked and registered, and our concierge will connect with you directly. Is there anything else I can help you with?"
            next_action = "BOOKED"
            diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
            return {
                "reply": reply_txt,
                "extracted_profile": merged_profile,
                "extracted_diff": diff,
                "next_action": next_action,
                "detected_language": active_lang,
                "recommended_properties": rag_properties
            }

        # Post-booking question answering
        if state in ["BOOKED", "CLOSING"]:
            if is_q:
                if "pool" in low or "clubhouse" in low:
                    reply_txt = f"Yes, {pname} features a swimming pool, clubhouse, and premium amenities. Since your visit is scheduled for {slot}, you can tour them in person! Is there anything else I can help you with?"
                else:
                    reply_txt = f"Certainly! {pname} in {merged_profile.get('location', 'Bangalore')} offers premium specifications and ready-to-move convenience. Is there anything else I can help you with?"
            else:
                reply_txt = f"Your visit to {pname} on {slot} is registered! Is there anything else I can help you with?"
            next_action = "ANSWER_QUESTION"
            diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
            return {
                "reply": reply_txt,
                "extracted_profile": merged_profile,
                "extracted_diff": diff,
                "next_action": next_action,
                "detected_language": active_lang,
                "recommended_properties": rag_properties
            }

        # 3. Missing Requirements Checking (Strict Deterministic Order)
        missing_code, missing_reply = determine_missing_field_and_action(merged_profile, active_lang)

        if missing_code == "MISSING_NAME":
            merged_profile["conv_state"] = "GREET"
            next_action = "ASK_NAME"
            reply_txt = missing_reply
        elif missing_code == "MISSING_LOCATION":
            merged_profile["conv_state"] = "LOCATION"
            next_action = "ASK_LOCATION"
            reply_txt = missing_reply
        elif missing_code == "MISSING_BHK_AND_BUDGET":
            merged_profile["conv_state"] = "CONFIG"
            next_action = "ASK_BHK_AND_BUDGET"
            reply_txt = missing_reply
        elif missing_code == "MISSING_BHK":
            merged_profile["conv_state"] = "CONFIG"
            next_action = "ASK_BHK"
            reply_txt = missing_reply
        elif missing_code == "MISSING_BUDGET":
            merged_profile["conv_state"] = "BUDGET"
            next_action = "ASK_BUDGET"
            reply_txt = missing_reply
        else:
            # ALL 4 REQUIREMENTS ARE PRESENT: name, location, bhk, budget!
            # Automatically query database and recommend properties!
            if not rag_properties and db:
                rag_properties, is_exact = search_rag_properties(db, merged_profile, current_message)

            if rag_properties:
                merged_profile["property_name"] = rag_properties[0].name

            # Check if we should recommend or proceed to booking visit
            if state in ["RECOMMEND", "VISIT", "COLLECT_PHONE"] or any(w in low for w in ["visit", "book", "schedule", "tour", "yes", "sure", "saturday", "sunday", "tomorrow"]):
                slot = merged_profile.get("visit_slot") or "Saturday 11:00 AM"
                p_name = merged_profile.get("property_name") or (rag_properties[0].name if rag_properties else "Prestige Willow Park")
                merged_profile["conv_state"] = "COLLECT_PHONE"
                merged_profile["booking_ready"] = True
                merged_profile["visit_interest"] = "Requested"
                next_action = "COLLECT_PHONE"
                reply_txt = self._get_collect_phone_reply(p_name, slot, active_lang)
            else:
                # State transitions to RECOMMEND: Verbally explain matching properties
                merged_profile["conv_state"] = "RECOMMEND"
                next_action = "RECOMMEND_PROPERTIES"
                reply_txt = generate_recommendation_reply(rag_properties, is_exact, merged_profile, active_lang)

        diff = {k: merged_profile[k] for k in ["customer_name", "location", "bhk", "budget", "budget_num", "customer_phone", "customer_email", "visit_interest", "visit_slot"] if merged_profile.get(k) and merged_profile.get(k) != current_profile.get(k)}
        return {
            "reply": reply_txt,
            "extracted_profile": merged_profile,
            "extracted_diff": diff,
            "next_action": next_action,
            "detected_language": active_lang,
            "recommended_properties": rag_properties
        }

    def generate_sales_response(
        self,
        current_message: str,
        history: List[Dict[str, str]],
        current_profile: Dict[str, Any],
        language: str = "English",
        db = None,
        session_id: Optional[str] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        client = self.get_client()

        # 1. Multi-requirement extraction from current message
        extracted_facts = extract_all_requirements(current_message, current_profile)
        active_lang = detect_language_from_text(current_message, extracted_facts.get("language") or language)
        extracted_facts["language"] = active_lang

        # 1b. Dedicated RESCHEDULE_APPOINTMENT intent handling (deterministic DB validation & state isolation)
        from app.services.appointment_service import detect_reschedule_intent, handle_reschedule_turn
        if extracted_facts.get("reschedule_active") or detect_reschedule_intent(current_message, extracted_facts):
            resched_res = handle_reschedule_turn(
                current_message=current_message,
                profile=extracted_facts,
                language=active_lang,
                db=db,
                session_id=session_id,
            )
            return {
                "reply": resched_res["reply"],
                "extracted_profile": resched_res["profile"],
                "detected_language": active_lang,
                "recommended_properties": [],
                "next_action": resched_res.get("next_action", "RESCHEDULE_APPOINTMENT"),
            }

        # 2. Trigger automatic RAG property search if criteria are present
        has_criteria = bool(extracted_facts.get("location") and (extracted_facts.get("bhk") or extracted_facts.get("budget")))
        rag_properties = []
        is_exact = False
        if db and (has_criteria or extracted_facts.get("conv_state") in ["RECOMMEND", "VISIT", "CONFIG"]):
            rag_properties, is_exact = search_rag_properties(db, extracted_facts, current_message)

        rag_context = ""
        if rag_properties:
            items = []
            for p in rag_properties:
                items.append(f"- {p.name} | Location: {p.location} | {p.bhk} BHK {p.property_type} | Price: {format_inr(p.price)} | Status: {p.availability}")
            rag_context = "\nACTUAL MATCHING PROPERTIES FROM SQLITE DATABASE:\n" + "\n".join(items) + f"\nExact match: {is_exact}\n"

        formatted_history = []
        for h in history[-12:]:
            role = "Customer" if h.get("role") in ["user", "customer"] else "DreamSpace AI"
            formatted_history.append(f"{role}: {h.get('content', '')}")

        history_str = "\n".join(formatted_history) if formatted_history else "No previous messages."
        profile_str = json.dumps(extracted_facts or {}, ensure_ascii=False)

        prompt = (
            f"Active Language: {active_lang}\n"
            f"Current Customer Profile (Remember these facts, never ask for already provided details):\n{profile_str}\n\n"
            f"{rag_context}\n"
            f"Conversation History:\n{history_str}\n\n"
            f"Current Customer Input: {current_message}\n\n"
            f"Instructions:\n"
            f"1. Acknowledge and remember all extracted customer requirements.\n"
            f"2. If matching properties are provided above, VERBALLY EXPLAIN THE BEST MATCHING PROPERTIES WITH THEIR NAME, LOCATION, AND PRICE. Ask if they want to schedule a visit.\n"
            f"3. Do NOT say 'Let me check' or wait for another message.\n"
            f"4. If exact match is false, clearly state that no property within their exact budget/specs exists, and ask permission to suggest alternatives.\n"
            f"5. Keep replies SHORT (1-3 sentences) in {active_lang} native script. Speak naturally with warm female tone."
        )

        merged_profile = dict(extracted_facts)
        model_reply = None

        if client:
            for model_name in CANDIDATE_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            system_instruction=SYSTEM_INSTRUCTION,
                            temperature=0.3
                        )
                    )
                    text = response.text.strip()
                    if text.startswith("```"):
                        text = text.split("```")[1]
                        if text.startswith("json"):
                            text = text[4:]
                    parsed = json.loads(text)
                    if "reply" in parsed:
                        merged_profile = self._merge_profile(extracted_facts, parsed)
                        low_msg = current_message.lower()
                        reply_txt = parsed["reply"]
                        model_lang = parsed.get("detected_language") or active_lang

                        has_real_phone = bool(
                            merged_profile.get("customer_phone") and
                            merged_profile["customer_phone"] not in ["+91 98450 12345", "", None] and
                            len(re.sub(r'\D', '', str(merged_profile["customer_phone"]))) >= 10
                        )

                        def is_closing_intent(txt: str) -> bool:
                            low_t = txt.lower()
                            if any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in ["yes", "correct", "right", "sure", "haan", "ha", "avunu", "sari", "ಹೌದು", "हाँ", "ಸరే", "சரி"]):
                                return False
                            if any(w in low_t for w in ["wrong", "correction", "email is", "phone is", "number is", "@", "dot", "change", "mistake", "actually"]):
                                return False
                            if "?" in low_t:
                                return False
                            closing_phrases = [
                                "bye", "goodbye", "alvida", "अलविदा", "సెలవు", "that's all", "thats all",
                                "no thanks", "no, thanks", "no thank you", "nothing else", "nothing more",
                                "that will be all", "all good", "no more", "नहीं, शुक्रिया", "नहीं शुक्रिया",
                                "शुक्रिया", "ಧನ್ಯವಾದ", "ಇಲ್ಲ ಧನ್ಯವಾದ", "వద్దు ಧನ್ಯవాದాలు", "చాలా ಧನ್ಯవాదాలు"
                            ]
                            if any(p in low_t for p in closing_phrases):
                                return True
                            single_closers = ["no", "nope", "nothing", "nahi", "nahin", "ಇಲ್ಲ", "వద్దు", "இல்லை"]
                            return any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in single_closers)

                        is_q = "?" in low_msg
                        is_closing = is_closing_intent(current_message)
                        if is_closing and not is_q:
                            merged_profile["call_ended"] = True
                            merged_profile["conv_state"] = "CLOSING"
                            if "telugu" in model_lang.lower():
                                reply_txt = "డ్రీమ్‌స్పేస్ రియల్టీని ఎంచుకున్నందుకు చాలా ధన్యవాదాలు! మీ సైట్ విజిట్‌లో మిమ్మల్ని కలవడానికి వేచి చూస్తున్నాము. మంచి రోజు కావాలని కోరుకుంటున్నాము. సెలవు!"
                            elif "kannada" in model_lang.lower():
                                reply_txt = "ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿ ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದ. ಒಳ್ಳೆಯ ದಿನವಾಗಲಿ!"
                            elif "hindi" in model_lang.lower():
                                reply_txt = "DreamSpace Properties चुनने के लिए बहुत धन्यवाद! हम आपकी विजिट पर मिलने के लिए उत्सुक हैं। आपका दिन शुभ हो। अलविदा!"
                            elif "tamil" in model_lang.lower():
                                reply_txt = "ட்ரீம்ஸ்பேஸ் ரியாலிட்டியைத் தேர்ந்தெடுத்ததற்கு மிக்க நன்றி! உங்கள் நாள் சிறப்பாக அமையட்டும். வணக்கம்!"
                            else:
                                reply_txt = "Thank you for choosing DreamSpace Properties! We look forward to your visit. Have a wonderful day. Goodbye!"

                        elif (
                            merged_profile.get("booking_ready")
                            and merged_profile.get("property_name")
                            and any(w in low_msg for w in ["visit", "tour", "book", "schedule", "see", "appointment", "saturday", "sunday", "tomorrow", "భేటి", "విజిಟ್", "ವಿಜಿಟ್", "विजिट"])
                        ):
                            if not has_real_phone:
                                phone_in_reply = any(w in reply_txt.lower() for w in ["phone", "number", "contact", "ಮೊಬೈಲ್", "ಸಂಖ್ಯೆ", "मोबाइल", "नंबर", "నంబర్", "ఫోన్", "எண்"])
                                if not phone_in_reply:
                                    slot = merged_profile.get("visit_slot") or "this Saturday at 11 AM"
                                    prop = merged_profile.get("property_name") or "the property"
                                    if "telugu" in model_lang.lower():
                                        reply_txt = f"{prop} కోసం {slot}న మీ విజిట్ షెడ్యూల్ చేయబడింది! కన్ఫర్మేషన్ వివరాలు పంపడానికి మీ మొబైల్ నంబర్ తెలియజేస్తారా?"
                                    elif "kannada" in model_lang.lower():
                                        reply_txt = f"{slot}ಗೆ {prop} ಭೇಟಿ ನಿಗದಿಯಾಗಿದೆ! ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಲು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸುವಿರಾ?"
                                    elif "hindi" in model_lang.lower():
                                        reply_txt = f"{prop} के लिए {slot} की आपकी विजिट तय हो गई है! कन्फर्मेशन भेजने के लिए क्या मुझे आपका मोबाइल नंबर मिल सकता है?"
                                    elif "tamil" in model_lang.lower():
                                        reply_txt = f"{prop} பார்க்க {slot} பதிவு செய்யப்பட்டுள்ளது! உறுதிப்படுத்தல் அனுப்ப உங்கள் மொபைல் எண்ணைத் தெரிவிப்பீர்களா?"
                                    else:
                                        reply_txt = f"Your visit to {prop} on {slot} is scheduled! May I have your phone number to send the confirmation details?"
                            else:
                                anything_else_in_reply = any(
                                    phrase in reply_txt.lower()
                                    for phrase in [
                                        "anything else", "help you with", "మరికేమైనా", "సహాయం చేయగలనా",
                                        "ಇನ್ನೇನಾದರೂ", "ಸಹಾಯ ಮಾಡಬೇಕೇ", "और कुछ", "मदद कर सकती हूँ", "வேறேதும்"
                                    ]
                                )
                                if not anything_else_in_reply:
                                    if "telugu" in model_lang.lower():
                                        reply_txt += " నేను మీకు ఇంకేమైనా సహాయం చేయగలనా?"
                                    elif "kannada" in model_lang.lower():
                                        reply_txt += " ನಾನು ನಿಮಗೆ ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಮಾಡಬೇಕೇ?"
                                    elif "hindi" in model_lang.lower():
                                        reply_txt += " क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूँ?"
                                    elif "tamil" in model_lang.lower():
                                        reply_txt += " நான் உங்களுக்கு வேறு ஏதேனும் உதவி செய்ய வேண்டுமா?"
                                    else:
                                        reply_txt += " Is there anything else I can help you with?"

                        # Automatic Property Recommendation: If model produced a stalling phrase, immediately speak matching properties in the same turn
                        stalling_phrases = ["let me find", "let me check", "let me search", "finding the best", "searching our", "looking up", "checking our inventory", "one moment", "wait a moment"]
                        is_stalling = any(sp in reply_txt.lower() for sp in stalling_phrases)
                        if rag_properties and (is_stalling or (rag_properties[0].name.lower() not in reply_txt.lower() and merged_profile.get("conv_state") in ["RECOMMEND", "CONFIG", "GREET", "LOCATION", "BUDGET"])):
                            p1 = rag_properties[0]
                            p1_price = format_inr(p1.price)
                            merged_profile["property_name"] = p1.name
                            merged_profile["conv_state"] = "RECOMMEND"
                            p2_text = f", and {rag_properties[1].name} at {format_inr(rag_properties[1].price)}" if len(rag_properties) > 1 and is_exact else ""
                            if "telugu" in model_lang.lower():
                                reply_txt = f"మీ అవసరాలకు తగినట్లుగా {p1.location} లో {p1.name} అందుబాటులో ఉంది, ధర {p1_price}. ఈ వారాంతంలో సైట్ విజిట్ బుక్ చేద్దామా?"
                            elif "kannada" in model_lang.lower():
                                reply_txt = f"ನಿಮ್ಮ ಅವಶ್ಯಕತೆಗೆ ತಕ್ಕಂತೆ {p1.location}ದಲ್ಲಿರುವ {p1.name} ಲಭ್ಯವಿದೆ, ಇದರ ಬೆಲೆ {p1_price}. ಈ ವಾರಾಂತ್ಯದಲ್ಲಿ ಸೈಟ್ ಭೇಟಿಯನ್ನು ನಿಗದಿಪಡಿಸೋಣವೇ?"
                            elif "hindi" in model_lang.lower():
                                reply_txt = f"आपकी पसंद के अनुसार {p1.location} में {p1.name} उपलब्ध है, जिसकी कीमत {p1_price} है। क्या आप इस वीकेंड साइट विजिट बुक करना चाहेंगे?"
                            elif "tamil" in model_lang.lower():
                                reply_txt = f"உங்கள் விருப்பத்திற்கேற்ப {p1.location} ல் உள்ள {p1.name} கிடைக்கிறது, இதன் விலை {p1_price}. இந்த வார இறுதியில் தளப் பார்வையை பதிவு செய்யலாமா?"
                            else:
                                reply_txt = f"I found the best matching properties for you: {p1.name} in {p1.location} at {p1_price}{p2_text}. Would you like to schedule a site visit to tour the property?"

                        merged_profile["language"] = model_lang
                        return {
                            "reply": reply_txt,
                            "extracted_profile": merged_profile,
                            "detected_language": model_lang,
                            "recommended_properties": rag_properties
                        }
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} failed: {e}. Trying next model...")

        logger.info("Using direct rule-based sales engine fallback with SQLite property retrieval.")
        fallback_res = self._rule_based_sales_fallback(current_message, extracted_facts, active_lang, rag_properties, is_exact)
        fallback_res["recommended_properties"] = rag_properties
        return fallback_res

    def generate_call_summary(
        self,
        history: List[Dict[str, str]],
        final_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        client = self.get_client()
        conversation_text = "\n".join([
            f"{'Customer' if h.get('role') in ['user', 'customer'] else 'Agent'}: {h.get('content', '')}"
            for h in history
        ])

        summary_prompt = (
            f"Summarize this real estate sales call in 2 concise sentences, and determine the outcome "
            f"('Visit Scheduled', 'Qualified Buyer', 'Follow-up Needed', or 'Information Provided').\n"
            f"Profile: {json.dumps(final_profile)}\n"
            f"Conversation:\n{conversation_text}\n\n"
            f"Return JSON with keys: summary, outcome, sentiment, lead_score."
        )

        if client and len(history) > 1:
            for model_name in CANDIDATE_MODELS:
                try:
                    res = client.models.generate_content(
                        model=model_name,
                        contents=summary_prompt,
                        config=types.GenerateContentConfig(response_mime_type="application/json")
                    )
                    text = res.text.strip()
                    if text.startswith("```"):
                        text = text.split("```")[1]
                        if text.startswith("json"):
                            text = text[4:]
                    parsed = json.loads(text)
                    return {
                        "summary": parsed.get("summary", "Customer inquired about Bangalore properties."),
                        "outcome": parsed.get("outcome", "Information Provided"),
                        "sentiment": parsed.get("sentiment", final_profile.get("sentiment", "Positive")),
                        "lead_score": parsed.get("lead_score", final_profile.get("lead_score", 75))
                    }
                except Exception:
                    pass

        visit_int = final_profile.get("visit_interest", "")
        loc = final_profile.get("location") or "Bangalore"
        bhk = final_profile.get("bhk") or ""
        outcome = "Visit Scheduled" if (
            visit_int in ["Interested", "Requested"] or final_profile.get("visit_slot")
        ) else "Follow-up Needed"
        summary = f"Customer explored {f'{bhk} BHK ' if bhk else ''}properties in {loc}. "
        if outcome == "Visit Scheduled":
            summary += f"Requested a site visit for {final_profile.get('visit_slot') or 'upcoming weekend'}."
        else:
            summary += "Shared verified DreamSpace project details."

        return {
            "summary": summary,
            "outcome": outcome,
            "sentiment": final_profile.get("sentiment", "Positive"),
            "lead_score": final_profile.get("lead_score", 80)
        }

    def _merge_profile(self, old_profile: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(old_profile or {})
        fields = [
            "customer_name", "customer_phone", "customer_email", "location", "budget", "budget_num", "bhk", "property_type",
            "timeline", "visit_interest", "visit_slot", "visit_date_iso", "property_name",
            "conv_state", "booking_ready", "call_ended", "phone_confirmed", "email_confirmed",
            "unconfirmed_phone", "unconfirmed_email", "email_spelling", "email_status",
            "appointment_id", "reschedule_active", "reschedule_target_date", "reschedule_target_time",
            "suggested_alternative_iso", "rescheduled_just_now",
            "sentiment", "lead_score", "intent", "language"
        ]
        for f in fields:
            val = new_data.get(f)
            if val is not None and val != "" and val != "null" and val != "Prospective Buyer" and val != "Valued Buyer":
                merged[f] = val

        # Ensure customer_name is never lost once known
        if old_profile.get("customer_name") and old_profile["customer_name"] not in ["Prospective Buyer", "Valued Buyer", "", None]:
            if not merged.get("customer_name") or merged["customer_name"] in ["Prospective Buyer", "Valued Buyer", ""]:
                merged["customer_name"] = old_profile["customer_name"]

        # Ensure budget, location, and bhk are never lost once known
        for k in ["location", "budget", "budget_num", "bhk"]:
            if old_profile.get(k) and not merged.get(k):
                merged[k] = old_profile[k]

        try:
            merged["lead_score"] = max(10, min(100, int(merged.get("lead_score", 70))))
        except Exception:
            merged["lead_score"] = 75

        for bool_field in ("booking_ready", "call_ended", "phone_confirmed", "email_confirmed"):
            if bool_field in merged:
                merged[bool_field] = bool(merged[bool_field])

        # When booking is ready or confirmed, synchronize email and phone from unconfirmed staging
        if merged.get("conv_state") == "BOOKED" or merged.get("booking_ready"):
            if not merged.get("customer_email") and merged.get("unconfirmed_email") and merged.get("email_confirmed"):
                merged["customer_email"] = merged["unconfirmed_email"]
            if not merged.get("customer_phone") and merged.get("unconfirmed_phone") and merged.get("phone_confirmed"):
                merged["customer_phone"] = merged["unconfirmed_phone"]

        return merged

    def _rule_based_sales_fallback(
        self,
        message: str,
        profile: Dict[str, Any],
        language: str = "English",
        rag_properties: List[Any] = None,
        is_exact: bool = True
    ) -> Dict[str, Any]:
        low = message.lower()
        updated = dict(profile or {})
        detected_lang = detect_language_from_text(message, language)
        updated["language"] = detected_lang

        is_telugu = "telugu" in detected_lang.lower()
        is_kannada = "kannada" in detected_lang.lower()
        is_hindi = "hindi" in detected_lang.lower()
        is_tamil = "tamil" in detected_lang.lower()

        state = updated.get("conv_state", "GREET")

        # Rescheduling check in fallback mode
        from app.services.appointment_service import detect_reschedule_intent, handle_reschedule_turn
        if updated.get("reschedule_active") or detect_reschedule_intent(message, updated):
            resched_res = handle_reschedule_turn(
                current_message=message,
                profile=updated,
                language=detected_lang,
                db=None,
            )
            return {
                "reply": resched_res["reply"],
                "extracted_profile": resched_res["profile"],
                "detected_language": detected_lang,
            }

        # Closing detection
        def is_closing_intent_fb(txt: str) -> bool:
            low_t = txt.lower()
            if any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in ["yes", "correct", "right", "sure", "haan", "ha", "avunu", "sari", "ಹೌದು", "हाँ", "ಸరే", "சரி"]):
                return False
            if any(w in low_t for w in ["wrong", "correction", "email is", "phone is", "number is", "@", "dot", "change", "mistake", "actually"]):
                return False
            if "?" in low_t:
                return False
            closing_phrases = [
                "bye", "goodbye", "alvida", "अलविदा", "సెలవు", "that's all", "thats all",
                "no thanks", "no, thanks", "no thank you", "nothing else", "nothing more",
                "that will be all", "all good", "no more", "नहीं, शुक्रिया", "नहीं शुक्रिया",
                "शुक्रिया", "ಧನ್ಯವಾದ", "ಇಲ್ಲ ಧನ್ಯವಾದ", "వద్దు ಧನ್ಯవాದాలు", "చాలా ಧನ್ಯవాదాలు"
            ]
            if any(p in low_t for p in closing_phrases):
                return True
            single_closers = ["no", "nope", "nothing", "nahi", "nahin", "ಇಲ್ಲ", "వద్దు", "இல்லை"]
            return any(re.search(r'\b' + re.escape(w) + r'\b', low_t) for w in single_closers)

        is_question = "?" in low
        is_closing = is_closing_intent_fb(message)
        if is_closing and not is_question:
            updated["call_ended"] = True
            updated["conv_state"] = "CLOSING"
            if is_telugu:
                reply = "డ్రీమ్‌స్పేస్ రియల్టీని సంప్రదించినందుకు చాలా ధన్యవాదాలు! మీ సైట్ విజిట్‌లో కలుద్దాం. మీ రోజు శుభప్రదంగా ఉండాలని కోరుకుంటున్నాము. సెలవు!"
            elif is_kannada:
                reply = "ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿ ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದ. ಒಳ್ಳೆಯ ದಿನವಾಗಲಿ!"
            elif is_hindi:
                reply = "DreamSpace Properties चुनने के लिए बहुत धन्यवाद! हम आपकी विजिट पर मिलने के लिए उत्सुक हैं। आपका दिन शुभ हो। अलविदा!"
            elif is_tamil:
                reply = "ட்ரீம்ஸ்பேஸ் ரியாலிட்டியைத் தேர்ந்தெடுத்ததற்கு மிக்க நன்றி! உங்கள் நாள் சிறப்பாக அமையட்டும். வணக்கம்!"
            else:
                reply = "Thank you for choosing DreamSpace Properties! We look forward to your visit. Have a wonderful day. Goodbye!"
            return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

        # Contact Details & Booking Confirmation Workflow
        is_affirmative = any(w in low for w in [
            "yes", "yeah", "yep", "sure", "correct", "that's correct", "thats correct", "that is correct",
            "right", "exact", "exactly", "haan", "sahi", "sahi hai", "theek",
            "avunu", "haudu", "sare", "sari", "aamaam", "confirm", "ok", "okay"
        ])
        is_negative = any(w in low for w in [
            "no", "nope", "wrong", "incorrect", "change", "nahi", "nahin", "kaadu", "illa", "illai"
        ])

        new_email_info = extract_email_and_spelling(message)
        new_phone_match = re.search(r'(\+91[\s-]?)?[6-9]\d{9}', message) or re.search(r'\b[6-9](?:\s*\d){9}\b', message)

        slot = updated.get("visit_slot") or "Saturday 11:00 AM"
        pname = updated.get("property_name") or (rag_properties[0].name if rag_properties else "Prestige Willow Park")

        if updated.get("booking_ready") or updated.get("visit_interest") in ["Requested", "Interested"]:
            # 1. Customer provides a new phone number
            if new_phone_match and (not updated.get("phone_confirmed") or "number is" in low or "phone is" in low):
                clean_d = re.sub(r'\D', '', new_phone_match.group(0))
                if len(clean_d) == 12 and clean_d.startswith("91"):
                    clean_d = clean_d[2:]
                if len(clean_d) == 10:
                    formatted_p = "+91 " + clean_d
                    updated["unconfirmed_phone"] = formatted_p
                    updated["customer_phone"] = formatted_p
                    updated["conv_state"] = "CONFIRM_PHONE"
                    digits_spaced = " ".join(list(clean_d))
                    if is_telugu:
                        reply = f"ధన్యవాదాలు! నేను మీ ఫోన్ నంబర్‌ను {digits_spaced} ({clean_d}) గా నమోదు చేసుకున్నాను. ఇది సరైనదేనా? దయచేసి నిర్ధారించండి లేదా ఇంకేమైనా సహాయం చేయగలనా?"
                    elif is_kannada:
                        reply = f"ಧನ್ಯವಾದಗಳು! ನಾನು ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು {digits_spaced} ({clean_d}) ಎಂದು ದಾಖಲಿಸಿಕೊಂಡಿದ್ದೇನೆ. ಇದು ಸರಿಯೇ? ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ ಅಥವಾ ಬೇರೇನಾದರೂ ಸಹಾಯ ಬೇಕೇ?"
                    elif is_hindi:
                        reply = f"धन्यवाद! मैंने आपका फ़ोन नंबर {digits_spaced} ({clean_d}) दर्ज किया है। क्या यह सही है? कृपया कन्फर्म करें या क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूँ?"
                    elif is_tamil:
                        reply = f"நன்றி! உங்கள் தொலைபேசி எண் {digits_spaced} ({clean_d}) என பதிவாகியுள்ளது. ఇది சரியானதா? தயவுசெய்து உறுதிப்படுத்தவும் அல்லது வேறு ஏதேனும் உதவி வேண்டுமா?"
                    else:
                        reply = f"Thank you! I have noted your phone number as {digits_spaced} ({clean_d}). Is that correct? Please confirm, or is there anything else I can help you with?"
                    return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 2. Customer confirms phone number
            if (state == "CONFIRM_PHONE" or (updated.get("unconfirmed_phone") and not updated.get("phone_confirmed"))) and is_affirmative and not is_negative:
                updated["phone_confirmed"] = True
                updated["customer_phone"] = updated.get("unconfirmed_phone") or updated.get("customer_phone")
                if new_email_info:
                    em_val, em_spell = new_email_info
                    updated["unconfirmed_email"] = em_val
                    updated["email_spelling"] = em_spell
                    updated["conv_state"] = "CONFIRM_EMAIL"
                    if is_telugu:
                        reply = f"మీ ఫోన్ నంబర్ కన్ఫర్మ్ అయింది! మీ ఇమెయిల్ స్పెల్లింగ్: {em_spell} ({em_val}). ఇది సరైనదేనా?"
                    elif is_kannada:
                        reply = f"ಫೋನ್ ಸಂಖ್ಯೆ ಖಚಿತವಾಗಿದೆ! ನಿಮ್ಮ ಇಮೇಲ್ ಸ್ಪೆಲ್ಲಿಂಗ್: {em_spell} ({em_val}). ಇದು ಸರಿಯೇ?"
                    elif is_hindi:
                        reply = f"फ़ोन नंबर कन्फर्म हो गया! आपके ईमेल की स्पेलिंग: {em_spell} ({em_val})। क्या यह सही है?"
                    elif is_tamil:
                        reply = f"தொலைபேசி எண் உறுதியானது! உங்கள் மின்னஞ்சல்: {em_spell} ({em_val}). இது சரியானதா?"
                    else:
                        reply = f"Phone number confirmed! Let me verify your email address spelling: {em_spell} ({em_val}). Did I get that right?"
                    return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}
                else:
                    updated["conv_state"] = "COLLECT_EMAIL"
                    if is_telugu:
                        reply = "మీ ఫోన్ నంబర్ కన్ఫర్మ్ చేసినందుకు ధన్యవాదాలు! మీ విజిట్ వివరాలు మరియు బ్రోచర్ పంపడానికి దయచేసి మీ ఇమెయిల్ అడ్రస్ చెప్పగలరా? కావాలంటే అక్షరం వారీగా చెప్పవచ్చు."
                    elif is_kannada:
                        reply = "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ಖಚಿತಪಡಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! ಭೇಟಿ ದೃಢೀಕರಣ ಮತ್ತು ಬ್ರೋಷರ್ ಕಳುಹಿಸಲು ದಯವಿಟ್ಟು ನಿಮ್ಮ ಇಮೇಲ್ ವಿಳಾಸ ತಿಳಿಸುವಿರಾ? ಅಕ್ಷರಶಃ ಕೂಡ ಹೇಳಬಹುದು."
                    elif is_hindi:
                        reply = "फ़ोन नंबर कन्फर्म करने के लिए धन्यवाद! बुकिंग कन्फर्मेशन और ब्रोशर भेजने के लिए कृपया अपना ईमेल एड्रेस बताएं। आप स्पेलिंग भी बोल सकते हैं।"
                    elif is_tamil:
                        reply = "தொலைபேசி எண் உறுதிப்படுத்தியதற்கு நன்றி! பார்வை உறுதிப்படுத்தல் மற்றும் புரோஷர் அனுப்ப உங்கள் மின்னஞ்சல் முகவரியைத் தெரிவிக்கவும்."
                    else:
                        reply = "Thank you for confirming your phone number! Could you please share your email address so we can send the visit confirmation and property brochure? Feel free to spell it letter by letter if needed."
                    return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 3. Customer provides an email address (standard or spelled out)
            if new_email_info and (not updated.get("email_confirmed") or "email is" in low or "@" in low or "dot" in low):
                em_val, em_spell = new_email_info
                updated["unconfirmed_email"] = em_val
                updated["email_spelling"] = em_spell
                updated["conv_state"] = "CONFIRM_EMAIL"
                if is_telugu:
                    reply = f"ధన్యవాదాలు! మీ ఇమెయిల్ స్పెల్లింగ్: {em_spell} ({em_val}). ఇది సరైనదేనా?"
                elif is_kannada:
                    reply = f"ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಇಮೇಲ್ ಸ್ಪೆಲ್ಲಿಂಗ್: {em_spell} ({em_val}). ಇದು ಸರಿಯೇ?"
                elif is_hindi:
                    reply = f"धन्यवाद! आपके ईमेल की स्पेलिंग: {em_spell} ({em_val})। क्या यह सही है?"
                elif is_tamil:
                    reply = f"நன்றி! உங்கள் மின்னஞ்சல்: {em_spell} ({em_val}). இது சரியானதா?"
                else:
                    reply = f"Thank you! Let me confirm your email address spelling: {em_spell} ({em_val}). Is that correct?"
                return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 4. Customer confirms email address
            if (state == "CONFIRM_EMAIL" or (updated.get("unconfirmed_email") and not updated.get("email_confirmed"))) and is_affirmative and not is_negative:
                updated["email_confirmed"] = True
                updated["customer_email"] = updated.get("unconfirmed_email") or updated.get("customer_email")
                updated["conv_state"] = "BOOKED"
                updated["booking_ready"] = True

                from app.config import settings
                smtp_active = bool(settings.SMTP_USER and settings.SMTP_PASSWORD and settings.SMTP_USER != "your_email@gmail.com")

                if is_telugu:
                    reply = f"చాలా ధన్యవాదాలు! {pname} కొరకు {slot}న మీ విజిట్ మరియు ఇమెయిల్ {updated['customer_email']} కన్ఫర్మ్ అయ్యాయి. నేను మీకు ఇంకేమైనా సహాయం చేయగలనా?"
                elif is_kannada:
                    reply = f"ತುಂಬಾ ಧನ್ಯವಾದಗಳು! {slot}ಗೆ {pname} ಭೇಟಿ ಮತ್ತು ಇಮೇಲ್ {updated['customer_email']} ಖಚಿತವಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಮಾಡಬೇಕೇ?"
                elif is_hindi:
                    reply = f"बहुत धन्यवाद! {pname} के लिए {slot} की आपकी विजिट और ईमेल {updated['customer_email']} कन्फर्म हो गए हैं। क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूँ?"
                elif is_tamil:
                    reply = f"நன்றி! {pname} பார்வை {slot} உறுதிப்படுத்தப்பட்டு புரோஷர் {updated['customer_email']} க்கு அனுப்பப்படுகிறது. நான் உங்களுக்கு வேறு ஏதேனும் உதவி செய்ய வேண்டுமா?"
                else:
                    if smtp_active:
                        reply = f"Thank you! Your email {updated['customer_email']} is confirmed. Your visit to {pname} on {slot} has been officially booked, and your property brochure has been sent to your inbox. Is there anything else I can help you with?"
                    else:
                        reply = f"Thank you! Your email {updated['customer_email']} is confirmed. Your visit to {pname} on {slot} has been booked and registered, and our concierge will connect with you directly. Is there anything else I can help you with?"
                return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 5. Customer attempted to provide email, but it was unclear
            if state == "COLLECT_EMAIL" and not new_email_info and not is_closing and not is_question:
                if is_telugu:
                    reply = "ఇమెయిల్ అడ్రస్ స్పష్టంగా అర్థం కాలేదు. దయచేసి gmail dot com తో సహా అక్షరం వారీగా స్పెల్లింగ్ చెప్పగలరా?"
                elif is_kannada:
                    reply = "ಇಮೇಲ್ ವಿಳಾಸ ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು gmail dot com ನೊಂದಿಗೆ ಅಕ್ಷರಶಃ ಸ್ಪೆಲ್ ಮಾಡುವಿರಾ?"
                elif is_hindi:
                    reply = "मुझे ईमेल एड्रेस सही से समझ नहीं आया। कृपया gmail dot com के साथ अक्षर-दर-अक्षर स्पेलिंग बताएं।"
                elif is_tamil:
                    reply = "மின்னஞ்சல் முகவரி தெளிவாக இல்லை. தயவுசெய்து எழுத்து வாரியாகக் கூறவும்."
                else:
                    reply = "I didn't quite catch the complete email address. Could you please spell it letter by letter, including the domain like gmail dot com?"
                return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 6. Customer hasn't provided phone number yet
            if not updated.get("customer_phone") and not updated.get("unconfirmed_phone"):
                updated["conv_state"] = "COLLECT_PHONE"
                if is_telugu:
                    reply = f"{pname} కొరకు {slot}న మీ విజిట్ షెడ్యూల్ అయింది! కన్ఫర్మేషన్ వివరాలు పంపడానికి మీ మొబైల్ నంబర్ తెలియజేస్తారా?"
                elif is_kannada:
                    reply = f"{slot}ಗೆ {pname} ಭೇಟಿ ನಿಗದಿಯಾಗಿದೆ! ದೃಢೀಕರಣ వివరాలను కಳುಹಿಸಲು ನಿಮ್ಮ మొబైಲ್ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸುವಿರಾ?"
                elif is_hindi:
                    reply = f"{pname} के लिए {slot} की आपकी विजिट तय हो गई है! कन्फर्मेशन भेजने के लिए क्या मुझे आपका मोबाइल नंबर मिल सकता है?"
                elif is_tamil:
                    reply = f"{pname} பார்க்க {slot} பதிவு செய்யப்பட்டுள்ளது! உறுதிப்படுத்தல் அனுப்ப உங்கள் మొబైల్ எண்ணைத் தெரிவிப்பீர்களா?"
                else:
                    reply = f"Your visit to {pname} on {slot} is scheduled! May I have your phone number to send the confirmation details?"
                return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

            # 7. Post-booking question answering
            if updated.get("conv_state") in ["BOOKED", "CLOSING"] or updated.get("phone_confirmed") or updated.get("booking_ready"):
                if is_question:
                    if "pool" in low or "clubhouse" in low:
                        reply = f"Yes, {pname} features a swimming pool, clubhouse, and premium amenities. Since your visit is scheduled for {slot}, you can tour them in person! Is there anything else I can help you with?"
                    else:
                        reply = f"Certainly! {pname} in {updated.get('location', 'Bangalore')} offers premium specifications and ready-to-move convenience. Is there anything else I can help you with?"
                else:
                    reply = f"Your visit to {pname} on {slot} is registered! Is there anything else I can help you with?"
                return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

        # Direct Automatic Property Recommendation when criteria are collected
        if rag_properties and (updated.get("location") and (updated.get("bhk") or updated.get("budget"))):
            updated["conv_state"] = "RECOMMEND"
            p1 = rag_properties[0]
            p1_price = format_inr(p1.price)

            if is_exact:
                p2 = rag_properties[1] if len(rag_properties) > 1 else None
                p2_info = f", and {p2.name} at {format_inr(p2.price)}" if p2 else ""
                p2_info_te = f", మరియు {p2.name} {format_inr(p2.price)}కి" if p2 else ""
                p2_info_kn = f" ಮತ್ತು {p2.name} {format_inr(p2.price)}ಗೆ" if p2 else ""
                p2_info_hi = f" और {p2.name} {format_inr(p2.price)} में" if p2 else ""

                if is_telugu:
                    reply = f"మీ అవసరాలకు తగినట్లుగా, {p1.location}లో {p1.name} {p1.bhk} BHK ప్రాపర్టీ {p1_price}కి{p2_info_te} అందుబాటులో ఉన్నాయి. మీరు సైట్ విజిట్ షెడ్యూల్ చేయాలనుకుంటున్నారా?"
                elif is_kannada:
                    reply = f"ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕಂತೆ, {p1.location}ನಲ್ಲಿ {p1.name} {p1.bhk} BHK ಪ್ರಾಪರ್ಟಿ {p1_price}ಗೆ{p2_info_kn} ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆಯಾಗಿದೆ. ನೀವು ಸೈಟ್ ಭೇಟಿ ನೀಡಲು ಬಯಸುತ್ತೀರಾ?"
                elif is_hindi:
                    reply = f"आपकी पसंद के अनुसार, {p1.location} में {p1.name} {p1.bhk} BHK प्रॉपर्टी {p1_price} में{p2_info_hi} उपलब्ध है। क्या आप साइट विजिट करना चाहेंगे?"
                else:
                    reply = f"Based on your requirements, I recommend {p1.name} in {p1.location} offering {p1.bhk} BHK at {p1_price}{p2_info}. Would you like to schedule a site visit?"
            else:
                loc = updated.get("location", "Bangalore")
                bhk = updated.get("bhk", "specified")
                b_str = updated.get("budget", "")
                if is_telugu:
                    reply = f"ప్రస్తుతం {loc}లో {b_str} బడ్జెట్‌లో సరిగ్గా సరిపోయే {bhk} BHK ప్రాపర్టీ లేదు. అయితే {p1.location}లో {p1.name} {p1_price}కి అందుబాటులో ఉంది. ప్రత్యామ్నాయ ఆప్షన్లను చూడమంటారా?"
                elif is_kannada:
                    reply = f"ಪ್ರಸ್ತುತ {loc}ನಲ್ಲಿ {b_str} ಬಜೆಟ್‌ಗೆ {bhk} BHK ಪ್ರಾಪರ್ಟಿ ಲಭ್ಯವಿಲ್ಲ. ಆದರೆ {p1.location}ನಲ್ಲಿ {p1.name} {p1_price}ಗೆ ಲಭ್ಯವಿದೆ. ಪರ್ಯಾಯ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?"
                elif is_hindi:
                    reply = f"वर्तमान में {loc} में आपके {b_str} बजट में कोई प्रॉपर्टी उपलब्ध नहीं है। हालांकि {p1.location} में {p1.name} {p1_price} में उपलब्ध है। क्या आप अन्य विकल्प देखना चाहेंगे?"
                else:
                    reply = f"We currently do not have a {bhk} BHK in {loc} within {b_str}. However, I found {p1.name} in {p1.location} at {p1_price}. Would you like me to explore nearby alternatives?"

            return {"reply": reply, "extracted_profile": updated, "detected_language": detected_lang}

        # Step-by-step smart question asking (Avoids asking for already-known info)
        cust_name = updated.get("customer_name")
        name_is_known = bool(cust_name and cust_name not in ["Prospective Buyer", "Valued Buyer", "", "None"])

        if not name_is_known:
            if is_telugu:
                reply = "నమస్కారం! డ్రీమ్‌స్పేస్ రియల్టీకి స్వాగతం. మీ పేరు తెలుసుకోవచ్చా?"
            elif is_kannada:
                reply = "ನಮಸ್ಕಾರ! ಡ್ರೀಮ್‌ಸ್ಪೇಸ್ ರಿಯಾಲ್ಟಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಹೆಸರೇನು ದಯವಿಟ್ಟು ತಿಳಿಸುವಿರಾ?"
            elif is_hindi:
                reply = "नमस्ते! ड्रीमस्पेस रियल्टी में आपका स्वागत है। क्या मैं आपका नाम जान सकती हूँ?"
            elif is_tamil:
                reply = "வணக்கம்! ட்ரீம்ஸ்பேஸ் ரியாலிட்டிக்கு வரவேற்கிறோம். உங்கள் பெயரைத் தெரிந்து கொள்ளலாமா?"
            else:
                reply = "Namaskara! Welcome to DreamSpace Properties. May I know your name?"
            updated["conv_state"] = "GREET"

        elif not updated.get("location"):
            if is_telugu:
                reply = f"ధన్యవాదాలు {cust_name} గారు! బెంగళూరులో ఏ ప్రాంతంలో ఇల్లు చూస్తున్నారు? వైట్‌ఫీల్డ్, ఎలక్ట్రానిక్ సిటీ, సర్జాపూర్, హెబ్బాల్ లేదా యలహంక?"
            elif is_kannada:
                reply = f"ಧನ್ಯವಾದಗಳು {cust_name} ಅವರೇ! ಬೆಂಗಳೂರಿನ ಯಾವ ಭಾಗದಲ್ಲಿ ಮನೆ ಬೇಕು? ವೈಟ್‌ಫೀಲ್ಡ್, ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ, ಸರ್ಜಾಪುರ ಅಥವಾ ಹೆಬ್ಬಾಳ?"
            elif is_hindi:
                reply = f"धन्यवाद {cust_name} जी! आप बैंगलोर के किस क्षेत्र में घर देख रहे हैं - Whitefield, Electronic City, Sarjapur या Hebbal?"
            elif is_tamil:
                reply = f"நன்றி {cust_name}! பெங்களூரில் எந்த பகுதியில் வீடு பார்க்கிறீர்கள்? Whitefield, Electronic City, Sarjapur, Hebbal அல்லது Yelahanka?"
            else:
                reply = f"Thank you {cust_name}! Which location in Bangalore are you looking to buy a home in? We have properties in Whitefield, Electronic City, Sarjapur, Hebbal, and Yelahanka."
            updated["conv_state"] = "LOCATION"

        elif not updated.get("bhk") and not updated.get("budget"):
            if is_telugu:
                reply = f"చాలా మంచిది {cust_name} గారు! మీకు ఎన్ని BHK ఇల్లు కావాలి, మరియు మీ అంచనా బడ్జెట్ ఎంత?"
            elif is_kannada:
                reply = f"ಉತ್ತಮ {cust_name} ಅವರೇ! ನೀವು ಎಷ್ಟು BHK ಮನೆ ಹುಡುಕುತ್ತಿದ್ದೀರಿ, ಮತ್ತು ನಿಮ್ಮ ಅಂದಾಜು ಬಜೆಟ್ ಎಷ್ಟು?"
            elif is_hindi:
                reply = f"बहुत अच्छा {cust_name} जी! आपको कितने BHK का घर चाहिए और आपका अनुमानित बजट कितना है?"
            else:
                reply = f"Great {cust_name}! How many BHK are you looking for, and what is your approximate budget?"
            updated["conv_state"] = "CONFIG"

        elif not updated.get("bhk"):
            if is_telugu:
                reply = "మీకు ఎన్ని BHK ఇల్లు కావాలి? మరియు అపార్ట్‌మెంట్ లేదా విల్లా ఇష్టపడతారా?"
            elif is_kannada:
                reply = "ನೀವು ಎಷ್ಟು BHK ಮನೆ ಹುಡುಕುತ್ತಿದ್ದೀರಿ? ಮತ್ತು ಅಪಾರ್ಟ್‌ಮೆಂಟ್ ಅಥವಾ ವಿಲ್ಲಾ ಬೇಕಾ?"
            elif is_hindi:
                reply = "कितने BHK का घर देख रहे हैं? और Apartment चाहिए या Villa?"
            else:
                reply = "How many BHK are you looking for? And do you prefer an Apartment, Villa, or Penthouse?"
            updated["conv_state"] = "CONFIG"

        elif not updated.get("budget"):
            if is_telugu:
                reply = "మీ అంచనా బడ్జెట్ ఎంత? (లక్షలు లేదా కోట్లలో చెప్పండి)"
            elif is_kannada:
                reply = "ನಿಮ್ಮ ಅಂದಾಜು ಬಜೆಟ್ ಎಷ್ಟು? (ಲಕ್ಷ ಅಥವಾ ಕೋಟಿಯಲ್ಲಿ ತಿಳಿಸಿ)"
            elif is_hindi:
                reply = "आपका अनुमानित बजट कितना है? (लाख या करोड़ में बताइए)"
            else:
                reply = "What is your approximate budget? Please tell me in Lakhs or Crores."
            updated["conv_state"] = "BUDGET"

        else:
            if is_telugu:
                reply = "నేను మీకు ఇంకేమైనా సహాయం చేయగలనా?"
            elif is_kannada:
                reply = "ನಾನು ನಿಮಗೆ ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಮಾಡಬೇಕೇ?"
            elif is_hindi:
                reply = "क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूँ?"
            else:
                reply = "Is there anything else I can help you with?"
            updated["conv_state"] = "BOOKED"

        return {
            "reply": reply,
            "extracted_profile": updated,
            "detected_language": detected_lang
        }


gemini_sales_service = GeminiSalesService()
