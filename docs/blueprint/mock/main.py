from __future__ import annotations

import json
import time
import uuid
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="pixel-pet-arena Mock API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

DATA_DIR = Path(__file__).parent / "data"
_cache: dict[str, Any] = {}


def load_json(filename: str) -> Any:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def ok(data: Any, meta: dict | None = None) -> dict:
    r = {"success": True, "data": data, "error": None}
    if meta:
        r["meta"] = meta
    return r


def err(code: str, message: str, status: int = 400) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={
            "success": False,
            "data": None,
            "error": {"code": code, "message": message},
        },
    )


def require_auth(authorization: Optional[str]) -> str:
    """Validates Bearer token. Returns the token value or raises 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise err("UNAUTHORIZED", "Missing or invalid Authorization header", 401)
    token = authorization[len("Bearer "):]
    if not token.strip():
        raise err("UNAUTHORIZED", "Bearer token is empty", 401)
    return token


def apply_scenario_delay(scenario: str, delay: int, error: bool) -> None:
    """Apply scenario/delay/error query param effects."""
    if delay and delay > 0:
        time.sleep(min(delay / 1000.0, 5.0))  # cap at 5 s for safety
    if error:
        raise err("MOCK_ERROR", "Simulated error triggered by ?error=true", 500)


def paginate(items: list, page: int, limit: int) -> tuple[list, dict]:
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    return items[start:end], {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def future_iso(seconds: int = 300) -> str:
    dt = datetime.now(timezone.utc) + timedelta(seconds=seconds)
    return dt.isoformat().replace("+00:00", "Z")


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class ClaimRequest(BaseModel):
    walletAddress: str = Field(..., example="0xABCDEF1234567890")
    nonce: Optional[str] = None


class ClaimVerifyRequest(BaseModel):
    claimId: str
    signature: str


class ClaimRecoverRequest(BaseModel):
    walletAddress: str
    recoveryCode: str


class TrainRequest(BaseModel):
    stat: str = Field(..., example="attack", description="Stat to train: attack, defense, speed, stamina")
    boostAmount: Optional[int] = Field(default=1, ge=1, le=10)


class FeedRequest(BaseModel):
    foodId: str = Field(..., example="food-berry-001")
    quantity: Optional[int] = Field(default=1, ge=1, le=99)


class ArenaEnterRequest(BaseModel):
    petId: str
    opponentPetId: Optional[str] = None
    mode: Optional[str] = Field(default="RANKED", example="RANKED")


class GdprRequest(BaseModel):
    requestType: str = Field(..., example="EXPORT", description="EXPORT or DELETE")
    reason: Optional[str] = None


class MarketplaceListingRequest(BaseModel):
    petId: str
    price: float = Field(..., gt=0)
    currency: Optional[str] = Field(default="PIXEL", example="PIXEL")
    expiresInHours: Optional[int] = Field(default=72, ge=1, le=720)


# ---------------------------------------------------------------------------
# Root / Health
# ---------------------------------------------------------------------------

@app.get("/")
def root() -> dict:
    return ok({
        "service": "pixel-pet-arena Mock API",
        "version": "1.0.0",
        "baseUrl": "/api/v1",
        "timestamp": now_iso(),
    })


@app.get("/health")
def health() -> dict:
    return ok({
        "status": "ok",
        "uptime": time.time(),
        "timestamp": now_iso(),
    })


# ---------------------------------------------------------------------------
# Claim Endpoints (no auth)
# ---------------------------------------------------------------------------

@app.post("/api/v1/claim")
def claim(
    body: ClaimRequest,
    scenario: str = Query(default="", description="Mock scenario"),
    delay: int = Query(default=0, description="Artificial delay in ms"),
    error: bool = Query(default=False, description="Trigger mock error"),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    claim_id = str(uuid.uuid4())
    nonce = body.nonce or str(uuid.uuid4()).replace("-", "")[:12].upper()

    return ok({
        "claimId": claim_id,
        "walletAddress": body.walletAddress,
        "nonce": nonce,
        "expiresAt": future_iso(300),
        "status": "PENDING",
        "createdAt": now_iso(),
    })


@app.post("/api/v1/claim/verify")
def claim_verify(
    body: ClaimVerifyRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    if not body.claimId or not body.signature:
        raise err("INVALID_PAYLOAD", "claimId and signature are required")

    pet_token = "ptk_" + uuid.uuid4().hex
    pet_id = str(uuid.uuid4())

    # Try to grab a real pet from pets.json for a more realistic token payload
    pets = load_json("pets.json")
    if pets:
        seed_pet = random.choice(pets)
        pet_id = seed_pet.get("id", pet_id)

    return ok({
        "claimId": body.claimId,
        "petToken": pet_token,
        "petId": pet_id,
        "petUrl": f"/api/v1/pets/{pet_id}",
        "expiresAt": future_iso(86400),
        "verifiedAt": now_iso(),
    })


@app.post("/api/v1/claim/recover")
def claim_recover(
    body: ClaimRecoverRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    if not body.recoveryCode or len(body.recoveryCode) < 6:
        raise err("INVALID_RECOVERY_CODE", "Recovery code must be at least 6 characters")

    new_token = "ptk_" + uuid.uuid4().hex

    return ok({
        "walletAddress": body.walletAddress,
        "recoveryToken": new_token,
        "expiresAt": future_iso(3600),
        "recoveredAt": now_iso(),
        "message": "Recovery initiated. Use recoveryToken to re-authenticate.",
    })


# ---------------------------------------------------------------------------
# Pet Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/pets/random")
def get_random_pet(
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    if not pets:
        raise err("NO_PETS", "No pets available", 404)

    pet = random.choice(pets)
    return ok(pet)


@app.get("/api/v1/pets/{petId}")
def get_pet(
    petId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    for pet in pets:
        if pet.get("id") == petId:
            return ok(pet)

    raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)


@app.get("/api/v1/pets/{petId}/stats")
def get_pet_stats(
    petId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    for pet in pets:
        if pet.get("id") == petId:
            base_stats = pet.get("stats", {})
            return ok({
                "petId": petId,
                "name": pet.get("name"),
                "level": pet.get("level", 1),
                "rarity": pet.get("rarity"),
                "element": pet.get("element"),
                "stats": base_stats,
                "combatPower": sum(base_stats.values()) if base_stats else 0,
                "trainingSessions": random.randint(0, 50),
                "arenaWins": random.randint(0, 30),
                "arenaLosses": random.randint(0, 20),
                "updatedAt": pet.get("updatedAt", now_iso()),
            })

    raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)


@app.post("/api/v1/pets/{petId}/train")
def train_pet(
    petId: str,
    body: TrainRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    valid_stats = {"attack", "defense", "speed", "stamina"}
    if body.stat not in valid_stats:
        raise err("INVALID_STAT", f"stat must be one of {sorted(valid_stats)}")

    pets = load_json("pets.json")
    for pet in pets:
        if pet.get("id") == petId:
            stats = dict(pet.get("stats", {}))
            old_value = stats.get(body.stat, 0)
            new_value = min(old_value + (body.boostAmount or 1), 100)
            stats[body.stat] = new_value

            return ok({
                "petId": petId,
                "name": pet.get("name"),
                "trainedStat": body.stat,
                "before": old_value,
                "after": new_value,
                "delta": new_value - old_value,
                "stats": stats,
                "xpGained": random.randint(10, 50),
                "trainedAt": now_iso(),
            })

    raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)


@app.post("/api/v1/pets/{petId}/feed")
def feed_pet(
    petId: str,
    body: FeedRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    for pet in pets:
        if pet.get("id") == petId:
            stamina_gain = random.randint(2, 8) * (body.quantity or 1)
            return ok({
                "petId": petId,
                "name": pet.get("name"),
                "foodId": body.foodId,
                "quantity": body.quantity or 1,
                "staminaGained": stamina_gain,
                "happinessGained": random.randint(1, 5),
                "fedAt": now_iso(),
                "nextFeedAvailableAt": future_iso(3600),
            })

    raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)


# ---------------------------------------------------------------------------
# Arena Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/arena/enter")
def arena_enter(
    body: ArenaEnterRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    pet = next((p for p in pets if p.get("id") == body.petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", f"Pet '{body.petId}' not found", 404)

    # Pick opponent from existing pets (or use provided opponentPetId)
    opponent = None
    if body.opponentPetId:
        opponent = next((p for p in pets if p.get("id") == body.opponentPetId), None)
    if not opponent:
        candidates = [p for p in pets if p.get("id") != body.petId]
        opponent = random.choice(candidates) if candidates else pet

    match_id = str(uuid.uuid4())
    outcome = random.choice(["WIN", "LOSS", "DRAW"])
    duration_seconds = random.randint(30, 180)

    return ok({
        "matchId": match_id,
        "mode": body.mode or "RANKED",
        "outcome": outcome,
        "pet": {
            "id": pet["id"],
            "name": pet["name"],
            "score": random.randint(50, 200),
        },
        "opponent": {
            "id": opponent["id"],
            "name": opponent["name"],
            "score": random.randint(50, 200),
        },
        "durationSeconds": duration_seconds,
        "ratingChange": random.randint(-20, 30) if outcome != "DRAW" else 0,
        "xpGained": random.randint(20, 100),
        "enteredAt": now_iso(),
        "completedAt": future_iso(duration_seconds),
    })


@app.get("/api/v1/arena/match/{matchId}")
def get_arena_match(
    matchId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    # Load arena history or generate a synthetic match record
    arena_data = load_json("arena.json")
    if arena_data:
        match = next((m for m in arena_data if m.get("matchId") == matchId), None)
        if match:
            return ok(match)

    # Synthetic match fallback
    pets = load_json("pets.json")
    pet_a = random.choice(pets) if pets else {"id": str(uuid.uuid4()), "name": "UnknownPet"}
    pet_b = random.choice(pets) if pets else {"id": str(uuid.uuid4()), "name": "UnknownPet"}

    return ok({
        "matchId": matchId,
        "mode": "RANKED",
        "status": "COMPLETED",
        "outcome": random.choice(["WIN", "LOSS", "DRAW"]),
        "petA": {"id": pet_a["id"], "name": pet_a["name"], "score": random.randint(50, 200)},
        "petB": {"id": pet_b["id"], "name": pet_b["name"], "score": random.randint(50, 200)},
        "durationSeconds": random.randint(30, 180),
        "completedAt": now_iso(),
    })


@app.get("/api/v1/arena/history/{petId}")
def get_arena_history(
    petId: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    if scenario == "empty":
        return ok([], meta={"total": 0, "page": page, "limit": limit, "pages": 0})

    arena_data = load_json("arena.json")
    if arena_data:
        matches = [m for m in arena_data if petId in (m.get("petA", {}).get("id"), m.get("petB", {}).get("id"))]
    else:
        # Synthetic history
        pets = load_json("pets.json")
        opponents = [p for p in pets if p.get("id") != petId]
        matches = []
        for i in range(random.randint(3, 12)):
            opp = random.choice(opponents) if opponents else {"id": str(uuid.uuid4()), "name": "UnknownPet"}
            outcome = random.choice(["WIN", "LOSS", "DRAW"])
            matches.append({
                "matchId": str(uuid.uuid4()),
                "mode": random.choice(["RANKED", "CASUAL"]),
                "outcome": outcome,
                "opponentId": opp["id"],
                "opponentName": opp["name"],
                "ratingChange": random.randint(-20, 30) if outcome != "DRAW" else 0,
                "completedAt": now_iso(),
            })

    paged, meta = paginate(matches, page, limit)
    return ok(paged, meta=meta)


# ---------------------------------------------------------------------------
# Leaderboard Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/leaderboard")
def get_leaderboard(
    rarity: Optional[str] = Query(default=None, description="Filter by rarity: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    if scenario == "empty":
        return ok([], meta={"total": 0, "page": page, "limit": limit, "pages": 0})

    leaderboard = load_json("leaderboard.json")
    if not leaderboard:
        # Synthesize from pets.json
        pets = load_json("pets.json")
        leaderboard = []
        for rank, pet in enumerate(
            sorted(pets, key=lambda p: sum(p.get("stats", {}).values()), reverse=True), start=1
        ):
            leaderboard.append({
                "rank": rank,
                "petId": pet.get("id", ""),
                "name": pet.get("name", "Unknown"),
                "rarity": pet.get("rarity", "COMMON"),
                "element": pet.get("element", ""),
                "level": pet.get("level", 1),
                "ownerId": pet.get("ownerId", ""),
                "ownerName": pet.get("ownerName", "Unknown"),
                "combatPower": sum(pet.get("stats", {}).values()),
                "arenaWins": random.randint(0, 80),
                "rating": 1000 + (10 - rank) * 80 + random.randint(0, 50),
            })

    if rarity:
        leaderboard = [entry for entry in leaderboard if entry.get("rarity", "").upper() == rarity.upper()]

    paged, meta = paginate(leaderboard, page, limit)
    return ok(paged, meta=meta)


@app.get("/api/v1/leaderboard/rank/{petId}")
def get_leaderboard_rank(
    petId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    leaderboard = load_json("leaderboard.json")
    if not leaderboard:
        # Synthesize
        pets = load_json("pets.json")
        leaderboard = []
        for rank, pet in enumerate(
            sorted(pets, key=lambda p: sum(p.get("stats", {}).values()), reverse=True), start=1
        ):
            leaderboard.append({
                "rank": rank,
                "petId": pet.get("id", ""),
                "name": pet.get("name", "Unknown"),
                "rarity": pet.get("rarity", "COMMON"),
                "combatPower": sum(pet.get("stats", {}).values()),
                "rating": 1000 + (10 - rank) * 80,
            })

    entry = next((e for e in leaderboard if e.get("petId") == petId), None)
    if entry:
        return ok({**entry, "totalParticipants": len(leaderboard)})

    # Pet exists but no rank yet
    pets = load_json("pets.json")
    pet = next((p for p in pets if p.get("id") == petId), None)
    if pet:
        return ok({
            "rank": None,
            "petId": petId,
            "name": pet.get("name", "Unknown"),
            "rarity": pet.get("rarity", "COMMON"),
            "combatPower": sum(pet.get("stats", {}).values()),
            "rating": None,
            "totalParticipants": len(leaderboard),
            "message": "Pet has not competed yet",
        })

    raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)


# ---------------------------------------------------------------------------
# GDPR Endpoints (required auth)
# ---------------------------------------------------------------------------

@app.post("/api/v1/gdpr/request", status_code=202)
def gdpr_request(
    body: GdprRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    valid_types = {"EXPORT", "DELETE"}
    if body.requestType.upper() not in valid_types:
        raise err("INVALID_REQUEST_TYPE", f"requestType must be one of {sorted(valid_types)}")

    job_id = "gdpr_" + uuid.uuid4().hex

    return ok({
        "jobId": job_id,
        "requestType": body.requestType.upper(),
        "status": "QUEUED",
        "estimatedCompletionAt": future_iso(86400),
        "submittedAt": now_iso(),
        "message": "Your GDPR request has been queued and will be processed within 24 hours.",
    })


@app.get("/api/v1/gdpr/request/status")
def gdpr_request_status(
    jobId: str = Query(..., description="GDPR job ID returned from POST /gdpr/request"),
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    if not jobId.startswith("gdpr_"):
        raise err("INVALID_JOB_ID", "jobId must start with 'gdpr_'", 400)
    if len(jobId) < 8:
        raise err("INVALID_JOB_ID", "jobId is too short", 400)

    status = random.choice(["QUEUED", "PROCESSING", "COMPLETED", "FAILED"])
    result: dict[str, Any] = {
        "jobId": jobId,
        "status": status,
        "checkedAt": now_iso(),
    }

    if status == "COMPLETED":
        result["completedAt"] = now_iso()
        result["downloadUrl"] = f"https://downloads.pixel-pet-arena.example.com/gdpr/{jobId}.zip"
        result["expiresAt"] = future_iso(172800)
    elif status == "FAILED":
        result["failedAt"] = now_iso()
        result["reason"] = "Internal processing error. Please re-submit your request."
    else:
        result["estimatedCompletionAt"] = future_iso(43200)

    return ok(result)


# ---------------------------------------------------------------------------
# Marketplace Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/marketplace/listings")
def get_marketplace_listings(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sortBy: str = Query(default="createdAt", description="Field to sort by"),
    order: str = Query(default="desc", description="asc or desc"),
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
) -> dict:
    apply_scenario_delay(scenario, delay, error)

    if scenario == "empty":
        return ok([], meta={"total": 0, "page": page, "limit": limit, "pages": 0})

    listings = load_json("marketplace.json")
    if not listings:
        # Synthesize from pets.json
        pets = load_json("pets.json")
        listings = []
        for pet in pets:
            listing_id = str(uuid.uuid4())
            listings.append({
                "listingId": listing_id,
                "petId": pet["id"],
                "petName": pet["name"],
                "rarity": pet["rarity"],
                "element": pet["element"],
                "level": pet["level"],
                "sellerId": pet["ownerId"],
                "sellerName": pet["ownerName"],
                "price": round(random.uniform(10.0, 500.0), 2),
                "currency": "PIXEL",
                "status": "ACTIVE",
                "createdAt": pet.get("createdAt", now_iso()),
                "expiresAt": future_iso(72 * 3600),
            })

    # Sort
    reverse = order.lower() == "desc"
    try:
        listings = sorted(listings, key=lambda x: x.get(sortBy, ""), reverse=reverse)
    except TypeError:
        pass  # fall back to unsorted if field types are incompatible

    paged, meta = paginate(listings, page, limit)
    return ok(paged, meta=meta)


@app.post("/api/v1/marketplace/listings", status_code=201)
def create_marketplace_listing(
    body: MarketplaceListingRequest,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    pets = load_json("pets.json")
    pet = next((p for p in pets if p.get("id") == body.petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", f"Pet '{body.petId}' not found", 404)

    listing_id = str(uuid.uuid4())
    expires_in = body.expiresInHours or 72

    return ok({
        "listingId": listing_id,
        "petId": body.petId,
        "petName": pet["name"],
        "rarity": pet["rarity"],
        "price": body.price,
        "currency": body.currency or "PIXEL",
        "status": "ACTIVE",
        "createdAt": now_iso(),
        "expiresAt": future_iso(expires_in * 3600),
    })


@app.delete("/api/v1/marketplace/listings/{listingId}", status_code=200)
def delete_marketplace_listing(
    listingId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    listings = load_json("marketplace.json")
    listing = next((l for l in listings if l.get("listingId") == listingId), None)

    # If not in data file, treat as valid synthetic deletion
    return ok({
        "listingId": listingId,
        "status": "CANCELLED",
        "cancelledAt": now_iso(),
        "message": "Listing has been removed from the marketplace.",
    })


@app.post("/api/v1/marketplace/listings/{listingId}/buy")
def buy_marketplace_listing(
    listingId: str,
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    listings = load_json("marketplace.json")
    listing = next((l for l in listings if l.get("listingId") == listingId), None)

    if not listing:
        # Synthesize a purchase receipt for unknown listing IDs
        pets = load_json("pets.json")
        pet = random.choice(pets) if pets else {"id": str(uuid.uuid4()), "name": "UnknownPet", "rarity": "COMMON"}
        listing = {
            "listingId": listingId,
            "petId": pet["id"],
            "petName": pet["name"],
            "rarity": pet.get("rarity", "COMMON"),
            "price": round(random.uniform(10.0, 200.0), 2),
            "currency": "PIXEL",
        }

    transaction_id = "txn_" + uuid.uuid4().hex

    return ok({
        "transactionId": transaction_id,
        "listingId": listingId,
        "petId": listing.get("petId"),
        "petName": listing.get("petName"),
        "price": listing.get("price"),
        "currency": listing.get("currency", "PIXEL"),
        "status": "SUCCESS",
        "purchasedAt": now_iso(),
        "newOwnerId": "u_mock_buyer_" + uuid.uuid4().hex[:8],
    })


@app.get("/api/v1/marketplace/history/{petId}")
def get_marketplace_history(
    petId: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    scenario: str = Query(default=""),
    delay: int = Query(default=0),
    error: bool = Query(default=False),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    require_auth(authorization)
    apply_scenario_delay(scenario, delay, error)

    if scenario == "empty":
        return ok([], meta={"total": 0, "page": page, "limit": limit, "pages": 0})

    marketplace = load_json("marketplace.json")
    history = [
        entry for entry in marketplace
        if entry.get("petId") == petId and entry.get("status") in ("SOLD", "COMPLETED")
    ]

    if not history:
        # Synthesize transaction history for pet
        pets = load_json("pets.json")
        pet = next((p for p in pets if p.get("id") == petId), None)
        if not pet:
            raise err("PET_NOT_FOUND", f"Pet '{petId}' not found", 404)

        history = []
        for _ in range(random.randint(0, 5)):
            history.append({
                "transactionId": "txn_" + uuid.uuid4().hex,
                "listingId": str(uuid.uuid4()),
                "petId": petId,
                "petName": pet["name"],
                "price": round(random.uniform(10.0, 400.0), 2),
                "currency": "PIXEL",
                "status": "SOLD",
                "sellerId": pet["ownerId"],
                "buyerId": "u_mock_" + uuid.uuid4().hex[:8],
                "soldAt": now_iso(),
            })

    paged, meta = paginate(history, page, limit)
    return ok(paged, meta=meta)
