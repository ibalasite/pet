# CONSTANTS — Global Quantitative Truth Source

<!-- 跨文件數值一致性的唯一真相來源（由 EDD Pass-0 生成） -->
<!-- 所有下游文件（EDD/BDD/test-plan/runbook）必須讀取此文件並引用，不得自行填寫未驗證數字 -->

---

## Document Control

| 欄位 | 內容 |
|------|------|
| **DOC-ID** | CONSTANTS-PIXEL-PET-ARENA-20260503 |
| **產品名稱** | Pixel Pet Arena |
| **文件版本** | v1.0 |
| **狀態** | DRAFT |
| **日期** | 2026-05-03 |
| **上游 PRD** | [PRD.md](PRD.md) |
| **上游 BRD** | [BRD.md](BRD.md) |
| **同步輸出** | [constants.json](constants.json) |

---

## Change Log

| 版本 | 日期 | 作者 | 變更摘要 |
|------|------|------|---------|
| v1.0 | 2026-05-03 | gendoc | 初稿（從 PRD-PIXEL-PET-ARENA-20260503 及 BRD-PIXEL-PET-ARENA-20260503 提取所有量化常數） |

---

## 使用指引

> ⚠️ **唯一真相來源**：本文件中所有數值均來源於 PRD 及 BRD，
> 下游文件（EDD/BDD/test-plan/runbook/ARCH）必須引用此文件中的數值，
> **不得在下游文件中自行定義任何量化數值**。
> 若發現 PRD 與本文件有衝突，以 PRD 為準並更新本文件。
>
> - **§1**：產品核心數值（pet 生成、訓練、戰鬥、排行榜、認證等核心常數）
> - **§2**：倍率與乘算器（稀有度倍率、交易價格公式、食物 buff 示例值）
> - **§3**：閾值與觸發條件（bot 偵測、快取刷新、A11y、資料庫 failover 等觸發點）
> - **§4**：SLO/SLI 目標（可用性、延遲、錯誤率、Core Web Vitals）
> - **§5**：RTP / 機率設計（稀有度機率分布，四檔必須加總 100%）
> - **§6**：Rate Limit 設定（戰鬥、認證、管理員各端點）
> - **§7**：業務規則數值（GDPR 時限、交易費率、成長目標、A/B 測試參數）
> - **§8**：系統容量規劃（RPS、DAU、連線池、基礎設施成本）

---

## §1 Product Core Constants

