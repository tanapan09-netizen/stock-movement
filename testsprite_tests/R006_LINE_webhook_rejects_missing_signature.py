import requests

BASE_URL = "http://localhost:3002"

def test_line_webhook_rejects_missing_signature():
    url = f"{BASE_URL}/api/line/webhook"
    headers = {
        "Content-Type": "application/json"
        # Intentionally omit 'x-line-signature' header
    }
    payload = {
        "events": [
            {
                "type": "message",
                "message": {
                    "type": "text",
                    "text": "Hello, world"
                },
                "timestamp": 1234567890,
                "source": {
                    "type": "user",
                    "userId": "U1234567890"
                }
            }
        ]
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"

    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "error" in resp_json, "Response JSON does not contain 'error' field"
    error_message = resp_json["error"]
    assert isinstance(error_message, str) and "missing signature" in error_message.lower(), \
        f"Error message should mention missing signature; got: {error_message}"

test_line_webhook_rejects_missing_signature()