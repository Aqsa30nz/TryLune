"""VirtueNova backend integration tests (pytest).

Covers: auth (register/login/me), catalog (products/categories/recommendations/assess),
visualize (validate + generate), cart CRUD, wishlist CRUD, and auth protection.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") \
    else "https://virtue-try-on.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@virtuenova.com"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_admin(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_login_invalid(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self, http):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = http.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": "Pass1234!"})
        assert r.status_code == 200, r.text
        data = r.json()
        token = data["token"]
        assert data["user"]["email"] == email
        # me
        me = http.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate(self, http):
        email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
        r1 = http.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Pass1234!"})
        assert r1.status_code == 200
        r2 = http.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Pass1234!"})
        assert r2.status_code == 400

    def test_me_unauthenticated(self, http):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Catalog ----------
class TestCatalog:
    def test_products_default_sort_ai_match(self, http):
        r = http.get(f"{API}/products")
        assert r.status_code == 200
        prods = r.json()["products"]
        assert len(prods) == 10
        scores = [p["ai_match_score"] for p in prods]
        assert scores == sorted(scores, reverse=True)
        # no _id leakage
        assert all("_id" not in p for p in prods)

    def test_products_search(self, http):
        r = http.get(f"{API}/products", params={"q": "blazer"})
        assert r.status_code == 200
        prods = r.json()["products"]
        assert any("Blazer" in p["name"] for p in prods)

    def test_products_category_filter(self, http):
        r = http.get(f"{API}/products", params={"category": "Furniture"})
        assert r.status_code == 200
        prods = r.json()["products"]
        assert len(prods) >= 1
        assert all(p["category"] == "Furniture" for p in prods)

    def test_products_sort_price_asc(self, http):
        r = http.get(f"{API}/products", params={"sort": "price_asc"})
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()["products"]]
        assert prices == sorted(prices)

    def test_products_sort_rating(self, http):
        r = http.get(f"{API}/products", params={"sort": "rating"})
        assert r.status_code == 200
        ratings = [p["rating"] for p in r.json()["products"]]
        assert ratings == sorted(ratings, reverse=True)

    def test_get_product_ok(self, http):
        r = http.get(f"{API}/products/p1")
        assert r.status_code == 200
        assert r.json()["id"] == "p1"

    def test_get_product_404(self, http):
        r = http.get(f"{API}/products/nonexistent")
        assert r.status_code == 404

    def test_categories(self, http):
        r = http.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert set(["Fashion", "Accessories", "Furniture", "Décor"]).issubset(set(cats))

    def test_recommendations(self, http):
        r = http.get(f"{API}/recommendations")
        assert r.status_code == 200
        prods = r.json()["products"]
        assert len(prods) == 10

    def test_assess_requires_auth(self, http):
        r = requests.get(f"{API}/assess/p1")
        assert r.status_code == 401

    def test_assess_ok(self, http, auth):
        r = http.get(f"{API}/assess/p1", headers=auth)
        assert r.status_code == 200
        data = r.json()
        assert data["product_id"] == "p1"
        assert isinstance(data["ai_match_score"], int)
        assert len(data["factors"]) == 4


# ---------- Visualize ----------
class TestVisualize:
    def test_validate_tryon_ok(self, http):
        r = http.post(f"{API}/visualize/validate", json={"mode": "tryon", "force_fail": False})
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert all(c["passed"] for c in data["checks"])

    def test_validate_tryon_fail(self, http):
        r = http.post(f"{API}/visualize/validate", json={"mode": "tryon", "force_fail": True})
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False
        assert any(not c["passed"] for c in data["checks"])
        assert "guidance" in data

    def test_validate_room_fail(self, http):
        r = http.post(f"{API}/visualize/validate", json={"mode": "room", "force_fail": True})
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is False

    def test_generate_tryon(self, http, auth):
        r = http.post(f"{API}/visualize/generate", json={"mode": "tryon", "product_id": "p1"}, headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert d["result_image"] and d["result_image"].startswith("http")
        assert d["microcopy"] == "AI-generated representative visualization"
        assert len(d["stages"]) == 4

    def test_generate_room(self, http, auth):
        r = http.post(f"{API}/visualize/generate", json={"mode": "room", "product_id": "p7"}, headers=auth)
        assert r.status_code == 200
        assert r.json()["result_image"]

    def test_generate_tryon_disallowed(self, http, auth):
        # p5 is Accessories, tryon_enabled False
        r = http.post(f"{API}/visualize/generate", json={"mode": "tryon", "product_id": "p5"}, headers=auth)
        assert r.status_code == 400

    def test_generate_requires_auth(self, http):
        r = requests.post(f"{API}/visualize/generate", json={"mode": "tryon", "product_id": "p1"})
        assert r.status_code == 401


# ---------- Cart ----------
class TestCart:
    @pytest.fixture(scope="class")
    def user_headers(self, http):
        email = f"cart_{uuid.uuid4().hex[:8]}@example.com"
        r = http.post(f"{API}/auth/register", json={"name": "Cart User", "email": email, "password": "Pass1234!"})
        assert r.status_code == 200
        return {"Authorization": f"Bearer {r.json()['token']}"}

    def test_full_cart_flow(self, http, user_headers):
        # empty
        r = http.get(f"{API}/cart", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []

        # add
        r = http.post(f"{API}/cart",
                      json={"product_id": "p1", "size": "M", "color": "Black", "qty": 1},
                      headers=user_headers)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 1
        item_id = items[0]["id"]
        assert items[0]["qty"] == 1
        assert items[0]["product"]["id"] == "p1"

        # add same → qty increments
        r = http.post(f"{API}/cart",
                      json={"product_id": "p1", "size": "M", "color": "Black", "qty": 2},
                      headers=user_headers)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 1
        assert items[0]["qty"] == 3

        # update qty
        r = http.patch(f"{API}/cart/{item_id}?qty=5", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["items"][0]["qty"] == 5

        # persistence via GET
        r = http.get(f"{API}/cart", headers=user_headers)
        assert r.json()["items"][0]["qty"] == 5

        # remove
        r = http.delete(f"{API}/cart/{item_id}", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []


# ---------- Wishlist ----------
class TestWishlist:
    @pytest.fixture(scope="class")
    def user_headers(self, http):
        email = f"wl_{uuid.uuid4().hex[:8]}@example.com"
        r = http.post(f"{API}/auth/register", json={"name": "WL User", "email": email, "password": "Pass1234!"})
        assert r.status_code == 200
        return {"Authorization": f"Bearer {r.json()['token']}"}

    def test_full_wishlist_flow(self, http, user_headers):
        r = http.get(f"{API}/wishlist", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []

        r = http.post(f"{API}/wishlist", json={"product_id": "p2"}, headers=user_headers)
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 1 and items[0]["product"]["id"] == "p2"

        # duplicate is idempotent
        r = http.post(f"{API}/wishlist", json={"product_id": "p2"}, headers=user_headers)
        assert r.status_code == 200
        assert len(r.json()["items"]) == 1

        # persistence
        r = http.get(f"{API}/wishlist", headers=user_headers)
        assert len(r.json()["items"]) == 1

        # remove
        r = http.delete(f"{API}/wishlist/p2", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["items"] == []
