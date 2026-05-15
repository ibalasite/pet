---
doc-type: ALIGN
version: 2.0.0
description: 全局對齊掃描報告 — pixel-pet-arena 六維度文件↔程式碼↔測試對齊問題清單（只列問題，不修復）
generated: 2026-05-15
---

# ALIGN_REPORT — 全局對齊掃描報告

**專案**：pixel-pet-arena
**掃描日期**：2026-05-15
**掃描策略**：exhaustive（全量掃描，六個維度）
**Client Type**：game | Has Admin Backend：true

---

## 執行摘要

```
╔══════════════════════════════════════════════════════════════════╗
║         gendoc-align-check — 對齊掃描報告                          ║
║         專案：pixel-pet-arena   日期：2026-05-15                   ║
╠══════════════════════════════════════════════════════════════════╣
║  對齊層              CRITICAL  HIGH  MEDIUM  LOW  總計   狀態      ║
║  Dim 0 文件存在性        0       0      0     0     0   ✅         ║
║  Dim 1 Doc → Doc         0       5      4     4    13   ⚠️         ║
║  Dim 2 Doc → Code        —       —      —     —    —    ⏸ 待 gencode ║
║  Dim 3 Code → Test       —       —      —     —    —    ⏸ 待 gencode ║
║  Dim 4 Doc → Test        3       7     11     3    24   🔴         ║
║  Dim 5 UML/RTM 品質      0       1      0     0     1   ⚠️         ║
║  Dim 6 AI Gencode        0       1      0     0     1   ⚠️  76%    ║
╠══════════════════════════════════════════════════════════════════╣
║  合計（不含 Dim2/3）      3      14     15     7    39             ║
╠══════════════════════════════════════════════════════════════════╣
║  建議執行：/gendoc-align-fix --layer gencode                       ║
╚══════════════════════════════════════════════════════════════════╝
```

> **Dim 2 / Dim 3 說明**：`src/` 和 `tests/` 目錄目前不存在（docs-first 開發模式）。
> Doc→Code 和 Code→Test 的所有對齊工作由 `/gendoc-align-fix --layer gencode` 負責生成程式碼骨架。
> 本次掃描不計入 Dim2/Dim3 findings，避免製造誤導性 CRITICAL 數字。

---

## Dimension 0 — 文件存在性

**結果：✅ PASS — 0 findings**

所有 25 份必要文件均存在且非空：
- docs/ 下 22 份 Markdown 文件（IDEA → ADMIN_IMPL 全鏈）
- features/ 12 個 server .feature 文件
- features/client/ 10 個 client .feature 文件
- README.md

---

## Dimension 1 — Doc → Doc 對齊問題

**結果：⚠️ 13 findings（0C / 5H / 4M / 4L）**

---

### [HIGH] D1-H1：PRD → SCHEMA — Data Dictionary 欄位與實際 Schema 嚴重偏離

PRD §11.2 Data Dictionary 定義了 4 個與 SCHEMA.md 不一致的欄位：

| PRD 定義 | SCHEMA.md 實際 | 偏差說明 |
|----------|--------------|---------|
| `owner_email_hash` | `claim_identity_id` (FK) | PRD 直接存 hash；SCHEMA 拆出 claim_identities 表 |
| `pet_access_tokens` 獨立表 | 不存在 — token hash 存於 `pets.owner_token_hash` | 架構差異 |
| `claim_code_used BOOLEAN` | `used_at TIMESTAMPTZ` | 語意相近但型別不同 |
| `battle_outcome ENUM(WIN, LOSS, DRAW)` | `winner_pet_id UUID` | 表達方式不同 |

衝突類型：B2-下游偏離（SCHEMA 設計更合理，PRD §11.2 為概念模型）
受影響範圍：開發者閱讀 PRD 後對 DB 結構產生錯誤預期，可能導致 ORM 欄位映射錯誤
建議修復方向：在 SCHEMA.md 或 EDD ADR 加入說明「PRD §11.2 為概念模型，SCHEMA 為實現模型」；或同步更新 PRD §11.2 欄位名稱對齊 SCHEMA
可自動修復：NO

---

### [HIGH] D1-H2：PRD → API — 缺少食物庫存查詢端點（AC-006-1）

PRD AC-006-1 要求 Player App 能顯示食物道具庫存數量（HUD 元素），但 API.md 無對應的 GET 食物庫存端點。
現有 API：`POST /api/v1/pets/:petId/feed`（消耗食物），無 `GET /api/v1/pets/:petId/food` 或等效端點。
Frontend 無法從 API 取得食物庫存以渲染 HUD。

