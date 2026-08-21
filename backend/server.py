from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import uuid
import base64
import asyncio
import json
import re
import requests
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="VirtueNova API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("virtuenova")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class CartItemInput(BaseModel):
    product_id: str
    size: Optional[str] = None
    color: Optional[str] = None
    qty: int = 1


class WishlistInput(BaseModel):
    product_id: str


class ValidateInput(BaseModel):
    mode: str            # 'tryon' | 'room'
    force_fail: bool = False


class GenerateInput(BaseModel):
    mode: str            # 'tryon' | 'room'
    product_id: str


class TryOnEditInput(BaseModel):
    product_id: str
    user_image: str      # data URL of the user's uploaded/captured photo


class RoomEditInput(BaseModel):
    product_id: str
    room_image: str      # data URL of the user's uploaded/captured room photo


class BodyAnalyzeInput(BaseModel):
    product_id: Optional[str] = None
    user_image: Optional[str] = None
    measurements: Optional[dict] = None   # cm: height, chest, waist, hip, shoulder, inseam


class RoomAnalyzeInput(BaseModel):
    product_id: str
    room_image: str


# ---------------------------------------------------------------------------
# Catalog seed (curated hero demo products)
# ---------------------------------------------------------------------------
IMG = "https://static.prod-images.emergentagent.com/jobs/1da77429-5137-4a1f-9a1c-602c4827dd62/images"

