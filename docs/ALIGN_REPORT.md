---
doc-type: ALIGN
version: 2.2.0
description: 全局對齊掃描報告 — pixel-pet-arena 六維度文件↔程式碼↔測試對齊問題清單（只列問題，不修復）
generated: 2026-05-18
---

# ALIGN_REPORT — 全局對齊掃描報告

**專案**：pixel-pet-arena  
**掃描日期**：2026-05-16  
**狀態**：gendoc-align-check 完整掃描（v2.1.0 — BDD-server 完成後全量重掃）

---

## 總覽儀表板

```
╔══════════════════════════════════════════════════════════════════════╗
║         gendoc — 對齊掃描報告                                         ║
║         專案：pixel-pet-arena  日期：2026-05-16                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  對齊層              CRITICAL  HIGH  MEDIUM  LOW  總計  狀態           ║
║  Dim0 文件存在性         0       0      0     0    0    ✅ 25 OK        ║
║  Dim1 Doc → Doc          0       2      4     4   10   ⚠️              ║
║  Dim2 Doc → Code         5       0      2     0    7   🔴（純文件期）   ║
║  Dim3 Code → Test        5       9      2     1   17   🔴（Scaffold）  ║
║  Dim4 Doc → Test         2       7      4     3   16   🔴              ║
║  Dim5 UML/RTM 品質       0       1      1     1    3   ⚠️              ║
║  Dim6 AI Gencode         0       0      0     0    0   ✅ 100%         ║
╠══════════════════════════════════════════════════════════════════════╣
║  總計                   12      19     13     9   53                   ║
╚══════════════════════════════════════════════════════════════════════╝
```

> **注意**：Dim2/Dim3 的 CRITICAL/HIGH finding 均源於「純文件期——src/ 未實作」，  
> 屬於預期的 AI Gencode 起始狀態，非文件品質問題。  
> Dim6 AI Gencode Readiness = **100%**（19/19 checks passed）— 文件完整度足以驅動 AI 全量實作。

---

## Dimension 0 — 文件存在性

**狀態：✅ PASS**

全部 25 個必要文件均存在且非空：
`IDEA.md` `BRD.md` `PRD.md` `CONSTANTS.md` `PDD.md` `VDD.md` `EDD.md` `ARCH.md` `API.md` `SCHEMA.md` `FRONTEND.md` `AUDIO.md` `ANIM.md` `CLIENT_IMPL.md` `ADMIN_IMPL.md` `RESOURCE.md` `test-plan.md` `RTM.md` `runbook.md` `LOCAL_DEPLOY.md` `CICD.md` `DEVELOPER_GUIDE.md`

BDD：`features/` — 13 個 server .feature 檔（122 個場景）；`features/client/` — 10 個 client .feature 檔（133 個場景）

---

## Dimension 1 — 文件↔文件對齊（Doc → Doc）

**CRITICAL: 0 / HIGH: 2 / MEDIUM: 4 / LOW: 4**

---

### [HIGH] [FIXED: align-fix 2026-05-19] D1-01 — LOCAL_DEPLOY: EDD Worker container 缺失，Port 3001 衝突

**來源**：EDD §3.5b + ARCH §3.7.2 → LOCAL_DEPLOY.md

EDD §3.5b 明確定義 Worker 為獨立服務（port 3001）；ARCH §3.7.2 顯示 api 與 worker 為獨立容器。  
但 `docker-compose.dev.yml` 只有 `api`（ports: "3000:3000", "3001:3001"）與 `redis`，無獨立 `worker` 服務，port 3001 被 api 佔用。

衝突類型: B2-下游偏離  
受影響範圍：本地開發環境；Worker 依賴的非同步任務（bot detection、GDPR deletion queue、leaderboard refresh）無法本地運行  
建議修復方向：docker-compose.dev.yml 新增獨立 worker service；api 移除 port 3001 映射；LOCAL_DEPLOY.md 安裝步驟加入 Worker 啟動指令  
可自動修復：YES

---

### [HIGH] D1-02 — VDD→EDD: Sprite 尺寸常數矛盾（64px vs 32px）

**來源**：VDD §4.2 → EDD §0 constants → FRONTEND.md

VDD §4.2：「canonical sprite size = 64×64px」；EDD §0：`SPRITE_RESOLUTION_PX = 32`；FRONTEND.md `PetCanvasEngine`：`width: spriteResolutionPx * 2`（32×2=64 CSS px）。三份文件對 canonical size 定義分散矛盾。

衝突類型: B2-下游偏離  
受影響範圍：所有 pet sprite 渲染（PetCanvas、Leaderboard thumbnail、Arena battle）；美術交付規格  
建議修復方向：選擇單一真實來源（方案A：EDD 改 64，FRONTEND 移除 ×2；方案B：VDD 改 32px grid/64px render）並三份文件同步  
可自動修復：NO