衝突類型：缺失
受影響範圍：US-FOOD-001 完整實現，Player App 食物 HUD
建議修復方向：在 API.md 新增 `GET /api/v1/pets/:petId/food`（回應 food_items 陣列）；或將食物庫存嵌入 `GET /api/v1/pets/:petId/stats`
可自動修復：NO

---

### [HIGH] D1-H3：PRD → EDD + API — 食物獲得機制（Arena 掉落、Training Streak）未設計（AC-006-4）

PRD AC-006-4 明確定義食物獲得機制：
- (a) Arena 對戰後掉落食物
- (b) 連續 3 次 training session 觸發 streak reward 食物

EDD §4.x 無食物掉落邏輯設計；API.md `POST /api/v1/arena/enter` 回應結構不含 `food_drop` 欄位；`POST /api/v1/pets/:petId/train` 回應亦無 `streak_reward` 欄位。

衝突類型：缺失
受影響範圍：US-FOOD-001 食物獲得完整路徑，Arena BC 與 Pet BC 跨 BC 食物發放業務邏輯
建議修復方向：EDD 補充食物掉落機制設計；API.md 在 arena/enter 回應新增 `food_drop: { item_type, quantity } | null`，在 train 回應新增 `streak_reward: { item_type, quantity } | null`
可自動修復：NO

---

### [HIGH] D1-H4：BDD-server → PRD — 交叉參照表存在 3 處 AC 編號錯誤

BDD-server.md 交叉參照表的 3 個 AC 引用錯誤：

1. `AC-007-1` 標示為「Email Claim Rate Limit」，但 PRD AC-007-1 屬於 US-ARENA-001（Arena 匹配邏輯）；Claim Rate Limit 實為 AC-003-x
2. 引用 `AC-004-6`（GDPR 場景）——PRD US-AUTH-002 僅定義 AC-004-1 至 AC-004-5，AC-004-6 不存在
3. 引用 `AC-005-8`（Admin Ban 反映至排行榜）——PRD US-TRAIN-001 僅定義 AC-005-1 至 AC-005-6，AC-005-8 不存在

衝突類型：B2-下游偏離
受影響範圍：BDD 場景可追溯性、RTM 正確性、QA 驗收對齊
建議修復方向：修正 BDD-server.md 交叉參照表的 AC 編號；移除 AC-004-6、AC-005-8，改對應正確 AC 或補充 PRD AC 條目
可自動修復：NO

---

### [HIGH] D1-H5：BRD → EDD + SCHEMA — notification BC 被吸收無 ADR 說明

BRD §5.5 定義 6 個 Bounded Context（含獨立 `notification` BC 負責 email OTP 發送）。
EDD §3.4 Context Map 僅有 5 個 BC——`notification` BC 被吸收進 Identity BC，無任何 ADR 或設計決策說明此合併。
SCHEMA.md §1.1 無 notification 相關表。

衝突類型：B2-下游偏離
受影響範圍：BC 邊界定義一致性；未來 notification 需求擴展缺乏架構槽位；BRD→EDD 可追溯性斷裂
建議修復方向：在 EDD 新增 ADR 說明「notification BC 職責由 Identity BC 的 EmailService 承擔，因當前範圍僅限 OTP email，不設獨立 BC；若通知種類增加則重新評估」
可自動修復：NO

---

### [MEDIUM] D1-M1：BDD-server → RTM — Scenario 計數不一致（81 vs 82）`[FIXED: 0e053e7]`

BDD-server.md 概覽聲明「共 81 scenarios」，RTM.md §2 Server BDD 統計為 82 scenarios。
實際 grep 計數：82 scenarios。BDD-server.md 概覽數字需更新。

衝突類型：B2-下游偏離
受影響範圍：RTM 覆蓋率統計可信度
建議修復方向：重新計算後統一更新 BDD-server.md 概覽數字為 82
可自動修復：YES

---

### [MEDIUM] D1-M2：BDD-client → PRD — settings.feature（21 scenarios）無 User Story 支撐

`features/client/settings.feature`（21 scenarios：主題切換、音效開關、通知偏好）在 RTM 中對應至 US-AUTH-002，但 PRD US-AUTH-002（Email Claim Recovery）無任何 settings/preferences AC 條目。

衝突類型：gold-plating（合理實作，但缺乏正式需求授權）
受影響範圍：21 個 client BDD scenarios 可追溯性懸空
建議修復方向：在 PRD 新增 US-PREF-001「玩家可調整音效/主題偏好」並定義 AC；或將 settings.feature 標記為 `@out-of-scope`
可自動修復：NO

---