CATALOG = [
    {
        "id": "p1", "name": "Tailored Wool Blazer", "category": "Fashion",
        "price": 12900, "rating": 4.8, "reviews": 214,
        "image": f"{IMG}/8103f4bfc887b0b0960f0573bbf90ddabdb8eb2e9f0a9bca1e72e92b400a267d.jpeg",
        "colors": ["Black", "Charcoal", "Navy"], "sizes": ["XS", "S", "M", "L", "XL"],
        "description": "A precision-cut single-breasted blazer in structured Italian wool. Softly padded shoulders, a clean lapel and a tailored waist make it the anchor of any wardrobe.",
        "specs": {"Material": "100% Virgin Wool", "Fit": "Tailored", "Lining": "Cupro", "Care": "Dry clean only", "Origin": "Made in Italy"},
        "ai_match_score": 96, "tryon_enabled": True, "room_enabled": False,
        "tryon_result": f"{IMG}/4a1ffad2a1c74e4b13e349f2ec9a0f63b98c6f7b87ba2601271165c1be434d2d.jpeg",
        "style_match": "Aligns with your preference for structured, monochrome tailoring and minimalist silhouettes.",
    },
    {
        "id": "p2", "name": "Ivory Silk Slip Dress", "category": "Fashion",
        "price": 8900, "rating": 4.6, "reviews": 176,
        "image": f"{IMG}/f5cef980a4f7e05e9df811a65885352361903a0a55dbb49305da69afd2af675e.jpeg",
        "colors": ["Ivory", "Blush", "Black"], "sizes": ["XS", "S", "M", "L"],
        "description": "A bias-cut slip dress in fluid sandwashed silk. The cowl neckline and floor-skimming hem create an effortless, liquid drape.",
        "specs": {"Material": "100% Mulberry Silk", "Fit": "Bias-cut", "Length": "Maxi", "Care": "Hand wash cold", "Origin": "Made in France"},
        "ai_match_score": 92, "tryon_enabled": True, "room_enabled": False,
        "tryon_result": f"{IMG}/fa302a8f0e5580186f427edfff826738372d5932959bd839f730890186265c8f.jpeg",
        "style_match": "Matches your interest in fluid, understated eveningwear and neutral palettes.",
    },
    {
        "id": "p3", "name": "Charcoal Trench Coat", "category": "Fashion",
        "price": 15900, "rating": 4.7, "reviews": 132,
        "image": f"{IMG}/395c451dd2a0842264c10fb3cd13ee19e16bec3f7e94d9b6100871bb4fca2f76.jpeg",
        "colors": ["Charcoal", "Stone", "Black"], "sizes": ["S", "M", "L", "XL"],
        "description": "An oversized double-breasted trench in brushed melton. Storm flaps, a self-tie belt and a relaxed drop-shoulder give it modern proportions.",
        "specs": {"Material": "Wool / Poly Melton", "Fit": "Oversized", "Length": "Longline", "Care": "Dry clean only", "Origin": "Made in Portugal"},
        "ai_match_score": 89, "tryon_enabled": True, "room_enabled": False,
        "tryon_result": f"{IMG}/46796873b588d99dbaa8a881d88d32251bc0c7d7f7cabb22146e67a756e86c73.jpeg",
        "style_match": "Fits your affinity for architectural outerwear and cool-toned neutrals.",
    },
    {
        "id": "p4", "name": "Terracotta Knit Sweater", "category": "Fashion",
        "price": 5400, "rating": 4.5, "reviews": 98,
        "image": f"{IMG}/9b2469472618c4e9f8a3653b03f88619e3190eecc9f0ca333f6ebc6aa74e30c2.jpeg",
        "colors": ["Terracotta", "Cream", "Olive"], "sizes": ["XS", "S", "M", "L", "XL"],
        "description": "A ribbed roll-neck knit in a warm terracotta lambswool blend. Slim through the body with a soft, brushed hand-feel.",
        "specs": {"Material": "Lambswool Blend", "Fit": "Slim", "Neck": "Roll neck", "Care": "Hand wash", "Origin": "Made in Scotland"},
        "ai_match_score": 88, "tryon_enabled": True, "room_enabled": False,
        "tryon_result": f"{IMG}/2f8e2c87328efbff612718a1a360ce863b99186958549725c83dece23ba73b57.jpeg",
        "style_match": "Complements your recent warm-tone selections and relaxed daywear.",
    },
    {
        "id": "p5", "name": "Structured Leather Tote", "category": "Accessories",
        "price": 11200, "rating": 4.9, "reviews": 305,
        "image": f"{IMG}/f4ff46de73941e09a58f30b3e478dc9dcb49366aa0f52317de5343f9a6353aa3.jpeg",
        "colors": ["Tan", "Black", "Cognac"], "sizes": ["One Size"],
        "description": "A structured tote in full-grain vegetable-tanned leather with dual rolled handles and a suede-lined interior.",
        "specs": {"Material": "Full-grain leather", "Dimensions": "38 × 30 × 14 cm", "Lining": "Suede", "Hardware": "Brushed gold", "Origin": "Made in Spain"},
        "ai_match_score": 94, "tryon_enabled": False, "room_enabled": False,
        "tryon_result": None,
        "style_match": "A versatile everyday carry that pairs with your minimalist wardrobe.",
    },
    {
        "id": "p6", "name": "Minimalist Gold Watch", "category": "Accessories",
        "price": 18700, "rating": 4.8, "reviews": 187,
        "image": f"{IMG}/c59eec41bc236409cf33e48df0ddc40af6b0d6b05a51cc48deb959ba5244574f.jpeg",
        "colors": ["Gold / Cream", "Silver / Black"], "sizes": ["One Size"],
        "description": "A slim 36mm case in brushed gold with a clean sunray dial and a cream Italian-leather strap. Swiss quartz movement.",
        "specs": {"Case": "36mm gold-tone", "Movement": "Swiss quartz", "Glass": "Sapphire crystal", "Strap": "Italian leather", "Water": "3 ATM"},
        "ai_match_score": 90, "tryon_enabled": False, "room_enabled": False,
        "tryon_result": None,
        "style_match": "A refined accent that echoes your preference for understated hardware.",
    },
    {
        "id": "p7", "name": "Leather Tub Sofa", "category": "Furniture",
        "price": 84900, "rating": 4.7, "reviews": 64,
        "image": f"{IMG}/35bf5dcb32df7b3f2848a17789fde1a115d301e7f203bd2e9101ffc1ca0fd2d5.jpeg",
        "colors": ["Cognac / Black", "Tan", "Espresso"], "sizes": ["3-Seater"],
        "description": "A mid-century tub sofa upholstered in aniline leather with a curved black frame and tapered wooden legs.",
        "specs": {"Material": "Aniline leather", "Dimensions": "210 × 88 × 78 cm", "Seats": "3", "Frame": "Solid ash", "Origin": "Made in Denmark"},
        "ai_match_score": 93, "tryon_enabled": False, "room_enabled": True,
        "tryon_result": None,
        "room_result": f"{IMG}/c0b8b4d22e3c01cad0ec61e1936352fd7bbab59eb8f350d63b268952dfbb9093.jpeg",
        "style_match": "Suits your warm mid-century interior direction and open-plan layouts.",
    },
    {
        "id": "p8", "name": "Emerald Velvet Armchair", "category": "Furniture",
        "price": 32900, "rating": 4.6, "reviews": 88,
        "image": f"{IMG}/12abfb1a8e183be7ed95723fca40bd38ae1a3da65e14b3d94e26e5a5db387d49.jpeg",
        "colors": ["Emerald", "Ochre", "Charcoal"], "sizes": ["One Size"],
        "description": "A softly rounded accent armchair in emerald cotton velvet with slim oak legs and a generous, enveloping seat.",
        "specs": {"Material": "Cotton velvet", "Dimensions": "78 × 76 × 82 cm", "Frame": "Solid oak", "Filling": "High-density foam", "Origin": "Made in Italy"},
        "ai_match_score": 91, "tryon_enabled": False, "room_enabled": True,
        "tryon_result": None,
        "room_result": f"{IMG}/edd2c300660923eda8a27bd012919307f993481e50e8fcf337457543fecf2a3d.jpeg",
        "style_match": "A jewel-tone accent that balances your neutral base palette.",
    },
    {
        "id": "p9", "name": "Round Oak Coffee Table", "category": "Furniture",
        "price": 21500, "rating": 4.5, "reviews": 52,
        "image": f"{IMG}/a466b9e5e9f42459fa81704e67d24462548f92dc664ca1eb5a8387c723c4f5ab.jpeg",
        "colors": ["Natural Oak", "Walnut"], "sizes": ["Ø 90 cm"],
        "description": "A sculptural round coffee table turned from solid oak with a substantial pedestal base and a soft matte oil finish.",
        "specs": {"Material": "Solid oak", "Dimensions": "Ø 90 × 38 cm", "Finish": "Natural oil", "Weight": "24 kg", "Origin": "Made in Sweden"},
        "ai_match_score": 87, "tryon_enabled": False, "room_enabled": True,
        "tryon_result": None,
        "room_result": f"{IMG}/251d52b074f3a5ccc2b9f63caf7975813532a1102a7209ded242ff012ad7b7b1.jpeg",
        "style_match": "Anchors your living space with the warm timber tones you favour.",
    },
    {
        "id": "p10", "name": "Arc Floor Lamp", "category": "Décor",
        "price": 14200, "rating": 4.7, "reviews": 141,
        "image": f"{IMG}/6b5bde28ea24f8e465914a0002116b6fdac14dcd22805ce36dfa01b937fc2821.jpeg",
        "colors": ["Black / Brass", "White / Nickel"], "sizes": ["One Size"],
        "description": "A statement arc lamp with a matte black stem, marble base and an adjustable brushed-brass dome shade for warm directional light.",
        "specs": {"Material": "Steel / Brass", "Height": "210 cm", "Base": "Marble", "Bulb": "E27 LED", "Origin": "Made in Germany"},
        "ai_match_score": 89, "tryon_enabled": False, "room_enabled": True,
        "tryon_result": None,
        "room_result": f"{IMG}/7d94bac5183b4ab7c7e9d7c7ffb9f30aab64da9c2809bd1ab2620d2f03e05c4a.jpeg",
        "style_match": "Adds a sculptural lighting moment that fits your reading-corner setup.",
    },
]


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
def _set_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")