---

### [MEDIUM] D1-03 — BRD→PRD: Sumo Mode 優先級無故提升（P2→P1）

**來源**：BRD §5.4 → PRD §4.2

BRD §5.4 將第 2 競技模式（相撲擂台）列為 P2 Could Have；PRD §4.2 F-ARENA-02 升為 P1 Should Have，無任何 scope reconciliation note 說明升級決策依據。

衝突類型: B2-下游偏離  
受影響範圍：F-ARENA-02 Sumo Mode 開發優先排序；sprint 規劃  
建議修復方向：PRD §1.3 補充 Sumo 升為 P1 的商業決策依據，或將 PRD §4.2 改回 P2  
可自動修復：NO

---

### [MEDIUM] D1-04 — PRD→BDD-server: US-ADMIN-003 Runtime Tuning 無對應 feature file

**來源**：PRD AC-015-1/2/3 → features/

US-ADMIN-003（Runtime Parameter Tuning）有 3 個 AC；RTM 備注「covered via integration test」，但 tests/ 目錄不存在，實際零覆蓋。

衝突類型: 缺失  
受影響範圍：AC-015-1/2/3 BDD 驗收覆蓋；RTM coverage integrity  
建議修復方向：新增 `features/runtime-config.feature`（3 個場景），或明確說明以 API integration tests 取代並更新 RTM  
可自動修復：NO

---

### [MEDIUM] [FIXED: align-fix 2026-05-19] D1-05 — BDD-server→RTM: claim-flow.feature 場景數不符（8 vs 13）

**來源**：BDD-server.md → RTM §Server-Side Features

BDD-server.md 標注 `claim-flow.feature` 有 4 個場景；RTM 欄位顯示 8；實際文件有 13 個場景。三份文件數字均不一致。

衝突類型: B2-下游偏離  
受影響範圍：BDD-server.md 82 scenarios 總計；RTM coverage percentage 可信度  
建議修復方向：以實際 feature 文件為準更新 BDD-server.md 與 RTM 數字  
可自動修復：YES

---

### [MEDIUM] D1-06 — FRONTEND→BDD-client: settings/ 目錄在 FRONTEND.md 架構中不存在

**來源**：features/client/settings.feature → FRONTEND.md §2.1

`settings.feature`（21 個場景）測試 ThemeToggle、AudioToggle、NotificationToggle，但 FRONTEND.md §2.1 目錄結構無 `settings/` 目錄，也無任何 Settings 相關元件定義。BDD 測試規格所指向的元件在 FRONTEND 架構文件中不存在。

衝突類型: 缺失  
受影響範圍：前端架構可實現性；settings 頁面無路由/元件位置參考  
建議修復方向：FRONTEND.md §2.1 新增 `settings/` 目錄及相關元件，或從 BDD-client 移除 settings.feature  
可自動修復：NO

---

### [LOW] D1-07 — BDD-client→RTM: settings.feature 溯源錯誤（US-AUTH-002 主題不符）

**來源**：RTM §Client-Side Features → PRD

RTM 將 `settings.feature` 對應至 US-AUTH-002（Returning Pet Owner Access）；US-AUTH-002 實際主題是「憑 email 重新取回寵物存取」，非 UI 偏好設定。

衝突類型: B2-下游偏離  
建議修復方向：若保留 settings，PRD 補充對應 user story；否則 RTM 改標記為「Non-PRD / Gold-plating」  
可自動修復：NO

---

### [LOW] D1-08 — Gold-plating: settings.feature 無 PRD/BRD/PDD 需求支撐

**來源**：features/client/settings.feature → BRD/PRD/PDD

ThemeToggle、AudioToggle、NotificationToggle 在 BRD in-scope、PRD user stories、PDD screen specs 中均無對應需求。

衝突類型: gold-plating  
建議修復方向：提交 Product Decision — 有業務價值則補 PRD P2 story；否則標記 `@skip @future`  
可自動修復：NO

---

### [LOW] [FIXED: align-fix 2026-05-19] D1-09 — EDD→SCHEMA: Economy config Redis key `config:economy` 缺失

**來源**：US-ADMIN-006 PUT /admin/api/config/economy → EDD §3.4 + SCHEMA.md §1.1

Cache refresh AC（≤5min）需要 `config:economy` Redis key，但 EDD §3.4 Admin BC Redis key patterns 和 SCHEMA.md §1.1 均未列出此 key。

衝突類型: 缺失  
建議修復方向：EDD §3.4 與 SCHEMA.md §1.1 同步新增 `config:economy` key pattern  
可自動修復：YES

---

### [LOW] [FIXED: align-fix 2026-05-19] D1-10 — BDD-client.md overview 數字過時（9 files/50+ → 10 files/133 scenarios）

**來源**：BDD-client.md §Overview

