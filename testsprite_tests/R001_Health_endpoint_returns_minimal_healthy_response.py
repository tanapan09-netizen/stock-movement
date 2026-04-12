import requests

def test_health_endpoint_returns_minimal_healthy_response():
    url = "http://localhost:3002/api/health"
    try:
        response = requests.get(url, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        json_data = response.json()
        assert "status" in json_data, "Response JSON missing 'status' field"
        assert "timestamp" in json_data, "Response JSON missing 'timestamp' field"
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

test_health_endpoint_returns_minimal_healthy_response()