| Constant Name | Value | Unit | PRD Source | Notes |
|---|---|---|---|---|
| PET_GENERATION_COMBINATIONS_MIN | 1,000,000,000 | combinations | PRD §5 US-PET-002 AC-002-1 | Must exceed 1 billion distinct combinations across (body × head × color × accessory × rarity_trait × pattern) |
| PET_GENERATION_DIMENSIONS | 6 | dimensions | PRD §5 US-PET-001 AC-001-3 | body, head, color palette, accessory, rarity trait, pattern |
| PET_STAT_DEFAULT | 10 | points | PRD §11.2 data dictionary | DEFAULT 10 for stat_speed, stat_strength, stat_stamina |
| PET_STAT_MIN | 1 | points | PRD §11.2 data dictionary | CHECK (1-100) constraint |
| PET_STAT_MAX | 100 | points | PRD §5 US-TRAIN-001 AC-005-6 | HTTP 400 with stat_at_maximum error when reached |
| PET_LEVEL_DEFAULT | 1 | level | PRD §11.2 data dictionary | DEFAULT 1 |
| PET_LEVEL_MAX | 100 | level | PRD §11.2 data dictionary | CHECK (1-100); derived from FLOOR(total_training_actions / 10) |
| PET_LEVEL_FORMULA_DIVISOR | 10 | training actions | PRD §11.2 data dictionary | level = FLOOR(total_training_actions / 10) capped at 100 |
| TRAINING_ACTIONS_PER_DAY | 3 | actions/day | PRD §5 US-TRAIN-001 AC-005-1 | run, strength, stamina training; reset UTC 00:00 |
| TRAINING_STAT_POINTS_MIN | 1 | points/action | PRD §5 US-TRAIN-001 AC-005-1 | Lower bound of per-action stat increment |
| TRAINING_STAT_POINTS_MAX | 3 | points/action | PRD §5 US-TRAIN-001 AC-005-1 | Based on current pet level |
| TRAINING_STAT_DISPLAY_DURATION | 2 | seconds | PRD §5 US-TRAIN-001 AC-005-3 | "+X Speed" indicator display time |
| TRAINING_NEGLECT_THRESHOLD | 3 | consecutive days | PRD §5 US-TRAIN-001 AC-005-5 | Triggers "hungry/neglected" visual state |
| ARENA_RATE_LIMIT_BATTLES_PER_HOUR | 10 | battles/hour | PRD §5 US-ARENA-001 AC-007-6; PRD §15 RTM | Default; admin-tunable |
| ARENA_RATE_LIMIT_ADMIN_MIN | 1 | battles/hour | PRD §5 US-ADMIN-003 AC-015-1 | Admin-tunable lower bound |
| ARENA_RATE_LIMIT_ADMIN_MAX | 50 | battles/hour | PRD §5 US-ADMIN-003 AC-015-1 | Admin-tunable upper bound |
| ARENA_MATCH_DURATION_MIN | 5 | seconds | PRD §5 US-ARENA-001 AC-007-3; PRD §6.3 | Battle animation minimum |
| ARENA_MATCH_DURATION_MAX | 15 | seconds | PRD §5 US-ARENA-001 AC-007-3; PRD §6.3 | Battle animation maximum |
| ARENA_MATCHMAKING_TIMEOUT | 30 | seconds | PRD §5 US-ARENA-001 AC-007-1 | Offer AI opponent if no match found |
| ARENA_BATTLE_OUTCOME_RANDOM_MODIFIER | 15 | percent (±) | PRD §5 US-ARENA-001 AC-007-2; US-ARENA-002 AC-008-2; PRD §6.3 | Seeded random modifier ±15% applied to Speed stat (race) or Strength stat (sumo); single canonical value covering both battle types |
| ARENA_BATTLE_RECORDS_DISPLAY | 20 | battles | PRD §5 US-RECORD-001 AC-010-1 | Last 20 battles shown on public page |
| LEADERBOARD_TOP_DISPLAY | 100 | pets | PRD §5 US-BOARD-001 AC-009-1 | Top 100 displayed by default |
| LEADERBOARD_ADMIN_VIEW | 500 | pets | PRD §5 US-ADMIN-002 AC-014-1; PRD §19.3 | Admin sees top 500 |
| LEADERBOARD_SNAPSHOT_TOP_N | 500 | pets | PRD §11.1 data dictionary | LeaderboardSnapshot stores top 500 pets per snapshot |
| CLAIM_CODE_DIGITS | 6 | digits | PRD §5 US-AUTH-001 AC-003-2; PRD §13 glossary | Numeric 6-digit one-time password |
| CLAIM_CODE_EXPIRY | 15 | minutes | PRD §5 US-AUTH-001 AC-003-4; PRD §6.5 state machine | Expires T+15min from generation |
| CLAIM_TOKEN_CLEANUP_TTL | 72 | hours | PRD §11.1 data dictionary; PRD §6.5 state machine | Deleted 72 hours after creation or first use |
| PET_ACCESS_TOKEN_MIN_BYTES | 32 | bytes | PRD §7.2 NFR-SEC-05; PRD §13 glossary | URL-safe base64 random bytes |
| CLAIM_TOKEN_MIN_ENTROPY | 32 | bytes | PRD §7.2 NFR-SEC-01 | Cryptographically random ≥ 32 bytes entropy |
| FOOD_BUFF_RECORD_RETENTION | 30 | days | PRD §11.1 data dictionary; PRD §6.6 state machine | Buff record retained 30 days after expiry/consumption |
| FOOD_BUFF_MULTIPLIER_ADMIN_MIN | 0.5 | x (multiplier) | PRD §19.4 US-ADMIN-006 AC-018-1 | Admin-tunable lower bound for food buff multipliers |
| FOOD_BUFF_MULTIPLIER_ADMIN_MAX | 5.0 | x (multiplier) | PRD §19.4 US-ADMIN-006 AC-018-1 | Admin-tunable upper bound for food buff multipliers |
| ARENA_ENTRY_COOLDOWN_ADMIN_MIN | 0 | minutes | PRD §19.4 US-ADMIN-006 AC-018-1 | Admin-tunable lower bound |
| ARENA_ENTRY_COOLDOWN_ADMIN_MAX | 60 | minutes | PRD §19.4 US-ADMIN-006 AC-018-1 | Admin-tunable upper bound |
| ARENA_ENTRY_COST_FOOD_CREDITS_DEFAULT | 0 | credits | PRD §19.4 US-ADMIN-006 AC-018-1 | Default arena entry cost |
| ARENA_ENTRY_COST_FOOD_CREDITS_ADMIN_MAX | 10 | credits | PRD §19.4 US-ADMIN-006 AC-018-1 | Admin-tunable upper bound |
| PET_RESERVATION_TTL | 24 | hours | [BRD §系統要求] | Pet claim reservation TTL |
| SPRITE_RESOLUTION | 32 | px | [EDD §4.1 Asset Pipeline] | Pixel sprite canvas resolution |

---

## §2 Multipliers & Modifiers