BDD-client.md 聲明「9 client features, 50+ scenarios」；實際：10 個 client feature 文件，133 個場景（含 `trading-ui.feature`）。

衝突類型: B2-下游偏離  
建議修復方向：更新 BDD-client.md §Overview 為「10 client features, 133 scenarios」  
可自動修復：YES

---

## Dimension 2 — 文件↔程式碼對齊（Doc → Code）

**CRITICAL: 5 / MEDIUM: 2**

> **背景**：專案處於「純文件 + Scaffold 期」。`apps/` 和 `src/` 目錄均不存在（僅有 `docs/blueprint/scaffold/` 作為 AI 生成參考骨架）。所有 Dim2 CRITICAL 為「預期的 gencode 前狀態」，文件設計本身無問題。

---

### [CRITICAL] D2-01 — API → src/: 全部 40+ API endpoint 零實作

API.md 定義的所有端點（Player API §5、Admin API §6，含 health check）在 repo 中無任何 route/handler 文件。`apps/api/` 目錄不存在。

受影響範圍：整個後端服務層  
建議修復方向：建立 monorepo 結構（apps/api, apps/worker, apps/web, apps/admin, packages/shared），按 EDD §3.8 plugin 掛載骨架實作。優先順序：health → claim → pet CRUD → arena → leaderboard → gdpr → admin

---

### [CRITICAL] D2-02 — SCHEMA → src/: 全部 12 個資料表零 ORM/Migration 實作

SCHEMA.md 定義 12 個 PostgreSQL 表，無 migration 文件、無 ORM 定義、無 Repository class。

建議修復方向：建立 V001–V021 migration SQL 檔，為每個 BC 實作對應 Repository（PetRepositoryPg 等）

---

### [CRITICAL] D2-03 — EDD → src/: 分層架構（Controller/Service/Repository）完全缺失

EDD §3.1b 定義 Clean Architecture；EDD §3.8 定義完整 monorepo 目錄樹。Use Case classes、domain entities、infrastructure adapters 均不存在。

建議修復方向：從 Domain layer 的 entity/port interfaces 開始向外實作（Domain → Application → Infrastructure → Presentation）

---

### [CRITICAL] D2-04 — EDD → src/: 外部依賴 adapter 完全缺失

Redis adapter（leaderboard sorted set、rate-limit counters、admin sessions、token blacklist、config cache）、PostgreSQL client（node-pg pool min=20/max=50）、SendGrid/Nodemailer failover — 均無 adapter 代碼。

---

### [CRITICAL] D2-05 — ARCH → src/: 所有 ARCH 元件無對應模組/目錄

Player App（React 18 + Phaser 3）、Admin Portal（Vue 3）、Game API Server（Fastify 4）、Worker、Shared package — 全部不存在。無根目錄 `package.json`。

---

### [MEDIUM] D2-06 — features/steps/*.ts: BDD step files 全部返回 'pending'

15 個 step definition 文件中每個 step body 均返回 `'pending'`；`AppWorld` 的 DbClient/RedisClient/HttpClient 介面未注入真實實作。屬 generated skeleton scaffolding，非 working tests。

建議修復方向：src/ 實作後補充 AppWorld injection + step bodies

---

### [MEDIUM] D2-07 — docker-compose.yml: 引用不存在的應用程式

`docker-compose.yml` 定義完整服務配置（build: .，healthcheck: GET /health），但無 Dockerfile、無 `package.json`、無 src/，無法建置或執行。

建議修復方向：實作 src/ 後新增 Dockerfile，或標記 docker-compose.yml 為 template-only artifact

---

## Dimension 3 — 程式碼↔測試對齊（Code → Test）

**CRITICAL: 5 / HIGH: 9 / MEDIUM: 2 / LOW: 1**

> **背景**：`docs/blueprint/scaffold/` 包含 AI 生成的骨架代碼（domain entities, application services, infrastructure adapters, presentation routes）。所有方法均拋出 `new Error('Not implemented')`。以下 findings 基於此 scaffold 結構，反映 TDD RED 狀態——測試已寫，實作待補。

---

### [CRITICAL] D3-01 — Pet.ts: 全部 7 個方法未實作，測試 22 個 it() 全部失敗

`create` `reconstitute` `rename` `gainExperience` `retire` `transferTo` `toJSON` 均拋出 `Not implemented`；`Pet.test.ts` 有 22 個具體 it() cases。

---

### [CRITICAL] D3-02 — ClaimCode.ts: 全部 7 個方法未實作，18 個 it() 全部失敗

`issue` `reconstitute` `redeem` `revoke` `expire` `isRedeemable` `toJSON` 均拋出 `Not implemented`。

---

### [CRITICAL] D3-03 — PetStats.ts: 7 個方法未實作且無測試文件

