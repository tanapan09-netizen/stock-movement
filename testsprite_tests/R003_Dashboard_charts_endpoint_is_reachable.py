import requests

def test_dashboard_charts_endpoint_is_reachable():
    url = "http://localhost:3002/api/dashboard/charts"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
        data = response.json()
        assert isinstance(data, dict), "Response JSON is not an object"
        assert "trends" in data and isinstance(data["trends"], list), "'trends' array missing or not a list"
        assert "categories" in data and isinstance(data["categories"], list), "'categories' array missing or not a list"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_dashboard_charts_endpoint_is_reachable()