### [MEDIUM] D1-M3：PRD → BDD-server — US-ADMIN-003（AC-015-x）無專屬 server BDD

PRD US-ADMIN-003（P1：Runtime Parameter Tuning）的 ACs（AC-015-1 至 AC-015-3：參數更新、5 分鐘快取刷新、稽核日誌）無對應 server BDD feature 檔案。RTM 備註「covered via integration test」，但 test-plan.md 未列對應整合測試案例。

衝突類型：缺失
受影響範圍：US-ADMIN-003 驗收完整性
建議修復方向：新增 `features/runtime-config.feature` 覆蓋 AC-015-x；或明確記錄整合測試檔案路徑
可自動修復：NO

---

### [MEDIUM] D1-M4：BRD → EDD — BC 命名不一致，無對應映射表

BRD §5.5 BC 命名（`auth`, `battle`, `ranking`, `notification`）與 EDD §3.4 BC 命名（`Identity`, `Arena`, `Leaderboard`）不一致，無任何映射表或 ADR 說明重命名決策。

衝突類型：B2-下游偏離
受影響範圍：文件可導航性，onboarding 效率，跨文件搜尋 BC 名稱一致性
建議修復方向：在 EDD §3.4 或 ARCH.md 加入 BC 名稱對應表（BRD 概念名 → EDD 實現名）
可自動修復：NO

---

### [LOW] D1-L1：LOCAL_DEPLOY → EDD — docker-compose port range 語法模糊

LOCAL_DEPLOY.md docker-compose 片段中 API/Worker port 映射為 `"3000-3001:3000"`，此語法將 host 3000 和 3001 均映射至 container port 3000，無法正確暴露 Worker port 3001（EDD §3.5b 定義 Worker 跑在 port 3001）。

衝突類型：B2-下游偏離
建議修復方向：修正為兩條獨立映射：`"3000:3000"` 和 `"3001:3001"`
可自動修復：YES

---

### [LOW] D1-L2：FRONTEND → API — BigInt seed 欄位轉換契約未記錄於 API.md `[FIXED: 0e053e7]`

FRONTEND.md PetCanvasProps 定義 `seed: bigint` 並加注「API returns seed as a JSON number; callers must convert: BigInt(apiResponse.seed)」。此型別轉換契約未記錄於 API.md 對應端點回應 schema（JavaScript 精度截斷風險）。

衝突類型：缺失
建議修復方向：在 API.md 的 pet `seed` 欄位加注「Type: integer (int64)；JavaScript 端須使用 BigInt() 轉換避免精度截斷（JS Number 最大安全整數 2^53-1）」
可自動修復：NO

---

### [LOW] D1-L3：PDD — Platform Scope Game UI 核取方塊未勾選 `[FIXED: 0e053e7]`

PDD.md Platform Scope 中 `Game UI (Phaser 3 / HTML5 Canvas)` 為 `[ ]` 未勾選狀態，但系統實際採用 Phaser 3，EDD 與 PRD 均明確記載。

衝突類型：B2-下游偏離
建議修復方向：將 PDD.md 中 `[ ] Game UI (Phaser 3 / HTML5 Canvas)` 改為 `[x]`
可自動修復：YES

---

### [LOW] D1-L4：VDD → FRONTEND — VDD 色彩 token 未對應至 FRONTEND CSS variables

VDD.md 定義深色模式色系（deep navy 色板），但 FRONTEND.md 未說明 VDD 色彩如何對應至 FRONTEND 的 CSS custom properties（如 `--color-surface`、`--color-rarity-epic` 等）。

衝突類型：缺失
建議修復方向：在 FRONTEND.md 新增 Design Token 對應段落，列出 VDD 色彩與對應 CSS variable 名稱的映射關係
可自動修復：NO

---

## Dimension 2 — Doc → Code 對齊（⏸ 待 gencode 階段）

`src/` 目錄目前不存在。API.md 定義的 33 個 REST endpoints 均無實作。
此為 docs-first 開發流程的正常狀態——所有 Doc→Code scaffold 由 `/gendoc-align-fix --layer gencode` 負責生成。
**本維度不計入 findings 總數。**

---

## Dimension 3 — Code → Test 對齊（⏸ 待 gencode 階段）

`src/` 和 `tests/` 目錄目前均不存在。Code→Test 對齊無法執行。
**本維度不計入 findings 總數。**

---

## Dimension 4 — Doc → Test 對齊問題

**結果：🔴 24 findings（3C / 7H / 11M / 3L）**

---

### [CRITICAL] D4-C1：RTM BDD Tags 欄位使用不存在的 tag 命名規則 `[FIXED: 0e053e7]`

