import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import Base, engine

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()

@pytest.fixture
def client():
    return TestClient(app)

def test_start_call_english(client):
    response = client.post("/api/calls/start", json={
        "language": "English",
        "customer_name": "Rohan Sharma",
        "customer_phone": "+91 98450 11223"
    })
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("CALL-")
    assert "greeting" in data
    assert data["language"] == "English"
    assert "initial_profile" in data

def test_start_call_kannada_and_hindi(client):
    res_kn = client.post("/api/calls/start", json={"language": "Kannada"})
    assert res_kn.status_code == 200
    assert "ನಮಸ್ಕಾರ" in res_kn.json()["greeting"]

    res_hi = client.post("/api/calls/start", json={"language": "Hindi"})
    assert res_hi.status_code == 200
    assert "नमस्ते" in res_hi.json()["greeting"]

def test_start_call_telugu_and_tamil(client):
    res_te = client.post("/api/calls/start", json={"language": "Telugu", "customer_name": "Ravi Teja"})
    assert res_te.status_code == 200
    assert "నమస్కారం" in res_te.json()["greeting"]

    res_ta = client.post("/api/calls/start", json={"language": "Tamil"})
    assert res_ta.status_code == 200
    assert "வணக்கம்" in res_ta.json()["greeting"]

def test_auto_language_detection_and_switching(client):
    # Start in English
    start_res = client.post("/api/calls/start", json={"language": "English"})
    session_id = start_res.json()["session_id"]

    # Customer speaks Telugu / Tenglish
    msg_te = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Naku Whitefield lo 3 BHK flat kavali, budget around 1.5 Cr."
    })
    assert msg_te.status_code == 200
    data_te = msg_te.json()
    assert data_te["detected_language"] == "Telugu"
    # Ensure native Telugu script is returned
    assert any('\u0C00' <= char <= '\u0C7F' for char in data_te["reply"])

    # Customer continues with closing in Telugu
    msg_close = client.post(f"/api/calls/{session_id}/message", json={
        "message": "చాలా ధన్యవాదాలు, సెలవు"
    })
    assert msg_close.status_code == 200
    assert msg_close.json()["call_ended"] is True
    assert any('\u0C00' <= char <= '\u0C7F' for char in msg_close.json()["reply"])

def test_send_call_message_and_extract_profile(client):
    # 1. Start call
    start_res = client.post("/api/calls/start", json={"language": "English"})
    session_id = start_res.json()["session_id"]

    # 2. Send message
    msg_res = client.post(f"/api/calls/{session_id}/message", json={
        "message": "Hi, I am Suresh Kumar. I want a 3 BHK in Whitefield with budget 1.5 Cr."
    })
    assert msg_res.status_code == 200
    data = msg_res.json()
    assert data["session_id"] == session_id
    assert "reply" in data
    assert len(data["reply"]) > 5
    assert "extracted_profile" in data
    profile = data["extracted_profile"]
    assert profile.get("location") == "Whitefield" or "Whitefield" in str(profile)
    assert len(data["recommended_properties"]) > 0

def test_end_call_and_summary(client):
    start_res = client.post("/api/calls/start", json={"language": "English"})
    session_id = start_res.json()["session_id"]

    client.post(f"/api/calls/{session_id}/message", json={
        "message": "Can I visit Prestige Willow Park this Saturday at 11 AM?"
    })

    end_res = client.post(f"/api/calls/{session_id}/end", json={"notes": "Customer interested in tour"})
    assert end_res.status_code == 200
    data = end_res.json()
    assert data["session_id"] == session_id
    assert "summary" in data
    assert "outcome" in data
    assert data["duration_seconds"] >= 0

def test_list_calls_and_get_details(client):
    start_res = client.post("/api/calls/start", json={"language": "English", "customer_name": "Test User"})
    session_id = start_res.json()["session_id"]

    # List
    list_res = client.get("/api/calls")
    assert list_res.status_code == 200
    calls = list_res.json()
    assert len(calls) > 0
    assert any(c["session_id"] == session_id for c in calls)

    # Details
    detail_res = client.get(f"/api/calls/{session_id}")
    assert detail_res.status_code == 200
    details = detail_res.json()
    assert details["session_id"] == session_id
    assert len(details["messages"]) >= 1  # Initial greeting
