import os
import sys
from dotenv import load_dotenv

load_dotenv("C:/Users/hp/OneDrive/Desktop/voice agent/backend/.env")
sys.path.insert(0, "C:/Users/hp/OneDrive/Desktop/voice agent/backend")

from app.services.gemini_service import detect_language_from_text, gemini_sales_service
from app.database import SessionLocal
from app.models import CallSession, ChatMessage, Property

def test_language_detection():
    print("=== 1. Testing Automatic Language Detection & Mixed Sentences ===")
    test_cases = [
        # Telugu cases
        ("నాకు వైట్‌ఫీల్డ్‌లో 3 BHK ఫ్లాట్ కావాలి", "Telugu"),
        ("Prestige Willow Park lo 3 BHK flat kavali", "Telugu"),
        ("na peru kiran, budget 1.5 crore", "Telugu"),
        ("repu morning 10 AM ki visit kudurthunda?", "Telugu"),
        ("chala dhanyavadalu, alage cheddam", "Telugu"),

        # Hindi cases
        ("मुझे व्हाइटफील्ड में 3 BHK फ्लैट चाहिए", "Hindi"),
        ("Whitefield me 3 BHK flat chahiye mera budget 1.5 crore hai", "Hindi"),
        ("mera naam rahul hai", "Hindi"),
        ("kya hum Saturday ko site visit dekh sakte hain?", "Hindi"),
        ("theek hai bahut shukriya", "Hindi"),

        # Kannada cases
        ("ನನಗೆ ಸರ್ಜಾಪುರದಲ್ಲಿ 2 BHK ಮನೆ ಬೇಕು", "Kannada"),
        ("Sarjapur alli 2 BHK mane beku nanna budget 90 lakhs", "Kannada"),
        ("nanna hesaru suresh", "Kannada"),
        ("Saturday banni nodona", "Kannada"),

        # Tamil cases
        ("எனக்கு ஒயிட்பீல்டில் 3 BHK வீடு வேண்டும்", "Tamil"),
        ("Whitefield la 3 BHK veedu vendum yen budget 1.5 cr", "Tamil"),
        ("yen peyar kumar", "Tamil"),

        # English cases
        ("I am looking for a 3 BHK in Whitefield around 1.5 Cr", "English"),
        ("Can we schedule a visit for Prestige Willow Park this Saturday?", "English"),
        ("My name is Rajesh and my budget is 2 crores", "English"),
        ("Please switch to English", "English")
    ]

    all_passed = True
    for text, expected in test_cases:
        detected = detect_language_from_text(text, "English")
        status = "PASS" if detected == expected else "FAIL"
        if status == "FAIL":
            all_passed = False
        print(f"[{status}] Input: '{text[:50]}...' -> Detected: {detected} (Expected: {expected})")

    assert all_passed, "Some language detection tests failed!"
    print("--> All language detection test cases PASSED!\n")


def test_dynamic_multilingual_conversation_flow():
    print("=== 2. Testing Dynamic Multilingual Conversation Flow with Preserved Context ===")
    db = SessionLocal()
    try:
        # Start in English
        profile = {
            "customer_name": "Prospective Buyer",
            "language": "English",
            "location": None,
            "bhk": None,
            "budget": None,
            "visit_interest": "Unknown"
        }
        history = []

        # Turn 1: Customer introduces themselves in English
        turn1_msg = "Hello, my name is Arvind and I am looking for a flat in Whitefield."
        res1 = gemini_sales_service.generate_sales_response(
            current_message=turn1_msg,
            history=history,
            current_profile=profile,
            language="English",
            db=db,
            session_id="TEST-SESSION-1"
        )
        p1 = res1["extracted_profile"]
        lang1 = res1["detected_language"]
        print(f"Turn 1 (English) -> Lang: {lang1}, Name: {p1.get('customer_name')}, Loc: {p1.get('location')}")
        print(f"Reply: {res1['reply'][:80]}...")
        assert p1.get("customer_name") == "Arvind"
        assert p1.get("location") == "Whitefield"

        history.append({"role": "user", "content": turn1_msg})
        history.append({"role": "model", "content": res1["reply"]})

        # Turn 2: Customer switches to TELUGU mid-call! (Mixed sentence with English terms)
        turn2_msg = "నాకు 3 BHK కావాలి, బడ్జెట్ 1.5 కోట్లు (3 BHK kavali, budget 1.5 crore)"
        res2 = gemini_sales_service.generate_sales_response(
            current_message=turn2_msg,
            history=history,
            current_profile=p1,
            language=lang1,
            db=db,
            session_id="TEST-SESSION-1"
        )
        p2 = res2["extracted_profile"]
        lang2 = res2["detected_language"]
        print(f"\nTurn 2 (Switched to Telugu) -> Lang: {lang2}, Name: {p2.get('customer_name')}, BHK: {p2.get('bhk')}, Budget: {p2.get('budget')}")
        print(f"Reply: {res2['reply']}")
        assert lang2 == "Telugu", f"Expected Telugu but got {lang2}"
        # Crucial check: customer name and location from Turn 1 MUST be preserved!
        assert p2.get("customer_name") == "Arvind", "Customer name lost across language switch!"
        assert p2.get("location") == "Whitefield", "Location lost across language switch!"
        assert p2.get("bhk") == 3, "BHK not extracted!"

        history.append({"role": "user", "content": turn2_msg})
        history.append({"role": "model", "content": res2["reply"]})

        # Turn 3: Customer switches to HINDI mid-call!
        turn3_msg = "क्या हम शनिवार 11 बजे Prestige Willow Park देख सकते हैं? (Saturday 11 AM visit)"
        res3 = gemini_sales_service.generate_sales_response(
            current_message=turn3_msg,
            history=history,
            current_profile=p2,
            language=lang2,
            db=db,
            session_id="TEST-SESSION-1"
        )
        p3 = res3["extracted_profile"]
        lang3 = res3["detected_language"]
        print(f"\nTurn 3 (Switched to Hindi) -> Lang: {lang3}, Name: {p3.get('customer_name')}, Slot: {p3.get('visit_slot')}")
        print(f"Reply: {res3['reply']}")
        assert lang3 == "Hindi", f"Expected Hindi but got {lang3}"
        assert p3.get("customer_name") == "Arvind", "Customer name lost across 2nd language switch!"
        assert p3.get("location") == "Whitefield", "Location lost!"
        assert p3.get("bhk") == 3, "BHK lost!"

        print("\n--> Dynamic Multilingual Conversation Flow test PASSED!")
    finally:
        db.close()


if __name__ == "__main__":
    test_language_detection()
    test_dynamic_multilingual_conversation_flow()