| Constant Name | Value | Unit | PRD Source | Notes |
|---|---|---|---|---|
| RARITY_MULTIPLIER_COMMON | 1 | multiplier | PRD §5 US-TRADE-001 AC-012-5 | Used in minimum price formula |
| RARITY_MULTIPLIER_RARE | 2 | multiplier | PRD §5 US-TRADE-001 AC-012-5 | Used in minimum price formula |
| RARITY_MULTIPLIER_EPIC | 4 | multiplier | PRD §5 US-TRADE-001 AC-012-5 | Used in minimum price formula |
| RARITY_MULTIPLIER_LEGENDARY | 8 | multiplier | PRD §5 US-TRADE-001 AC-012-5 | Used in minimum price formula |
| TRADE_MIN_PRICE_FORMULA_LEVEL_COEFF | 100 | credits/level | PRD §5 US-TRADE-001 AC-012-5 | min_price = (pet_level × 100) + (rarity_multiplier × 500) |
| TRADE_MIN_PRICE_FORMULA_RARITY_COEFF | 500 | credits | PRD §5 US-TRADE-001 AC-012-5 | min_price = (pet_level × 100) + (rarity_multiplier × 500) |
| ARENA_SCORE_FORMULA | win_rate × battles_played × level_multiplier | formula | PRD §5 US-BOARD-001 AC-009-1 | Composite leaderboard score |
| FOOD_BUFF_EXAMPLE_TEMP_AMOUNT | 5 | stat points | PRD §5 US-FOOD-001 AC-006-1 | Example: "Speed Berry +5 Speed for 24h" |
| FOOD_BUFF_EXAMPLE_TEMP_DURATION | 24 | hours | PRD §5 US-FOOD-001 AC-006-1 | Example temporary food buff duration |
| FOOD_BUFF_EXAMPLE_PERM_AMOUNT | 3 | stat points | PRD §5 US-FOOD-001 AC-006-1 | Example: "Power Mushroom +3 Strength permanently" |

---

## §3 Thresholds & Triggers

