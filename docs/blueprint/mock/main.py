"""
pixel-pet-arena Mock API Server
================================

Frontend development mock server -- 1:1 mapping to docs/API.md (53 endpoints).

Stack: FastAPI + uvicorn. Single-file. Reads JSON fixtures from data/.

Quick start:
    pip install -r requirements.txt
    uvicorn main:app --reload

Useful URLs:
    http://localhost:8000/docs       Swagger UI
    http://localhost:8000/redoc      ReDoc
    http://localhost:8000/openapi.json   Postman import target

Test parameters supported on most GET list endpoints:
    ?scenario=empty   returns []
    ?delay=1500       sleeps ms (capped 5s)
    ?error=true       returns simulated 500
"""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------

app = FastAPI(
    title="pixel-pet-arena Mock API",
    description="Frontend development mock server. 1:1 mapping to API.md (53 endpoints).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"


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
    body: dict[str, Any] = {"success": True, "data": data, "error": None}
    if meta is not None:
        body["meta"] = meta
    return body


def err(code: str, message: str, status: int = 400, details: dict | None = None) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={
            "success": False,
            "data": None,
            "error": {"code": code, "message": message, "details": details or {}},
        },
    )


def require_pet_token(authorization: Optional[str], token_query: Optional[str] = None) -> str:
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
    elif token_query:
        token = token_query.strip()
    if not token:
        raise err("UNAUTHORIZED", "Missing or invalid pet token", 401)
    return token


