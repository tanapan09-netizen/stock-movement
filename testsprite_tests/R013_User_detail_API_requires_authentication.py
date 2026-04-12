import requests

def test_user_detail_requires_authentication():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/users/1"
    headers = {
        # No authentication headers provided intentionally
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_user_detail_requires_authentication()