---
doc-type: DRYRUN_DEV_FEEDBACK
version: 1.0.0
review-round: r1
generated: 2026-05-15
---

# DRYRUN DEV FEEDBACK — Quantitative Anchor Discrepancy Report

> 本文件由 DRYRUN Review Loop 生成，記錄 Track A vs Track B 不一致的量化錨點，供 dryrun_core.py 修復參考。

---

## §1 Review Round Summary

| Round | CRITICAL | HIGH | MEDIUM | LOW | Total Findings |
|-------|----------|------|--------|-----|----------------|
| r1    | 3        | 0    | 0      | 0   | 3              |

Fixed in r1: R-05 (entity_count), R-07 (rest_endpoint_count), R-13 (this file created).

---

## §2 Metric Discrepancy Details

### §2.1 R-05 — entity_count

| 欄位 | 內容 |
|------|------|
| **Track A (core) 數值** | 42（`.gendoc-rules/SCHEMA-rules.json` `min_table_count`；`docs/MANIFEST.md §2.1` `entity_count`） |
| **Track B (AI) 數值** | 40（`grep -cE '^\s*class\s+[A-Za-z][a-zA-Z0-9_]*' docs/EDD.md` 確實返回 40） |
| **共識值** | 40（Track A > Track B，AI 舉證 2 筆 false positive 成立，取低值） |
| **不一致原因** | dryrun_core.py 使用 `grep -c 'class '`（無行首錨點），匹配到 2 個 markdown table cell 中的 "class " 字串（line 300、line 2421），非 classDiagram class 宣告 |
| **AI 舉證清單** | (1) EDD.md line 300：`\| **Single Responsibility** \| 每個 Use Case class 只處理...` — table cell，非 classDiagram class → **不計入**；(2) EDD.md line 2421：`\| Diagrams \| docs/diagrams/ \| UML / class inventory \|` — table metadata reference → **不計入** |
| **建議修正** | 檔案：`dryrun_core.py`；函式：entity_count 計算段落；現行 pattern：`grep -c 'class '`；建議 pattern：`grep -cE '^\s*class\s+[A-Za-z][a-zA-Z0-9_]*' docs/EDD.md`；理由：加入行首 `^\s*` 錨點和後置字元 `\s+[A-Za-z]` 確保只匹配 classDiagram class 宣告 |

**Cascade impact**:
- `SCHEMA-rules.json` `min_table_count`: 42 → **40** ✅ fixed
- `FRONTEND-rules.json` `min_component_count`: 42 → **40** ✅ fixed（formula: `max(3, entity_count)`）
- `docs/MANIFEST.md §2.1` `entity_count` display: 42 → **40** ✅ fixed

---

### §2.2 R-07 — rest_endpoint_count