RTM.md 的「BDD Tags (sample)」欄位使用 `@TC-PET-001-1`、`@TC-AUTH-001-1`、`@TC-ARENA-001-1` 等 tag。
這些 tag **在任何 feature 檔案中均不存在**。
實際 feature file tag 格式為：`@TC-SRV-CLAIM-001`、`@TC-CLI-CLAIM-001`、`@TC-SRV-ARENA-001` 等（SRV/CLI 前綴 + 領域名 + 序號）。
RTM 的正向追溯性（requirement → BDD scenario）從 tag 層完全斷裂。

衝突類型：B2-下游偏離
受影響範圍：全部 19 個 RTM rows（18 US + 1 NFR-XCUT-001）；整條正向追溯鏈
建議修復方向：以 `grep "@TC-" features/**/*.feature` 自動提取實際 tag，重新生成 RTM BDD Tags 欄位
可自動修復：YES（腳本自動化）

---

### [CRITICAL] D4-C2：features/steps/ 不存在 — 82 個 server BDD scenarios 無法執行 `[FIXED: 992aa6c]`

`features/steps/` 目錄完全不存在。82 個 server-side Gherkin scenarios（12 個 feature 檔案）無任何 Cucumber-js step definition，整個 server BDD suite 無法執行。

衝突類型：缺失
受影響範圍：所有 82 個 server BDD scenarios，12 個 feature 檔案
建議修復方向：`/gendoc-align-fix --layer gencode` 生成 `features/steps/`（TypeScript + Cucumber-js）；優先：claim-flow steps（認證關鍵路徑）、arena-battle steps（限流/配對）、training-food steps（stat 邊界）
可自動修復：YES（gencode 階段生成骨架）

---

### [CRITICAL] D4-C3：features/client/steps/ 不存在 — 133 個 client BDD scenarios 無法執行 `[FIXED: e739041]`

`features/client/steps/` 目錄完全不存在。133 個 client-side Gherkin scenarios（10 個 feature 檔案）無任何 Playwright step definition，整個 client BDD suite 無法執行。

衝突類型：缺失
受影響範圍：所有 133 個 client BDD scenarios，10 個 feature 檔案
建議修復方向：`/gendoc-align-fix --layer gencode` 生成 `features/client/steps/`（Playwright + Cucumber-js）；優先：pet-display steps（canvas 渲染）、claim-flow-ui steps（主要獲取漏斗）、admin-portal steps（TOTP + 封禁流程）
可自動修復：YES（gencode 階段生成骨架）

---

### [HIGH] D4-H1：EDD §8.1 HTTP 404 — 12 個 server feature 中完全沒有 404 負面場景

EDD §8.1 錯誤碼表明確列出 HTTP 404（not found / unknown petId）。
掃描 12 個 server feature 檔案，**零個 scenarios** 產生 HTTP 404 回應。
PRD AC-004-5 和 AC-010-5 均要求 404 處理。

衝突類型：缺失
受影響範圍：claim-flow.feature（AC-004-5）、battle-records.feature（AC-010-5）及所有接受 petId 路徑參數的端點
建議修復方向：在 claim-flow.feature 新增 @TC-SRV-CLAIM-009（無效/已撤銷 token → 404）；在 battle-records.feature 新增 @TC-SRV-REC-008（未知 petId → 404）
可自動修復：NO

---

### [HIGH] D4-H2：RTM 庫存計數陳舊 `[FIXED: 0e053e7]`

RTM Overview 聲明「9 個 client feature 檔案 / 124 scenarios」。實際狀態：
- 10 個 client feature 檔案（trading-ui.feature 未列入 RTM 庫存）
- admin-portal.feature：RTM 記載 13 scenarios，實際為 21
- Client scenarios 實際總數：133（RTM 記載 124）
- 總 scenarios：RTM 聲明 206，實際為 215

衝突類型：B2-下游偏離
受影響範圍：RTM Overview、BDD Feature File Inventory table、Coverage Summary
建議修復方向：依當前 feature 檔案重新計算，更新所有計數；在庫存表新增 trading-ui.feature 行（映射 US-TRADE-001，標記 ⏸ Deferred）
可自動修復：YES（腳本自動化）

---

### [HIGH] D4-H3：PRD AC-002-6 → 無 503 generation_exhausted server BDD scenario

PRD AC-002-6 要求寵物種子唯一性在 3 次重試後仍無法達成時回傳 HTTP 503 `{"error":"generation_exhausted"}`。無任何 server BDD scenario 涵蓋此錯誤邊界。

