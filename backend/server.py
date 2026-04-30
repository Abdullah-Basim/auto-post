from dotenv import load_dotenv
load_dotenv()

import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

# Config
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "autopost")
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@autopost.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI(title="Autopost API")

# CORS
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ============ HELPERS ============

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ MODELS ============

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str = "User"


class LoginInput(BaseModel):
    email: str
    password: str


class NicheInput(BaseModel):
    niche: str


class ReplyInput(BaseModel):
    comment_id: str
    reply_text: str


class VaultKeyInput(BaseModel):
    provider: str
    api_key: str


# ============ STARTUP ============

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
    # Seed mock data
    await seed_mock_data()


async def seed_mock_data():
    # Seed platforms if empty
    if await db.platforms.count_documents({}) == 0:
        platforms = [
            {"name": "Facebook", "slug": "facebook", "connected": True, "health": "healthy", "last_post_metrics": {"likes": 234, "comments": 18, "shares": 45}},
            {"name": "Instagram", "slug": "instagram", "connected": True, "health": "healthy", "last_post_metrics": {"likes": 1203, "comments": 87, "shares": 23}},
            {"name": "X", "slug": "x", "connected": True, "health": "degraded", "last_post_metrics": {"likes": 89, "comments": 12, "shares": 34}},
            {"name": "LinkedIn", "slug": "linkedin", "connected": True, "health": "healthy", "last_post_metrics": {"likes": 456, "comments": 23, "shares": 67}},
            {"name": "TikTok", "slug": "tiktok", "connected": False, "health": "disconnected", "last_post_metrics": {"likes": 0, "comments": 0, "shares": 0}},
        ]
        await db.platforms.insert_many(platforms)

    # Seed comments if empty
    if await db.comments.count_documents({}) == 0:
        comments = [
            {"platform": "instagram", "author": "tech_sarah", "text": "This is amazing content! Keep it up!", "sentiment": "positive", "suggested_reply": "Thank you so much, Sarah! We appreciate the support!", "replied": False, "created_at": datetime.now(timezone.utc)},
            {"platform": "x", "author": "dev_mike", "text": "How does this compare to Buffer?", "sentiment": "question", "suggested_reply": "Great question! Unlike Buffer, Autopost uses AI to generate content automatically, not just schedule it.", "replied": False, "created_at": datetime.now(timezone.utc)},
            {"platform": "linkedin", "author": "ceo_jane", "text": "Not impressed. The formatting is off.", "sentiment": "negative", "suggested_reply": "Thank you for the feedback, Jane. We're constantly improving and would love to hear more specific details so we can address this.", "replied": False, "created_at": datetime.now(timezone.utc)},
            {"platform": "facebook", "author": "startup_fan", "text": "When will you support Threads?", "sentiment": "question", "suggested_reply": "Threads support is on our roadmap! We'll announce it once it's ready.", "replied": False, "created_at": datetime.now(timezone.utc)},
            {"platform": "instagram", "author": "design_pro", "text": "Love the visual aesthetic of your posts!", "sentiment": "positive", "suggested_reply": "That means a lot coming from a design professional! Our AI focuses on creating visually compelling content.", "replied": False, "created_at": datetime.now(timezone.utc)},
            {"platform": "x", "author": "angry_user", "text": "Your tool posted at the wrong time and ruined my engagement.", "sentiment": "negative", "suggested_reply": "We sincerely apologize for this issue. Let's review your scheduling settings together. Please DM us.", "replied": False, "created_at": datetime.now(timezone.utc)},
        ]
        await db.comments.insert_many(comments)


# ============ AUTH ENDPOINTS ============

@app.post("/api/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": email, "name": body.name, "role": "user", "token": access_token}


@app.post("/api/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user"), "token": access_token}