`create` `addExperience` `scaleToLevel` `takeDamage` `isDefeated` `equals` `toJSON` 均未實作，無 `PetStats.test.ts`。`Pet.test.ts` 使用 `PetStats.create()` 作為 fixture，因此 Pet 測試亦受連帶影響。

---

### [CRITICAL] D3-04 — PetRarity.ts: `sampleRarity()` 未實作且無測試文件

`sampleRarity()` 拋出 `Not implemented`，無 `PetRarity.test.ts`。此函式為關鍵公平性敏感工具（cryptographic RNG distribution: 60/25/12/3%）。

---

### [CRITICAL] D3-05 — BattleRecord.ts: 5 個方法未實作且無測試文件

`record` `reconstitute` `durationMs` `involves` `toJSON` 均未實作，無 `BattleRecord.test.ts`。

---

### [HIGH] D3-06 — MarketplaceListing.ts: 9 個 it.todo() 存根，3 個核心方法未實作

`computeMinPriceCredits` 已實作（4 個 it() 通過）；`open()` `cancel()` `markSold()` 未實作，對應 9 個 `it.todo()` 靜默跳過。

---

### [HIGH] D3-07 — MarketplaceTransaction.ts: 8 個 it.todo()，4 個方法未實作

`computeFeeCredits` 已實作（3 個 it() 通過）；`record()` `reconstitute()` 分支 `netSellerCredits()` `toPublicJSON()` 未實作。

---

### [HIGH] D3-08 — PetService.ts: 7 個方法未實作，無測試文件

`createPet` `getPetById` `listPets` `renamePet` `transferPet` `retirePet` `awardExperience` 全部拋出 `Not implemented`。無 `PetService.test.ts`。

---

### [HIGH] D3-09 — ArenaService.ts: 5 個方法未實作，無測試文件

含可純函式測試的 `simulateBattle` 和 `calculateRankedDelta`，均未實作，無測試文件。

---

### [HIGH] D3-10 — ClaimService.ts: 5 個方法未實作，無測試文件

`issueCode` `redeemCode` `revokeCode` `expireStaleCodes` `getCodeById` 全部未實作。

---

### [HIGH] D3-11 — MarketplaceService.ts: 3 個核心方法未實作，無測試文件

`createListing` `cancelListing` `buyListing` 未實作（anti-flip check、self-trade guard、atomic buy flow）。

---

### [HIGH] D3-12 — InMemoryPetRepository: 7 個方法未實作，無測試文件

此 test-double 預計用於 PetService/ArenaService 單元測試，但自身亦全部拋出 `Not implemented`，導致 application-layer 測試無法建立。

---

### [HIGH] D3-13 — pet.routes.ts: 6 個 route handler 未實作，無 integration test 目錄

`/pets` 全部 6 個 route handler 拋出 `Not implemented`；`tests/integration/` 目錄不存在。

---

### [HIGH] D3-14 — 所有 BDD E2E steps 返回 'pending'，無任何斷言執行

15 個 step definition 文件 + 10 個 client step 文件，全部 step 返回 `'pending'`。60+ Cucumber 場景靜默通過而非真正失敗，遮蔽了 E2E 覆蓋的完全缺失。

---

### [MEDIUM] D3-15 — Pet.test.ts: rarity 固定傳入，未測試 sampleRarity() 隨機分支

`buildPet` fixture 直接傳 `rarity: PetRarity.COMMON`，未覆蓋 `Pet.create()` 應呼叫 `sampleRarity()` 的路徑。

---

### [MEDIUM] D3-16 — ListingStatus.ts: 常數集合無測試驗證

`LISTING_STATUS_VALUES` 的集合正確性（`['active', 'cancelled', 'sold']`）無任何測試，`MarketplaceListing.reconstitute` 驗證邏輯依賴此常數。

---

### [LOW] D3-17 — Client BDD steps 全部返回 'pending'

10 個 client step 文件（Playwright/browser）全部 `'pending'`，所有客戶端 UI BDD 場景零斷言執行。

---

## Dimension 4 — 文件↔測試對齊（Doc → Test）

**CRITICAL: 2 / HIGH: 7 / MEDIUM: 4 / LOW: 3**

---

### [CRITICAL] D4-01 — tests/ 目錄不存在，所有 integration/unit test 引用均為 phantom

test-plan.md 文件化 24 個 integration TCs（TC-INT-001 ~ TC-INT-024）和 22 個 unit TCs，引用 `apps/api/src/__tests__/integration/*.test.ts`，但 `apps/` 目錄不存在。RTM 所有「Unit/Integration」覆蓋狀態均為「未驗證的計畫」。

受影響範圍：24 個 integration TCs、22 個 unit TCs、所有 SCHEMA use-case SQL 測試  
建議修復方向：建立 monorepo 後實作 test-plan.md §6 記錄的 integration test 文件；RTM 所有對應欄位改標記為「⏳ Spec Written — Not Implemented」

---

