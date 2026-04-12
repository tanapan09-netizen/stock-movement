import requests

BASE_URL = "http://localhost:3002"
TIMEOUT = 30

def test_security_settings_update_enforces_csrf():
    url = f"{BASE_URL}/api/settings/security"
    headers = {
        "Content-Type": "application/json"
    }
    # No CSRF header and no csrf-token cookie sent

    try:
        response = requests.post(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 403, f"Expected status code 403 but got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # The error message should indicate invalid or missing CSRF token
    error_message = json_data.get("error") or json_data.get("message") or ""
    assert "csrf" in error_message.lower() or "csrf token" in error_message.lower() or "invalid or missing csrf token" in error_message.lower(), \
        f"Unexpected error message: {error_message}"

test_security_settings_update_enforces_csrf()