@app.get("/api/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


# ============ CONTENT PIPELINE ============

@app.post("/api/pipeline/start")
async def start_pipeline(body: NicheInput, request: Request):
    pipeline_id = str(uuid.uuid4())
    pipeline_doc = {
        "pipeline_id": pipeline_id,
        "user_id": "default",
        "niche": body.niche,
        "status": "running",
        "current_stage": 1,
        "stages": {
            "1": {"name": "Source Discovery", "status": "running", "result": None},
            "2": {"name": "Topic Enrichment", "status": "pending", "result": None},
            "3": {"name": "Copywriting", "status": "pending", "result": None},
            "4": {"name": "Creative Generation", "status": "pending", "result": None},
            "5": {"name": "Platform Approval", "status": "pending", "result": None},
        },
        "created_at": datetime.now(timezone.utc)
    }
    await db.pipelines.insert_one(pipeline_doc)

    # Add agent log
    await add_agent_log("pipeline_start", f"Content pipeline initiated for niche: {body.niche}", pipeline_id)

    # Run AI generation in background (simulate stages)
    import asyncio
    asyncio.create_task(run_pipeline(pipeline_id, body.niche))

    return {"pipeline_id": pipeline_id, "status": "running", "niche": body.niche}


async def run_pipeline(pipeline_id: str, niche: str):
    """Run the 5-stage content pipeline with AI"""
    import asyncio
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    try:
        # Stage 1: Source Discovery
        await asyncio.sleep(2)
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pipeline-{pipeline_id}-s1", system_message="You are a social media trend researcher. Find trending topics and sources.")
        chat.with_model("openai", "gpt-4o-mini")
        msg = UserMessage(text=f"Find 3 trending topics in the '{niche}' niche for social media content. Return as a brief JSON array with 'topic' and 'source' fields.")
        result1 = await chat.send_message(msg)
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"stages.1.status": "complete", "stages.1.result": result1, "current_stage": 2, "stages.2.status": "running"}})
        await add_agent_log("stage_complete", f"Source Discovery complete. Found trends for {niche}", pipeline_id)

        # Stage 2: Topic Enrichment
        await asyncio.sleep(2)
        chat2 = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pipeline-{pipeline_id}-s2", system_message="You enrich content topics with research and insights.")
        chat2.with_model("openai", "gpt-4o-mini")
        msg2 = UserMessage(text=f"Based on these trends: {result1}\n\nEnrich the top topic with 3 key insights, statistics, and audience angles. Be concise.")
        result2 = await chat2.send_message(msg2)
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"stages.2.status": "complete", "stages.2.result": result2, "current_stage": 3, "stages.3.status": "running"}})
        await add_agent_log("stage_complete", f"Topic Enrichment complete for pipeline {pipeline_id}", pipeline_id)

        # Stage 3: Copywriting
        await asyncio.sleep(2)
        chat3 = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pipeline-{pipeline_id}-s3", system_message="You are an expert social media copywriter. Write engaging, viral-worthy posts.")
        chat3.with_model("openai", "gpt-4o-mini")
        msg3 = UserMessage(text=f"Based on this research: {result2}\n\nWrite 3 social media posts (one for LinkedIn, one for X/Twitter, one for Instagram). Each should be platform-optimized with hashtags.")
        result3 = await chat3.send_message(msg3)
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"stages.3.status": "complete", "stages.3.result": result3, "current_stage": 4, "stages.4.status": "running"}})
        await add_agent_log("stage_complete", f"Copywriting complete for pipeline {pipeline_id}", pipeline_id)

        # Stage 4: Creative Generation (simulated)
        await asyncio.sleep(2)
        result4 = "Creative assets generated: 1x LinkedIn carousel mockup, 1x X post image, 1x Instagram story template. Assets ready for review."
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"stages.4.status": "complete", "stages.4.result": result4, "current_stage": 5, "stages.5.status": "running"}})
        await add_agent_log("stage_complete", f"Creative Generation complete for pipeline {pipeline_id}", pipeline_id)

        # Stage 5: Platform Approval
        await asyncio.sleep(1)
        result5 = "Content ready for approval. All posts formatted for target platforms. Awaiting user review."
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"stages.5.status": "complete", "stages.5.result": result5, "current_stage": 5, "status": "complete"}})
        await add_agent_log("pipeline_complete", f"Pipeline {pipeline_id} complete. Content ready for approval.", pipeline_id)

    except Exception as e:
        await db.pipelines.update_one({"pipeline_id": pipeline_id}, {"$set": {"status": "error", "error": str(e)}})
        await add_agent_log("pipeline_error", f"Pipeline {pipeline_id} error: {str(e)}", pipeline_id)


