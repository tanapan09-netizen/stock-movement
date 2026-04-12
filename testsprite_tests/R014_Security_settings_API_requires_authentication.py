import requests

def test_security_settings_requires_authentication():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/settings/security"
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    # Optionally, verify response body contains expected Unauthorized info if defined
    # But as per test plan, only status code is mandatory

test_security_settings_requires_authentication()