| Constant Name | Value | Unit | PRD Source | Notes |
|---|---|---|---|---|
| BOT_DETECTION_BATTLES_THRESHOLD | 50 | battles | PRD §5 US-ADMIN-005 AC-017-1; PRD §7.9 analytics; PRD §19.3 | Auto-flag as SUSPICIOUS if >50 battles within any 60-min window |
| BOT_DETECTION_WINDOW | 60 | minutes | PRD §5 US-ADMIN-005 AC-017-1; PRD §7.9 analytics | Rolling window for bot detection |
| LEADERBOARD_ADMIN_SUSPICIOUS_FLAG | 50 | battles/hour | PRD §5 US-ADMIN-002 AC-014-1 | Admin leaderboard view flags >50 battles/hour |
| LEADERBOARD_BAN_REFLECTION_TIME | 5 | minutes | PRD §5 US-BOARD-001 AC-009-6; PRD §5 US-ADMIN-002 AC-014-3 | Banned pet removed from leaderboard within 5 minutes |
| LEADERBOARD_UPDATE_LAG_MAX | 30 | seconds | PRD §5 US-BOARD-001 AC-009-2; PRD §7.1 NFR-PERF-09 | Maximum eventual consistency lag |
| CONFIG_CACHE_REFRESH_TIME | 5 | minutes | PRD §5 US-ADMIN-003 AC-015-2; US-ADMIN-006 AC-018-3 | Config changes take effect within 5 minutes |
| PET_SEED_COLLISION_MAX_RETRIES | 3 | retries | PRD §11.3 data quality | Application-level retry on seed collision |
| AUTH_RATE_LIMIT_CLAIM_ATTEMPTS_PER_HOUR | 5 | attempts/hour | PRD §7.2 NFR-SEC-04 | Per email, authentication endpoint |
| AUTH_RATE_LIMIT_CODE_ENTRY_ATTEMPTS | 10 | attempts/session | PRD §7.2 NFR-SEC-04 | Per session, code-entry endpoint |
| ADMIN_SESSION_INACTIVITY_EXPIRY | 4 | hours | PRD §7.2 NFR-SEC-11; PRD §19.6 NFR-ADMIN-02 | Admin session token expires after 4 hours inactivity |
| ADMIN_SESSION_ABSOLUTE_EXPIRY | 8 | hours | PRD §19.6 NFR-ADMIN-02 | Absolute session expiry regardless of activity |
| ADMIN_RATE_LIMIT_REQUESTS_PER_MINUTE | 100 | requests/min | PRD §19.6 NFR-ADMIN-04 | Per admin account |
| ADMIN_AUDIT_LOG_SEARCH_RESPONSE_TIME | 3 | seconds | PRD §19.5 admin audit requirements | Max search response time for any 12-month window |
| ADMIN_SEARCH_RESPONSE_TIME | 2 | seconds | PRD §5 US-ADMIN-001 AC-013-4 | Search by pet ID or email, up to 1 million records |
| ADMIN_MODERATION_REASON_MAX_CHARS | 500 | characters | PRD §5 US-ADMIN-005 AC-017-4 | Required reason text field for moderation actions |
| ADMIN_DAILY_MODERATION_ACTIONS | 100 | actions/day | PRD §19.6 NFR-ADMIN-06 | Single moderator capacity without degradation |
| ADMIN_PAGE_LOAD_TIME | 3 | seconds | PRD §19.6 NFR-ADMIN-06 | With up to 1 million pet records |
| ARENA_RATE_LIMIT_COUNTER_WINDOW | 1 | hour | PRD §7.2 NFR-SEC-10 | Redis-backed counter TTL |
| OBSERVABILITY_ERROR_RATE_ALERT_WINDOW | 5 | minutes | PRD §7.8 NFR-OBS-03 | Alert trigger window for >1% error rate |
| OBSERVABILITY_LATENCY_ALERT_THRESHOLD | 1000 | ms | PRD §7.8 NFR-OBS-04 | Alert if any endpoint exceeds P99 1000ms |
| OBSERVABILITY_EMAIL_FAILURE_ALERT_WINDOW | 30 | minutes | PRD §7.8 NFR-OBS-05 | Alert window for >2% SendGrid failure rate |
| OBSERVABILITY_LEADERBOARD_LAG_ALERT | 60 | seconds | PRD §7.8 metrics table | Alert threshold for leaderboard_update_lag_seconds |
| OBSERVABILITY_PET_CLAIMS_DROP_THRESHOLD | 5 | claims/hour | PRD §7.8 metrics table | Alert if <5/hour for 2h (engagement drop) |
| OBSERVABILITY_ARENA_BATTLES_DROP_THRESHOLD | 10 | battles/hour | PRD §7.8 metrics table | Alert if <10/hour for 2h |
| INFRA_REDIS_ALERT_THRESHOLD | 80 | percent | PRD §7.8 metrics table | redis_memory_usage_percent alert |
| INFRA_DB_POOL_ALERT_THRESHOLD | 80 | percent | PRD §7.8 metrics table | db_connection_pool_utilization alert |
| A11Y_FOCUS_CONTRAST_RATIO | 3 | :1 | PRD §7.7 NFR-A11Y-01; PRD §18 A11y-01 | Minimum focus indicator contrast ratio |
| A11Y_TEXT_CONTRAST_NORMAL | 4.5 | :1 | PRD §18 A11y-06 | Normal text minimum contrast |
| A11Y_TEXT_CONTRAST_LARGE | 3 | :1 | PRD §18 A11y-06 | Large text minimum contrast |
| A11Y_CLAIM_CODE_WARNING_BEFORE_EXPIRY | 2 | minutes | PRD §18 A11y-09 | Warn user 2 min before claim code expiry |
| MARKETPLACE_TRADE_ANTIFLIP_PROTECTION | 7 | days | PRD §5 US-TRADE-001 AC-012-4 | Cooldown after trade before relisting same pet |
| DB_AUTOFAILOVER_TIME | 60 | seconds | PRD §7.3 NFR-AVAIL-03 | PostgreSQL automated failover target |
| DB_MAINTENANCE_WINDOW_MAX | 2 | hours/month | PRD §7.3 NFR-AVAIL-02 | Maximum planned maintenance per month |
| DB_MAINTENANCE_NOTICE | 48 | hours | PRD §7.3 NFR-AVAIL-02 | Advance notice required for maintenance window |
| SENDGRID_FAILOVER_CONSECUTIVE_FAILURES | 3 | failures | PRD §7.3 NFR-AVAIL-04 | Trigger Nodemailer SMTP fallback |
| HEALTH_CHECK_RESPONSE_TIME | 500 | ms | PRD §7.3 NFR-AVAIL-06 | /health endpoint response time |
| HORIZONTAL_SCALE_CPU_THRESHOLD | 70 | percent | PRD §7.4 NFR-SCALE-02 | HPA scale-out trigger |
| ARENA_MATCHMAKING_CONCURRENT_ENTRIES | 100 | entries | PRD §7.4 NFR-SCALE-04 | Redis queue concurrent capacity |
| PET_GENERATION_CONCURRENT_BATCH | 1000 | pets | PRD §7.4 NFR-SCALE-05 | Concurrent generation within 10 seconds |
| PET_GENERATION_CONCURRENT_BATCH_TIME | 10 | seconds | PRD §7.4 NFR-SCALE-05 | Completion time for 1000 concurrent pet generations |
| CODE_MODULE_MAX_LINES | 800 | lines | PRD §7.5 NFR-MAINT-03 | No module exceeds 800 lines |
| CODE_FUNCTION_MAX_LINES | 50 | lines | PRD §7.5 NFR-MAINT-03 | Functions do not exceed 50 lines |
| API_BACKWARD_COMPAT_VERSIONS | 1 | major version | PRD §7.5 NFR-MAINT-06; PRD §8.5 | Backward compatibility maintained for at least 1 major version |
| API_DEPRECATION_NOTICE_DAYS | 90 | days | PRD §8.5 | Notice required before breaking changes |

