---
doc-type: ALIGN
version: 2.0.0
description: 全局對齊掃描報告 — pixel-pet-arena 六維度文件↔程式碼↔測試對齊問題清單（只列問題，不修復）
generated: 2026-05-16
---

# ALIGN_REPORT — 全局對齊掃描報告

**專案**：pixel-pet-arena  
**掃描日期**：2026-05-16  
**狀態**：gendoc-align-check 完整掃描

---

## 總覽儀表板

```
╔══════════════════════════════════════════════════════════════════╗
║           gendoc — 對齊掃描報告                                   ║
║           專案：pixel-pet-arena  日期：2026-05-16                 ║
╠══════════════════════════════════════════════════════════════════╣
║  對齊層             CRITICAL  HIGH  MEDIUM  LOW  總計  狀態       ║
║  Dim0 文件存在性        0       0      0     0     0   ✅          ║
║  Dim1 Doc → Doc         0       3      5     3    11   ⚠️          ║
║  Dim2 Doc → Code      N/A     N/A    N/A   N/A   N/A  ⏳（待實作）║
║  Dim3 Code → Test     N/A     N/A    N/A   N/A   N/A  ⏳（待實作）║
║  Dim4 Doc → Test        0       0      0     0     0   ✅          ║
║  Dim5 UML/RTM 品質      0       0      0     0     0   ✅          ║
║  Dim6 AI Gencode        0       0      0     0     0   ✅ 90%      ║
╠══════════════════════════════════════════════════════════════════╣
║  總計                   0       3      5     3    11               ║
╠══════════════════════════════════════════════════════════════════╣
║  0 CRITICAL / 3 HIGH / 5 MEDIUM / 3 LOW                          ║
╚══════════════════════════════════════════════════════════════════╝
```

> **Dim2/Dim3**：`src/` 和 `tests/` 尚未建立（預實作階段）。等 AI 生成代碼後重跑 align-check。

---

## Dimension 0 — 文件存在性

**結果：✅ 全部通過（25/25 文件存在且非空）**

所有 pipeline 步驟的輸出文件均存在：IDEA、BRD、PRD、CONSTANTS、PDD、VDD、EDD、ARCH、API、SCHEMA、FRONTEND、AUDIO、ANIM、CLIENT_IMPL、ADMIN_IMPL、RESOURCE、test-plan、RTM、runbook、LOCAL_DEPLOY、CICD、DEVELOPER_GUIDE、features/（12 個 server feature）、features/client/（10 個 client feature）、README.md。

---

## Dimension 1 — Doc → Doc 對齊問題

### HIGH Findings

---

**[HIGH-1] SCHEMA → ADMIN_IMPL：資料表名稱全面錯誤**

```
[HIGH] IMPLEMENTATION: SCHEMA → ADMIN_IMPL
  ADMIN_IMPL.md 通篇引用 admin_accounts 和 admin_audit_log。
  SCHEMA.md §3.10 定義的實際表名為 admin_users，§3.11 為 audit_logs。
  開發者依 ADMIN_IMPL.md 寫查詢時將得到 schema 錯誤。

  衝突類型：B2-下游偏離（SCHEMA.md 為準）
  受影響範圍：ADMIN_IMPL.md — Document Control header、§1.2、§1.3、§7 Audit Log、
              §18 Security section；所有 admin_accounts / admin_audit_log 引用
  建議修復方向：全局 search-replace：admin_accounts → admin_users，
               admin_audit_log → audit_logs
  可自動修復：YES
```

---

**[HIGH-2] PRD → FRONTEND / ADMIN_IMPL：RBAC 4 角色 vs 3 角色衝突**

```
[HIGH] IMPLEMENTATION: PRD → FRONTEND / ADMIN_IMPL
  PRD NFR-SEC-13 §19.2 定義 4 個 RBAC 角色：
    Super Admin、Moderator、Analyst、Support Agent
  FRONTEND.md useAdminAuthStore TypeScript union type 定義：
    'super_admin' | 'moderator' | 'read_only' | null（僅 3 角色）
  ADMIN_IMPL.md §1.3 role table 同樣只有 3 個角色。
  Analyst（唯讀數據分析）和 Support Agent（限定寵物查詢 + 重發連結）
  能力無法在當前 3 角色模型中表達。

  衝突類型：B-待確認（需產品決策）
  受影響範圍：FRONTEND.md §3 useAdminAuthStore role type；
              ADMIN_IMPL §1.3 role table；API.md §6.1 route authorization；
              EDD §3.7 admin role model
  建議修復方向：選項 A（擴展至 4 角色）：在 FRONTEND/ADMIN_IMPL/API/EDD 中
               加入 analyst 和 support_agent 角色定義和對應路由守衛；
               選項 B（降級至 3 角色）：更新 PRD NFR-SEC-13 §19.2 正式確認
               採用 3 角色模型並記錄理由
  可自動修復：NO（需人工決策）
```

