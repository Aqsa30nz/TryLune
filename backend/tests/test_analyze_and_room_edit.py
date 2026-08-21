"""Tests for the new TryLune endpoints (iteration 3):
- POST /api/analyze/body
- POST /api/analyze/room
- POST /api/visualize/room-edit
- POST /api/visualize/tryon-edit (regression on p1..p4)
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
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


def _make_jpg(path, w=384, h=256, color=(200, 190, 170)):
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (w, h), color=color)
    d = ImageDraw.Draw(img)
    # simple pseudo-room / person markers
    d.rectangle((0, int(h * 0.75), w, h), fill=(120, 90, 70))  # floor
    d.rectangle((int(w * 0.1), int(h * 0.2), int(w * 0.9), int(h * 0.75)), outline=(90, 90, 90), width=3)  # window
    img.save(path, "JPEG", quality=85)


@pytest.fixture(scope="module")
def person_data_url():
    p = "/tmp/person3.jpg"
    from PIL import Image, ImageDraw
    if not os.path.exists(p):
        img = Image.new("RGB", (256, 512), (180, 160, 140))
        d = ImageDraw.Draw(img)
        d.ellipse((100, 40, 156, 100), fill=(220, 190, 170))
        d.rectangle((90, 100, 166, 300), fill=(90, 90, 120))
        d.rectangle((90, 300, 166, 480), fill=(40, 40, 60))
        img.save(p, "JPEG", quality=85)
    with open(p, "rb") as f:
        b = base64.b64encode(f.read()).decode()
    return f"data:image/jpeg;base64,{b}"


@pytest.fixture(scope="module")
def room_data_url():
    p = "/tmp/room3.jpg"
    if not os.path.exists(p):
        _make_jpg(p, 512, 384)
    with open(p, "rb") as f:
        b = base64.b64encode(f.read()).decode()
    return f"data:image/jpeg;base64,{b}"


# ---------- /api/analyze/body ----------
class TestAnalyzeBody:
    def test_requires_auth(self):
        r = requests.post(f"{API}/analyze/body",
                          json={"product_id": "p1", "measurements": {"chest": 96}}, timeout=15)
        assert r.status_code == 401

    def test_with_measurements(self, auth):
        r = requests.post(
            f"{API}/analyze/body",
            json={"product_id": "p1",
                  "measurements": {"height": 172, "chest": 96, "waist": 80, "hip": 98}},
            headers=auth, timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_size"] in ["XS", "S", "M", "L", "XL"]
        # chest=96 => M
        assert d["recommended_size"] == "M"
        assert d["fit"] in ["Regular", "Slim", "Relaxed"]
        assert d["confidence"] >= 85
        assert d["source"] in ["measurements", "combined"]
        assert isinstance(d["measurements"], list) and len(d["measurements"]) >= 4
        # measured values should not be flagged estimated
        chest_row = next((x for x in d["measurements"] if x["key"] == "chest"), None)
        assert chest_row is not None
        assert chest_row["estimated"] is False
        assert "96" in chest_row["value"]

    def test_with_image_only_estimates(self, auth, person_data_url):
        r = requests.post(
            f"{API}/analyze/body",
            json={"product_id": "p1", "user_image": person_data_url},
            headers=auth, timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["recommended_size"] in ["XS", "S", "M", "L", "XL"]
        # AI-only estimate -> lower confidence than measurements path
        assert d["confidence"] < 90
        # any AI-derived rows should be flagged estimated=true
        assert any(x.get("estimated") is True for x in d["measurements"]) or d["source"] == "default"


# ---------- /api/analyze/room ----------
class TestAnalyzeRoom:
    def test_requires_auth(self, room_data_url):
        r = requests.post(f"{API}/analyze/room",
                          json={"product_id": "p7", "room_image": room_data_url}, timeout=15)
        assert r.status_code == 401

    def test_unknown_product_404(self, auth, room_data_url):
        r = requests.post(f"{API}/analyze/room",
                          json={"product_id": "nope-xxx", "room_image": room_data_url},
                          headers=auth, timeout=30)
        assert r.status_code == 404

    def test_ok_p7(self, auth, room_data_url):
        r = requests.post(f"{API}/analyze/room",
                          json={"product_id": "p7", "room_image": room_data_url},
                          headers=auth, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["room_dimensions_ft", "clear_space_ft", "furniture_dimensions_ft",
                  "fits", "coverage_pct", "verdict", "notes"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["fits"], bool)
        assert isinstance(d["room_dimensions_ft"], dict) and "width" in d["room_dimensions_ft"]
        assert isinstance(d["furniture_dimensions_ft"], dict) and "width" in d["furniture_dimensions_ft"]


# ---------- /api/visualize/room-edit ----------
class TestRoomEdit:
    def test_requires_auth(self, room_data_url):
        r = requests.post(f"{API}/visualize/room-edit",
                          json={"product_id": "p8", "room_image": room_data_url}, timeout=15)
        assert r.status_code == 401

    def test_non_room_product_400(self, auth, room_data_url):
        # p1 is Fashion (tryon), room_enabled False
        r = requests.post(f"{API}/visualize/room-edit",
                          json={"product_id": "p1", "room_image": room_data_url},
                          headers=auth, timeout=30)
        assert r.status_code == 400

    def test_unknown_product_404(self, auth, room_data_url):
        r = requests.post(f"{API}/visualize/room-edit",
                          json={"product_id": "does-not-exist", "room_image": room_data_url},
                          headers=auth, timeout=30)
        assert r.status_code == 404

    def test_happy_path_p8(self, auth, room_data_url):
        r = requests.post(f"{API}/visualize/room-edit",
                          json={"product_id": "p8", "room_image": room_data_url},
                          headers=auth, timeout=120)
        # Gemini can occasionally 502; allow one retry
        if r.status_code == 502:
            r = requests.post(f"{API}/visualize/room-edit",
                              json={"product_id": "p8", "room_image": room_data_url},
                              headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["product_id"] == "p8"
        assert "furniture" in d["microcopy"].lower() and "room" in d["microcopy"].lower()
        assert d["result_image"].startswith("data:image/")
        _, b64 = d["result_image"].split(",", 1)
        raw = base64.b64decode(b64)
        assert len(raw) > 500


# ---------- Regression: tryon-edit still works ----------
class TestTryOnEditRegression:
    def test_p1_ok(self, auth, person_data_url):
        r = requests.post(f"{API}/visualize/tryon-edit",
                          json={"product_id": "p1", "user_image": person_data_url},
                          headers=auth, timeout=120)
        if r.status_code == 502:
            r = requests.post(f"{API}/visualize/tryon-edit",
                              json={"product_id": "p1", "user_image": person_data_url},
                              headers=auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["result_image"].startswith("data:image/")
