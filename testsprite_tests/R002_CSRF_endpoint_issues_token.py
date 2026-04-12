import requests

def test_csrf_endpoint_issues_token():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/security/csrf"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "token" in data, "Response JSON does not contain 'token'"
    assert isinstance(data["token"], str), "'token' is not a string"
    assert data["token"].strip() != "", "'token' is an empty string"

test_csrf_endpoint_issues_token()