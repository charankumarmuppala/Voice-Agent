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

def test_voice_status(client):
    res = client.get("/api/voice/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "English" in data["supported_languages"]
    assert "Kannada" in data["supported_languages"]
    assert "Hindi" in data["supported_languages"]

def test_voice_start_and_greeting_multilingual(client):
    # Test English
    res_en = client.post("/api/voice/start", json={"language": "English", "customer_name": "Kiran Rao"})
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["session_id"].startswith("CALL-")
    assert "DreamSpace Properties" in data_en["greeting"]

    # Test Kannada
    res_kn = client.post("/api/voice/start", json={"language": "Kannada"})
    assert res_kn.status_code == 200
    assert "ನಮಸ್ಕಾರ" in res_kn.json()["greeting"]

    # Test Hindi
    res_hi = client.post("/api/voice/start", json={"language": "Hindi"})
    assert res_hi.status_code == 200
    assert "नमस्ते" in res_hi.json()["greeting"]

def test_voice_message_flow(client):
    # 1. Start voice session
    start_res = client.post("/api/voice/start", json={"language": "English", "customer_name": "Ananya Desai"})
    session_id = start_res.json()["session_id"]

    # 2. Send customer message with preferences
    msg_res = client.post(f"/api/voice/{session_id}/message", json={
        "message": "I'm looking for a 3 BHK in Whitefield with a budget of 1.5 Cr."
    })
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["session_id"] == session_id
    assert "reply" in msg_data
    assert len(msg_data["reply"]) > 0

    # Verify extracted profile updates
    profile = msg_data["extracted_profile"]
    assert profile.get("location") == "Whitefield"
    assert len(msg_data["recommended_properties"]) > 0

    # 3. Also test the body-based endpoint /api/voice/message
    body_msg_res = client.post("/api/voice/message", json={
        "session_id": session_id,
        "message": "Can I schedule a visit to Prestige Willow Park this Saturday?"
    })
    assert body_msg_res.status_code == 200
    body_data = body_msg_res.json()
    assert body_data["extracted_profile"]["visit_interest"] in ["Requested", "Interested"]

    # 4. End the voice session
    end_res = client.post(f"/api/voice/{session_id}/end", json={"notes": "Customer interested in Saturday tour"})
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["session_id"] == session_id
    assert "summary" in end_data
    assert end_data["outcome"] in ["Visit Scheduled", "Information Provided", "Qualified Buyer", "Follow-up Needed"]

    # 5. Fetch history
    history_res = client.get(f"/api/voice/history/{session_id}")
    assert history_res.status_code == 200
    hist_data = history_res.json()
    assert hist_data["session_id"] == session_id
    assert len(hist_data["messages"]) >= 3  # Initial greeting + 2 exchanges