衝突類型：缺失
受影響範圍：US-PET-002（Procedural Pixel Pet Generation）— AC-002-6 邊界
建議修復方向：在 rarity-distribution.feature 或新的 pet-generation.feature 新增 @TC-SRV-PET-006：3 次重試失敗 → 503 generation_exhausted
可自動修復：NO

---

### [HIGH] D4-H4：PRD AC-001-7 → 無 Canvas WebGL fallback client BDD scenario

PRD AC-001-7 要求 WebGL/canvas 初始化失敗後 3 秒逾時 → 靜態備用圖像 + "Try refreshing" 訊息，CTA 按鈕仍可操作。pet-display.feature 無任何涵蓋此錯誤路徑的 scenarios。

衝突類型：缺失
受影響範圍：US-PET-001 — AC-001-7（E2E + Integration）
建議修復方向：在 pet-display.feature 新增 @TC-CLI-PET-013：模擬 Phaser init 失敗（WebGL 不可用）→ 靜態備用可見 + claim button 可操作
可自動修復：NO

---

### [HIGH] D4-H5：PRD AC-004-4 + FRONTEND GdprPage → 玩家端 GDPR 刪除流程無 client BDD coverage

PRD AC-004-4 要求玩家能請求自身資料刪除（GDPR right to erasure）。FRONTEND.md 定義 `GdprPage`（`/gdpr`）含 `GdprRequestForm` 和 `GdprStatusBanner`。**沒有任何 client feature 檔案**涵蓋此玩家端頁面。settings.feature（RTM 對應至 US-AUTH-002）涵蓋的是主題/音效偏好，非 GDPR 刪除流程。

衝突類型：缺失
受影響範圍：US-AUTH-002 — AC-004-4；GdprPage（`/gdpr`）、GdprRequestForm、GdprStatusBanner
建議修復方向：建立 `features/client/gdpr-ui.feature`，至少包含 3 個 scenarios：提交刪除請求、透過 GdprStatusBanner 查看狀態、成功確認
可自動修復：NO

---

### [HIGH] D4-H6：PRD AC-010-5 → battle-records.feature 無 404 invalid petId scenario

PRD AC-010-5 要求以無效/不存在 pet ID 存取對戰記錄頁面時回傳 HTTP 404。battle-records.feature 有 7 個 scenarios，無一涵蓋 404 on invalid petId。

衝突類型：缺失
受影響範圍：US-RECORD-001 — AC-010-5
建議修復方向：在 battle-records.feature 新增 @TC-SRV-REC-008：GET /api/v1/arena/history/:petId 使用未知 ID → 404
可自動修復：NO

---

### [HIGH] D4-H7：PRD AC-004-4（server side）→ 玩家 GDPR erasure 端點無 server BDD coverage

GDPR erasure 的 server-side 端點（POST /api/v1/gdpr/request）需對應 server BDD scenario。gdpr-erasure.feature（8 scenarios）涵蓋 Admin-triggered GDPR（AC-014-x），非玩家自助提交路徑（AC-004-4）。

衝突類型：缺失
受影響範圍：US-AUTH-002 — AC-004-4（server layer）
建議修復方向：在 gdpr-erasure.feature 新增 1-2 個 player-initiated 場景，區分 admin-initiated 和 player-initiated GDPR request flow
可自動修復：NO

---

### [MEDIUM] D4-M1：PRD AC-005-6 → 無 stat_at_maximum（訓練）server BDD scenario

PRD AC-005-6 要求訓練已滿 stat（=100）時回傳 HTTP 400 `{"error":"stat_at_maximum"}`。training-food.feature 涵蓋每日訓練上限但未涵蓋 stat 最大值邊界。

衝突類型：缺失
建議修復方向：在 training-food.feature 新增 @TC-SRV-TRAIN-004：stat=100 時 POST /api/v1/training → HTTP 400 stat_at_maximum
可自動修復：NO

---

### [MEDIUM] D4-M2：PRD AC-006-6 → 無 stat_at_maximum（餵食）server BDD scenario

PRD AC-006-6 要求對已滿 stat 餵食永久性 stat food 時回傳 HTTP 400 `{"error":"stat_at_maximum","stat":"<stat_name>"}`。無任何 server BDD scenario 涵蓋此邊界。

衝突類型：缺失
建議修復方向：在 training-food.feature 新增 @TC-SRV-FOOD-004：stat=100 時 POST /api/v1/food/apply → HTTP 400 stat_at_maximum
可自動修復：NO

---

### [MEDIUM] D4-M3：PRD AC-013-5 → admin-moderation.feature 無 DB 寫入失敗場景