---

## §4 SLO/SLI Targets

| Metric | Target | Unit | PRD Source | Notes |
|---|---|---|---|---|
| Availability | 99.9% | monthly | PRD §7.3 NFR-AVAIL-01 | Maximum 43.8 minutes downtime per month |
| P99 API Latency (read endpoints) | < 200 | ms at 100 RPS | PRD §7.1 NFR-PERF-01 | All read endpoints |
| P99 API Latency (write endpoints) | < 500 | ms at 100 RPS | PRD §7.1 NFR-PERF-02 | Training, arena entry write endpoints |
| First Contentful Paint (FCP) | < 1.5 | seconds | PRD §7.1 NFR-PERF-04 | Lighthouse / Core Web Vitals |
| Largest Contentful Paint (LCP) | < 2.5 | seconds | PRD §7.1 NFR-PERF-05 | Core Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | score | PRD §7.1 NFR-PERF-06 | Core Web Vitals |
| Interaction to Next Paint (INP) | < 200 | ms | PRD §7.1 NFR-PERF-07 | Core Web Vitals |
| Pet Animation Frame Rate | ≥ 30 | FPS sustained | PRD §7.1 NFR-PERF-08 | Mid-range devices |
| Arena Battle Result E2E | < 2 | seconds | PRD §7.1 NFR-PERF-09 | Calculation + storage |
| Leaderboard Update Lag | ≤ 30 | seconds | PRD §7.1 NFR-PERF-10 | From battle completion |
| Email Delivery (P90) | ≤ 60 | seconds | PRD §7.1 NFR-PERF-11 | Claim password email |
| Error Rate | < 1% | of requests / 5 min | PRD §7.8 NFR-OBS-03 | Alert trigger threshold |
| Observability P99 Alert | > 1000 | ms / 5 min | PRD §7.8 NFR-OBS-04 | Alert threshold |
| Email Delivery Failure Rate | < 2% | / 30 min | PRD §7.8 NFR-OBS-05; PRD §9.2 guardrails | SendGrid failure rate alert |
| Spam Complaint Rate | < 0.1% | SendGrid | PRD §9.2 guardrail metrics | Prevents SendGrid IP throttling |
| Test Unit Coverage | ≥ 80% | percent | PRD §7.5 NFR-MAINT-01 | All business logic modules |
| Pet Interaction Response | < 200 | ms | PRD §5 US-PET-001 AC-001-2 | Click/tap animation response |
| Pet Render on Load | < 2 | seconds | PRD §5 US-PET-001 AC-001-1 | Canvas render on page load |
| Total JS Bundle (gzipped) | < 300 | KB | PRD §7.1 bundle size limits | App page type |
| Total CSS Bundle (gzipped) | < 50 | KB | PRD §7.1 bundle size limits | App page type |

---

## §5 RTP / Probability Design

| Rarity | Probability | PRD Source | Notes |
|---|---|---|---|
| Common | 60% | PRD §5 US-PET-002 AC-002-5; PRD §13 glossary | Assigned probabilistically at generation time |
| Rare | 25% | PRD §5 US-PET-002 AC-002-5; PRD §13 glossary | Assigned probabilistically at generation time |
| Epic | 12% | PRD §5 US-PET-002 AC-002-5; PRD §13 glossary | Assigned probabilistically at generation time |
| Legendary | 3% | PRD §5 US-PET-002 AC-002-5; PRD §13 glossary | Assigned probabilistically at generation time |
| Total | 100% | PRD §5 US-ADMIN-003 AC-015-1 | Four values must always sum to 100%; admin-tunable |

---

## §6 Rate Limits

