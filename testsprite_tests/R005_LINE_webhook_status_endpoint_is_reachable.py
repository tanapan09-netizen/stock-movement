import requests

def test_line_webhook_status_endpoint_is_reachable():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/line/webhook"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate that returned JSON has some keys indicating status details (at least non-empty dict)
    assert isinstance(json_data, dict), "Response JSON is not a dictionary"
    assert len(json_data) > 0, "Response JSON is empty, expected status details"

test_line_webhook_status_endpoint_is_reachable()