@api_router.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {"name": payload.name, "email": email,
           "password_hash": hash_password(payload.password), "role": "user",
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email)
    _set_cookie(response, token)
    return {"token": token, "user": {"id": uid, "name": payload.name, "email": email, "role": "user"}}


@api_router.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    uid = str(user["_id"])
    token = create_access_token(uid, email)
    _set_cookie(response, token)
    return {"token": token, "user": {"id": uid, "name": user["name"], "email": email, "role": user.get("role", "user")}}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Catalog routes
# ---------------------------------------------------------------------------
def _public(p: dict) -> dict:
    return {k: v for k, v in p.items() if k != "_id"}


@api_router.get("/categories")
async def categories():
    cats = []
    seen = set()
    for p in CATALOG:
        if p["category"] not in seen:
            seen.add(p["category"])
            cats.append(p["category"])
    return {"categories": cats}


@api_router.get("/products")
async def list_products(q: Optional[str] = None, category: Optional[str] = None,
                        sort: Optional[str] = None):
    docs = await db.products.find({}, {"_id": 0}).to_list(200)
    if category and category.lower() != "all":
        docs = [d for d in docs if d["category"].lower() == category.lower()]
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["name"].lower() or ql in d["description"].lower()
                or ql in d["category"].lower()]
    if sort == "price_asc":
        docs.sort(key=lambda d: d["price"])
    elif sort == "price_desc":
        docs.sort(key=lambda d: d["price"], reverse=True)
    elif sort == "rating":
        docs.sort(key=lambda d: d["rating"], reverse=True)
    else:
        docs.sort(key=lambda d: d["ai_match_score"], reverse=True)
    return {"products": docs}