---

**[HIGH-3] PRD → BDD-server：Sumo 戰鬥算法衝突**

```
[HIGH] TEST: PRD → BDD-server
  PRD AC-008-2（US-ARENA-002 Sumo 模式）明確指定：
    "outcome is calculated from Strength stats + seeded modifier (±15%)"
  features/arena-battle.feature @TC-SRV-ARENA-004 步驟描述：
    "the outcome is determined solely by the raw strength stat
     with no random modifier applied"（無隨機修正子）
  兩份文件對 sumo 戰鬥核心算法的描述正好相反。測試通過的實作
  將不符合 PRD 驗收標準。

  衝突類型：B2-下游偏離（PRD AC-008-2 為準）
  受影響範圍：features/arena-battle.feature @TC-SRV-ARENA-004 的 outcome 步驟
  建議修復方向：將 arena-battle.feature @TC-SRV-ARENA-004 的 "And" 步驟修改為：
    "And the outcome is determined by the higher effective strength
     (base strength stat plus up to ±15% seeded random modifier)"
  可自動修復：YES（文字精確修改）
```

---

### MEDIUM Findings

---

**[MEDIUM-1] BRD → EDD：Notification BC 無架構決策記錄（ADR）**

```
[MEDIUM] REQUIREMENT: BRD → EDD
  BRD §5.5 定義 Notification 為獨立的第 6 個限界上下文（BC），
  含 60 秒交付 SLA、重試策略、bounce 處理、provider failover。
  EDD §3.4 BC 清單只有 5 個 BC（Identity/Pet/Arena/Leaderboard/Admin）。
  缺少 ADR 記錄「Notification BC 被吸收進 Identity BC」的決策，
  未來工程師可能在 Phase 2 擴展時重新引入獨立 BC。

  衝突類型：Missing（架構決策未記錄）
  受影響範圍：EDD §3.4 BC 所有權表；EDD §4 ADR 缺失
  建議修復方向：在 EDD §4 新增 ADR-008：
    「Notification BC 吸收進 Identity BC — 無獨立資料表」
    說明 email 交付透過 SendGrid/Nodemailer 處理（無持久化 log），
    記錄取捨與 60 秒 SLA 機制
  可自動修復：NO
```

---

**[MEDIUM-2] PRD → BDD-server：US-ADMIN-003 無 server-side BDD Scenario**

```
[MEDIUM] TEST: PRD → BDD-server
  US-ADMIN-003（Admin Runtime Parameter Tuning，P1）
  無專屬的 server-side Gherkin feature file。
  RTM 中標記「No dedicated server scenario; covered via integration test」。
  config cache refresh（PUT /admin/api/config/runtime → Redis TTL 300s）
  是後端行為，應有至少一個可追溯的 @TC-SRV-ADMIN-* 標籤的 BDD Scenario。

  衝突類型：Missing
  受影響範圍：features/ 目錄缺少 admin-runtime-config.feature 或等效 scenario；
              RTM US-ADMIN-003 server scenario column
  建議修復方向：新增 features/admin-runtime-config.feature，
    至少包含 1 個 scenario：
    "Admin updates arena rate limit and change takes effect within 5 minutes"
    標籤 @TC-SRV-ADMIN-003；同步更新 RTM
  可自動修復：NO
```

---

**[MEDIUM-3] test-plan → RTM：Feature Flags 欄位空白（6 個 User Story）**

```
[MEDIUM] TRACEABILITY: test-plan → RTM
  test-plan.md §2.3 Feature Flag Kill-Switch 表列出 6 個 feature flag 映射：
    FF_TRAINING_SYSTEM → US-TRAIN-001
    FF_FOOD_SYSTEM → US-FOOD-001
    FF_ARENA_RACE → US-ARENA-001
    FF_ARENA_SUMO → US-ARENA-002
    FF_LEADERBOARD → US-BOARD-001
    FF_BATTLE_RECORDS → US-RECORD-001
  RTM §1 requirements 表的「Feature Flags」欄位對這 6 個 US 顯示 — (空白)。

  衝突類型：Missing
  受影響範圍：RTM §1 requirements table，6 個 US 的 Feature Flags 欄位
  建議修復方向：填入 RTM Feature Flags 欄位：
    US-TRAIN-001 → FF_TRAINING_SYSTEM
    US-FOOD-001 → FF_FOOD_SYSTEM
    US-ARENA-001 → FF_ARENA_RACE
    US-ARENA-002 → FF_ARENA_SUMO
    US-BOARD-001 → FF_LEADERBOARD
    US-RECORD-001 → FF_BATTLE_RECORDS
  可自動修復：YES
```