| Endpoint/Feature | Limit | Window | PRD Source | Notes |
|---|---|---|---|---|
| Arena battles per pet | 10 (default) | 1 hour | PRD §5 US-ARENA-001 AC-007-6; PRD §7.2 NFR-SEC-10 | Redis-backed counter with TTL; HTTP 429 + Retry-After on breach |
| Arena battles per pet (admin-tunable range) | 1–50 | 1 hour | PRD §5 US-ADMIN-003 AC-015-1 | Integer; default 10 |
| Email claim attempts | 5 | 1 hour per email | PRD §7.2 NFR-SEC-04 | Per email address |
| Claim code-entry attempts | 10 | per session | PRD §7.2 NFR-SEC-04 | Per session |
| Claim email retry cooldown | 60 | seconds | PRD §6.2 error flow; PRD §6.5 state machine | Minimum wait before retry after failure |
| Email re-send on delivery failure | 3 | retries | PRD §6.2 error flow | Retry queue over 15 minutes |
| Email re-send retry duration | 15 | minutes | PRD §6.2 error flow | Total retry window for failed delivery |
| Admin portal requests per admin | 100 | per minute | PRD §19.6 NFR-ADMIN-04 | Separately rate-limited from player API |
| Admin login lockout threshold | 10 | failed attempts | PRD §7.2 NFR-SEC-05 | Admin login lockout after N failed attempts |
| Admin login lockout duration | 30 | minutes | PRD §7.2 NFR-SEC-05 | Admin login lockout duration |
| Admin login IP rate limit attempts | 10 | attempts | PRD §7.2 NFR-SEC-06 | Admin login IP rate limit attempts per window |
| Admin login IP rate limit window | 900 | seconds | PRD §7.2 NFR-SEC-06 | Admin login IP rate limit window (15 min) |

---

## §7 Business Rules