@api_router.get("/recommendations")
async def recommendations():
    docs = await db.products.find({}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda d: d["ai_match_score"], reverse=True)
    return {"products": docs}


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc


@api_router.get("/assess/{product_id}")
async def assess(product_id: str, user: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    score = doc["ai_match_score"]
    fit = "True to size" if doc["category"] in ("Fashion", "Accessories") else "Scales well to mid-size rooms"
    factors = [
        {"label": "Style alignment", "value": min(99, score + 2)},
        {"label": "Colour harmony", "value": max(70, score - 4)},
        {"label": "Fit / scale confidence", "value": min(98, score + 1)},
        {"label": "Value vs. peers", "value": max(72, score - 8)},
    ]
    return {
        "product_id": product_id,
        "ai_match_score": score,
        "summary": doc["style_match"],
        "fit_note": fit,
        "factors": factors,
        "recommendation": "Strong match" if score >= 90 else "Good match" if score >= 85 else "Consider alternatives",
    }


# ---------------------------------------------------------------------------
# Visualization (representative outputs)
# ---------------------------------------------------------------------------
@api_router.post("/visualize/validate")
async def validate(payload: ValidateInput):
    if payload.mode == "tryon":
        checks = [
            {"key": "single_person", "label": "Single person detected"},
            {"key": "full_body", "label": "Full body in frame"},
            {"key": "lighting", "label": "Even, sufficient lighting"},
            {"key": "pose", "label": "Front-facing neutral pose"},
        ]
    else:
        checks = [
            {"key": "room_detected", "label": "Room detected"},
            {"key": "floor_visible", "label": "Floor plane visible"},
            {"key": "corners", "label": "Wall corners identified"},
            {"key": "lighting", "label": "Adequate lighting"},
        ]
    if payload.force_fail:
        # deterministic controlled failure for the demo
        results = []
        for i, c in enumerate(checks):
            passed = i < len(checks) - 2  # fail last two
            results.append({**c, "passed": passed})
        guidance = ("We couldn't confirm a full body in an evenly lit frame. Stand back so your "
                    "whole body is visible and face the camera in soft, even light."
                    if payload.mode == "tryon" else
                    "We couldn't detect clear wall corners and the floor plane. Step back and capture "
                    "the room from a corner so the floor and two walls are visible.")
        return {"valid": False, "checks": results, "guidance": guidance}
    return {"valid": True, "checks": [{**c, "passed": True} for c in checks],
            "guidance": "All checks passed. Ready to visualize."}


@api_router.post("/visualize/generate")
async def generate(payload: GenerateInput, user: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.mode == "tryon":
        if not doc.get("tryon_enabled"):
            raise HTTPException(status_code=400, detail="This item does not support virtual try-on.")
        result = doc.get("tryon_result")
        stages = ["Detecting pose keypoints…", "Segmenting garment…",
                  "Aligning garment to body…", "Rendering try-on…"]
    else:
        if not doc.get("room_enabled"):
            raise HTTPException(status_code=400, detail="This item does not support room visualization.")
        result = doc.get("room_result")
        stages = ["Estimating room depth…", "Detecting floor plane…",
                  "Placing furniture…", "Compositing lighting…"]
    return {
        "result_image": result,
        "stages": stages,
        "duration_ms": 3000,
        "microcopy": "AI-generated representative visualization",
    }


TRYON_EDIT_PROMPT = (
    "You are performing a precise virtual try-on PHOTO EDIT (inpainting), NOT image generation. "
    "You are given TWO images. IMAGE 1 is the base photo of a real person. IMAGE 2 is a garment ('{garment}'). "
    "Treat IMAGE 1 as the fixed base layer and edit ONLY the clothing region on the person so they appear "
    "to be wearing the garment from IMAGE 2.\n\n"
    "KEEP EXACTLY THE SAME, PIXEL-FOR-PIXEL WHERE POSSIBLE:\n"
    "- the person's face, identity, hairstyle, skin tone and expression\n"
    "- the body shape, pose, hands and fingers, arms and legs\n"
    "- the background, room, furniture, and every other object in the scene\n"
    "- the lighting, shadows, camera angle, framing, image dimensions and composition\n\n"
    "ONLY CHANGE THE CLOTHING. While doing so:\n"
    "- Preserve the garment's exact colour, pattern, texture, logo and design from IMAGE 2.\n"
    "- Fit the garment to the body's proportions, shoulders, torso, waist, hips and arm position.\n"
    "- Render realistic fabric folds, contours, wrinkles and natural contact shadows so it looks genuinely worn.\n"
    "- Do NOT distort or beautify the face or body. Do NOT crop, zoom, rotate or reposition.\n"
    "- Do NOT generate a new person or a new scene.\n"
    "The output must look like the SAME person photographed in the SAME place, only wearing the selected garment. "
    "Return only the edited version of IMAGE 1."
)


ROOM_EDIT_PROMPT = (
    "You are performing precise virtual staging as a PHOTO EDIT (inpainting), NOT image generation. "
    "You are given TWO images. IMAGE 1 is the base photo of a real room. IMAGE 2 is a furniture product ('{item}'). "
    "Treat IMAGE 1 as the fixed base layer and edit it to ADD ONLY this one furniture piece into the room.\n\n"
    "KEEP EXACTLY THE SAME, PIXEL-FOR-PIXEL WHERE POSSIBLE:\n"
    "- the walls, floor, ceiling, windows, doors and wall colours\n"
    "- all existing furniture, decorations and the room layout\n"
    "- the lighting, shadows, camera perspective, framing, image dimensions and composition\n\n"
    "ONLY ADD the furniture from IMAGE 2. While doing so:\n"
    "- Preserve the furniture's exact colour, material, texture and design from IMAGE 2.\n"
    "- Place it flat on the existing floor plane with correct perspective, realistic scale relative to the room, "
    "and correct depth. Respect occlusion (existing objects in front should still overlap it) and add natural contact shadows.\n"
    "- Put it in genuinely free floor space so it does not overlap or cover existing furniture incorrectly.\n"
    "- The piece must NOT float, must NOT look pasted-on, and must NOT be unrealistically huge or tiny.\n"
    "- Do NOT replace, regenerate or restyle the room. Do NOT crop, zoom, rotate or resize IMAGE 1.\n"
    "The output must look like the SAME room photographed with the new furniture realistically placed inside it. "
    "Return only the edited version of IMAGE 1."
)


BODY_VISION_PROMPT = (
    "You are an apparel-sizing computer-vision analyst. Analyze the person in this photo and estimate their body "
    "measurements in centimeters. Respond with ONLY compact JSON, no prose: "
    '{"height_cm": <int>, "shoulder_cm": <int>, "chest_cm": <int>, "waist_cm": <int>, '
    '"hip_cm": <int>, "inseam_cm": <int>, "build": "slim|average|athletic|broad"}. '
    "If the full body is not fully visible, still return your best estimate."
)


ROOM_VISION_PROMPT = (
    "You are an interior computer-vision analyst. Analyze this room photo and estimate, in FEET, the floor "
    "dimensions and the largest clear (empty) floor area available for placing a new piece of furniture. "
    "Respond with ONLY compact JSON, no prose: "
    '{"room_width_ft": <number>, "room_length_ft": <number>, "clear_width_ft": <number>, '
    '"clear_depth_ft": <number>, "notes": "<short observation about free space and existing objects>"}.'
)


def _strip_data_url(d: str) -> str:
    if isinstance(d, str) and d.strip().startswith("data:") and "," in d:
        return d.split(",", 1)[1]
    return d


def _num(v):
    try:
        f = float(v)
        return f if f > 0 else None
    except (TypeError, ValueError):
        return None


async def _fetch_image_b64(url: str) -> str:
    resp = await asyncio.to_thread(requests.get, url, timeout=25)
    resp.raise_for_status()
    return base64.b64encode(resp.content).decode("utf-8")


async def _edit_two_images(base_b64: str, ref_b64: str, prompt: str, system: str):
    """Localized image edit: base image + reference image -> edited base. Returns image dict or None."""
    images = None
    last_err = None
    for attempt in range(2):
        try:
            chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=str(uuid.uuid4()),
                           system_message=system)
            chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
            msg = UserMessage(text=prompt, file_contents=[ImageContent(base_b64), ImageContent(ref_b64)])
            _, images = await chat.send_message_multimodal_response(msg)
            if images:
                return images[0]
        except Exception as e:
            last_err = e
            logger.error("edit attempt %d failed: %s", attempt + 1, e)
    logger.error("edit produced no image after retries. last_err=%s", last_err)
    return None


async def _gemini_vision_json(image_b64: str, instruction: str):
    """Run a multimodal vision analysis and parse a JSON object from the response. Returns dict or None."""
    try:
        chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=str(uuid.uuid4()),
                       system_message="You are a precise computer-vision analyst. Reply with compact JSON only.")
        chat.with_model("gemini", "gemini-2.5-flash")
        msg = UserMessage(text=instruction, file_contents=[ImageContent(image_b64)])
        resp = await chat.send_message(msg)
        text = resp if isinstance(resp, str) else str(resp)
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
    except Exception as e:
        logger.error("vision json analysis failed: %s", e)
    return None


