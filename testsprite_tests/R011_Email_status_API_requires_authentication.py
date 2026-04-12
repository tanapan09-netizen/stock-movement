import requests

BASE_URL = "http://localhost:3002"
TIMEOUT = 30

def test_email_status_api_requires_authentication():
    url = f"{BASE_URL}/api/email"
    try:
        response = requests.get(url, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    # Optionally check the response content for error message or structure if known
    # e.g. assert "Unauthorized" in response.text or json response error field

test_email_status_api_requires_authentication()