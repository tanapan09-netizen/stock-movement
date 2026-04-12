import requests

def test_image_proxy_validates_required_path():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/maintenance/image-proxy"
    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    error_msg = json_data.get("error") or json_data.get("message") or ""
    assert "Invalid path" in error_msg, f"Expected error message to contain 'Invalid path' but got '{error_msg}'"

test_image_proxy_validates_required_path()