### [CRITICAL] D4-02 — US-ADMIN-003 AC-015 標記 RTM「✅ Covered」但實際無測試

RTM 將 US-ADMIN-003 標記為「✅ Covered（via integration test）」，實際 integration test 文件不存在（見 D4-01），且無 BDD feature file。

建議修復方向：RTM 改標記為「⚠ Planned — no test file exists」直到實際測試文件建立

---

### [HIGH] [FIXED: align-fix 2026-05-19] D4-03 — RTM: server feature 場景計數嚴重過時（RTM 82 → 實際 122）

RTM server-side inventory 聲稱 82 個場景；實際 13 個 feature 文件共 122 個場景（差距 40 個）。`admin-auth.feature`（5 個場景）完全未列入 RTM。

受影響範圍：RTM §Server-Side Features 全表；BDD coverage percentage 可信度  
建議修復方向：執行 `grep -c "Scenario" features/*.feature` 重新生成 RTM inventory，新增 admin-auth.feature 行（映射至 US-ADMIN-AUTH-001 或 US-ADMIN-001 AC 子項目）

---

### [HIGH] D4-04 — PRD AC-001-7（canvas 降級顯示）→ features/client/: 無對應場景

AC-001-7：「pet canvas 渲染失敗 3 秒後顯示靜態降級圖片」。`features/client/pet-display.feature` 12 個場景覆蓋 sprite 渲染但不含 canvas 失敗降級路徑。

建議修復方向：`pet-display.feature` 新增：「Given WebGL 不可用或 Phaser 初始化 3s 超時，顯示靜態降級圖片，ClaimCTA 保持可用」

---

### [HIGH] D4-05 — PRD AC-003-8（COPPA age gate）→ 無 Accessibility BDD 場景

AC-003-8 分類為「E2E + Accessibility」；server 場景覆蓋 HTTP 400 `AGE_CONFIRMATION_REQUIRED`；client 場景覆蓋 form 前端阻擋。但無 WCAG/鍵盤導航/screen reader 場景。

建議修復方向：`claim-flow-ui.feature` 新增無障礙場景：Tab 可達勾選框，aria-label 可被 screen reader 讀取

---

### [HIGH] D4-06 — FRONTEND §5.9 Admin TOTP Enrollment → features/client/: Path A/C 無專門場景

FRONTEND.md §5.9 定義 Path A（TOTP 未設定 → 跳轉 `/admin/totp-setup`）和 Path C（10 次失敗 → 帳號鎖定 15 分鐘顯示）。`admin-portal.feature` 21 個場景覆蓋後台功能但不含這兩個 login 特殊路徑。

建議修復方向：`admin-portal.feature` 新增：(1) 首次登入 TOTP 設定重定向 + QR code 顯示 + backup codes 一次性顯示；(2) IP rate-limit 倒計時顯示

---

### [HIGH] D4-07 — FRONTEND §5.2 Token Recovery 負面場景 → features/client/: 缺失

FRONTEND.md §5.2 定義 4 個 recovery error states：`CODE_EXPIRED` `INVALID_CODE` `MAX_ATTEMPTS_REACHED` `RATE_LIMIT_EXCEEDED`。`claim-flow-ui.feature` 10 個場景聚焦初始 claim flow，無 recovery 負面路徑。

建議修復方向：`claim-flow-ui.feature` 新增至少 3 個 recovery error 場景：invalid OTP shake、session exhaustion disable、expired code re-request

---

### [HIGH] D4-08 — EDD §1.2 Redis 不可用 Fail-Closed → features/client/: 無 503 UI 場景

EDD §1.2 P9 設計原則：Redis 不可用時 OTP 驗證 fail closed（503）。Server 場景已覆蓋 API 合約；FRONTEND.md §9.1 指定「HTTP 503 → 降級模式訊息 + retry button」，但 client features 無對應場景。

建議修復方向：`claim-flow-ui.feature` 新增：「API 返回 503 時，顯示降級模式訊息與 retry 按鈕，inputs 保持可用」

---

### [HIGH] D4-09 — FRONTEND §5.8 GDPR player 頁面 → features/client/: gdpr-ui.feature 不存在

FRONTEND.md §5.8 描述玩家自助 GDPR 流程（form type selector、HTTP 400 inline error、status polling banner）；Table 10 映射至 `features/client/gdpr-ui.feature`，但此文件**不存在**。`admin-portal.feature` 僅覆蓋管理員端 GDPR queue。

建議修復方向：建立 `features/client/gdpr-ui.feature`（含 request submission、validation error、status polling 場景）及 `features/client/steps/gdpr-ui.steps.ts`

---

### [MEDIUM] [FIXED: align-fix 2026-05-19] D4-10 — RTM BDD coverage 聲稱「100%」但所有 step 返回 pending

RTM 聲明「17/17 active user stories fully covered (100%)」，基於 feature file 存在性而非實際執行通過。所有 step definitions 返回 `'pending'`。

