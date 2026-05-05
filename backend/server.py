from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Any, Dict
import base64
import hashlib
import os
import secrets
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "sneezy_todo")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"

if not MONGO_URL:
    raise RuntimeError("MONGO_URL .env içinde tanımlı olmalı")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def normalize_role(role: Optional[str]) -> str:
    value = str(role or "").strip().lower()

    if value in ["admin", "yönetici", "yonetici"]:
        return "admin"

    return "staff"


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user.get("user_id"),
        "id": user.get("user_id"),
        "name": user.get("name", ""),
        "username": user.get("username", ""),
        "role": normalize_role(user.get("role")),
        "active": user.get("active", True),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


def hash_password(password: str, salt: Optional[str] = None) -> Dict[str, str]:
    if not salt:
        salt_bytes = secrets.token_bytes(16)
        salt = base64.b64encode(salt_bytes).decode("utf-8")

    salt_bytes = base64.b64decode(salt.encode("utf-8"))
    password_bytes = password.encode("utf-8")

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password_bytes,
        salt_bytes,
        120_000,
    )

    return {
        "password_hash": base64.b64encode(digest).decode("utf-8"),
        "password_salt": salt,
    }


def verify_password(password: str, password_hash: str, password_salt: str) -> bool:
    calculated = hash_password(password, password_salt)["password_hash"]
    return secrets.compare_digest(calculated, password_hash)


async def ensure_default_admin() -> None:
    user_count = await db.users.count_documents({})

    if user_count == 0:
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "123456")
        admin_name = os.environ.get("ADMIN_NAME", "Uğur Can")

        password_data = hash_password(admin_password)

        await db.users.insert_one({
            "user_id": "user_admin",
            "name": admin_name,
            "username": admin_username,
            "role": "admin",
            "active": True,
            **password_data,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })

    list_count = await db.task_lists.count_documents({})

    if list_count == 0:
        await db.task_lists.insert_one({
            "list_id": "list_default",
            "name": "Sneezy Görevler",
            "icon": "House",
            "color": "#002FA7",
            "theme_bg": "none",
            "order": 0,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })


async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("session_token")

    if not token:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0},
    )

    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")

    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0},
    )

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="User inactive")

    return user


def require_admin(user: Dict[str, Any]) -> None:
    if normalize_role(user.get("role")) != "admin":
        raise HTTPException(status_code=403, detail="Admin permission required")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_default_admin()
    yield
    client.close()


app = FastAPI(title="Sneezy Görev API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


allowed_origins = [
    origin.strip()
    for origin in CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginPayload(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str = "staff"
    active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None


class TaskListCreate(BaseModel):
    name: str
    icon: Optional[str] = "House"
    color: Optional[str] = "#002FA7"
    theme_bg: Optional[str] = "none"


class TaskListUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    theme_bg: Optional[str] = None
    order: Optional[int] = None


class Step(BaseModel):
    id: str
    title: str
    completed: bool = False


class TaskCreate(BaseModel):
    title: str
    list_id: Optional[str] = None
    notes: Optional[str] = ""
    completed: Optional[bool] = False
    important: Optional[bool] = False
    my_day: Optional[bool] = False
    due_date: Optional[str] = None
    reminder_at: Optional[str] = None
    recurrence: Optional[str] = "none"
    tags: Optional[List[str]] = []
    steps: Optional[List[Step]] = []

    barcode: Optional[str] = ""
    stock_code: Optional[str] = ""
    quantity: Optional[int] = 1
    initial_quantity: Optional[int] = 1

    product_name: Optional[str] = ""
    variant_name: Optional[str] = ""
    variant_id: Optional[str] = ""
    product_id: Optional[str] = ""

    image_url: Optional[str] = ""
    image_urls: Optional[List[str]] = []

    matched: Optional[bool] = None
    match_code: Optional[str] = ""
    source: Optional[str] = "manual"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    list_id: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None
    important: Optional[bool] = None
    my_day: Optional[bool] = None
    due_date: Optional[str] = None
    reminder_at: Optional[str] = None
    recurrence: Optional[str] = None
    tags: Optional[List[str]] = None
    steps: Optional[List[Step]] = None
    order: Optional[int] = None

    barcode: Optional[str] = None
    stock_code: Optional[str] = None
    quantity: Optional[int] = None
    initial_quantity: Optional[int] = None

    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    variant_id: Optional[str] = None
    product_id: Optional[str] = None

    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None

    matched: Optional[bool] = None
    match_code: Optional[str] = None
    source: Optional[str] = None


class ProductDataImport(BaseModel):
    products: List[Dict[str, Any]]


@api_router.get("/")
async def root():
    return {
        "ok": True,
        "message": "Sneezy Görev API çalışıyor",
    }


@api_router.get("/health")
async def health():
    return {
        "ok": True,
        "db": DB_NAME,
        "time": now_iso(),
    }


@api_router.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    await ensure_default_admin()

    username = payload.username.strip()
    password = payload.password.strip()

    user = await db.users.find_one(
        {"username": username},
        {"_id": 0},
    )

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Kullanıcı pasif durumda")

    if not verify_password(
        password,
        user.get("password_hash", ""),
        user.get("password_salt", ""),
    ):
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")

    session_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="none" if COOKIE_SECURE else "lax",
        path="/",
    )

    return {
        "user": public_user(user),
        "session_token": session_token,
    }


@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")

    if not token:
        auth_header = request.headers.get("Authorization") or ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if token:
        await db.user_sessions.delete_one({"session_token": token})

    response.delete_cookie("session_token", path="/")

    return {"ok": True}


@api_router.get("/users")
async def list_users(request: Request):
    user = await get_current_user(request)
    require_admin(user)

    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0, "password_salt": 0},
    ).sort("created_at", 1).to_list(500)

    return [public_user(item) for item in users]