PRD AC-013-5 要求 Admin Ban 操作 DB 寫入失敗時回傳友善錯誤且無部分狀態變更。admin-moderation.feature 11 個 scenarios 均未涵蓋後端 DB 失敗路徑。

衝突類型：缺失
建議修復方向：在 admin-moderation.feature 新增 @TC-SRV-MOD-012：mock DB timeout during POST /admin/api/pets/:petId/ban → 無部分狀態；UI error toast
可自動修復：NO

---

### [MEDIUM] D4-M4：PRD AC-014-4 → leaderboard.feature 無 Admin 移除寫入失敗場景

PRD AC-014-4 要求排行榜移除失敗（Redis/DB 不可用）時 UI 顯示「Removal failed」且條目不變。leaderboard.feature 的 Redis-down fallback scenario 只涵蓋讀取路徑，未涵蓋管理員移除的寫入失敗路徑。

衝突類型：缺失
建議修復方向：在 leaderboard.feature 新增 @TC-SRV-BOARD-009：Redis ZREM 失敗時管理員移除請求 → HTTP 500，狀態不變
可自動修復：NO

---

### [MEDIUM] D4-M5：PRD AC-015-1..3（US-ADMIN-003）+ admin-search-performance.feature @US tag 錯誤 `[PARTIAL-FIXED: 0e053e7 — feature header tag 已修正；AC-015-x runtime config scenarios 仍缺]`

雙重問題：
1. US-ADMIN-003 的 ACs（AC-015-1..3：runtime config 調整、5 分鐘快取刷新、稽核日誌）無任何 server BDD scenarios
2. `admin-search-performance.feature` Feature header 標記 `US-ADMIN-003`，但其內容（管理搜尋 SLA）對應 AC-013-4（US-ADMIN-001），非 US-ADMIN-003

衝突類型：缺失 + B2-下游偏離
建議修復方向：將 admin-search-performance.feature header 改為 `@US-ADMIN-001`；另在 economy-config.feature 或新的 runtime-config.feature 新增涵蓋 AC-015-1..3 的 scenarios
可自動修復：部分 YES（header 修正自動化）

---

### [MEDIUM] D4-M6：PRD AC-004-5 → 無 client BDD 404 URL 渲染場景

PRD AC-004-5 要求 client 在存取無效/已撤銷 pet URL 時渲染適當的 404/錯誤狀態頁面。無任何 client BDD scenario 涵蓋此頁面層級 404 渲染。

衝突類型：缺失
建議修復方向：在 claim-flow-ui.feature 新增 @TC-CLI-CLAIM-011：導航至 `/pet/:invalidToken` → 錯誤頁面含「URL not valid」及返回首頁連結
可自動修復：NO

---

### [MEDIUM] D4-M7：EDD §8.1 HTTP 409 vs claim-flow.feature HTTP 400 狀態碼不一致

EDD §8.1 定義 HTTP 409 Conflict（already claimed）。TC-SRV-CLAIM-006 涵蓋「already claimed」情境但預期 HTTP 400，與 EDD 定義不符。

衝突類型：B2-下游偏離
受影響範圍：claim-flow.feature TC-SRV-CLAIM-006；US-AUTH-001
建議修復方向：統一 ALREADY_CLAIMED 的 HTTP 狀態碼：EDD §8.1 改為 400，或 scenario 改預期 409（兩者選其一並更新全部文件）
可自動修復：NO

---

### [MEDIUM] D4-M8：EDD §8.5 SendGrid 3 次失敗後切換 SMTP Failover — 無 server BDD scenario

EDD §8.5 定義：3 次連續 SendGrid 失敗 → 切換至 Nodemailer SMTP fallback。PRD §6.2 亦有此規格。無任何 server BDD scenario 驗證此 failover 路徑。

衝突類型：缺失
建議修復方向：在 claim-flow.feature 新增 @TC-SRV-CLAIM-009：mock SendGrid 3 次連續失敗 → SMTP fallback → email 發送 → HTTP 200
可自動修復：NO

---

### [MEDIUM] D4-M9：EDD TOTP_SETUP_REQUIRED（首次 Admin 登入 HTTP 403）— 僅有 client BDD，無 server BDD

EDD 定義首次 Admin 登入時回傳 HTTP 403 TOTP_SETUP_REQUIRED + setupToken。client BDD 已涵蓋（TC-CLI-ADMIN-002），但 server-side 無對應 server BDD scenario。

衝突類型：缺失（server 層）
建議修復方向：在 admin-moderation.feature 或新的 admin-auth.feature 新增首次 TOTP 設定流程的 server scenario
可自動修復：NO