| Rule Name | Value | Unit | PRD Source | Notes |
|---|---|---|---|---|
| GDPR_EMAIL_DELETION_WINDOW | 7 | days | PRD §7.2 NFR-SEC-07; PRD §17.3; PRD §17.2 PII inventory | Email replaced with SHA-256 hash within 7 days of deletion request |
| GDPR_EMAIL_HASHING_INTERNAL_SLA | 24 | hours | PRD §19.4 US-ADMIN-004 AC-016-2 | Actual system completes within 24 hours; reported compliant within 7 days |
| GDPR_DATA_ACCESS_RESPONSE | 30 | days | PRD §17.3 GDPR rights matrix | Right of Access (Art. 15) |
| GDPR_DATA_PORTABILITY_RESPONSE | 30 | days | PRD §17.3 GDPR rights matrix | Right to Portability (Art. 20) |
| GDPR_RESTRICT_PROCESSING_RESPONSE | 24 | hours | PRD §17.3 GDPR rights matrix | Right to Restrict Processing (Art. 18) |
| GDPR_OBJECT_LEADERBOARD_RESPONSE | 5 | business days | PRD §17.3 GDPR rights matrix | Right to Object (Art. 21) |
| GDPR_EMAIL_RECTIFICATION_RESPONSE | 24 | hours | PRD §17.3 GDPR rights matrix | Right to Rectification (Art. 16) |
| LEADERBOARD_SNAPSHOT_RETENTION | 12 | months | PRD §11.1 data dictionary | Rolling retention; older snapshots purged |
| ANALYTICS_EVENT_HOT_RETENTION | 90 | days | PRD §11.1 data dictionary | Hot storage for analytics events |
| ANALYTICS_EVENT_COLD_ARCHIVE | 2 | years | PRD §11.1 data dictionary | Cold archive for analytics events |
| ADMIN_AUDIT_LOG_RETENTION | 2 | years | PRD §11.1 data dictionary; PRD §19.5 | Compliance requirement; GDPR Art. 30 accountability |
| IP_ADDRESS_LOG_RETENTION | 90 | days | PRD §11.4 PII inventory; PRD §17.2 | Hashed IP only; raw IP never stored |
| TRADE_TRANSACTION_FEE | 5 | percent | PRD §5 US-TRADE-001 AC-012-5; BRD §11.1 | Platform fee deducted from agreed trade price |
| TRADE_FEE_RANGE_BRD | 5–10 | percent | BRD §11.1 商業模式; BRD §2.3 | BRD revenue assumption range; PRD locks at 5% |
| COPPA_MINIMUM_AGE | 13 | years | PRD §5 US-AUTH-001 AC-003-8; PRD §8.1 constraints | Age confirmation checkbox required on claim form |
| EMAIL_CLAIM_FLOW_STEPS_MAX | 3 | steps | BRD §7.2 Input metrics | email → email sent → enter code |
| MAAPO_TARGET_MONTH_1 | 50 | owners | PRD §9.1 | Monthly Active Arena Pet Owners target |
| MAAPO_TARGET_MONTH_3 | 200 | owners | PRD §9.1 | Monthly Active Arena Pet Owners target |
| MAAPO_TARGET_MONTH_6 | 500 | owners | PRD §9.1 | Monthly Active Arena Pet Owners target |
| MAAPO_TARGET_MONTH_12 | 1000 | owners | PRD §9.1 | Monthly Active Arena Pet Owners target |
| DAP_TARGET_WEEK_4 | 100 | pets/day | PRD §9.1 | Daily Active Pets leading indicator |
| DAP_TARGET_MONTH_3 | 500 | pets/day | PRD §9.1 | Daily Active Pets leading indicator |
| DAP_TARGET_MONTH_6 | 1000 | pets/day | PRD §9.1 | Daily Active Pets leading indicator |
| DAP_TARGET_MONTH_12 | 2000 | pets/day | PRD §9.1 | Daily Active Pets leading indicator |
| CLAIM_CONVERSION_TARGET | 10 | percent | PRD §9.2; BRD §7.2; BRD §3.1 O1 | Visitor to email-claim conversion rate |
| DAY_7_RETENTION_TARGET | 25 | percent | PRD §9.2; BRD §7.2; BRD §3.1 O1 | 7-day retention target |
| DAY_30_RETENTION_TARGET | 15 | percent | BRD §7.2 | 30-day retention target |
| DAY_1_RETURN_RATE_TARGET | 50 | percent | BRD §7.2 | Day-1 return rate after claim |
| CLAIM_CONVERSION_ALPHA_GO | 7 | percent | PRD §9.3 go/no-go | Alpha → Beta go threshold |
| CLAIM_CONVERSION_PIVOT_THRESHOLD | 3 | percent | PRD §9.3 go/no-go; BRD §10.2 K1 | Below this triggers Pivot/Kill evaluation |
| DAY_3_RETENTION_ALPHA_GO | 30 | percent | PRD §9.3 go/no-go | Alpha → Beta go threshold |
| DAY_3_RETENTION_NOGO | 10 | percent | PRD §9.3 go/no-go | Alpha → Beta no-go threshold |
| DAY_7_RETENTION_BETA_NOGO | 10 | percent | PRD §9.3 go/no-go; BRD §10.2 K2 | Beta → GA no-go / Kill trigger |
| ARENA_BATTLES_BETA_GA_MIN | 50 | battles/day | PRD §9.3 go/no-go | Minimum Beta exit threshold (week 8 post-launch) |
| ARENA_BATTLES_BETA_GA_NOGO | 20 | battles/day | PRD §9.3 go/no-go | Beta → GA no-go threshold |
| ARENA_BATTLES_GA_SUCCESS | 100 | battles/day | PRD §9.3; BRD §3.1 O2 | 3-month sustained success target post-GA |
| DAU_MARKETPLACE_TRIGGER | 1000 | users | PRD §9.3; PRD §10.2 FF_MARKETPLACE; BRD §5.3 | Sustain 2 weeks before enabling marketplace |
| ARENA_SOCIAL_SHARE_RATE_TARGET | 5 | percent | PRD §9.2 guardrails; BRD §3.1 O4; BRD §7.2 | Arena battle social share rate |
| LEADERBOARD_UV_DAU_RATIO_TARGET | 20 | percent | PRD §9.2 guardrails; BRD §3.1 O2; BRD §7.2 | Leaderboard page UV / DAU |
| ORGANIC_TRAFFIC_TARGET | 30 | percent | BRD §3.1 O4 | Natural traffic as percent of total visits at 6 months |
| ARENA_FAIR_PLAY_RATE_TARGET | 95 | percent | PRD §9.2 guardrail metrics | Non-bot battles minimum |
| CLAIM_EMAIL_DELIVERY_RATE_TARGET | 98 | percent | PRD §9.2 guardrail metrics; BRD §8.3 vendor SLA | Operational guardrail — alerts and remediation trigger if below 98%; see also SENDGRID_DELIVERY_RATE_ASSUMPTION (same value, planning assumption) |
| CLAIM_FORM_ERROR_RATE_MAX | 2 | percent | PRD §9.2 guardrail metrics | Upper bound for claim form errors |
| SENDGRID_DELIVERY_RATE_ASSUMPTION | 98 | percent | PRD §8.4 assumption A5 | BRD cost/revenue planning assumption with proper SPF/DKIM setup; see also CLAIM_EMAIL_DELIVERY_RATE_TARGET (same value, operational guardrail) |
| MVP_BUDGET | 40000 | USD | PRD §8.1; BRD §8.1; BRD §3.3 base scenario | Hard budget constraint |
| AB_TEST_SAMPLE_SIZE_001_002 | 1000 | visitors/arm | PRD §9.4 | AB-001, AB-002 sample size |
| AB_TEST_SAMPLE_SIZE_003_004 | 500 | sessions or battles/arm | PRD §9.4 | AB-003, AB-004 sample size |
| AB_TEST_DURATION | 2 | weeks | PRD §9.4 | Duration for all A/B tests |
| ALPHA_BETA_TESTERS | 20 | people | PRD §10.1 | Invited testers for Alpha phase |
| BETA_AUDIENCE | 500 | users | PRD §10.1 | itch.io + Discord beta rollout |

---

## §8 Capacity Planning