| 欄位 | 內容 |
|------|------|
| **Track A (core) 數值** | 28（`.gendoc-rules/API-rules.json` `min_endpoint_count`；`docs/MANIFEST.md §2.1` `rest_endpoint_count`） |
| **Track B (AI) 數值** | 33（EDD.md §5 API tables + inline refs，Python deduplicated，排除 POST /claim 流程圖縮寫） |
| **共識值** | 33（Track B > Track A → 從嚴取高，per §0.1） |
| **不一致原因** | dryrun_core.py 使用的正規表達式未捕捉帶 `:param` 路徑的端點（如 `GET /api/v1/pets/:petId`）和 `| METHOD | /path |` 格式的 markdown table rows；導致低估 |
| **AI 舉證清單（Track B 33 個端點）** | §5.1 Claim: (1) POST /api/v1/claim, (2) POST /api/v1/claim/verify, (3) POST /api/v1/claim/recover；§5.2 Pet: (4) GET /api/v1/pets/random, (5) GET /api/v1/pets/:petId, (6) POST /api/v1/pets/:petId/train, (7) POST /api/v1/pets/:petId/feed；§5.3 Arena: (8) POST /api/v1/arena/enter, (9) GET /api/v1/arena/match/:matchId, (10) GET /api/v1/arena/history/:petId；§5.4 Leaderboard: (11) GET /api/v1/leaderboard, (12) GET /api/v1/leaderboard/rank/:petId；§5.6 GDPR: (13) POST /api/v1/gdpr/request, (14) GET /api/v1/gdpr/request/status；§5.7 Marketplace: (15) GET /api/v1/marketplace/listings, (16) POST /api/v1/marketplace/listings, (17) DELETE /api/v1/marketplace/listings/:id, (18) POST /api/v1/marketplace/listings/:id/buy；Admin RBAC table (EDD.md §9.6): (19) GET /admin/api/dashboard, (20) GET /admin/api/pets, (21) POST /admin/api/pets/:id/ban, (22) GET /admin/api/leaderboard, (23) POST /admin/api/battles/:id/flag, (24) PUT /admin/api/config/runtime, (25) PUT /admin/api/config/economy, (26) POST /admin/api/gdpr/delete, (27) POST /admin/api/roles, (28) DELETE /admin/api/roles/:id, (29) GET /admin/api/audit；inline refs: (30) POST /admin/api/auth/login (EDD §5.5 text), (31) GET /health (EDD §10.7), (32) GET /health/live (EDD §2.6 probe), (33) GET /health/ready (EDD §2.6 probe)；EXCLUDED: POST /claim (line 1278, flow diagram abbreviation for POST /api/v1/claim，已計入） |
| **建議修正** | 檔案：`dryrun_core.py`；函式：rest_endpoint_count 計算段落；現行 pattern：`grep -cE '(GET\|POST\|...) /path'`；建議：使用雙重掃描 — (1) markdown table pattern `\|\s*(METHOD)\s*\|\s*(/path)\s*\|`，(2) inline pattern `(METHOD)\s+(/path)` — 合併後 set 去重，排除流程圖縮寫（路徑不含 `/api/v1/` 或 `/admin/api/` 前綴的短路徑）；理由：全面捕捉 §5 API section 的所有端點定義 |

**Cascade impact**:
- `API-rules.json` `min_endpoint_count`: 28 → **33** ✅ fixed
- `docs/MANIFEST.md §2.1` `rest_endpoint_count` display: 28 → **33** ✅ fixed

---

### §2.3 R-13 — DRYRUN_DEV_FEEDBACK.md

| 欄位 | 內容 |
|------|------|
| **Track A (core) 數值** | 檔案不存在（pre-r1） |
| **Track B (AI) 數值** | R-05 和 R-07 有不一致 → 必須生成此檔案 |
| **共識值** | 此檔案必須存在 |
| **不一致原因** | dryrun_core.py 未生成 DRYRUN_DEV_FEEDBACK.md；該文件應在任何量化錨點不一致時由 review loop 生成 |
| **AI 舉證清單** | R-05 finding（entity_count 不一致）+ R-07 finding（rest_endpoint_count 不一致）觸發 R-13 |
| **建議修正** | review loop 已生成此文件 ✅；dryrun_core.py 可考慮在生成時預置空模板，由 review loop 填入內容 |

---

## §3 Metrics with No Finding (PASS)

| Metric | Track A | Track B | 結論 |
|--------|---------|---------|------|
| `user_story_count` / RTM `min_row_count` | 18 | 18（PRD.md 15 個 ### heading + 3 個 §19.4 **bold** format US-ADMIN-004/005/006）| ✅ PASS — Track A 正確，Track B 需擴展匹配模式（`^\*\*US-` 格式） |
| `arch_layer_count` / test-plan `min_h2_sections` | 19 / 23 | 19（`grep -cE '^## §' docs/ARCH.md`）→ min_h2 = 19+4 = 23 | ✅ PASS |
| `avg_entity_field_count` / SCHEMA `min_columns_per_table` | 4 | — | ✅ PASS（formula `max(3, avg_field)` at 4 is conservative minimum） |
| BDD-server `expected_scenario_count` | 36 | 18*2=36 | ✅ PASS |

---

## §4 dryrun_core.py Fix Recommendations Summary

| 優先 | 函式 / 段落 | 現行 Pattern | 建議 Pattern |
|------|-------------|-------------|--------------|
| P0 | entity_count | `grep -c 'class '` | `grep -cE '^\s*class\s+[A-Za-z][a-zA-Z0-9_]*'` |
| P0 | rest_endpoint_count | inline regex without `\|` table support | dual-scan: table rows + inline refs, set-dedup, exclude short path abbreviations |
| P1 | user_story_count | `grep -c '^## US-\|^### US-'` | add `\|\s*\*\*US-` or `^\*\*US-` to also catch bold-format stories in PRD appendices |