建議修復方向：RTM 新增「Execution Status」欄位，區分「Spec Written（Pending）」與「Scenarios Passing in CI」

---

### [MEDIUM] D4-11 — FRONTEND §5.5 Arena error states → BDD-client: PET_BANNED/NOT_OWNER 無場景

FRONTEND.md §5.5 定義：HTTP 403 PET_BANNED → ban notice block；HTTP 403 NOT_OWNER → toast。`arena-ui.feature` 10 個場景無這兩個 client-visible error state。

建議修復方向：`arena-ui.feature` 新增 2 個場景：banned pet ban notice、NOT_OWNER toast

---

### [MEDIUM] D4-12 — FRONTEND §5.3 STAT_AT_MAXIMUM card 狀態 → features/client/: 無專門場景

FRONTEND.md §5.3：HTTP 400 STAT_AT_MAXIMUM → 該 stat card disabled，其他 card 保持可用 + toast。`training-ui.feature` 無此 disabled card 場景。

建議修復方向：`training-ui.feature` 新增：「stat_speed=100 時，RUN training card 顯示 Max indicator 且 disabled；STRENGTH 和 STAMINA card 保持可用」

---

### [MEDIUM] D4-13 — SCHEMA use-case SQL → tests/integration/: 無任何 integration test

SCHEMA.md §6.3 文件化 GDPR erasure procedure；§1.1.2 文件化 anti-flip 查詢模式。TC-INT-014 ~ TC-INT-016、AC-012-4 均依賴 integration test，但 tests/ 不存在（見 D4-01）。

---

### [LOW] D4-14 — FRONTEND §5.6 Marketplace error states → trading-ui.feature: 僅 1 個 @future 場景

FRONTEND.md §5.6 定義 6 個 marketplace error states；`trading-ui.feature` 僅 1 個 `@future @wip` 場景。此為 P2 deferred，正式接受。若 FF_MARKETPLACE 啟用，6 個 error state 場景將缺席。

---

### [LOW] [FIXED: align-fix 2026-05-19] D4-15 — RTM: rarity-distribution.feature 場景數 5 → 實際 10（2× 低估）

RTM 記錄 5 個場景；實際 10 個場景（差距最大的比例失真）。

建議修復方向：更新 RTM `rarity-distribution.feature` 行為 10 個場景

---

### [LOW] D4-16 — FRONTEND §5.5 Arena error → no client BDD scenario

arena error UI behavior for HTTP 503 (Redis unavailable) not yet captured in client scenarios beyond the general degraded mode request noted in D4-08.

---

## Dimension 5 — Feature Scenario 實際計數

**Server features (13 files)**：

| Feature File | 實際場景數 |
|---|---|
| admin-auth.feature | 5 |
| admin-moderation.feature | 9 |
| admin-search-performance.feature | 6 |
| arena-battle.feature | 12 |
| battle-records.feature | 8 |
| claim-flow.feature | 13 |
| economy-config.feature | 10 |
| gdpr-erasure.feature | 10 |
| leaderboard.feature | 9 |
| rarity-distribution.feature | 10 |
| suspicious-detection.feature | 7 |
| trading-system.feature | 11 |
| training-food.feature | 12 |
| **總計** | **122** |

**Client features (10 files)**：

| Feature File | 實際場景數 |
|---|---|
| admin-portal.feature | 21 |
| arena-ui.feature | 10 |
| battle-records.feature | 19 |
| claim-flow-ui.feature | 10 |
| food-system.feature | 17 |
| leaderboard-ui.feature | 10 |
| pet-display.feature | 12 |
| settings.feature | 21 |
| trading-ui.feature | 1 |
| training-ui.feature | 12 |
| **總計** | **133** |

> RTM 聲稱 server 82 個場景（實際 122，缺計 40），client 50+ 個場景（實際 133）。詳見 D4-03。

---

## Dimension 6 — AI Gencode Readiness

**狀態：✅ EXCELLENT — 100%（19/19 checks passed）**

```
✅ API: request schemas defined
✅ API: response schemas defined
✅ API: error codes specified
✅ SCHEMA: DDL statements present
✅ SCHEMA: index definitions present
✅ SCHEMA: constraints defined
✅ EDD: tech stack explicit (Fastify 4, Node.js 20, PostgreSQL, Redis)
✅ EDD: constants table present
✅ EDD: error handling design documented
✅ EDD: bounded context boundaries defined
✅ BDD: {word} typed expressions for URL paths
✅ BDD: step definition files exist
✅ ARCH: BC ownership documented
✅ ARCH: sequence diagrams present
✅ OPS: runbook.md present
✅ OPS: LOCAL_DEPLOY.md present
✅ OPS: CICD.md present
✅ FRONTEND: component specs documented
✅ FRONTEND: route mapping documented
```