@app.get("/api/pipeline/{pipeline_id}")
async def get_pipeline(pipeline_id: str, request: Request):
    pipeline = await db.pipelines.find_one({"pipeline_id": pipeline_id}, {"_id": 0})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@app.get("/api/pipelines")
async def list_pipelines(request: Request):
    pipelines = await db.pipelines.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return pipelines


# ============ PLATFORMS ============

@app.get("/api/platforms")
async def get_platforms(request: Request):
    platforms = await db.platforms.find({}, {"_id": 0}).to_list(10)
    return platforms


# ============ GHOST REPLY ============

@app.get("/api/comments")
async def get_comments(request: Request):
    await get_current_user(request)
    comments = await db.comments.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    # Add string id for frontend
    all_comments = []
    async for c in db.comments.find({}).sort("created_at", -1).limit(50):
        c["id"] = str(c["_id"])
        del c["_id"]
        all_comments.append(c)
    return all_comments


@app.post("/api/comments/{comment_id}/reply")
async def reply_to_comment(comment_id: str, request: Request):
    result = await db.comments.update_one({"_id": ObjectId(comment_id)}, {"$set": {"replied": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    await add_agent_log("ghost_reply", f"Reply sent to comment {comment_id}", None)
    return {"message": "Reply sent"}


@app.post("/api/comments/generate-reply")
async def generate_reply(request: Request):
    body = await request.json()
    comment_text = body.get("comment_text", "")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"reply-{uuid.uuid4()}", system_message="You generate professional, friendly social media replies. Keep them brief (1-2 sentences).")
    chat.with_model("openai", "gpt-4o-mini")
    msg = UserMessage(text=f"Generate a professional reply to this social media comment: \"{comment_text}\"")
    reply = await chat.send_message(msg)
    return {"reply": reply}


# ============ SECURE VAULT ============

@app.get("/api/vault/keys")
async def get_vault_keys(request: Request):
    keys = await db.vault_keys.find({"user_id": "default"}, {"_id": 0, "api_key": 0}).to_list(20)
    return keys


@app.post("/api/vault/keys")
async def save_vault_key(body: VaultKeyInput, request: Request):
    await db.vault_keys.update_one(
        {"user_id": "default", "provider": body.provider},
        {"$set": {"api_key": body.api_key, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": f"{body.provider} key saved"}


# ============ AGENT LOGS ============

async def add_agent_log(log_type: str, message: str, pipeline_id: Optional[str]):
    await db.agent_logs.insert_one({
        "type": log_type,
        "message": message,
        "pipeline_id": pipeline_id,
        "timestamp": datetime.now(timezone.utc)
    })


@app.get("/api/agent-logs")
async def get_agent_logs(request: Request):
    logs = []
    async for log in db.agent_logs.find({}).sort("timestamp", -1).limit(50):
        log["id"] = str(log["_id"])
        del log["_id"]
        if log.get("timestamp"):
            log["timestamp"] = log["timestamp"].isoformat()
        logs.append(log)
    return logs


# ============ BRAIN STATUS ============

@app.get("/api/brain/status")
async def get_brain_status(request: Request):
    # Check if there's a running pipeline
    running = await db.pipelines.find_one({"status": "running"})
    if running:
        stage_names = {1: "Source Discovery", 2: "Topic Enrichment", 3: "Copywriting", 4: "Creative Generation", 5: "Platform Approval"}
        current = running.get("current_stage", 1)
        return {"status": "active", "message": f"Processing: {stage_names.get(current, 'Unknown')}", "niche": running.get("niche", "")}
    return {"status": "idle", "message": "Awaiting instructions", "niche": ""}


# ============ HEALTH ============

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "autopost-api"}
