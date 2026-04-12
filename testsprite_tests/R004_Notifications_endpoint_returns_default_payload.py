import requests

BASE_URL = "http://localhost:3002"
TIMEOUT = 30

def test_notifications_endpoint_returns_default_payload():
    url = f"{BASE_URL}/api/notifications"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

        json_data = response.json()
        assert isinstance(json_data, dict), "Response JSON should be a dictionary"
        assert "items" in json_data, "Response JSON missing 'items' key"
        assert "unreadCount" in json_data, "Response JSON missing 'unreadCount' key"

        # Validate items is an array (list)
        assert isinstance(json_data["items"], list), "'items' should be a list"

        # Validate unreadCount is an integer
        assert isinstance(json_data["unreadCount"], int), "'unreadCount' should be an integer"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_notifications_endpoint_returns_default_payload()