import requests

def test_R010_products_api_requires_authentication():
    base_url = "http://localhost:3002"
    url = f"{base_url}/api/products"

    try:
        response = requests.get(url, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 401, f"Expected status code 401 but got {response.status_code}"
    # Optionally check WWW-Authenticate header or response body for 'Unauthorized'
    # but the test plan only specifies 401 Unauthorized

test_R010_products_api_requires_authentication()