| Parameter | Value | Unit | PRD Source | Notes |
|---|---|---|---|---|
| NORMAL_OPERATION_RPS | 100 | RPS | PRD §7.1 capacity targets | Sustained normal operation |
| NORMAL_OPERATION_DAU_MIN | 2000 | DAU | PRD §7.1 capacity targets; BRD §3.1 O3 | Normal DAU range lower bound; intentionally equal to DAU_12_MONTH_TARGET — infrastructure sized to meet 12-month business objective |
| NORMAL_OPERATION_DAU_MAX | 5000 | DAU | PRD §7.1 capacity targets; BRD §3.1 O3 | Normal DAU range upper bound |
| PEAK_OPERATION_RPS | 500 | RPS | PRD §7.1 capacity targets | Viral event peak |
| PEAK_CONCURRENT_USERS | 2000 | PCU | PRD §7.1 capacity targets; PRD §13 glossary | Peak Concurrent Users during arena events |
| DB_CONNECTION_POOL_MIN_CONNECTIONS | 20 | connections | PRD §7.1 capacity targets | PostgreSQL connection pool minimum |
| DB_CONNECTION_POOL_MAX_CONNECTIONS | 50 | connections | PRD §7.1 NFR-PERF-01 | DB connection pool maximum connections |
| DAU_12_MONTH_TARGET | 2000 | DAU | BRD §3.1 O3; PRD §9.1 DAP targets | 12-month DAU success objective; intentionally equal to NORMAL_OPERATION_DAU_MIN — represents the infrastructure sizing target |
| CLAIMED_PETS_6_WEEK_TARGET | 500 | pets | BRD §7.2; BRD §3.5 | 6-week total claimed pets target |
| MONTHLY_GMV_TARGET | 10000 | USD | BRD §3.1 O5 | Marketplace monthly GMV target at 12 months |
| MONTHLY_FEE_REVENUE_TARGET | 500 | USD | BRD §3.1 O5; BRD §7.2 Outcome | Monthly transaction fee revenue at 12 months |
| PII_EMAIL_RETENTION_POST_DELETE | 7 | days | PRD §11.4 PII inventory | Account lifetime + 7 days post-deletion; then hashed |
| SERVER_COST_DAU5K_MONTHLY_MIN | 50 | USD/month | BRD §11.1 cost structure | Vercel + Supabase + Railway at DAU ≤ 5k |
| SERVER_COST_DAU5K_MONTHLY_MAX | 200 | USD/month | BRD §11.1 cost structure | Vercel + Supabase + Railway at DAU ≤ 5k |
| EMAIL_SENDGRID_MONTHLY_LIMIT | 10000 | emails | BRD §11.1 cost structure | ~$20/month |
| INFRA_COST_ANNUAL_BASE | 8000 | USD/year | BRD §3.3 base scenario | Server + maintenance labor |
| VENDOR_MIGRATION_PLAN_DAYS | 14 | days | PRD §8.3; BRD §13.1 | SendGrid and PostgreSQL vendor migration plan window |

> **Data retention constants** (ANALYTICS_EVENT_HOT_RETENTION, ANALYTICS_EVENT_COLD_ARCHIVE, ADMIN_AUDIT_LOG_RETENTION) are defined in §7 Business Rules.

---

## Appendix A：constants.json 同步格式

本文件生成後，必須同步輸出 `docs/constants.json`，格式如下（節選關鍵欄位）：

```json
{
  "version": "1.0",
  "generated_from": "docs/PRD.md",
  "last_updated": "2026-05-03",
  "core": {
    "PET_GENERATION_COMBINATIONS_MIN": 1000000000,
    "PET_STAT_MAX": 100,
    "PET_LEVEL_MAX": 100,
    "TRAINING_ACTIONS_PER_DAY": 3,
    "ARENA_RATE_LIMIT_BATTLES_PER_HOUR": 10,
    "CLAIM_CODE_DIGITS": 6,
    "CLAIM_CODE_EXPIRY": 15
  },
  "slo": {
    "availability_pct": 99.9,
    "p99_latency_read_ms": 200,
    "p99_latency_write_ms": 500,
    "error_rate_pct": 1.0,
    "leaderboard_update_lag_s": 30
  },
  "rtp": {
    "COMMON_PCT": 60,
    "RARE_PCT": 25,
    "EPIC_PCT": 12,
    "LEGENDARY_PCT": 3
  },
  "rate_limits": {
    "arena_battles_per_pet": {"limit": 10, "window": "1h"},
    "email_claim_attempts": {"limit": 5, "window": "1h"},
    "admin_requests_per_account": {"limit": 100, "window": "1m"}
  },
  "capacity": {
    "NORMAL_OPERATION_RPS": 100,
    "PEAK_OPERATION_RPS": 500,
    "DAU_12_MONTH_TARGET": 2000
  }
}
```