---

### [MEDIUM] D4-M10：RTM admin-search-performance.feature @US tag mismatch `[FIXED: 0e053e7]`

RTM 正確將 admin-search-performance.feature 對應至 US-ADMIN-001，但 feature 檔案本身 Feature header 標記 `US-ADMIN-003`（與 D4-M5 同一根因）。

衝突類型：B2-下游偏離
建議修復方向：同 D4-M5，修正 feature header tag 為 `@US-ADMIN-001`
可自動修復：YES（單行修正）

---

### [MEDIUM] D4-M11：RTM US-AUTH-002 row：settings.feature 對應製造虛假覆蓋信心

RTM 將 settings.feature（21 scenarios）映射至 US-AUTH-002，而 US-AUTH-002 的實際 ACs（AC-004-1..5：unique URL claim、link re-send、GDPR deletion）均未被 settings.feature 的任何 scenario 涵蓋。

衝突類型：B2-下游偏離
建議修復方向：拆分 RTM US-AUTH-002 BDD-Client 條目：claim-flow-ui.feature 涵蓋 AC-004-1..3；AC-004-4（玩家 GDPR 刪除）為未涵蓋；settings.feature 標記為 US-PREF-001（待補 PRD）
可自動修復：NO

---

### [LOW] D4-L1：trading-ui.feature（@future）未列入 RTM 庫存 `[FIXED: 0e053e7]`

trading-ui.feature 存在（1 scenario，標記 @future @wip），符合 FF_MARKETPLACE P2 延期狀態，但 RTM 庫存表未記錄此檔案，US-TRADE-001 的 BDD-Client 欄位顯示「—」。

衝突類型：B1-下游合理（延期合理）
建議修復方向：在 RTM 庫存表新增 trading-ui.feature 行，標記 ⏸ Deferred（映射 US-TRADE-001）
可自動修復：YES

---

### [LOW] D4-L2：EDD §8.1 HTTP 409 用於 duplicate marketplace listing — 貿易功能延期但文件未標記 `[FIXED: 0e053e7]`

EDD §8.1 列出 HTTP 409 的第二個觸發情境為「duplicate marketplace listing」，但 Marketplace 為 P2 延期功能（FF_MARKETPLACE）。EDD §8.1 未標記此情境為 Deferred。

衝突類型：gold-plating 補充（dead-code 風險低，但文件明確性不足）
建議修復方向：在 EDD §8.1 duplicate listing 條目旁加注「FF_MARKETPLACE — deferred」
可自動修復：YES

---

### [LOW] D4-L3：trading-ui.feature @future 標記但 cucumber 執行時可能被誤跑 `[FIXED: 0e053e7]`

trading-ui.feature 標記 @future @wip，若 cucumber 執行時沒有 `--tags "not @future"` 過濾，此 scenario 會被嘗試執行並因無 step definition 失敗。

衝突類型：缺失
建議修復方向：在 cucumber.js config 中加入 `tags: "not @future"` 預設過濾；或在 CI pipeline 中明確加 --tags 旗標
可自動修復：YES

---

## Dimension 5 — UML/RTM 品質

**結果：⚠️ 1 finding（0C / 1H / 0M / 0L）**

**量化數據（直接掃描）：**

| 指標 | 數值 | 狀態 |
|------|------|------|
| EDD class count | 42 | ✅ |
| PlantUML .puml 檔案數 | 9 | ✅ |
| RTM.csv 存在 | 是 | ✅ |
| RTM table rows（`\|`-starting lines） | 146 | ✅ |
| Class Diagram Inheritance（`<\|--`） | 7 | ✅ |
| Class Diagram Composition（`*--`） | 5 | ✅ |
| Class Diagram Aggregation（`o--`） | 6 | ✅ |

### [HIGH] D5-H1：EDD.md 中 `####.*Diagram` 區段標頭僅 8 個，但 UML 要求 9 大圖

`grep -cE "####.*Diagram|####.*圖" docs/EDD.md` 回傳 8。UML 9 大圖（sequence × 3、activity × 3、state × 3）的一張可能未在 EDD.md 中以標準 `####` 標頭引用。
注意：`docs/diagrams/puml/` 確認有 9 個 `.puml` 檔案，UML 輸出成品齊全；僅 EDD.md 本文引用可能缺少一個 diagram 章節標頭。

衝突類型：B2-下游偏離（輕微）
受影響範圍：EDD.md 自包含完整性；閱讀 EDD 時無法從目錄索引定位全部 9 張圖
建議修復方向：確認哪一張 diagram 使用非標準標頭（如 `###` 或不含 `Diagram`/`圖` 關鍵字），統一格式至 `#### xxx Diagram`
可自動修復：NO

