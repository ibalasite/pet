---
diagram: frontend-communication
uml-type: Communication Diagram（Frontend ↔ Server Message Flow）
source: docs/FRONTEND.md §2.6 + docs/API.md §5 endpoints
generated: 2026-05-08T00:00:00Z
---

# Frontend Communication Diagram — Client/Server Message Flow

> 來源：docs/FRONTEND.md §2.6 API Client + docs/API.md §5 Endpoints

描述 Player App、Admin SPA 與後端 API 的所有訊息協作。本系統為純 HTTP（無 WebSocket），訊息分類：
- 系統訊息（health check, telemetry）
- 認領流程（claim flow）
- 遊戲事件（pet, training, arena）
- 廣播 / 公開（leaderboard, battle records）

```mermaid
flowchart LR
    subgraph PlayerSide ["Player App<br/>React 18 + Phaser.js 3<br/>+ Vite 5"]
        PlayerApp["Player App<br/>(localhost:5173 dev /<br/>pet.local prod)"]
    end

    subgraph AdminSide ["Admin Portal<br/>Vue 3 + Element Plus +<br/>Vite 5"]
        AdminApp["Admin SPA<br/>(localhost:5174 dev /<br/>admin.pet.local prod)"]
    end

    subgraph Server ["Game / Admin API Server<br/>(Fastify 4 + Node.js 20)<br/>:3000 intra / :443 ingress"]
        APIServer["Fastify Routes<br/>/api/v1/* (player) +<br/>/admin/api/* (admin)"]
        DB[("PostgreSQL 16")]
        Redis[("Redis 7.2")]
        APIServer --> DB
        APIServer --> Redis
    end

    subgraph SystemMessages ["1. System Messages"]
        S1["1: GET /health/ready<br/>HTTPS:443<br/>poll every 30s"]
        S2["2: 200 {status: 'ready'}<br/>(or 503 degraded)"]
        S3["3: POST /telemetry/event<br/>HTTPS:443 (Sentry)<br/>fire-and-forget"]
    end

    subgraph ClaimMessages ["2. Claim Flow Messages"]
        C1["4: POST /api/v1/claim<br/>{email, petId}<br/>HTTPS:443"]
        C2["5: 200 {claimId, expiresAt: ISO8601}"]
        C3["6: POST /api/v1/claim/verify<br/>{claimId, otpCode, petId}<br/>HTTPS:443"]
        C4["7: 200 {accessToken, pet}"]
        C5["8: POST /api/v1/claim/recover<br/>{email, petId}<br/>HTTPS:443"]
        C6["9: 200 {claimId} (new claim)"]
    end

    subgraph GameMessages ["3. Game Event Messages"]
        G1["10: GET /api/v1/pets/random<br/>HTTPS:443"]
        G2["11: 200 {pet}"]
        G3["12: GET /api/v1/pets/:petId<br/>HTTPS:443<br/>Header: X-Pet-Token"]
        G4["13: 200 {pet}"]
        G5["14: POST /api/v1/pets/:petId/train<br/>{trainingType}"]
        G6["15: 200 {pet, trainingLog}"]
        G7["16: POST /api/v1/pets/:petId/feed<br/>{foodType}"]
        G8["17: 200 {pet, foodBuff}"]
        G9["18: POST /api/v1/arena/enter<br/>{petId, mode, acceptAi}<br/>(long-poll up to 30s)"]
        G10["19: 200 {matchId, status: READY,<br/>opponentPetId, durationSeconds}"]
        G11["20: GET /api/v1/arena/match/:matchId<br/>HTTPS:443"]
        G12["21: 200 {ArenaMatch with battleLog}"]
        G13["22: GET /api/v1/arena/history/:petId<br/>HTTPS:443"]
        G14["23: 200 {matches: ArenaMatch[]}"]
    end

    subgraph BroadcastMessages ["4. Broadcast / Public Messages"]
        B1["24: GET /api/v1/leaderboard<br/>?limit=100&rarity=&mode=RACE<br/>HTTPS:443"]
        B2["25: 200 {entries, snapshotTime}"]
        B3["26: GET /api/v1/leaderboard/rank/:petId<br/>HTTPS:443"]
        B4["27: 200 {rank, score, total}"]
    end

    subgraph GdprMessages ["5. GDPR Messages"]
        GD1["28: POST /api/v1/gdpr/request<br/>{requestType: 'erasure', ...}<br/>Header: X-Pet-Token"]
        GD2["29: 200 {jobId, status: 'pending'}"]
        GD3["30: GET /api/v1/gdpr/request/status?jobId=...<br/>HTTPS:443"]
        GD4["31: 200 {status, completedAt?}"]
    end

    subgraph AdminMessages ["6. Admin Messages"]
        A1["32: POST /admin/api/auth/login<br/>{username, password, totpCode}<br/>HTTPS:443"]
        A2["33: 200 {sessionToken, permissions}<br/>Set-Cookie: admin_session=<br/>HttpOnly; Secure"]
        A3["34: GET /admin/api/pets<br/>?page=1&limit=50&filter=banned<br/>+ Cookie admin_session"]
        A4["35: 200 {items, total, page, limit}"]
        A5["36: POST /admin/api/pets/:petId/ban<br/>{reason}"]
        A6["37: 200 {pet}"]
        A7["38: PUT /admin/api/config/runtime<br/>{keyValuePairs}"]
        A8["39: 200 {keyValuePairs}"]
        A9["40: GET /admin/api/dashboard<br/>HTTPS:443"]
        A10["41: 200 {metrics, recentEvents}"]
    end

    PlayerApp -->|S1| APIServer
    APIServer -->|S2| PlayerApp
    PlayerApp -.->|S3 async| APIServer

    PlayerApp -->|C1| APIServer
    APIServer -->|C2| PlayerApp
    PlayerApp -->|C3| APIServer
    APIServer -->|C4| PlayerApp
    PlayerApp -->|C5| APIServer
    APIServer -->|C6| PlayerApp

    PlayerApp -->|G1| APIServer
    APIServer -->|G2| PlayerApp
    PlayerApp -->|G3| APIServer
    APIServer -->|G4| PlayerApp
    PlayerApp -->|G5| APIServer
    APIServer -->|G6| PlayerApp
    PlayerApp -->|G7| APIServer
    APIServer -->|G8| PlayerApp
    PlayerApp -->|G9| APIServer
    APIServer -->|G10| PlayerApp
    PlayerApp -->|G11| APIServer
    APIServer -->|G12| PlayerApp
    PlayerApp -->|G13| APIServer
    APIServer -->|G14| PlayerApp

    PlayerApp -->|B1| APIServer
    APIServer -->|B2| PlayerApp
    PlayerApp -->|B3| APIServer
    APIServer -->|B4| PlayerApp

    PlayerApp -->|GD1| APIServer
    APIServer -->|GD2| PlayerApp
    PlayerApp -->|GD3| APIServer
    APIServer -->|GD4| PlayerApp

    AdminApp -->|A1| APIServer
    APIServer -->|A2| AdminApp
    AdminApp -->|A3| APIServer
    APIServer -->|A4| AdminApp
    AdminApp -->|A5| APIServer
    APIServer -->|A6| AdminApp
    AdminApp -->|A7| APIServer
    APIServer -->|A8| AdminApp
    AdminApp -->|A9| APIServer
    APIServer -->|A10| AdminApp

    classDef sysClass fill:#f4f4ff,stroke:#669
    classDef claimClass fill:#fff4e0,stroke:#963
    classDef gameClass fill:#e8ffe8,stroke:#393
    classDef broadcastClass fill:#fff0f4,stroke:#936
    classDef gdprClass fill:#f8f0ff,stroke:#639
    classDef adminClass fill:#ffe8e0,stroke:#c33

    class S1,S2,S3 sysClass
    class C1,C2,C3,C4,C5,C6 claimClass
    class G1,G2,G3,G4,G5,G6,G7,G8,G9,G10,G11,G12,G13,G14 gameClass
    class B1,B2,B3,B4 broadcastClass
    class GD1,GD2,GD3,GD4 gdprClass
    class A1,A2,A3,A4,A5,A6,A7,A8,A9,A10 adminClass
```