def require_admin_session(cookie_session: Optional[str], required_role: str = "moderator") -> dict:
    if not cookie_session:
        raise err("UNAUTHORIZED", "Admin session missing or invalid", 401)
    if cookie_session.startswith("super"):
        role = "super_admin"
    elif cookie_session.startswith("readonly"):
        role = "read_only"
    else:
        role = "moderator"
    role_rank = {"read_only": 0, "moderator": 1, "super_admin": 2}
    if role_rank[role] < role_rank.get(required_role, 1):
        raise err("FORBIDDEN", f"Admin role '{role}' insufficient; '{required_role}' or higher required", 403)
    return {"role": role, "adminId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}


def apply_test_params(scenario: Optional[str], delay: Optional[int], error: Optional[bool]) -> None:
    if delay and delay > 0:
        time.sleep(min(delay / 1000.0, 5.0))
    if error:
        raise err("MOCK_ERROR", "Simulated error triggered by ?error=true", 500)


def paginate(items: list, page: int, limit: int) -> tuple[list, dict]:
    total = len(items)
    page_eff = max(page, 1)
    limit_eff = max(limit, 1)
    start = (page_eff - 1) * limit_eff
    end = start + limit_eff
    return items[start:end], {
        "total": total,
        "page": page_eff,
        "limit": limit_eff,
        "pages": max(1, (total + limit_eff - 1) // limit_eff),
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def future_iso(seconds: int = 900) -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def fixture_for(scenario: Optional[str], normal: str, empty: str) -> Any:
    return load_json(empty if scenario == "empty" else normal)


class ClaimRequest(BaseModel):
    email: str = Field(..., example="player@example.com")
    petId: str = Field(..., example="550e8400-e29b-41d4-a716-446655440000")
    ageConfirmed: bool = Field(..., example=True)


class ClaimVerifyRequest(BaseModel):
    claimId: str = Field(..., example="7f3d9a1c-b2e4-4f88-9c6a-1a2b3c4d5e6f")
    code: str = Field(..., example="482917")


class ClaimRecoverRequest(BaseModel):
    email: str = Field(..., example="player@example.com")
    petId: str = Field(..., example="550e8400-e29b-41d4-a716-446655440000")


class TrainRequest(BaseModel):
    trainingType: str = Field(..., example="RUN", description="RUN | STRENGTH | STAMINA")


class FeedRequest(BaseModel):
    buffType: str = Field(..., example="protein_shake")
    stat: str = Field(..., example="strength", description="speed | strength | stamina")
    magnitude: int = Field(..., example=5, ge=1, le=50)
    isPermanent: Optional[bool] = Field(default=False, example=False)


class ArenaEnterRequest(BaseModel):
    petId: str = Field(..., example="550e8400-e29b-41d4-a716-446655440000")
    mode: str = Field(..., example="RACE", description="RACE | SUMO")
    acceptAI: Optional[bool] = Field(default=False, example=True)


class GdprRequestBody(BaseModel):
    type: str = Field(..., example="erasure", description="erasure | data_access | restrict_processing | object_leaderboard | rectification")


class MarketplaceListingCreate(BaseModel):
    petId: str = Field(..., example="550e8400-e29b-41d4-a716-446655440000")
    priceCredits: int = Field(..., example=2500, gt=0)
    expiresInHours: Optional[int] = Field(default=168, ge=1, le=720)


class AdminLoginRequest(BaseModel):
    username: str = Field(..., example="moderator_alice")
    password: str = Field(..., example="correct-horse-battery-staple")
    totpCode: Optional[str] = Field(default=None, example="482917")


class AdminTotpSetupRequest(BaseModel):
    setupToken: str = Field(..., example="signed.jwt.token")
    password: str = Field(..., example="correct-horse-battery-staple")


class AdminTotpVerifyRequest(BaseModel):
    totpCode: str = Field(..., example="482917")


class AdminCreateRoleRequest(BaseModel):
    username: str = Field(..., example="new_moderator")
    role: str = Field(..., example="moderator", description="super_admin | moderator | read_only")
    temporaryPassword: str = Field(..., example="temp-password-123")


class AdminPetUpdateRequest(BaseModel):
    petName: Optional[str] = Field(default=None, example="Crimson Vexor")


class AdminBanRequest(BaseModel):
    reason: str = Field(..., example="Inappropriate pet name detected after community report")


class AdminFlagBattleRequest(BaseModel):
    reason: str = Field(..., example="Suspicious win pattern flagged by analytics")


class AdminUnflagBattleRequest(BaseModel):
    reason: Optional[str] = Field(default=None, example="False positive after manual review")


class ConfigRuntimeUpdate(BaseModel):
    arenaBattlesPerPetPerHour: Optional[int] = None
    trainingActionsPerDay: Optional[int] = None
    arenaMatchmakingTimeoutSeconds: Optional[int] = None


class ConfigEconomyUpdate(BaseModel):
    tradeTransactionFeePercent: Optional[float] = None
    rarityCommonPercent: Optional[int] = None
    rarityRarePercent: Optional[int] = None
    rarityEpicPercent: Optional[int] = None
    rarityLegendaryPercent: Optional[int] = None


class ConfigFlagUpdate(BaseModel):
    enabled: bool


class AdminGdprDeleteRequest(BaseModel):
    requestId: str = Field(..., example="3c4d5e6f-7a8b-9c0d-e1f2-a3b4c5d6e7f8")
    confirmed: bool = Field(..., example=True)


class AdminGdprPatch(BaseModel):
    status: str = Field(..., example="completed", description="pending | processing | completed | failed")
    adminNotes: Optional[str] = None


@app.get("/", tags=["health"])
def root() -> dict:
    """Mock API root. Sanity check."""
    return {"message": "pixel-pet-arena Mock API is running", "docsUrl": "/docs"}


@app.get("/health", tags=["health"])
def health() -> dict:
    """API.md section 10 - Liveness probe."""
    return ok({"status": "ok", "version": "1.0.0", "timestamp": now_iso()})


@app.post("/api/v1/claim", tags=["claim"])
def claim_init(body: ClaimRequest, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.1 - Initiate email claim flow; returns claimId + expiresAt (15 min)."""
    apply_test_params(scenario, delay, error)
    if not body.ageConfirmed:
        raise err("AGE_CONFIRMATION_REQUIRED", "ageConfirmed must be true", 400)
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == body.petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    if pet.get("claimedAt"):
        raise err("ALREADY_CLAIMED", "Pet is already claimed", 400)
    return ok({"claimId": str(uuid.uuid4()), "expiresAt": future_iso(15 * 60)})


@app.post("/api/v1/claim/verify", tags=["claim"])
def claim_verify(body: ClaimVerifyRequest, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.1 - Verify OTP and issue 32-byte petToken (transmitted exactly once)."""
    apply_test_params(scenario, delay, error)
    if body.code == "000000":
        raise err("INVALID_CODE", "Code does not match", 400)
    if body.code == "111111":
        raise err("CODE_EXPIRED", "OTP expired (15 minute window)", 400)
    pet_id = "550e8400-e29b-41d4-a716-446655440000"
    pet_token = "dGhpcyBpcyBhIDMyLWJ5dGUgY3J5cHRvZ3JhcGhpY2FsbHkgcmFuZG9t"
    return ok({"petToken": pet_token, "petId": pet_id, "petUrl": f"https://pixel-pet-arena.com/pet/{pet_id}?token={pet_token}"})


@app.post("/api/v1/claim/recover", tags=["claim"])
def claim_recover(body: ClaimRecoverRequest, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.1 - Recovery OTP; always returns 200 (anti-enumeration)."""
    apply_test_params(scenario, delay, error)
    return ok({"claimId": str(uuid.uuid4()), "expiresAt": future_iso(15 * 60)})


@app.get("/api/v1/pets/random", tags=["pets"])
def pets_random(scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.2 - Generate a new unclaimed random pet for guest preview (24h reserved)."""
    apply_test_params(scenario, delay, error)
    pets = load_json("pets.json")
    guest = next((p for p in pets if p.get("reservedUntil") and not p.get("claimedAt")), pets[0])
    return ok({
        "id": guest["id"],
        "seed": guest["seed"],
        "rarity": guest["rarity"],
        "petName": guest["petName"],
        "stats": guest["stats"],
        "generationMeta": guest["generationMeta"],
        "reservedUntil": future_iso(24 * 3600),
    })


@app.get("/api/v1/pets/{petId}", tags=["pets"])
def pets_get(petId: str, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.2 - Public pet data; isOwner reflects optional auth."""
    apply_test_params(scenario, delay, error)
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    is_owner = bool(authorization or token)
    last_trained = pet.get("lastTrainedAt")
    is_neglected = (not last_trained) or (datetime.fromisoformat(last_trained.replace("Z", "+00:00")) < datetime.now(timezone.utc) - timedelta(days=3))
    return ok({
        "id": pet["id"],
        "seed": pet["seed"],
        "rarity": pet["rarity"],
        "petName": pet["petName"],
        "stats": pet["stats"],
        "isOwner": is_owner,
        "claimedAt": pet.get("claimedAt"),
        "isNeglected": is_neglected,
    })


@app.get("/api/v1/pets/{petId}/stats", tags=["pets"])
def pets_stats(petId: str, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.2 - Full stats panel including training history summary and active food buffs."""
    apply_test_params(scenario, delay, error)
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    food_buffs = [b for b in load_json("food_buffs.json") if b["petId"] == petId]
    active_buffs = [{"stat": b["buffStat"], "magnitude": b["magnitude"], "isPermanent": b["isPermanent"], "expiresAt": b.get("expiresAt")} for b in food_buffs]
    total_training = pet.get("totalTrainingActions", 0)
    last_trained = pet.get("lastTrainedAt")
    is_neglected = (not last_trained) or (datetime.fromisoformat(last_trained.replace("Z", "+00:00")) < datetime.now(timezone.utc) - timedelta(days=3))
    return ok({
        "petId": petId,
        "stats": pet["stats"],
        "totalTrainingActions": total_training,
        "trainingActionsToday": 1,
        "actionsRemainingToday": 2,
        "lastTrainedAt": last_trained,
        "isNeglected": is_neglected,
        "activeFoodBuffs": active_buffs,
    })


@app.post("/api/v1/pets/{petId}/train", tags=["pets"])
def pets_train(petId: str, body: TrainRequest, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.2 - Perform one training action (+1..3 stat points)."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    if body.trainingType not in {"RUN", "STRENGTH", "STAMINA"}:
        raise err("VALIDATION_ERROR", "Invalid trainingType", 400)
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    stat_key = {"RUN": "speed", "STRENGTH": "strength", "STAMINA": "stamina"}[body.trainingType]
    delta = 2
    new_stats = dict(pet["stats"])
    if new_stats.get(stat_key, 10) >= 100:
        raise err("STAT_AT_MAXIMUM", "Target stat already at 100", 400)
    new_stats[stat_key] = min(100, new_stats.get(stat_key, 10) + delta)
    return ok({"updatedStats": new_stats, "statDelta": delta, "actionsRemainingToday": 1})


@app.post("/api/v1/pets/{petId}/feed", tags=["pets"])
def pets_feed(petId: str, body: FeedRequest, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.2 - Apply food buff (temporary or permanent)."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    if body.stat not in {"speed", "strength", "stamina"}:
        raise err("VALIDATION_ERROR", "Invalid stat value", 400)
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    new_stats = {k: pet["stats"][k] for k in ("speed", "strength", "stamina") if k in pet["stats"]}
    new_stats[body.stat] = min(100, new_stats.get(body.stat, 10) + body.magnitude)
    return ok({"updatedStats": new_stats, "buffApplied": {"stat": body.stat, "magnitude": body.magnitude, "isPermanent": bool(body.isPermanent), "expiresAt": None if body.isPermanent else future_iso(24 * 3600)}})


@app.post("/api/v1/arena/enter", tags=["arena"])
def arena_enter(body: ArenaEnterRequest, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.3 - HTTP long-poll matchmaking (up to 30s) with optional AI fallback."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    if body.mode not in {"RACE", "SUMO"}:
        raise err("VALIDATION_ERROR", "Invalid mode", 400)
    matches = load_json("arena.json")
    if not matches:
        raise err("MATCHMAKING_TIMEOUT", "No opponent found within 30 seconds", 408)
    sample = matches[0]
    return ok({"matchId": sample["matchId"], "result": "WIN", "opponentPetId": sample.get("petBId"), "isAiOpponent": sample.get("isAiOpponent", False), "statDelta": sample.get("statDeltaA", 2), "newLeaderboardScore": 142.7})


@app.get("/api/v1/arena/match/{matchId}", tags=["arena"])
def arena_match_get(matchId: str, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.3 - Public arena match record with full battleLog."""
    apply_test_params(scenario, delay, error)
    matches = load_json("arena.json")
    match = next((m for m in matches if m["matchId"] == matchId), None)
    if not match:
        raise err("MATCH_NOT_FOUND", "No match with given matchId", 404)
    return ok({"matchId": match["matchId"], "mode": match["mode"], "petA": match["petA"], "petB": match.get("petB"), "winnerId": match.get("winnerPetId"), "battleLog": match["battleLog"], "completedAt": match["completedAt"]})


@app.get("/api/v1/arena/history/{petId}", tags=["arena"])
def arena_history(petId: str, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.3 - Last 20 battles for a pet plus win/loss summary (OG-card source)."""
    apply_test_params(scenario, delay, error)
    pets = load_json("pets.json")
    if not any(p["id"] == petId for p in pets):
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    matches = load_json("arena.json") if scenario != "empty" else []
    relevant = [m for m in matches if m.get("petAId") == petId or m.get("petBId") == petId][:20]
    battles = [{"matchId": m["matchId"], "mode": m["mode"], "opponentPetId": m["petBId"] if m["petAId"] == petId else m["petAId"], "isAiOpponent": m.get("isAiOpponent", False), "result": "WIN" if m.get("winnerPetId") == petId else "LOSS", "completedAt": m["completedAt"]} for m in relevant]
    wins = sum(1 for b in battles if b["result"] == "WIN")
    losses = len(battles) - wins
    return ok({"petId": petId, "battles": battles, "summary": {"wins": wins, "losses": losses, "winRate": round(wins / len(battles), 3) if battles else 0}})


@app.get("/api/v1/leaderboard", tags=["leaderboard"])
def leaderboard_list(rarity: Optional[str] = Query(None), page: int = Query(1, ge=1), limit: int = Query(100, ge=1, le=100), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.4 - Top 100 leaderboard entries (Redis-sourced; <=30s lag)."""
    apply_test_params(scenario, delay, error)
    entries = fixture_for(scenario, "leaderboard.json", "leaderboard_empty.json")
    if rarity:
        entries = [e for e in entries if e.get("rarity") == rarity]
    page_items, meta = paginate(entries, page, limit)
    return ok({"entries": page_items, "lastUpdated": now_iso()}, meta=meta)


@app.get("/api/v1/leaderboard/rank/{petId}", tags=["leaderboard"])
def leaderboard_rank(petId: str, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.4 - Specific pet's leaderboard rank (null if not ranked)."""
    apply_test_params(scenario, delay, error)
    pets = load_json("pets.json")
    if not any(p["id"] == petId for p in pets):
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    entries = load_json("leaderboard.json")
    entry = next((e for e in entries if e["petId"] == petId), None)
    return ok({"petId": petId, "rank": entry["rank"] if entry else None, "score": entry["score"] if entry else 0})


@app.post("/api/v1/gdpr/request", tags=["gdpr"], status_code=202)
def gdpr_request(body: GdprRequestBody, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.5 - Submit a GDPR data subject request."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    valid_types = {"erasure", "data_access", "restrict_processing", "object_leaderboard", "rectification"}
    if body.type not in valid_types:
        raise err("VALIDATION_ERROR", f"Invalid type. must be one of {sorted(valid_types)}", 400)
    return ok({"jobId": str(uuid.uuid4()), "message": "Your GDPR request has been received and will be processed within the applicable SLA."})


@app.get("/api/v1/gdpr/request/status", tags=["gdpr"])
def gdpr_request_status(jobId: str = Query(...), authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.5 - Poll GDPR request status."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    requests = load_json("gdpr_requests.json")
    job = next((r for r in requests if r["jobId"] == jobId), None)
    if not job:
        raise err("NOT_FOUND", "No GDPR request with given jobId", 404)
    return ok({"jobId": job["jobId"], "requestType": job["requestType"], "status": job["status"], "submittedAt": job["submittedAt"], "completedAt": job.get("completedAt")})


@app.get("/api/v1/marketplace/listings", tags=["marketplace"])
def marketplace_list(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), sortBy: Optional[str] = Query(None), order: Optional[str] = Query("desc"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.6 - Browse active marketplace listings (public)."""
    apply_test_params(scenario, delay, error)
    listings = fixture_for(scenario, "marketplace_listings.json", "marketplace_listings_empty.json")
    active = [l for l in listings if l.get("status") == "active"]
    if sortBy == "price":
        active.sort(key=lambda l: l.get("priceCredits", 0), reverse=(order == "desc"))
    elif sortBy == "rarity":
        rank = {"COMMON": 1, "RARE": 2, "EPIC": 3, "LEGENDARY": 4}
        active.sort(key=lambda l: rank.get(l.get("petSummary", {}).get("rarity"), 0), reverse=(order == "desc"))
    elif sortBy == "level":
        active.sort(key=lambda l: l.get("petSummary", {}).get("level", 0), reverse=(order == "desc"))
    page_items, meta = paginate(active, page, limit)
    return ok(page_items, meta=meta)


@app.post("/api/v1/marketplace/listings", tags=["marketplace"], status_code=201)
def marketplace_create(body: MarketplaceListingCreate, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.6 - Create a new marketplace listing."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    return ok({"listingId": str(uuid.uuid4()), "petId": body.petId, "priceCredits": body.priceCredits, "status": "active", "listedAt": now_iso(), "expiresAt": future_iso((body.expiresInHours or 168) * 3600)})


@app.delete("/api/v1/marketplace/listings/{listingId}", tags=["marketplace"])
def marketplace_cancel(listingId: str, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.6 - Cancel an active listing (owner only)."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    listings = load_json("marketplace_listings.json")
    if not any(l["listingId"] == listingId for l in listings):
        raise err("NOT_FOUND", "No listing with given listingId", 404)
    return ok({"listingId": listingId, "status": "cancelled", "completedAt": now_iso()})


@app.post("/api/v1/marketplace/listings/{listingId}/buy", tags=["marketplace"])
def marketplace_buy(listingId: str, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.6 - Buy a listing (5 percent platform fee deducted)."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    listings = load_json("marketplace_listings.json")
    listing = next((l for l in listings if l["listingId"] == listingId), None)
    if not listing:
        raise err("NOT_FOUND", "No listing with given listingId", 404)
    fee = listing["priceCredits"] * 5 // 100
    return ok({"transactionId": str(uuid.uuid4()), "listingId": listingId, "priceCredits": listing["priceCredits"], "feeCredits": fee, "completedAt": now_iso()})


@app.get("/api/v1/marketplace/history/{petId}", tags=["marketplace"])
def marketplace_history(petId: str, authorization: Optional[str] = Header(None), token: Optional[str] = Query(None), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 5.6 - Trade history for a pet (owner only)."""
    apply_test_params(scenario, delay, error)
    require_pet_token(authorization, token)
    pets = load_json("pets.json")
    if not any(p["id"] == petId for p in pets):
        raise err("NOT_FOUND", "No pet with given petId", 404)
    txs = [t for t in load_json("marketplace_transactions.json") if t["petId"] == petId]
    return ok({"petId": petId, "transactions": txs})


@app.post("/admin/api/auth/login", tags=["admin-auth"])
def admin_login(body: AdminLoginRequest, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.1 - Admin login with password + TOTP."""
    apply_test_params(scenario, delay, error)
    admins = load_json("admin_users.json")
    admin = next((a for a in admins if a["username"] == body.username), None)
    if not admin or admin.get("deactivatedAt"):
        raise err("UNAUTHORIZED", "Invalid username or password", 401)
    if not admin.get("totpEnrolled"):
        raise err("TOTP_SETUP_REQUIRED", "TOTP not yet enrolled", 403, details={"setupToken": "mock.signed.jwt.token"})
    if not body.totpCode:
        raise err("VALIDATION_ERROR", "totpCode required", 400)
    return ok({"adminId": admin["adminId"], "role": admin["role"], "sessionExpiresAt": future_iso(4 * 3600)})


@app.post("/admin/api/auth/totp/setup", tags=["admin-auth"])
def admin_totp_setup(body: AdminTotpSetupRequest, scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.1 - Complete TOTP enrollment for first-login admins."""
    apply_test_params(scenario, delay, error)
    if not body.setupToken or not body.password:
        raise err("VALIDATION_ERROR", "setupToken and password are required", 400)
    return ok({
        "otpAuthUrl": "otpauth://totp/pixel-pet-arena:moderator_alice?secret=BASE32SECRET&issuer=pixel-pet-arena",
        "backupCodes": ["A1B2C3D4E5", "F6G7H8I9J0", "K1L2M3N4O5", "P6Q7R8S9T0", "U1V2W3X4Y5", "Z6A7B8C9D0", "E1F2G3H4I5", "J6K7L8M9N0", "O1P2Q3R4S5", "T6U7V8W9X0"],
    })


@app.post("/admin/api/auth/logout", tags=["admin-auth"])
def admin_logout(session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.1 - Invalidate the current admin session."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    return ok({})


@app.post("/admin/api/auth/totp/verify", tags=["admin-auth"])
def admin_totp_verify(body: AdminTotpVerifyRequest, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.1 - Step-up TOTP verification for sensitive operations."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    if not body.totpCode or len(body.totpCode) != 6:
        raise err("UNAUTHORIZED", "TOTP code does not match", 401)
    return ok({"verified": True})


@app.get("/admin/api/roles", tags=["admin-roles"])
def admin_roles_list(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.2 - List all admin users (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    admins = fixture_for(scenario, "admin_users.json", "admin_users_empty.json")
    page_items, meta = paginate(admins, page, limit)
    return ok({"admins": page_items}, meta=meta)


@app.post("/admin/api/roles", tags=["admin-roles"], status_code=201)
def admin_roles_create(body: AdminCreateRoleRequest, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.2 - Create a new admin account (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    if body.role not in {"super_admin", "moderator", "read_only"}:
        raise err("VALIDATION_ERROR", "Invalid role", 400)
    admins = load_json("admin_users.json")
    if any(a["username"] == body.username for a in admins):
        raise err("CONFLICT", "Username already exists", 409)
    return ok({"adminId": str(uuid.uuid4()), "username": body.username, "role": body.role, "auditLogId": "12351"})


@app.delete("/admin/api/roles/{adminId}", tags=["admin-roles"])
def admin_roles_deactivate(adminId: str, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.2 - Soft-deactivate an admin account (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    admins = load_json("admin_users.json")
    if not any(a["adminId"] == adminId for a in admins):
        raise err("NOT_FOUND", "No admin account with given adminId", 404)
    return ok({"auditLogId": "12352"})


@app.post("/admin/api/roles/{adminId}/totp/reset", tags=["admin-roles"])
def admin_roles_totp_reset(adminId: str, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.2 - Reset TOTP for an admin (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    admins = load_json("admin_users.json")
    if not any(a["adminId"] == adminId for a in admins):
        raise err("NOT_FOUND", "No admin account with given adminId", 404)
    return ok({"auditLogId": "12353"})


@app.get("/admin/api/pets", tags=["admin-pets"])
def admin_pets_list(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), search: Optional[str] = Query(None), rarity: Optional[str] = Query(None), isBanned: Optional[bool] = Query(None), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.3 - Admin pet search/filter (moderator+ or read_only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    pets = fixture_for(scenario, "admin_pets.json", "admin_pets_empty.json")
    if search:
        pets = [p for p in pets if p["id"] == search]
    if rarity:
        pets = [p for p in pets if p["rarity"] == rarity]
    if isBanned is not None:
        pets = [p for p in pets if p["isBanned"] == isBanned]
    page_items, meta = paginate(pets, page, limit)
    return ok({"pets": page_items}, meta=meta)


@app.get("/admin/api/pets/{petId}", tags=["admin-pets"])
def admin_pets_detail(petId: str) -> dict:
    """API.md 6.3 - Full admin pet detail."""
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    return ok(pet)


@app.put("/admin/api/pets/{petId}", tags=["admin-pets"])
def admin_pets_update_pet(petId: str, body: AdminPetUpdateRequest) -> dict:
    """API.md 6.3 - Modify admin-editable pet fields (super_admin only)."""
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    return ok({"pet": pet, "auditLogId": "12354"})


@app.post("/admin/api/pets/{petId}/ban", tags=["admin-pets"])
def admin_pets_ban(petId: str, body: AdminBanRequest, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.3 - Ban a pet from arena and leaderboard (moderator+)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "moderator")
    pets = load_json("pets.json")
    pet = next((p for p in pets if p["id"] == petId), None)
    if not pet:
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    if len(body.reason) > 500:
        raise err("VALIDATION_ERROR", "Ban reason exceeds 500 chars", 400)
    return ok({"petId": petId, "isBanned": True, "bannedReason": body.reason, "bannedAt": now_iso(), "auditLogId": "12355"})


@app.post("/admin/api/pets/{petId}/unban", tags=["admin-pets"])
def admin_pets_unban(petId: str, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.3 - Unban a pet (moderator+)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "moderator")
    pets = load_json("pets.json")
    if not any(p["id"] == petId for p in pets):
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    return ok({"petId": petId, "isBanned": False, "auditLogId": "12356"})


@app.get("/admin/api/battles", tags=["admin-battles"])
def admin_battles_list(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), flagged: Optional[bool] = Query(None), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.4 - Admin battle browser with optional flagged filter."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    matches = fixture_for(scenario, "arena.json", "arena_empty.json")
    if flagged is not None:
        matches = [m for m in matches if m.get("isFlagged") == flagged]
    page_items, meta = paginate(matches, page, limit)
    return ok({"battles": page_items}, meta=meta)


@app.get("/admin/api/suspicious", tags=["admin-battles"])
def admin_suspicious(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.4 - Suspicious battles queue (analytics-flagged)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    items = fixture_for(scenario, "suspicious_battles.json", "suspicious_battles_empty.json")
    page_items, meta = paginate(items, page, limit)
    return ok({"suspiciousBattles": page_items}, meta=meta)


@app.post("/admin/api/battles/{matchId}/flag", tags=["admin-battles"])
def admin_battles_flag(matchId: str, body: AdminFlagBattleRequest, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.4 - Flag a match (moderator+)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "moderator")
    matches = load_json("arena.json")
    if not any(m["matchId"] == matchId for m in matches):
        raise err("MATCH_NOT_FOUND", "No match with given matchId", 404)
    return ok({"matchId": matchId, "isFlagged": True, "flaggedAt": now_iso(), "auditLogId": "12357"})


@app.delete("/admin/api/battles/{matchId}/flag", tags=["admin-battles"])
def admin_battles_unflag(matchId: str, body: Optional[AdminUnflagBattleRequest] = None, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.4 - Clear flag on a match (moderator+). Body optional."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "moderator")
    matches = load_json("arena.json")
    if not any(m["matchId"] == matchId for m in matches):
        raise err("MATCH_NOT_FOUND", "No match with given matchId", 404)
    return ok({"matchId": matchId, "isFlagged": False, "auditLogId": "12358"})


@app.get("/admin/api/leaderboard", tags=["admin-leaderboard"])
def admin_leaderboard_list(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=500), rarity: Optional[str] = Query(None), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.5 - Admin leaderboard view (extended limits)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    entries = fixture_for(scenario, "leaderboard.json", "leaderboard_empty.json")
    if rarity:
        entries = [e for e in entries if e.get("rarity") == rarity]
    page_items, meta = paginate(entries, page, limit)
    return ok({"entries": page_items, "lastUpdated": now_iso()}, meta=meta)


@app.delete("/admin/api/leaderboard/{petId}", tags=["admin-leaderboard"])
def admin_leaderboard_remove(petId: str, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.5 - Remove pet from leaderboard (ban reflection)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "moderator")
    pets = load_json("pets.json")
    if not any(p["id"] == petId for p in pets):
        raise err("PET_NOT_FOUND", "No pet with given petId", 404)
    return ok({"petId": petId, "removed": True, "auditLogId": "12359"})


@app.get("/admin/api/config/runtime", tags=["admin-config"])
def admin_config_runtime_get(session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - Read runtime config."""
    require_admin_session(session, "read_only")
    return ok(load_json("config_runtime.json"))


@app.put("/admin/api/config/runtime", tags=["admin-config"])
def admin_config_runtime_set(body: ConfigRuntimeUpdate, session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - Modify runtime config (super_admin only)."""
    require_admin_session(session, "super_admin")
    cfg = load_json("config_runtime.json")
    cfg.update(body.model_dump(exclude_none=True))
    cfg["lastUpdatedAt"] = now_iso()
    return ok({"config": cfg, "auditLogId": "12360"})


@app.get("/admin/api/config/economy", tags=["admin-config"])
def admin_config_economy_get(session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - Read economy config."""
    require_admin_session(session, "read_only")
    return ok(load_json("config_economy.json"))


@app.put("/admin/api/config/economy", tags=["admin-config"])
def admin_config_economy_set(body: ConfigEconomyUpdate, session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - Modify economy config (super_admin only)."""
    require_admin_session(session, "super_admin")
    cfg = load_json("config_economy.json")
    cfg.update(body.model_dump(exclude_none=True))
    cfg["lastUpdatedAt"] = now_iso()
    return ok({"config": cfg, "auditLogId": "12361"})


@app.get("/admin/api/config/flags", tags=["admin-config"])
def admin_config_flags_get(session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - List feature flags."""
    require_admin_session(session, "read_only")
    return ok(load_json("config_flags.json"))


@app.put("/admin/api/config/flags/{name}", tags=["admin-config"])
def admin_config_flag_toggle(name: str, body: ConfigFlagUpdate, session: Optional[str] = Header(None, alias="Cookie")) -> dict:
    """API.md 6.6 - Toggle a single feature toggle."""
    require_admin_session(session, "super_admin")
    return ok({"name": name, "enabled": body.enabled, "auditLogId": "12362"})


@app.get("/admin/api/gdpr", tags=["admin-gdpr"])
def admin_gdpr_list(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), status: Optional[str] = Query(None), requestType: Optional[str] = Query(None), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.7 - List GDPR requests (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    items = fixture_for(scenario, "gdpr_requests.json", "gdpr_requests_empty.json")
    if status:
        items = [r for r in items if r.get("status") == status]
    if requestType:
        items = [r for r in items if r.get("requestType") == requestType]
    page_items, meta = paginate(items, page, limit)
    return ok({"requests": page_items}, meta=meta)


@app.post("/admin/api/gdpr/delete", tags=["admin-gdpr"])
def admin_gdpr_delete(body: AdminGdprDeleteRequest, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.7 - Execute an erasure request (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    if not body.confirmed:
        raise err("VALIDATION_ERROR", "Confirmation required", 400)
    requests = load_json("gdpr_requests.json")
    target = next((r for r in requests if r["jobId"] == body.requestId), None)
    if not target:
        raise err("NOT_FOUND", "No GDPR request with given requestId", 404)
    if target["requestType"] != "erasure":
        raise err("WRONG_REQUEST_TYPE", "Target requestType is not erasure", 400)
    return ok({"jobId": body.requestId, "status": "completed", "completedAt": now_iso(), "auditLogId": "12363"})


@app.patch("/admin/api/gdpr/{requestId}", tags=["admin-gdpr"])
def admin_gdpr_patch(requestId: str, body: AdminGdprPatch, session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.7 - Update non-erasure GDPR request status (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    requests = load_json("gdpr_requests.json")
    target = next((r for r in requests if r["jobId"] == requestId), None)
    if not target:
        raise err("NOT_FOUND", "No GDPR request with given requestId", 404)
    if target["requestType"] == "erasure":
        raise err("WRONG_REQUEST_TYPE", "Erasure requests must use POST /admin/api/gdpr/delete", 400)
    valid_statuses = {"pending", "processing", "completed", "failed"}
    if body.status not in valid_statuses:
        raise err("VALIDATION_ERROR", "Invalid status", 400)
    completed_at = now_iso() if body.status in {"completed", "failed"} else None
    return ok({"jobId": requestId, "status": body.status, "adminNotes": body.adminNotes, "completedAt": completed_at, "auditLogId": "12364"})


@app.get("/admin/api/audit", tags=["admin-audit"])
def admin_audit_list(page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200), adminId: Optional[str] = Query(None), action: Optional[str] = Query(None), targetType: Optional[str] = Query(None), session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.8 - Browse audit log (super_admin only)."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "super_admin")
    items = fixture_for(scenario, "audit_logs.json", "audit_logs_empty.json")
    if adminId:
        items = [i for i in items if i.get("adminId") == adminId]
    if action:
        items = [i for i in items if i.get("action") == action]
    if targetType:
        items = [i for i in items if i.get("targetType") == targetType]
    page_items, meta = paginate(items, page, limit)
    return ok({"entries": page_items}, meta=meta)


@app.get("/admin/api/dashboard", tags=["admin-dashboard"])
def admin_dashboard(session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.9 - Operations dashboard summary."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    return ok(load_json("dashboard.json"))


@app.get("/admin/api/analytics", tags=["admin-dashboard"])
def admin_analytics(session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.9 - Detailed analytics."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    return ok(load_json("analytics.json"))


@app.get("/admin/api/email/monitor", tags=["admin-dashboard"])
def admin_email_monitor(session: Optional[str] = Header(None, alias="Cookie"), scenario: Optional[str] = Query(None), delay: Optional[int] = Query(None), error: Optional[bool] = Query(None)) -> dict:
    """API.md 6.9 - Email delivery monitor."""
    apply_test_params(scenario, delay, error)
    require_admin_session(session, "read_only")
    return ok(load_json("email_monitor.json"))
