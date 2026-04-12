import requests

def test_email_send_api_enforces_csrf():
    url = "http://localhost:3002/api/email"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {}  # Assuming empty body is allowed as we just want to test CSRF enforcement

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 403, f"Expected 403 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    error_message = data.get("error") or data.get("message") or ""
    assert "csrf" in error_message.lower(), f"Expected error message about CSRF token but got: {error_message}"

test_email_send_api_enforces_csrf()