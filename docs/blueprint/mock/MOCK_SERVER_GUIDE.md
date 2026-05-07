# pixel-pet-arena - Mock Server 使用手冊

> **適用版本：** FastAPI Mock Server v1.0
> **上游規格：** docs/API.md (53 endpoints) + docs/SCHEMA.md (12 entities)
> **最後更新：** 2026-05-08

本 Mock Server 根據 docs/API.md 與 docs/SCHEMA.md 自動生成，提供 1:1 對應的 53 個 API endpoint，
供 frontend 工程師（HTML5 / Cocos / Unity / 後台介面）在 backend 完成前獨立開發。

---

## 目錄

1. [目錄結構](#1-目錄結構)
2. [前置需求](#2-前置需求)
3. [安裝步驟](#3-安裝步驟)
4. [啟動 Mock Server](#4-啟動-mock-server)
5. [Postman 匯入](#5-postman-匯入)
6. [Frontend 串接設定](#6-frontend-串接設定)
7. [認證模擬](#7-認證模擬)
8. [特殊測試情境](#8-特殊測試情境)
9. [修改假資料](#9-修改假資料)
10. [Endpoint 一覽](#10-endpoint-一覽)
11. [常見問題](#11-常見問題)
12. [進階：對接 Backend](#12-進階對接-backend)

---

## 1. 目錄結構

```
docs/blueprint/mock/
├── main.py                  # 單一 FastAPI 應用，含全部 53 個 endpoint
├── requirements.txt         # Python 依賴
├── MOCK_SERVER_GUIDE.md     # 本文件
└── data/                    # 假資料（依 SCHEMA.md 12 個 entity 切分）
    ├── pets.json / pets_empty.json
    ├── arena.json / arena_empty.json
    ├── leaderboard.json / leaderboard_empty.json
    ├── leaderboard_snapshots.json / leaderboard_snapshots_empty.json
    ├── training_logs.json / training_logs_empty.json
    ├── food_buffs.json / food_buffs_empty.json
    ├── marketplace_listings.json / marketplace_listings_empty.json
    ├── marketplace_transactions.json / marketplace_transactions_empty.json
    ├── claim_identities.json / claim_identities_empty.json
    ├── gdpr_requests.json / gdpr_requests_empty.json
    ├── admin_users.json / admin_users_empty.json
    ├── admin_pets.json / admin_pets_empty.json
    ├── audit_logs.json / audit_logs_empty.json
    ├── suspicious_battles.json / suspicious_battles_empty.json
    ├── config_runtime.json
    ├── config_economy.json
    ├── config_flags.json
    ├── dashboard.json
    ├── analytics.json
    └── email_monitor.json
```

> 整個 docs/blueprint/mock/ 目錄可以直接打包帶走。

---

## 2. 前置需求

- Python 3.10 以上（macOS / Linux / Windows 皆可）
- pip

```bash
python3 --version   # macOS / Linux
python --version    # Windows
```

---

## 3. 安裝步驟

### macOS / Linux

```bash
cd docs/blueprint/mock
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Windows

```cmd
cd docs\blueprint\mock
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## 4. 啟動 Mock Server

```bash
uvicorn main:app --reload
```

啟動後可存取：

| 服務 | URL |
|------|-----|
| API Server | http://localhost:8000 |
| Swagger UI（互動測試） | http://localhost:8000/docs |
| ReDoc（文件閱讀） | http://localhost:8000/redoc |
| OpenAPI JSON | http://localhost:8000/openapi.json |
| Health check | http://localhost:8000/health |

---

## 5. Postman 匯入

### 方法一：直接從 URL 匯入（推薦）

1. 確認 Mock Server 已啟動
2. Postman → Import → Link
3. 輸入：`http://localhost:8000/openapi.json`

### 方法二：下載後匯入

```bash
curl http://localhost:8000/openapi.json -o openapi.json
```

再到 Postman Import → 選擇 openapi.json。

---

## 6. Frontend 串接設定

### Vite / Vue / React (.env.development)

```env
VITE_API_BASE_URL=http://localhost:8000
```

```ts
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/pets/random`);
const data = await res.json();
```

### Cocos Creator

```ts
const API_BASE = "http://localhost:8000";
```

### Unity (C#)

```csharp
const string API_BASE = "http://localhost:8000";
```

---

## 7. 認證模擬

Mock server 提供兩種認證模擬：

### Pet Token (Player API)

帶任意非空 Bearer Token 即可通過：

```http
Authorization: Bearer dGhpcyBpcyBhIDMyLWJ5dGUgY3J5cHRvZ3JhcGhpY2FsbHkgcmFuZG9t
```

或透過 query string：`?token=<任意字串>`。

### Admin Session (Admin API)

帶 Cookie 標頭，內容用以下慣例切換角色：

| Cookie 值 | 對應角色 |
|-----------|----------|
| `super-admin-session` | super_admin |
| `readonly-session` | read_only |
| 其他任意非空字串 | moderator |
| 缺失 | 401 UNAUTHORIZED |

範例：

```http
Cookie: super-admin-session=mock
```

---

## 8. 特殊測試情境

每個 endpoint 接受以下 query parameters：

| 參數 | 說明 | 範例 |
|------|------|------|
| `scenario=empty` | 回傳空陣列 / 空集合 | `GET /api/v1/leaderboard?scenario=empty` |
| `delay=1500` | 延遲 1500 毫秒（最多 5 秒） | `GET /api/v1/pets/random?delay=1500` |
| `error=true` | 模擬 500 錯誤 | `GET /api/v1/leaderboard?error=true` |

特殊行為（POST /api/v1/claim/verify）：
- `code = "000000"` → 回傳 INVALID_CODE
- `code = "111111"` → 回傳 CODE_EXPIRED
- 其他任意 6 位數 → 成功並回傳 mock petToken

---

## 9. 修改假資料

假資料存放在 data/ 目錄，可直接用任何文字編輯器修改 JSON 檔案。
--reload 模式下會自動重新載入。

> 注意：mock server 為純讀取，不會把 POST/PUT/DELETE 寫回 JSON 檔。
> 寫操作會回傳合理的成功 envelope，但不持久化。

### 主要資料表（對齊 SCHEMA.md 規範名稱）

| 檔案 | 對應 SCHEMA.md table | 說明 |
|------|---------------------|------|
| `pets.json` | `pets` | 寵物（claimed / guest / banned） |
| `arena.json` | `arena_matches` | 競技場戰役紀錄 |
| `leaderboard.json` | (Redis ZSET) | 全域排行榜 |
| `leaderboard_snapshots.json` | `leaderboard_snapshots` | 排行榜歷史快照 |
| `training_logs.json` | `training_logs` | 訓練動作紀錄 |
| `food_buffs.json` | `food_buffs` | 食物 buff 紀錄 |
| `marketplace_listings.json` | `marketplace_listings` | 市場掛單 |
| `marketplace_transactions.json` | `marketplace_transactions` | 完成交易紀錄 |
| `claim_identities.json` | `claim_identities` | 玩家身份（email hash） |
| `gdpr_requests.json` | `gdpr_requests` | GDPR 請求佇列 |
| `admin_users.json` | `admin_users` | 後台帳號 |
| `audit_logs.json` | `audit_logs` | 後台操作稽核日誌 |
| `admin_pets.json` | (view of `pets`) | 後台寵物列表（含 owner mask） |
| `suspicious_battles.json` | (analytics view) | 可疑戰役佇列 |
| `config_runtime.json` | (Redis cache) | runtime 可調設定 |
| `config_economy.json` | (Redis cache) | economy 可調設定 |
| `config_flags.json` | (feature flags) | 功能旗標 |
| `dashboard.json` | (aggregate view) | 後台儀表板資料 |
| `analytics.json` | (aggregate view) | 後台分析資料 |
| `email_monitor.json` | (SES feed) | 郵件投遞監控 |

---

## 10. Endpoint 一覽

完整 endpoint 列表（共 53 個 + `/` + `/health`）：

### 5.1 Claim Flow (3)

```
POST   /api/v1/claim
POST   /api/v1/claim/verify
POST   /api/v1/claim/recover
```

### 5.2 Pet Endpoints (5)

```
GET    /api/v1/pets/random
GET    /api/v1/pets/{petId}
GET    /api/v1/pets/{petId}/stats
POST   /api/v1/pets/{petId}/train
POST   /api/v1/pets/{petId}/feed
```

### 5.3 Arena (3)

```
POST   /api/v1/arena/enter
GET    /api/v1/arena/match/{matchId}
GET    /api/v1/arena/history/{petId}
```

### 5.4 Leaderboard (2)

```
GET    /api/v1/leaderboard
GET    /api/v1/leaderboard/rank/{petId}
```

### 5.5 GDPR Self-Service (2)

```
POST   /api/v1/gdpr/request
GET    /api/v1/gdpr/request/status
```

### 5.6 Marketplace (5; FF_MARKETPLACE)

```
GET    /api/v1/marketplace/listings
POST   /api/v1/marketplace/listings
DELETE /api/v1/marketplace/listings/{listingId}
POST   /api/v1/marketplace/listings/{listingId}/buy
GET    /api/v1/marketplace/history/{petId}
```

### 6.1 Admin Auth (4)

```
POST   /admin/api/auth/login
POST   /admin/api/auth/totp/setup
POST   /admin/api/auth/logout
POST   /admin/api/auth/totp/verify
```

### 6.2 Admin Roles (4; super_admin only)

```
GET    /admin/api/roles
POST   /admin/api/roles
DELETE /admin/api/roles/{adminId}
POST   /admin/api/roles/{adminId}/totp/reset
```

### 6.3 Admin Pets (5)

```
GET    /admin/api/pets
GET    /admin/api/pets/{petId}
PUT    /admin/api/pets/{petId}
POST   /admin/api/pets/{petId}/ban
POST   /admin/api/pets/{petId}/unban
```

### 6.4 Admin Battles (4)

```
GET    /admin/api/battles
GET    /admin/api/suspicious
POST   /admin/api/battles/{matchId}/flag
DELETE /admin/api/battles/{matchId}/flag
```

### 6.5 Admin Leaderboard (2)

```
GET    /admin/api/leaderboard
DELETE /admin/api/leaderboard/{petId}
```

### 6.6 Admin Configuration (6)

```
GET    /admin/api/config/runtime
PUT    /admin/api/config/runtime
GET    /admin/api/config/economy
PUT    /admin/api/config/economy
GET    /admin/api/config/flags
PUT    /admin/api/config/flags/{flag}
```

### 6.7 Admin GDPR Queue (3; super_admin only)

```
GET    /admin/api/gdpr
POST   /admin/api/gdpr/delete
PATCH  /admin/api/gdpr/{requestId}
```

### 6.8 Admin Audit Log (1; super_admin only)

```
GET    /admin/api/audit
```

### 6.9 Admin Dashboard (3)

```
GET    /admin/api/dashboard
GET    /admin/api/analytics
GET    /admin/api/email/monitor
```

### Health (2)

```
GET    /
GET    /health
```

---

## 11. 常見問題

### Q: Port 8000 被佔用？

```bash
uvicorn main:app --reload --port 8001
```

Frontend 環境變數也要同步改為 http://localhost:8001。

### Q: CORS 錯誤？

Mock Server 預設開放所有來源（allow_origins=["*"]）。如仍有問題，
確認 frontend 的 fetch 沒有同時設定 credentials: "include" + *。

### Q: 401 UNAUTHORIZED？

請確認：
- Player API：帶上 Authorization: Bearer <token> 或 ?token=<任意字串>
- Admin API：帶上 Cookie: <任意非空值>，依角色慣例（見 §7）

### Q: Windows 執行 uvicorn 報錯？

確認 pip 安裝到正確的 Python 版本：

```cmd
python -m uvicorn main:app --reload
```

### Q: Mock 回傳空資料？

加 ?scenario=empty 會回傳空集合。預設 scenario 是 normal。

---

## 12. 進階：對接 Backend

當 backend 完成後，僅需修改 frontend 的環境變數：

```env
VITE_API_BASE_URL=https://api.pixel-pet-arena.com
```

無需修改任何 frontend 業務代碼，因為 mock 與 backend 共享同一份 OpenAPI / API.md 規範。

---

> **產生來源：** gendoc-gen-mock skill
> 對齊規範：docs/API.md v1.0、docs/SCHEMA.md v1.0、docs/EDD.md