---

**[MEDIUM-4] EDD → LOCAL_DEPLOY：Worker port 3001 缺少故障排除說明**

```
[MEDIUM] INFRA: EDD → LOCAL_DEPLOY
  EDD §3.5b Port Matrix 記錄 Worker service port 3001。
  LOCAL_DEPLOY.md troubleshooting 的 port conflict 段落（kill commands）
  只列 3000、5173、5174，缺少 3001。
  啟動步驟也未明確提及啟動 Worker service 的指令。
  Worker 處理 GDPR erasure jobs 和 leaderboard snapshot jobs，
  缺少啟動說明會導致靜默破壞關鍵功能。

  衝突類型：Missing
  受影響範圍：LOCAL_DEPLOY.md troubleshooting section + startup steps
  建議修復方向：
    (1) troubleshooting port conflict 段落加入：lsof -ti :3001 | xargs kill -9
    (2) startup steps 加入 Worker 啟動步驟：pnpm --filter api worker:dev
    (3) Verification checklist 加入 Worker 健康確認
  可自動修復：NO
```

---

**[MEDIUM-5] EDD → SCHEMA：Notification BC 無資料表且無 ADR**

```
[MEDIUM] SCHEMA: EDD → SCHEMA
  BRD §5.5 定義 Notification 為獨立 BC，期望有 notification_events
  或 email_delivery_log 表。SCHEMA.md 無此類表，且 EDD 未記錄
  「刻意不建表」的決策。（與 MEDIUM-1 為同一根本問題的 schema 側影響）

  衝突類型：Missing（架構決策未記錄）
  受影響範圍：SCHEMA.md BC 映射表；EDD §3.4
  建議修復方向：配合 MEDIUM-1 ADR-008，在 SCHEMA.md BC 映射
    表新增 Notification BC 行，說明「無獨立表，由 Identity BC 的
    SendGrid 整合處理」
  可自動修復：NO
```

---

### LOW Findings

---

**[LOW-1] PDD → EDD / CONSTANTS：PDD §2.6 寫「5 attribute dimensions」應為 6**

```
[LOW] DESIGN: PDD → EDD / CONSTANTS
  PDD §2.6 Service Blueprint "Support System" 行：「5 attribute dimensions」
  PRD AC-001-3 / EDD / ANIM §11.3 / CLIENT_IMPL / CONSTANTS 均明確：
  PET_GENERATION_DIMENSIONS = 6（body/head/color_palette/accessory/rarity_trait/pattern）

  衝突類型：B2-下游偏離（PDD 數字錯誤）
  修復：PDD §2.6 "5 attribute dimensions" → "6 attribute dimensions"
  可自動修復：YES
```

---

**[LOW-2] EDD → ARCH：Container diagram 命名不一致（API1/API2 vs ADM1/ADM2）**

```
[LOW] ARCHITECTURE: EDD → ARCH
  EDD §2.2 Container diagram 標示 API1/API2（unified Fastify）。
  ARCH §1.3 Container diagram 額外顯示 ADM1/ADM2 方塊，
  可能誤導讀者認為 Admin API 是獨立的 deployable binary。
  ARCH §1.3 prose 正確說明是同一 Fastify process 的 plugin。

  衝突類型：Missing（ARCH 圖缺少 note 說明）
  修復：ARCH §1.3 diagram 加 note：「ADM1/ADM2 = API1/API2 相同 process，
       僅代表 /admin/* plugin route prefix」
  可自動修復：NO
```

---

**[LOW-3] EDD → ADMIN_IMPL：RBAC 角色收斂決策無 ADR**

```
[LOW] DESIGN: PRD → EDD
  PRD NFR-SEC-13 定義 4 角色，EDD §3.7 實作 3 角色（super_admin/moderator/read_only），
  但 EDD 無 ADR 記錄「Analyst + Support Agent 合併為 read_only」的決策。
  （與 HIGH-2 為同一根本問題的 EDD 側影響）

  衝突類型：Missing（架構決策未記錄）
  修復：EDD §4 新增 ADR，或升至 HIGH-2 決策後一起解決
  可自動修復：NO
```

---

## Dimension 2 — Doc → Code 對齊

**結果：N/A（src/ 尚未建立）**