@api_router.post("/users")
async def create_user(payload: UserCreate, request: Request):
    user = await get_current_user(request)
    require_admin(user)

    username = payload.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Kullanıcı adı zorunlu")

    exists = await db.users.find_one({"username": username})

    if exists:
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")

    password_data = hash_password(payload.password.strip())

    doc = {
        "user_id": create_id("user"),
        "name": payload.name.strip(),
        "username": username,
        "role": normalize_role(payload.role),
        "active": payload.active,
        **password_data,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    await db.users.insert_one(doc.copy())

    return public_user(doc)


@api_router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, request: Request):
    current_user = await get_current_user(request)
    require_admin(current_user)

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})

    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    updates: Dict[str, Any] = {}

    if payload.name is not None:
        updates["name"] = payload.name.strip()

    if payload.username is not None:
        username = payload.username.strip()

        duplicate = await db.users.find_one({
            "username": username,
            "user_id": {"$ne": user_id},
        })

        if duplicate:
            raise HTTPException(status_code=400, detail="Bu kullanıcı adı başka kullanıcıda mevcut")

        updates["username"] = username

    if payload.role is not None:
        next_role = normalize_role(payload.role)

        admin_count = await db.users.count_documents({"role": "admin"})

        if normalize_role(target.get("role")) == "admin" and next_role != "admin" and admin_count <= 1:
            raise HTTPException(status_code=400, detail="Son yönetici personel yapılamaz")

        if current_user["user_id"] == user_id and next_role != "admin":
            raise HTTPException(status_code=400, detail="Kendi yönetici yetkinizi kaldıramazsınız")

        updates["role"] = next_role

    if payload.active is not None:
        if current_user["user_id"] == user_id and payload.active is False:
            raise HTTPException(status_code=400, detail="Kendi hesabınızı pasif yapamazsınız")

        updates["active"] = payload.active

    if payload.password:
        updates.update(hash_password(payload.password.strip()))

    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

    updates["updated_at"] = now_iso()

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": updates},
    )

    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0})

    return public_user(updated)


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    current_user = await get_current_user(request)
    require_admin(current_user)

    if current_user["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")

    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})

    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    admin_count = await db.users.count_documents({"role": "admin"})

    if normalize_role(target.get("role")) == "admin" and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Son yönetici silinemez")

    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})

    return {"ok": True}


@api_router.get("/lists")
async def list_lists(request: Request):
    await get_current_user(request)

    items = await db.task_lists.find(
        {},
        {"_id": 0},
    ).sort("order", 1).to_list(1000)

    return items


