"""Tests for the new POST /api/visualize/tryon-edit endpoint.

Covers:
- 401 without auth
- 400 for non-tryon product (p5)
- 200 happy path with valid tryon product + user photo data URL,
  returns result_image as a data:image base64 string.
"""
import os
import base64
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") \
    else "https://virtue-try-on.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@virtuenova.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def person_data_url():
    path = "/tmp/person.jpg"
    if not os.path.exists(path):
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (256, 512), color=(180, 160, 140))
        d = ImageDraw.Draw(img)
        d.ellipse((100, 40, 156, 100), fill=(220, 190, 170))
        d.rectangle((90, 100, 166, 300), fill=(90, 90, 120))
        d.rectangle((90, 300, 166, 480), fill=(40, 40, 60))
        img.save(path, "JPEG", quality=85)
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return f"data:image/jpeg;base64,{b64}"


class TestTryOnEdit:
    def test_requires_auth(self, person_data_url):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "p1", "user_image": person_data_url}, timeout=15)
        assert r.status_code == 401

    def test_non_tryon_product_400(self, auth, person_data_url):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "p5", "user_image": person_data_url},
                          headers=auth, timeout=30)
        assert r.status_code == 400
        assert "try-on" in r.json()["detail"].lower() or "tryon" in r.json()["detail"].lower()

    def test_unknown_product_404(self, auth, person_data_url):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "does-not-exist", "user_image": person_data_url},
                          headers=auth, timeout=30)
        assert r.status_code == 404

    def test_empty_image_400(self, auth):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "p1", "user_image": ""},
                          headers=auth, timeout=30)
        assert r.status_code == 400

    def test_happy_path_p1(self, auth, person_data_url):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "p1", "user_image": person_data_url},
                          headers=auth, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["product_id"] == "p1"
        assert data["microcopy"] == "AI photo edit — garment applied to your photo"
        assert isinstance(data["result_image"], str)
        assert data["result_image"].startswith("data:image/")
        # base64 payload should be a non-trivial length
        _, b64 = data["result_image"].split(",", 1)
        assert len(b64) > 1000
        # verify it's decodable base64
        raw = base64.b64decode(b64)
        assert len(raw) > 500
