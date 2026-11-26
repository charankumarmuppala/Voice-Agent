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

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "version" in data

def test_get_properties_default(client):
    response = client.get("/api/properties")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 30
    assert len(data["properties"]) == 30
    first = data["properties"][0]
    assert "property_id" in first
    assert "name" in first
    assert "location" in first
    assert "price" in first
    assert "bhk" in first
    assert "amenities" in first

def test_filter_properties_by_location(client):
    response = client.get("/api/properties?location=Whitefield")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for p in data["properties"]:
        assert "Whitefield" in p["location"]

def test_filter_properties_by_bhk(client):
    response = client.get("/api/properties?bhk=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for p in data["properties"]:
        assert p["bhk"] == 3

def test_filter_properties_by_budget(client):
    min_p = 10000000.0
    max_p = 20000000.0
    response = client.get(f"/api/properties?min_price={min_p}&max_price={max_p}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for p in data["properties"]:
        assert min_p <= p["price"] <= max_p

def test_filter_properties_search(client):
    response = client.get("/api/properties?search=Prestige")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for p in data["properties"]:
        assert "prestige" in p["name"].lower() or "prestige" in p["description"].lower()

def test_get_property_by_id(client):
    # Fetch first property
    response = client.get("/api/properties")
    first_id = response.json()["properties"][0]["id"]
    
    res = client.get(f"/api/properties/{first_id}")
    assert res.status_code == 200
    assert res.json()["id"] == first_id

def test_get_property_by_property_id_code(client):
    res = client.get("/api/properties/PROP-BLR-001")
    assert res.status_code == 200
    assert res.json()["property_id"] == "PROP-BLR-001"
    assert res.json()["location"] == "Whitefield"

def test_get_property_not_found(client):
    res = client.get("/api/properties/NON-EXISTENT-ID-999")
    assert res.status_code == 404

def test_get_property_stats(client):
    response = client.get("/api/properties/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_properties"] == 30
    assert data["avg_price"] > 0
    assert data["min_price"] > 0
    assert data["max_price"] >= data["min_price"]
    assert len(data["location_distribution"]) >= 5
    assert len(data["bhk_distribution"]) >= 3
    assert data["ready_to_move_count"] > 0
