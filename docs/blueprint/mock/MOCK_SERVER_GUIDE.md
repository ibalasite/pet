# Pixel Pet Arena — Mock Server 使用手冊

> **適用版本：** FastAPI Mock Server v1.0  
> **OpenAPI 規格：** `docs/blueprint/contracts/openapi.yaml`  
> **最後更新：** 2026-05-05

---

## 目錄

1. [目錄結構](#1-目錄結構)
2. [前置需求](#2-前置需求)
3. [安裝步驟](#3-安裝步驟)
4. [啟動 Mock Server](#4-啟動-mock-server)
5. [Postman 匯入](#5-postman-匯入)
6. [Frontend 串接設定](#6-frontend-串接設定)
7. [特殊測試情境](#7-特殊測試情境)
8. [修改假資料](#8-修改假資料)
9. [Endpoint 清單](#9-endpoint-清單)
10. [常見問題](#10-常見問題)
11. [進階：對接 Backend](#11-進階對接-backend)

---

## 1. 目錄結構

```
docs/blueprint/mock/
├── main.py                   # FastAPI 應用程式進入點
├── requirements.txt          # Python 依賴套件清單
├── .env.example              # 環境變數範例檔
├── routers/
│   ├── claim.py              # Claim 流程路由（3 個端點）
│   ├── pets.py               # 寵物資料與訓練路由（5 個端點）
│   ├── arena.py              # 競技場對戰路由（3 個端點）
│   ├── leaderboard.py        # 排行榜路由（2 個端點）
│   ├── gdpr.py               # GDPR 自助路由（2 個端點）
│   └── marketplace.py        # 交易市場路由（5 個端點）
├── data/
│   ├── pets.json             # 寵物假資料（8 筆範例）
│   ├── arena.json            # 競技場對戰記錄假資料
│   ├── leaderboard.json      # 排行榜假資料
│   └── marketplace.json      # 市場掛單假資料
└── MOCK_SERVER_GUIDE.md      # 本文件
```

---

## 2. 前置需求

| 項目 | 最低版本 | 建議版本 |
|------|----------|----------|
| Python | 3.10 | 3.12 |
| pip | 22.0 | 最新版 |
| (選用) venv / virtualenv | — | 內建 venv 即可 |

確認 Python 版本：

```bash
python --version
# 或
python3 --version
```

確認 pip 版本：

```bash
pip --version
```

---

## 3. 安裝步驟

### macOS / Linux

```bash
# 1. 進入 mock 目錄
cd docs/blueprint/mock

# 2. 建立虛擬環境
python3 -m venv .venv

# 3. 啟動虛擬環境
source .venv/bin/activate

# 4. 安裝依賴套件
pip install -r requirements.txt
```

### Windows（Command Prompt）

```cmd
:: 1. 進入 mock 目錄
cd docs\blueprint\mock

:: 2. 建立虛擬環境
python -m venv .venv

:: 3. 啟動虛擬環境
.venv\Scripts\activate.bat

:: 4. 安裝依賴套件
pip install -r requirements.txt
```

### Windows（PowerShell）

```powershell
# 1. 進入 mock 目錄
Set-Location docs\blueprint\mock

# 2. 建立虛擬環境
python -m venv .venv

# 3. 啟動虛擬環境（若出現執行原則錯誤，請先執行 Set-ExecutionPolicy RemoteSigned）
.venv\Scripts\Activate.ps1

# 4. 安裝依賴套件
pip install -r requirements.txt
```

> **提示：** 若 `requirements.txt` 尚不存在，可手動安裝最低依賴：
> ```bash
> pip install fastapi uvicorn[standard]
> ```

---

## 4. 啟動 Mock Server

### 基本啟動指令

```bash
# 在 docs/blueprint/mock 目錄下執行
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 指定自訂 Port

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### 靜默模式（不顯示重新載入訊息）

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 可用 URL 一覽

| 名稱 | URL | 說明 |
|------|-----|------|
| API 根路徑 | `http://localhost:8000` | REST API 主要入口 |
| Swagger UI | `http://localhost:8000/docs` | 互動式 API 文件（可直接測試） |
| ReDoc | `http://localhost:8000/redoc` | 閱讀友善的 API 文件 |
| OpenAPI JSON | `http://localhost:8000/openapi.json` | 機器可讀的 OpenAPI 規格 |
| 健康檢查 | `http://localhost:8000/health` | 服務狀態確認 |

啟動成功後終端機會顯示：

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx]
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## 5. Postman 匯入

### 方法一：從 URL 匯入（推薦）

1. 開啟 Postman，點選左上角 **Import**
2. 選擇 **Link** 頁籤
3. 輸入以下 URL：
   ```
   http://localhost:8000/openapi.json
   ```
4. 點選 **Continue** → **Import**
5. Postman 會自動建立 Collection，包含所有 20 個端點

> **注意：** 需先啟動 Mock Server 才能從 URL 匯入。

### 方法二：從檔案匯入

1. 確認 OpenAPI 規格檔案位置：
   ```
   docs/blueprint/contracts/openapi.yaml
   ```
2. 開啟 Postman，點選 **Import**
3. 選擇 **File** 頁籤
4. 拖拉或選取 `openapi.yaml` 檔案
5. 點選 **Import**

### 設定環境變數（建議）

在 Postman 建立一個 Environment，設定以下變數：

| 變數名稱 | 初始值 |
|----------|--------|
| `base_url` | `http://localhost:8000` |
| `pet_token` | （執行 Claim 流程後取得） |

---

## 6. Frontend 串接設定

### Vite / React 專案設定

在專案根目錄建立或編輯 `.env.local` 檔案：

```env
# 開發環境 — 指向本地 Mock Server
VITE_API_BASE_URL=http://localhost:8000

# 正式環境 — 替換為真實 Backend URL
# VITE_API_BASE_URL=https://api.pixel-pet-arena.com
```

> **重要：** `.env.local` 已在 `.gitignore` 中，不會被提交到版本庫。

### TypeScript 環境變數型別宣告

在 `src/vite-env.d.ts` 或 `src/env.d.ts` 新增：

```typescript
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 基礎 fetch 範例

```typescript
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 取得隨機寵物（無需認證）
export async function getRandomPet() {
  const res = await fetch(`${BASE_URL}/api/v1/pets/random`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  return data;
}

// 取得特定寵物資訊（可帶 Bearer Token）
export async function getPet(petId: string, petToken?: string) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (petToken) {
    headers['Authorization'] = `Bearer ${petToken}`;
  }
  const res = await fetch(`${BASE_URL}/api/v1/pets/${petId}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  return data;
}

// 訓練寵物（需要 Bearer Token）
export async function trainPet(
  petId: string,
  trainingType: 'RUN' | 'STRENGTH' | 'STAMINA',
  petToken: string
) {
  const res = await fetch(`${BASE_URL}/api/v1/pets/${petId}/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${petToken}`,
    },
    body: JSON.stringify({ trainingType }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  return data;
}
```

### 使用 React Query 的範例

```typescript
// src/hooks/usePet.ts
import { useQuery } from '@tanstack/react-query';
import { getPet } from '../lib/api';

export function usePet(petId: string, petToken?: string) {
  return useQuery({
    queryKey: ['pet', petId],
    queryFn: () => getPet(petId, petToken),
    enabled: !!petId,
  });
}
```

---

## 7. 特殊測試情境

Mock Server 支援透過 Query String 參數觸發特殊回應，方便前端測試各種邊界情況。

| 參數 | 型別 | 說明 | 範例 |
|------|------|------|------|
| `scenario=empty` | string | 回傳空陣列或空資料 | `GET /api/v1/leaderboard?scenario=empty` |
| `delay=<ms>` | number | 延遲指定毫秒後回應（模擬慢速網路） | `GET /api/v1/pets/random?delay=2000` |
| `error=true` | boolean | 強制回傳 500 Internal Server Error | `GET /api/v1/arena/history/{petId}?error=true` |
| `error=400` | number | 回傳指定 HTTP 錯誤碼 | `POST /api/v1/arena/enter?error=429` |

### 使用情境範例

**測試空排行榜顯示：**
```
GET http://localhost:8000/api/v1/leaderboard?scenario=empty
```

**模擬 2 秒網路延遲（測試 Loading 狀態）：**
```
GET http://localhost:8000/api/v1/pets/random?delay=2000
```

**測試伺服器錯誤處理：**
```
POST http://localhost:8000/api/v1/claim?error=true
```

**測試速率限制錯誤（429）：**
```
POST http://localhost:8000/api/v1/arena/enter?error=429
```

---

## 8. 修改假資料

所有假資料儲存於 `docs/blueprint/mock/data/` 目錄下的 JSON 檔案中。直接編輯這些檔案即可改變 Mock Server 的回應內容。

### 資料檔案說明

| 檔案 | 對應資源 | 說明 |
|------|----------|------|
| `data/pets.json` | Pets, Claim | 寵物基本資料，包含稀有度、等級、屬性、Stats |
| `data/arena.json` | Arena | 競技場對戰記錄與歷史 |
| `data/leaderboard.json` | Leaderboard | 排行榜排名與分數 |
| `data/marketplace.json` | Marketplace | 市場掛單列表與交易歷史 |

### 編輯 `pets.json` 範例

目前 `data/pets.json` 包含 8 筆寵物範例資料。若要新增一筆：

```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "新寵物名稱",
  "rarity": "COMMON",
  "level": 1,
  "element": "FIRE",
  "stats": {
    "attack": 30,
    "defense": 25,
    "speed": 40,
    "stamina": 35
  },
  "ownerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ownerName": "TestPlayer",
  "createdAt": "2026-05-05T00:00:00Z",
  "updatedAt": "2026-05-05T00:00:00Z"
}
```

### 欄位值參考

**rarity 可選值：**
- `COMMON`
- `RARE`
- `EPIC`
- `LEGENDARY`

**element 可選值：**
- `FIRE` / `ICE` / `LIGHTNING` / `EARTH` / `METAL` / `NATURE` / `WIND`

### 注意事項

- 編輯 JSON 後，若 Mock Server 以 `--reload` 模式啟動，**不需要重啟**，Uvicorn 會自動偵測檔案變更並重新載入。
- 若未使用 `--reload`，請手動重啟 Mock Server（`Ctrl+C` 後再次執行 `uvicorn` 指令）。
- JSON 格式錯誤會導致 Mock Server 啟動失敗，可使用 `jsonlint` 或編輯器的 JSON 驗證功能確認格式。

---

## 9. Endpoint 清單

共 20 個 Player API 端點，分為 6 個資源群組。

### Claim（寵物認領）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `POST` | `/api/v1/claim` | 發送 OTP，啟動認領流程 | 無 |
| `POST` | `/api/v1/claim/verify` | 驗證 OTP，取得 Pet Token | 無 |
| `POST` | `/api/v1/claim/recover` | 寄出找回連結的 OTP | 無 |

### Pets（寵物管理）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `GET` | `/api/v1/pets/random` | 產生隨機未認領寵物（訪客顯示用） | 無 |
| `GET` | `/api/v1/pets/{petId}` | 取得寵物公開資料 | 選用 Bearer |
| `GET` | `/api/v1/pets/{petId}/stats` | 取得完整訓練面板 | 選用 Bearer |
| `POST` | `/api/v1/pets/{petId}/train` | 執行一次訓練動作 | Bearer 必填 |
| `POST` | `/api/v1/pets/{petId}/feed` | 餵食，套用食物增益 | Bearer 必填 |

### Arena（競技場）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `POST` | `/api/v1/arena/enter` | 進入配對佇列（長輪詢，最長 30 秒） | Bearer 必填 |
| `GET` | `/api/v1/arena/match/{matchId}` | 取得完整對戰記錄 | 無 |
| `GET` | `/api/v1/arena/history/{petId}` | 取得最近 20 場對戰歷史 | 無 |

### Leaderboard（排行榜）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `GET` | `/api/v1/leaderboard` | 全球排行榜（前 100 名） | 無 |
| `GET` | `/api/v1/leaderboard/rank/{petId}` | 查詢特定寵物排名 | 無 |

### GDPR（隱私權自助服務）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `POST` | `/api/v1/gdpr/request` | 提交 GDPR 請求 | Bearer 必填 |
| `GET` | `/api/v1/gdpr/request/status` | 查詢 GDPR 請求狀態 | Bearer 必填 |

### Marketplace（交易市場，需要 FF_MARKETPLACE 功能旗標）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| `GET` | `/api/v1/marketplace/listings` | 瀏覽市場掛單 | 無 |
| `POST` | `/api/v1/marketplace/listings` | 建立新掛單 | Bearer 必填 |
| `DELETE` | `/api/v1/marketplace/listings/{listingId}` | 取消掛單 | Bearer 必填 |
| `POST` | `/api/v1/marketplace/listings/{listingId}/buy` | 購買掛單 | Bearer 必填 |
| `GET` | `/api/v1/marketplace/history/{petId}` | 取得寵物交易歷史（僅限擁有者） | Bearer 必填 |

---

## 10. 常見問題

### Q1：Port 8000 已被佔用，無法啟動

**錯誤訊息：**
```
ERROR:    [Errno 48] Address already in use
```

**解決方式：**

macOS / Linux — 查詢佔用 Port 的程序：
```bash
lsof -i :8000
kill -9 <PID>
```

Windows — 查詢佔用 Port 的程序：
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

或直接改用其他 Port 啟動：
```bash
uvicorn main:app --reload --port 8080
```

---

### Q2：前端出現 CORS 錯誤

**錯誤訊息（瀏覽器 Console）：**
```
Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**原因：** Mock Server 預設允許的 Origin 不包含你的前端開發伺服器 Port。

**解決方式：** 編輯 `main.py`，在 `CORSMiddleware` 設定中新增你的前端 Origin：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite 預設 Port
        "http://localhost:3000",   # 其他前端框架
        "http://localhost:4173",   # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

開發期間也可暫時設定 `allow_origins=["*"]`（僅限本地開發，請勿用於正式環境）。

---

### Q3：Windows 上 uvicorn 指令找不到

**錯誤訊息：**
```
'uvicorn' is not recognized as an internal or external command
```

**原因：** 虛擬環境未啟動，或 Python Scripts 目錄不在 PATH 中。

**解決方式：**

方法一：確認虛擬環境已啟動（PowerShell）：
```powershell
.venv\Scripts\Activate.ps1
uvicorn main:app --reload
```

方法二：使用 `python -m` 方式執行：
```cmd
python -m uvicorn main:app --reload --port 8000
```

方法三：若 PowerShell 禁止執行腳本：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Q4：Mock Server 回應 422 Unprocessable Entity

**原因：** 請求 Body 或 Path Parameter 格式不符合 OpenAPI 規格。常見原因：
- `petId` 必須為 UUID 格式（`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
- 必填欄位缺少（如 `trainingType`、`email`）
- 列舉值錯誤（如 `rarity` 只接受 `COMMON` / `RARE` / `EPIC` / `LEGENDARY`）

請參考 Swagger UI（`http://localhost:8000/docs`）確認正確的請求格式。

---

### Q5：`--reload` 模式下 Mock Server 頻繁重啟

**原因：** `data/*.json` 檔案被頻繁修改，觸發 Uvicorn 的檔案監控重載。

**解決方式：** 使用 `--reload-dir` 限制監控範圍，只監控 Python 程式碼：
```bash
uvicorn main:app --reload --reload-dir routers --reload-dir .
```

---

## 11. 進階：對接 Backend

當真實 Backend 準備就緒後，**只需修改一個環境變數**即可將前端切換至正式 API，無需更改任何程式碼。

### 切換方式

編輯 `.env.local`（或正式部署的環境設定）：

```env
# 開發時使用 Mock Server
# VITE_API_BASE_URL=http://localhost:8000

# 切換至正式 Backend
VITE_API_BASE_URL=https://api.pixel-pet-arena.com
```

### 各環境對應 URL

| 環境 | `VITE_API_BASE_URL` 值 |
|------|------------------------|
| 本地 Mock | `http://localhost:8000` |
| 本地 Backend | `http://localhost:3000` |
| Staging | `https://staging-api.pixel-pet-arena.com` |
| Production | `https://api.pixel-pet-arena.com` |

### 注意事項

- Mock Server **不驗證** Bearer Token 的有效性，任何字串都會被接受。真實 Backend 會嚴格驗證 32 位元 URL-safe Base64 格式的 Pet Token。
- Marketplace 端點需要功能旗標 `FF_MARKETPLACE` 啟用。Mock Server 可透過特殊參數模擬此行為；真實 Backend 需由管理員在後台開啟旗標。
- Mock Server 的資料在重啟後會重置為 `data/*.json` 的初始狀態，真實 Backend 資料則持久化儲存於資料庫。
