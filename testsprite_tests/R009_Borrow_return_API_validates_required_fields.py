import requests

def test_borrow_return_api_validates_required_fields():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/borrow/return"
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json={}, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 400, f"Expected status code 400, got {response.status_code}"

test_borrow_return_api_validates_required_fields()