@api_router.post("/visualize/tryon-edit")
async def tryon_edit(payload: TryOnEditInput, user: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    if not doc.get("tryon_enabled"):
        raise HTTPException(status_code=400, detail="This item does not support virtual try-on.")

    user_b64 = _strip_data_url(payload.user_image)
    if not user_b64:
        raise HTTPException(status_code=400, detail="No photo provided.")

    try:
        garment_b64 = await _fetch_image_b64(doc["image"])
    except Exception as e:
        logger.error("Garment fetch failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not load garment image. Please retry.")

    img = await _edit_two_images(
        user_b64, garment_b64, TRYON_EDIT_PROMPT.format(garment=doc["name"]),
        "You are a professional fashion photo retoucher performing localized virtual try-on garment replacement.")
    if not img:
        raise HTTPException(status_code=502, detail="Try-on edit failed. Please try again.")

    return {
        "result_image": f"data:{img['mime_type']};base64,{img['data']}",
        "microcopy": "AI photo edit — only the clothing on your photo was changed",
        "product_id": payload.product_id,
    }


@api_router.post("/visualize/room-edit")
async def room_edit(payload: RoomEditInput, user: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    if not doc.get("room_enabled"):
        raise HTTPException(status_code=400, detail="This item does not support room visualization.")

    room_b64 = _strip_data_url(payload.room_image)
    if not room_b64:
        raise HTTPException(status_code=400, detail="No room photo provided.")

    try:
        item_b64 = await _fetch_image_b64(doc["image"])
    except Exception as e:
        logger.error("Furniture fetch failed: %s", e)
        raise HTTPException(status_code=502, detail="Could not load furniture image. Please retry.")

    img = await _edit_two_images(
        room_b64, item_b64, ROOM_EDIT_PROMPT.format(item=doc["name"]),
        "You are a professional interior-staging photo retoucher placing a single furniture piece into a real room photo.")
    if not img:
        raise HTTPException(status_code=502, detail="Room staging failed. Please try again.")

    return {
        "result_image": f"data:{img['mime_type']};base64,{img['data']}",
        "microcopy": "AI photo edit — furniture placed in your actual room",
        "product_id": payload.product_id,
    }


# ---- Body / size analysis (fashion) --------------------------------------
SIZE_ORDER = ["XS", "S", "M", "L", "XL"]
SIZE_BANDS = [("XS", 0, 86), ("S", 86, 94), ("M", 94, 102), ("L", 102, 110), ("XL", 110, 999)]
FIT_MAP = {"Tailored": "Regular", "Slim": "Slim", "Oversized": "Relaxed",
           "Bias-cut": "Regular", "Relaxed": "Relaxed", "Regular": "Regular"}


def _size_from_chest(chest):
    for name, lo, hi in SIZE_BANDS:
        if lo <= chest < hi:
            return name
    return "M"


def _constrain_size(size, available):
    avail = [a for a in available if a in SIZE_ORDER]
    if not avail:
        return size
    if size in avail:
        return size
    idx = SIZE_ORDER.index(size) if size in SIZE_ORDER else 2
    return min(avail, key=lambda a: abs(SIZE_ORDER.index(a) - idx))


@api_router.post("/analyze/body")
async def analyze_body(payload: BodyAnalyzeInput, user: dict = Depends(get_current_user)):
    available = SIZE_ORDER
    product = None
    if payload.product_id:
        product = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
        if product:
            available = [s for s in product.get("sizes", SIZE_ORDER) if s in SIZE_ORDER] or SIZE_ORDER

    m = payload.measurements or {}
    ai = None
    if payload.user_image:
        ai = await _gemini_vision_json(_strip_data_url(payload.user_image), BODY_VISION_PROMPT)

    fields = [("height", "Height"), ("shoulder", "Shoulder"), ("chest", "Chest / Bust"),
              ("waist", "Waist"), ("hip", "Hip"), ("inseam", "Inseam")]
    out, values, used_measured, used_ai = [], {}, False, False
    for key, label in fields:
        mv = _num(m.get(key))
        if mv:
            values[key] = mv
            used_measured = True
            out.append({"key": key, "label": label, "value": f"{int(round(mv))} cm", "estimated": False})
        elif ai and _num(ai.get(key + "_cm")):
            av = _num(ai.get(key + "_cm"))
            values[key] = av
            used_ai = True
            out.append({"key": key, "label": label, "value": f"~{int(round(av))} cm", "estimated": True})
        else:
            out.append({"key": key, "label": label, "value": "—", "estimated": False})

    chest = values.get("chest") or 96
    size = _constrain_size(_size_from_chest(chest), available)
    fit = FIT_MAP.get((product or {}).get("specs", {}).get("Fit", "Regular"), "Regular")

    if used_measured and values.get("chest"):
        confidence = 93
        source = "combined" if used_ai else "measurements"
    elif used_measured:
        confidence = 88
        source = "combined" if used_ai else "measurements"
    elif used_ai:
        confidence = 82
        source = "ai_estimate"
    else:
        confidence = 75
        source = "default"

    build = (ai or {}).get("build")
    note = (f"AI reads your build as '{build}'. " if build else "") + (
        "Estimates marked '~' are AI-derived from your photo; enter real measurements for higher confidence."
        if used_ai else "Recommendation based on the measurements you entered.")

    return {
        "recommended_size": size,
        "fit": fit,
        "confidence": confidence,
        "available_sizes": available,
        "measurements": out,
        "source": source,
        "note": note,
        "disclaimer": "AI-estimated. Actual fit may vary by brand and personal preference.",
    }


# ---- Room / space analysis (furniture) -----------------------------------
def _parse_dims_cm(product):
    spec = product.get("specs", {})
    s = spec.get("Dimensions") or spec.get("Height") or ""
    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", s)]
    return nums


CM_PER_FT = 30.48


@api_router.post("/analyze/room")
async def analyze_room(payload: RoomAnalyzeInput, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    nums = _parse_dims_cm(product)
    if len(nums) >= 2:
        f_w, f_d = nums[0] / CM_PER_FT, nums[1] / CM_PER_FT
    elif len(nums) == 1:
        f_w = f_d = nums[0] / CM_PER_FT
    else:
        f_w, f_d = 6.0, 3.0

    vision = await _gemini_vision_json(_strip_data_url(payload.room_image), ROOM_VISION_PROMPT)
    estimated = True
    if vision and _num(vision.get("room_width_ft")) and _num(vision.get("room_length_ft")):
        rw = _num(vision.get("room_width_ft"))
        rl = _num(vision.get("room_length_ft"))
        cw = _num(vision.get("clear_width_ft")) or rw * 0.5
        cd = _num(vision.get("clear_depth_ft")) or rl * 0.4
        notes = vision.get("notes") or "Estimated from your room photo."
    else:
        rw, rl, cw, cd = 12.0, 14.0, 7.0, 6.0
        notes = "Could not read the room precisely; using a typical mid-size living-room estimate."

    fits = (f_w <= cw + 0.5) and (f_d <= cd + 0.5)
    footprint = f_w * f_d
    room_area = rw * rl
    coverage = round((footprint / room_area) * 100) if room_area else 0

    return {
        "product_id": payload.product_id,
        "room_dimensions_ft": {"width": round(rw, 1), "length": round(rl, 1)},
        "clear_space_ft": {"width": round(cw, 1), "depth": round(cd, 1)},
        "furniture_dimensions_ft": {"width": round(f_w, 1), "depth": round(f_d, 1)},
        "fits": fits,
        "coverage_pct": coverage,
        "verdict": ("Fits comfortably in the available space." if fits and coverage < 25
                    else "Fits, but will fill most of the free space." if fits
                    else "May be tight — consider a smaller piece or rearranging the room."),
        "notes": notes,
        "estimated": estimated,
        "disclaimer": "Room dimensions are AI-estimated from a single photo and are approximate.",
    }


# ---------------------------------------------------------------------------
# Cart & Wishlist
# ---------------------------------------------------------------------------
async def _hydrate(items, key="cart"):
    out = []
    for it in items:
        p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if not p:
            continue
        entry = {"id": it["id"], "product": p}
        if key == "cart":
            entry.update({"size": it.get("size"), "color": it.get("color"), "qty": it.get("qty", 1)})
        out.append(entry)
    return out


@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "cart")}


@api_router.post("/cart")
async def add_cart(payload: CartItemInput, user: dict = Depends(get_current_user)):
    existing = await db.cart.find_one({"user_id": user["id"], "product_id": payload.product_id,
                                       "size": payload.size, "color": payload.color})
    if existing:
        await db.cart.update_one({"id": existing["id"]}, {"$inc": {"qty": payload.qty}})
    else:
        await db.cart.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"],
                                  "product_id": payload.product_id, "size": payload.size,
                                  "color": payload.color, "qty": payload.qty})
    items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "cart")}


