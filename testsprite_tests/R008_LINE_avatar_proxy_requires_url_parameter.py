import requests

def test_line_avatar_proxy_requires_url_parameter():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/line/avatar"
    try:
        response = requests.get(url, timeout=30)
        assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_line_avatar_proxy_requires_url_parameter()