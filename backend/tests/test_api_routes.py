from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_system_status():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "api_key_configured" in data["data"]

def test_get_records():
    response = client.get("/api/feedback/records?dataset_id=sample-saas")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] > 0
    assert len(data["data"]["records"]) > 0

def test_get_analytics():
    response = client.get("/api/feedback/analytics?dataset_id=sample-saas")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total_records"] > 0

def test_export_excel():
    response = client.get("/api/feedback/export/excel?dataset_id=sample-saas")
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert len(response.content) > 1000