@api_router.patch("/cart/{item_id}")
async def update_cart(item_id: str, qty: int, user: dict = Depends(get_current_user)):
    if qty <= 0:
        await db.cart.delete_one({"id": item_id, "user_id": user["id"]})
    else:
        await db.cart.update_one({"id": item_id, "user_id": user["id"]}, {"$set": {"qty": qty}})
    items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "cart")}


@api_router.delete("/cart/{item_id}")
async def remove_cart(item_id: str, user: dict = Depends(get_current_user)):
    await db.cart.delete_one({"id": item_id, "user_id": user["id"]})
    items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "cart")}


@api_router.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    items = await db.wishlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "wishlist")}


@api_router.post("/wishlist")
async def add_wishlist(payload: WishlistInput, user: dict = Depends(get_current_user)):
    existing = await db.wishlist.find_one({"user_id": user["id"], "product_id": payload.product_id})
    if not existing:
        await db.wishlist.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"],
                                      "product_id": payload.product_id})
    items = await db.wishlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "wishlist")}


@api_router.delete("/wishlist/{product_id}")
async def remove_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await db.wishlist.delete_one({"user_id": user["id"], "product_id": product_id})
    items = await db.wishlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    return {"items": await _hydrate(items, "wishlist")}


@api_router.get("/")
async def root():
    return {"message": "VirtueNova API", "products": len(CATALOG)}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup: seed catalog + admin
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    # seed / refresh catalog (idempotent by id)
    for p in CATALOG:
        await db.products.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@virtuenova.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"name": "VirtueNova Admin", "email": admin_email,
                                   "password_hash": hash_password(admin_password), "role": "admin",
                                   "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
    logger.info("Startup complete: %d products seeded", len(CATALOG))


@app.on_event("shutdown")
async def shutdown():
    client.close()
