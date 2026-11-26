import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import Base, engine, SessionLocal
from app.models import Appointment, Lead, CallSession

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()

@pytest.fixture
def client():
    return TestClient(app)

def test_full_appointment_booking_workflow(client):
    # 1. Start voice session
    start_res = client.post("/api/calls/start", json={
        "language": "English",
        "customer_name": "Arun Kumar",
        "customer_phone": "+91 98451 99887"
    })
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]
    assert "May I know your name" in start_res.json()["greeting"] or "Which area" in start_res.json()["greeting"]

    # 2. Location preference
    msg1 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My name is Arun Kumar, looking for properties in Whitefield."
    })
    assert msg1.status_code == 200
    p1 = msg1.json()["extracted_profile"]
    assert p1.get("location") == "Whitefield"

    # 3. Budget & BHK
    msg2 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My budget is around 1.5 Cr for a 3 BHK apartment."
    })
    assert msg2.status_code == 200
    p2 = msg2.json()["extracted_profile"]
    assert p2.get("bhk") == 3
    assert len(msg2.json()["recommended_properties"]) > 0

    # 4. Schedule visit
    msg3 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Yes, I would like to schedule a visit to Prestige Willow Park this Saturday at 11 AM. My number is +91 98451 99887."
    })
    assert msg3.status_code == 200
    p3 = msg3.json()["extracted_profile"]
    assert p3.get("visit_interest") in ["Requested", "Interested"]

    # 5. End call and verify appointment creation
    end_res = client.post(f"/api/calls/{session_id}/end", json={"notes": "Saturday morning walkthrough"})
    assert end_res.status_code == 200

    # 6. Verify appointment appears in GET /api/appointments
    appts_res = client.get("/api/appointments")
    assert appts_res.status_code == 200
    appts = appts_res.json()
    assert len(appts) > 0
    created_appt = next((a for a in appts if a["customer_phone"] == "+91 98451 99887"), None)
    assert created_appt is not None
    assert created_appt["appointment_id"].startswith("APT-")
    assert created_appt["status"] == "Confirmed"
    assert created_appt["customer_name"] == "Arun Kumar"

    # 7. Verify lead appears in GET /api/leads with status Visit Scheduled
    leads_res = client.get("/api/leads")
    assert leads_res.status_code == 200
    leads = leads_res.json()
    created_lead = next((l for l in leads if l["phone"] == "+91 98451 99887"), None)
    assert created_lead is not None
    assert created_lead["status"] == "Visit Scheduled"
    assert created_lead["name"] == "Arun Kumar"

def test_manual_appointment_creation_api(client):
    payload = {
        "customer_name": "Priyanka Sen",
        "customer_phone": "+91 99001 22334",
        "property_name": "Godrej Royale Woods",
        "location": "Electronic City",
        "date_time": "2026-12-05T15:00:00",
        "notes": "Interested in 2 BHK high floor"
    }
    res = client.post("/api/appointments", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["appointment_id"].startswith("APT-")
    assert data["customer_name"] == "Priyanka Sen"
    assert data["status"] == "Confirmed"

    # Test duplicate prevention: booking same slot returns existing without duplicate
    res_dup = client.post("/api/appointments", json=payload)
    assert res_dup.status_code in [200, 201]
    assert res_dup.json()["appointment_id"] == data["appointment_id"]

def test_continuation_phone_collection_and_natural_ending(client):
    # 1. Start call without phone number
    start_res = client.post("/api/calls/start", json={
        "language": "English",
        "customer_name": "Kavita Rao"
    })
    assert start_res.status_code == 200
    session_id = start_res.json()["session_id"]

    # 2. Book a visit without providing phone number
    msg1 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "I would like to schedule a visit to Prestige Willow Park this Saturday at 11 AM."
    })
    assert msg1.status_code == 200
    res1 = msg1.json()
    assert res1["appointment_id"] is not None
    assert res1["call_ended"] is False
    # Agent asks for phone number since it wasn't collected yet
    assert "phone number" in res1["reply"].lower() or "contact" in res1["reply"].lower()

    # Verify 1 appointment exists in database for this session
    appts1 = client.get("/api/appointments").json()
    matched1 = [a for a in appts1 if a.get("notes") and session_id in a["notes"]]
    assert len(matched1) == 1
    apt_id = matched1[0]["appointment_id"]

    # 3. Customer provides phone number -> Agent reads back and requests confirmation
    msg2 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My phone number is 9876543210."
    })
    assert msg2.status_code == 200
    res2 = msg2.json()
    assert res2["call_ended"] is False
    assert "9 8 7 6 5 4 3 2 1 0" in res2["reply"] or "correct" in res2["reply"].lower()

    # 3b. Customer confirms phone number -> Agent requests email
    msg2b = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Yes, that is correct."
    })
    assert msg2b.status_code == 200
    res2b = msg2b.json()
    assert "email" in res2b["reply"].lower()

    # 3c. Customer provides email -> Agent reads back spelling and requests confirmation
    msg2c = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My email is kavita.rao@gmail.com"
    })
    assert msg2c.status_code == 200
    res2c = msg2c.json()
    assert "kavita" in res2c["reply"].lower() and ("spelling" in res2c["reply"].lower() or "dot" in res2c["reply"].lower())

    # 3d. Customer confirms email -> Booking is officially confirmed, brochure sent, asks "Is there anything else I can help you with?"
    msg2d = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Yes, that is my correct email."
    })
    assert msg2d.status_code == 200
    res2d = msg2d.json()
    assert "anything else" in res2d["reply"].lower()

    # Verify existing appointment was updated with confirmed phone and email, no duplicate created
    appts2 = client.get("/api/appointments").json()
    matched2 = [a for a in appts2 if a["appointment_id"] == apt_id]
    assert len(matched2) == 1
    assert "9876543210" in matched2[0]["customer_phone"]
    assert matched2[0]["customer_email"] == "kavita.rao@gmail.com"
    assert bool(matched2[0]["phone_confirmed"]) is True
    assert bool(matched2[0]["email_confirmed"]) is True

    # 4. Customer asks a further question about amenities
    msg3 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "What amenities does it have? Is there a swimming pool?"
    })
    assert msg3.status_code == 200
    res3 = msg3.json()
    assert res3["call_ended"] is False
    # Agent answers question naturally without re-announcing booking
    assert "swimming pool" in res3["reply"].lower() or "clubhouse" in res3["reply"].lower()
    assert "anything else" in res3["reply"].lower()

    # 5. Customer says no / goodbye
    msg4 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "No, nothing else. Thank you so much!"
    })
    assert msg4.status_code == 200
    res4 = msg4.json()
    # Call is marked ended, polite thank you is given
    assert res4["call_ended"] is True
    assert "thank you" in res4["reply"].lower()

    # 6. End call to save summary
    end_res = client.post(f"/api/calls/{session_id}/end")
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["session_id"] == session_id
    assert end_data["duration_seconds"] >= 10