---

## Dimension 6 — AI Gencode Readiness

**結果：⚠️ 1 finding（0C / 1H / 0M / 0L）| 整體就緒度：76%**

| 層 | 分數 | 狀態 |
|-----|------|------|
| SCHEMA | 100% | ✅ 就緒 |
| LOCAL_DEPLOY | 100% | ✅ 就緒 |
| Phaser/ANIM | 85% | ✅ 就緒 |
| API | 75% | ⚠️ 可提升 |
| CI/CD | 70% | ⚠️ 可提升 |
| BDD/Tests | 30% | 🔴 需補強 |
| **整體** | **76%** | ⚠️ |

### [HIGH] D6-H1：BDD/Tests AI Gencode 就緒度 30% → 95% — 無 step definition stub `[FIXED: 992aa6c, e739041]`

`features/steps/` 不存在，AI 需從 215 個 Gherkin scenarios 從零推導 step definition 實作邏輯，無任何骨架可參照。此為 D4-C2 和 D4-C3 的同一根因，由 `/gendoc-align-fix --layer gencode` 處理。

衝突類型：缺失
建議修復方向：gencode 階段生成 step definition stubs
可自動修復：YES（gencode 階段）

---

## 綜合建議與優先修復清單

### 立即修復（CRITICAL — 阻塞後續 gencode）

| ID | 問題 | 狀態 | commit |
|----|------|------|--------|
| D4-C1 | RTM BDD Tags 重新生成（@TC-SRV/CLI 命名） | ✅ FIXED | 0e053e7 |
| D4-C2 | features/steps/ 生成 server step stubs | ✅ FIXED | 992aa6c |
| D4-C3 | features/client/steps/ 生成 client step stubs | ✅ FIXED | e739041 |

### HIGH 優先修復（gencode 前完成）

| ID | 問題 | 狀態 | commit |
|----|------|------|--------|
| D4-H1 | 補充 HTTP 404 server BDD scenarios | ⏳ OPEN | — |
| D4-H2 | RTM 庫存計數更新（+ trading-ui.feature） | ✅ FIXED | 0e053e7 |
| D4-H3 | 補充 503 generation_exhausted scenario | ⏳ OPEN | — |
| D4-H4 | 補充 Canvas WebGL fallback client scenario | ⏳ OPEN | — |
| D4-H5 | 建立 gdpr-ui.feature（玩家端 GDPR） | ⏳ OPEN | — |
| D4-H6 | battle-records 補充 404 scenario | ⏳ OPEN | — |
| D4-H7 | gdpr-erasure 補充 player-initiated scenarios | ⏳ OPEN | — |
| D1-H2 | API.md 補充食物庫存端點 | ⏳ OPEN | — |
| D1-H3 | EDD + API 補充食物掉落機制設計 | ⏳ OPEN | — |
| D1-H4 | 修正 BDD-server.md 交叉參照表 3 個 AC 錯誤 | ⏳ OPEN | — |
| D1-H5 | EDD 補充 notification BC 合併 ADR | ⏳ OPEN | — |

### 可腳本自動修復的所有 findings

```bash
# D1-L3: PDD Game UI checkbox
sed -i 's/\[ \] Game UI (Phaser 3/[x] Game UI (Phaser 3/g' docs/PDD.md

# D1-M1: BDD-server.md scenario count 81→82
sed -i 's/共 81 scenarios/共 82 scenarios/g' docs/BDD-server.md

# D4-M5/D4-M10: admin-search-performance.feature header tag
sed -i 's/@US-ADMIN-003/@US-ADMIN-001/g' features/admin-search-performance.feature

# D4-L1: RTM add trading-ui.feature row → manual RTM update
# D4-L2: EDD §8.1 deferred tag → manual EDD update
# D4-L3: cucumber.js config --tags "not @future" → add to config
```

---

## 附錄：掃描環境資訊

| 項目 | 值 |
|------|-----|
| 掃描日期 | 2026-05-15 |
| State File | .gendoc-state-tobala-main.json |
| client_type | game |
| has_admin_backend | true |
| Server feature files | 12（82 scenarios） |
| Client feature files | 10（133 scenarios） |
| Total BDD scenarios | 215 |
| Pipeline hash | 49f8456caade9b87 |
| EDD class count | 42 |
| UML .puml files | 9 |
| RTM.csv | exists |
| src/ exists | NO（docs-first） |
| tests/ exists | NO（docs-first） |
| Dim6 overall readiness | 76% |