**結論**：文件完整度已達到 AI 全量代碼生成的最高信心等級。所有 API 端點、Schema DDL、架構邊界、BDD 驗收場景均有明確規格。可直接執行 `gencode` 流程驅動後端、前端、Admin Portal、Worker 的完整實作。

---

## 修復優先矩陣

### P0 — 立即修復（阻礙 AI Gencode 或影響 local dev）

| ID | 問題 | 可自動修復 |
|---|---|---|
| D1-01 | LOCAL_DEPLOY: Worker container 缺失，port 3001 衝突 | YES |
| D4-09 | gdpr-ui.feature 不存在（FRONTEND.md 映射目標）| NO |
| D4-03 | RTM server scenario inventory 嚴重過時（82→122）| YES |

### P1 — 下一 sprint 前修復（覆蓋缺口 / 文件矛盾）

| ID | 問題 | 可自動修復 |
|---|---|---|
| D1-02 | Sprite 尺寸三文件矛盾（VDD 64 / EDD 32 / FRONTEND ×2）| NO |
| D1-04 | US-ADMIN-003 無 BDD feature file，RTM 虛假覆蓋 | NO |
| D4-01 | tests/ 不存在，24 integration TCs 均為 phantom | NO |
| D4-02 | US-ADMIN-003 RTM 標記 ✅ Covered 但零測試 | NO |
| D4-04 | AC-001-7 canvas 降級場景缺失 | NO |
| D4-06 | Admin TOTP enrollment Path A/C client 場景缺失 | NO |
| D4-07 | Token Recovery 負面場景缺失 | NO |
| D4-08 | Redis 不可用 503 client UI 場景缺失 | NO |

### P2 — 本版本内修復（品質改善）

| ID | 問題 | 可自動修復 |
|---|---|---|
| D1-05 | claim-flow.feature RTM 場景數不符（3個數字均不一致）| YES |
| D1-06 | settings/ 目錄在 FRONTEND.md 不存在 | NO |
| D1-09 | EDD/SCHEMA 缺少 `config:economy` Redis key | YES |
| D1-10 | BDD-client.md overview 數字過時 | YES |
| D4-10 | RTM coverage 聲稱 100% 但 step 全 pending | YES |
| D4-11 | Arena PET_BANNED/NOT_OWNER client 場景缺失 | NO |
| D4-12 | STAT_AT_MAXIMUM training card 場景缺失 | NO |

### P3 — Gold-plating / 低優先（Product Decision 待議）

| ID | 問題 | 可自動修復 |
|---|---|---|
| D1-03 | Sumo Mode BRD P2 vs PRD P1 優先級衝突 | NO |
| D1-07 | settings.feature RTM 溯源錯誤 | NO |
| D1-08 | settings.feature gold-plating（無 PRD 依據）| NO |
| D4-14 | Marketplace error states 僅 1 @future 場景（P2 deferred）| NO |

---

## 總結（v2.1.0 — 2026-05-16）

```
總 Finding 數：53
CRITICAL: 12（Dim2 x5 + Dim3 x5 + Dim4 x2）— 預期 gencode 前狀態
HIGH: 19（Dim1 x2 + Dim3 x9 + Dim4 x7 + Dim5 x1）
MEDIUM: 13（Dim1 x4 + Dim2 x2 + Dim3 x2 + Dim4 x4 + Dim5 x1）
LOW: 9（Dim1 x4 + Dim3 x1 + Dim4 x3 + Dim5 x1）

AI Gencode Readiness: 100%（EXCELLENT）
文件完備度：25/25 文件存在且非空
BDD 覆蓋：Server 13 files / 122 scenarios；Client 10 files / 133 scenarios
下一步：執行 gencode 流程驅動後端全量實作（P0 fixes 優先）
```

---

## 增量 Re-scan（v2.2.0 — 2026-05-18）

> PROTOTYPE、MOCK、HTML 步驟完成後執行的增量掃描。新增 Dim1 findings，其他維度延續 v2.1.0 結論。

### 新增 Dim1 Findings（2026-05-18）

**[HIGH] D1-NEW-01 — PRD §19.2 Admin 4 roles vs EDD/SCHEMA/FRONTEND 3 roles**
- PRD §19.2 定義 4 個 admin 角色（Super Admin, Moderator, Analyst, Support Agent）；EDD §9.6、SCHEMA admin_role_enum、FRONTEND useAdminAuthStore、ADMIN_IMPL RBAC 一致實作 3 個角色（super_admin, moderator, read_only）。Analyst 和 Support Agent 被靜默合併至 read_only 無追溯。
- 衝突類型：B2-下游偏離（EDD/SCHEMA/FRONTEND 內部一致，PRD 是唯一偏差方）
- 建議修復方向：更新 PRD §19.2 改為 3 角色模型（無需修改 EDD/SCHEMA/FRONTEND）
- 可自動修復：NO（需產品決策）