預實作階段，AI 代碼生成尚未執行。待 `/gendoc-align-fix --layer gencode` 完成後重跑。

---

## Dimension 3 — Code → Test 對齊

**結果：N/A（tests/ 尚未建立）**

---

## Dimension 4 — Doc → Test 對齊

**結果：✅ 全部通過**

- 22 個 BDD feature files（12 server + 10 client）覆蓋所有 18 個 User Stories
- features/steps/ 有 12 個 server-side step definition stubs（100% feature file 覆蓋）
- features/client/steps/ 有 10 個 client-side step definition stubs（100% feature file 覆蓋）
- Total: 215 scenarios（82 server + 133 client）
- 唯一缺口：US-ADMIN-003 無 server BDD scenario（已列於 MEDIUM-2）

---

## Dimension 5 — UML / RTM 品質

**結果：✅ 全部通過**

| 項目 | 值 | 標準 | 狀態 |
|------|-----|------|------|
| EDD class count | 42 | ≥ 6 | ✅ |
| EDD mermaid blocks | 27 | ≥ 9 | ✅ |
| EDD classDiagram blocks | 4 | ≥ 1 | ✅ |
| EDD sequenceDiagram blocks | 4 | ≥ 1 | ✅ |
| Inheritance (<\|--) | 7 | ≥ 1 | ✅ |
| Composition (*--) | 5 | ≥ 1 | ✅ |
| Aggregation (o--) | 6 | ≥ 1 | ✅ |
| PlantUML .puml files | 9 | ≥ 1 | ✅ |
| RTM.csv | ✅ exists | 必有 | ✅ |
| RTM coverage | 18 US + 1 NFR | 全覆蓋 | ✅ |
| docs/diagrams/ files | 47 | ≥ 9 | ✅ |

---

## Dimension 6 — AI Gencode Readiness

**結果：✅ 整體 90%（所有層 ≥ 60%）**

| Layer | Score | 狀態 |
|-------|-------|------|
| SCHEMA | 100% | ✅ 就緒 |
| Phaser/ANIM | 100% | ✅ 就緒 |
| LOCAL_DEPLOY | 100% | ✅ 就緒 |
| API | 85% | ✅ 就緒 |
| BDD/Tests | 85% | ✅ 就緒 |
| CI/CD | 70% | ⚠️ 可提升（非阻塞） |

**整體 AI Gencode 就緒度：90%** — 可執行 `/gendoc-align-fix --layer gencode`

---

## 可自動修復清單（align-fix 輸入）

| ID | 嚴重度 | 來源 → 目標 | 修復動作 |
|----|-------|------------|---------|
| F-H1 | HIGH | SCHEMA → ADMIN_IMPL | admin_accounts → admin_users; admin_audit_log → audit_logs 全局替換 |
| F-H3 | HIGH | PRD → BDD-server | arena-battle.feature @TC-SRV-ARENA-004 sumo outcome 步驟修正 |
| F-M3 | MEDIUM | test-plan → RTM | RTM Feature Flags 欄位補齊 6 個 US |
| F-L1 | LOW | PDD → EDD | PDD §2.6 "5 attribute dimensions" → "6 attribute dimensions" |

**不可自動修復（需人工決策）**：F-H2（RBAC 4 vs 3 角色）、F-M1（Notification ADR）、F-M2（US-ADMIN-003 BDD）、F-M4（Worker LOCAL_DEPLOY）、F-M5（Notification SCHEMA note）、F-L2（ARCH diagram note）、F-L3（RBAC ADR）

---

## 建議後續行動

```
優先修復：
  1. [HIGH-1] ADMIN_IMPL 資料表名稱替換（auto-fixable，阻塞開發）
  2. [HIGH-3] Sumo BDD scenario 修正（auto-fixable，阻塞測試）
  3. [HIGH-2] RBAC 角色決策（需人工，阻塞 RBAC 測試計劃）

跟進修復：
  4. [MEDIUM-2] US-ADMIN-003 server BDD scenario 補充
  5. [MEDIUM-1/5] Notification BC ADR 記錄
  6. [MEDIUM-3] RTM Feature Flags 欄位填寫（auto-fixable）
  7. [MEDIUM-4] LOCAL_DEPLOY Worker 說明補充

低優先：
  8. [LOW-1] PDD 維度數字修正（auto-fixable）
  9. [LOW-2/3] ARCH/EDD 圖注與 ADR 補充

下一步：
  執行 /gendoc-align-fix --layer gencode 生成 src/ 代碼骨架
```

---

**Generated:** 2026-05-16  
**Maintainer:** gendoc-align-check v2  
**Next action:** `/gendoc-align-fix --layer gencode`