@api_router.post("/lists")
async def create_list(payload: TaskListCreate, request: Request):
    await get_current_user(request)

    count = await db.task_lists.count_documents({})

    doc = {
        "list_id": create_id("list"),
        "name": payload.name.strip(),
        "icon": payload.icon or "House",
        "color": payload.color or "#002FA7",
        "theme_bg": payload.theme_bg or "none",
        "order": count,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    await db.task_lists.insert_one(doc.copy())

    return doc


@api_router.patch("/lists/{list_id}")
async def update_list(list_id: str, payload: TaskListUpdate, request: Request):
    await get_current_user(request)

    updates = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }

    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

    updates["updated_at"] = now_iso()

    result = await db.task_lists.update_one(
        {"list_id": list_id},
        {"$set": updates},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")

    item = await db.task_lists.find_one({"list_id": list_id}, {"_id": 0})

    return item


@api_router.delete("/lists/{list_id}")
async def delete_list(list_id: str, request: Request):
    await get_current_user(request)

    result = await db.task_lists.delete_one({"list_id": list_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Liste bulunamadı")

    await db.tasks.delete_many({"list_id": list_id})

    return {"ok": True}


@api_router.get("/tasks")
async def list_tasks(
    request: Request,
    list_id: Optional[str] = None,
    smart: Optional[str] = None,
    q: Optional[str] = None,
):
    await get_current_user(request)

    query: Dict[str, Any] = {}

    if list_id and list_id not in ("smart", "null"):
        query["list_id"] = list_id

    if smart == "today":
        query["my_day"] = True
        query["completed"] = False

    elif smart == "important":
        query["important"] = True
        query["completed"] = False

    elif smart == "planned":
        query["due_date"] = {"$ne": None}
        query["completed"] = False

    elif smart == "completed":
        query["completed"] = True

    elif smart == "all":
        query["completed"] = False

    elif smart == "unmatched":
        query["matched"] = False

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"stock_code": {"$regex": q, "$options": "i"}},
            {"barcode": {"$regex": q, "$options": "i"}},
            {"product_name": {"$regex": q, "$options": "i"}},
            {"variant_name": {"$regex": q, "$options": "i"}},
        ]

    items = await db.tasks.find(
        query,
        {"_id": 0},
    ).sort([
        ("completed", 1),
        ("order", 1),
        ("created_at", -1),
    ]).to_list(5000)

    return items


@api_router.post("/tasks")
async def create_task(payload: TaskCreate, request: Request):
    await get_current_user(request)

    count = await db.tasks.count_documents({"list_id": payload.list_id})
    quantity = payload.quantity if payload.quantity is not None else 1

    doc = {
        "task_id": create_id("task"),
        "list_id": payload.list_id,
        "title": payload.title,
        "notes": payload.notes or "",
        "completed": bool(payload.completed),
        "important": bool(payload.important),
        "my_day": bool(payload.my_day),
        "due_date": payload.due_date,
        "reminder_at": payload.reminder_at,
        "recurrence": payload.recurrence or "none",
        "tags": payload.tags or [],
        "steps": [
            step.model_dump() if hasattr(step, "model_dump") else step
            for step in (payload.steps or [])
        ],
        "order": count,

        "barcode": payload.barcode or "",
        "stock_code": payload.stock_code or "",
        "quantity": quantity,
        "initial_quantity": payload.initial_quantity or quantity,

        "product_name": payload.product_name or "",
        "variant_name": payload.variant_name or "",
        "variant_id": payload.variant_id or "",
        "product_id": payload.product_id or "",

        "image_url": payload.image_url or "",
        "image_urls": payload.image_urls or [],

        "matched": payload.matched,
        "match_code": payload.match_code or "",
        "source": payload.source or "manual",

        "created_at": now_iso(),
        "updated_at": now_iso(),
        "completed_at": now_iso() if payload.completed else None,
    }

    await db.tasks.insert_one(doc.copy())

    return doc


@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, request: Request):
    await get_current_user(request)

    updates = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
    }

    if "steps" in updates and updates["steps"] is not None:
        updates["steps"] = [
            step if isinstance(step, dict) else step.model_dump()
            for step in updates["steps"]
        ]

    if "completed" in updates:
        updates["completed_at"] = now_iso() if updates["completed"] else None

    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

    updates["updated_at"] = now_iso()

    result = await db.tasks.update_one(
        {"task_id": task_id},
        {"$set": updates},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    item = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})

    return item


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    await get_current_user(request)

    result = await db.tasks.delete_one({"task_id": task_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    return {"ok": True}


@api_router.get("/product-data/stats")
async def product_data_stats(request: Request):
    await get_current_user(request)

    count = await db.product_data.count_documents({})
    meta = await db.app_meta.find_one({"key": "product_data"}, {"_id": 0})

    return {
        "count": count,
        "updated_at": meta.get("updated_at") if meta else "",
    }


@api_router.post("/product-data/import")
async def import_product_data(payload: ProductDataImport, request: Request):
    user = await get_current_user(request)
    require_admin(user)

    await db.product_data.delete_many({})

    docs = []

    for product in payload.products:
        doc = {
            **product,
            "created_at": now_iso(),
        }
        docs.append(doc)

    if docs:
        await db.product_data.insert_many(docs)

    updated_at = datetime.now().strftime("%d.%m.%Y %H:%M")

    await db.app_meta.update_one(
        {"key": "product_data"},
        {
            "$set": {
                "key": "product_data",
                "count": len(docs),
                "updated_at": updated_at,
            }
        },
        upsert=True,
    )

    return {
        "ok": True,
        "count": len(docs),
        "updated_at": updated_at,
    }


@api_router.get("/product-data/search")
async def search_product_data(
    request: Request,
    q: str,
    limit: int = 15,
):
    await get_current_user(request)

    search = q.strip()

    if not search:
        return []

    query = {
        "$or": [
            {"stock_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"main_stock_code": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
            {"variant_name": {"$regex": search, "$options": "i"}},
        ]
    }

    items = await db.product_data.find(query, {"_id": 0}).limit(limit).to_list(limit)

    return items


@api_router.delete("/product-data")
async def delete_product_data(request: Request):
    user = await get_current_user(request)
    require_admin(user)

    await db.product_data.delete_many({})
    await db.app_meta.update_one(
        {"key": "product_data"},
        {"$set": {"key": "product_data", "count": 0, "updated_at": ""}},
        upsert=True,
    )

    return {"ok": True}


app.include_router(api_router)