**[HIGH] D1-NEW-02 — PRD AC-012-2 barter trade vs API §5.6 monetary marketplace**
- PRD US-TRADE-001 AC-012-2：「玩家可提交換寵物要約（以自己的寵物換取對方寵物）」— 描述 barter 模型。API.md §5.6 Marketplace 實作 price 欄位的買賣模型；SCHEMA marketplace_listings 有 price 欄（無 offer/barter 結構）。
- 衝突類型：B2-下游偏離（API 設計了 monetary 模型；PRD 描述 barter 模型）
- 建議修復方向：更新 PRD AC-012-2 改為描述 monetary buy/sell 模型（該功能受 FF_MARKETPLACE 保護，非 v1 阻塞項）
- 可自動修復：NO（需產品決策）

**[MEDIUM] [FIXED: align-fix 2026-05-19] D1-NEW-03 — ANIM §11.3 rarity 機率值與 PRD/EDD CONSTANTS 不符**
- ANIM §11.3 `determineRarity()` 使用：RARE=30%, EPIC=8%, LEGENDARY=2%
- PRD/EDD/CONSTANTS 定義：RARE=25%, EPIC=12%, LEGENDARY=3%
- 三個非 COMMON 等級均錯誤；TC-UNIT-003 使用正確 PRD 值
- 建議修復方向：修正 ANIM §11.3 閾值：legendary < 0.03, epic < 0.15, rare < 0.40
- 可自動修復：YES

**[MEDIUM] [FIXED: align-fix 2026-05-19] D1-NEW-04 — PRD §11.2 data dictionary 欄位名稱與 SCHEMA §3.3 不符**
- PRD §11.2 claim_codes 欄位：claim_code, claim_code_expires_at, claim_code_used
- SCHEMA §3.3 實際欄位：code_hash, expires_at, used_at
- 建議修復方向：更新 PRD §11.2 欄位名稱對齊 SCHEMA（SCHEMA 為權威來源）
- 可自動修復：YES

**[MEDIUM] [FIXED: align-fix 2026-05-19] D1-NEW-05 — PRD §11.2 pet_access_tokens 描述為獨立表；SCHEMA 使用 pets.owner_token_hash**
- 建議修復方向：移除/更正 PRD §11.2 PetAccessToken 條目，說明 token hash 存放在 pets 表
- 可自動修復：YES

**[MEDIUM] [FIXED: align-fix 2026-05-19] D1-NEW-06 — EDD §3.5b Service Port Matrix 描述 pre-K8s port；LOCAL_DEPLOY v3.0 為 K8s 架構**
- EDD §3.5b: API=3000, PostgreSQL=54322, Inbucket=54324（已淘汰的 pnpm+Docker 模式）
- LOCAL_DEPLOY v3.0: API=8080 (kubectl), PostgreSQL=5432 (kubectl), Mailpit=8025
- 建議修復方向：更新 EDD §3.5b 改為 K8s port；Inbucket 替換為 Mailpit
- 可自動修復：YES

**[MEDIUM] [FIXED: align-fix 2026-05-19] D1-NEW-07 — AUDIO §5.2 定義 12 個音效事件；FRONTEND §3.3 無對應 cross-reference**
- 建議修復方向：在 FRONTEND §3.3 PetCanvasEngine 段落補充 12 個 audio event 名稱清單及 AUDIO.md §5.2 引用
- 可自動修復：YES

### Dim5、Dim6、Dim7 新增結論（2026-05-18）

| 維度 | 狀態 | 摘要 |
|------|------|------|
| Dim5 UML/RTM 品質 | ✅ PASS | EDD 42 classes, 9 PUML files, RTM.csv OK, 9 relationship types |
| Dim6 AI Gencode 就緒度 | ✅ 90% | All 6 layers ≥80% (SCHEMA/ANIM/BDD=100%, API=85%, CICD/LOCAL=80%) |
| Dim7 Generated Artifacts | ✅ PASS | API Explorer=54 endpoints OK; main.py path params OK; admin-mock.js spot-check needed |

### 增量總計（v2.2.0 新增）

```
新增 Dim1 findings：HIGH=2, MEDIUM=5
Dim6 AI Gencode Readiness：90%（v2.1.0 100% 基礎上，因 CICD/LOCAL 微降）
Dim7 Generated Artifacts：全部通過

建議下一步：執行 /gendoc-align-fix — 自動修復所有 YES 項目
  優先：D1-NEW-03 ANIM rarity values (BUG 級)
        D1-NEW-04/05 PRD data dictionary corrections
        D1-NEW-06 EDD port matrix update
        D1-NEW-07 FRONTEND audio cross-reference
  人工：D1-NEW-01 PRD role count (product decision)
        D1-NEW-02 Marketplace mechanism (product decision)
```