def test_kannada_and_hindi_conversation_continuation(client):
    # Kannada
    k_start = client.post("/api/calls/start", json={"language": "Kannada", "customer_name": "ಮಂಜುನಾಥ್"})
    k_sid = k_start.json()["session_id"]
    k_msg = client.post(f"/api/calls/{k_sid}/message", json={"message": "ಶನಿವಾರ ಭೇಟಿ ನೀಡಲು ಇಷ್ಟಪಡುತ್ತೇನೆ"})
    assert k_msg.status_code == 200
    assert "ಭೇಟಿ" in k_msg.json()["reply"]

    # Kannada closing
    k_close = client.post(f"/api/calls/{k_sid}/message", json={"message": "ಇಲ್ಲ ಧನ್ಯವಾದಗಳು"})
    assert k_close.status_code == 200
    assert k_close.json()["call_ended"] is True
    assert "ಧನ್ಯವಾದ" in k_close.json()["reply"]

    # Hindi
    h_start = client.post("/api/calls/start", json={"language": "Hindi", "customer_name": "रोहित"})
    h_sid = h_start.json()["session_id"]
    h_msg = client.post(f"/api/calls/{h_sid}/message", json={"message": "शनिवार को साइट विजिट बुक करें"})
    assert h_msg.status_code == 200
    assert "विजिट" in h_msg.json()["reply"]

    # Hindi closing
    h_close = client.post(f"/api/calls/{h_sid}/message", json={"message": "नहीं, शुक्रिया"})
    assert h_close.status_code == 200
    assert h_close.json()["call_ended"] is True
    assert "धन्यवाद" in h_close.json()["reply"] or "शुक्रिया" in h_close.json()["reply"]


def test_spoken_digits_and_email_correction_flow(client):
    start_res = client.post("/api/calls/start", json={
        "language": "English",
        "customer_name": "Rohan Mehta"
    })
    session_id = start_res.json()["session_id"]

    # 1. Ask for properties in Whitefield 3 BHK under 1.8 Cr -> instant RAG recommendation in same turn
    msg1 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Looking for a 3 BHK in Whitefield under 2 Cr."
    })
    res1 = msg1.json()
    assert len(res1["recommended_properties"]) > 0
    # Must speak property details in same turn, not wait or say 'let me check'
    assert "prestige" in res1["reply"].lower() or "whitefield" in res1["reply"].lower()

    # 2. Schedule visit
    msg2 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "I would like to book a visit for Prestige Willow Park this Sunday."
    })
    res2 = msg2.json()
    assert "phone" in res2["reply"].lower() or "number" in res2["reply"].lower()

    # 3. Spoken digit phone number
    msg3 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My number is nine eight seven six five four three two one zero."
    })
    res3 = msg3.json()
    assert "9 8 7 6 5 4 3 2 1 0" in res3["reply"] or "correct" in res3["reply"].lower()

    # 4. Confirm phone
    msg4 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Yes, that is correct."
    })
    res4 = msg4.json()
    assert "email" in res4["reply"].lower()

    # 5. Provide initial email
    msg5 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "My email is rohan at gmail dot com"
    })
    res5 = msg5.json()
    assert "rohan" in res5["reply"].lower()

    # 6. Correct email before saving
    msg6 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Actually no, that's wrong. My email is rohan dot mehta at gmail dot com"
    })
    res6 = msg6.json()
    assert "mehta" in res6["reply"].lower() or "rohan" in res6["reply"].lower()

    # 7. Confirm corrected email
    msg7 = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Yes, that is correct now."
    })
    res7 = msg7.json()
    assert "anything else" in res7["reply"].lower()

    # Verify database has the confirmed corrected details
    appts = client.get("/api/appointments").json()
    matched = [a for a in appts if a.get("notes") and session_id in a["notes"]]
    assert len(matched) == 1
    assert "9876543210" in matched[0]["customer_phone"]
    assert "rohan.mehta@gmail.com" in matched[0]["customer_email"]
    assert bool(matched[0]["phone_confirmed"]) is True
    assert bool(matched[0]["email_confirmed"]) is True