## Message Categories

### 1. System Messages（1-3）
- Health check polling、telemetry async fire-and-forget。

### 2. Claim Flow Messages（4-9）
- Email OTP 認領流程 + 遺失 URL 恢復流程，全部 Player App → Server。

### 3. Game Event Messages（10-23）
- 寵物 CRUD、訓練、餵食、競技場 enter / get / history。
- `POST /arena/enter` 為 long-poll（最久 30 秒）。

### 4. Broadcast / Public Messages（24-27）
- 排行榜（無 token 公開可讀）、單一寵物 rank 查詢。

### 5. GDPR Messages（28-31）
- 資料刪除請求 + 狀態查詢（已認領玩家專屬）。

### 6. Admin Messages（32-41）
- Admin Login + RBAC Pet Management + Runtime Config + Dashboard。
- 所有 admin 訊息附 `Cookie: admin_session=` httpOnly。

## Notes

- **No WebSocket**：本系統 HTTP 即可（API.md §5.3 Scope note）；長時間連線僅有 `POST /arena/enter` 30 秒 long-poll。
- **Bidirectional 完整覆蓋**：所有 Player → Server 訊息都有 Server → Player 回應對應；Admin 同樣 bidirectional。
- **訊息序號連續（1-41）**：完整覆蓋 API.md §5 Player + §6 Admin 主要 endpoints。
- **協定統一 HTTPS:443**：production；local dev 走 :3000 HTTP（透過 Vite proxy）。
- **Authorization headers**：
  - Player: `X-Pet-Token: {token}`（32-byte URL-safe base64）
  - Admin: httpOnly Cookie `admin_session={opaque-token}`
