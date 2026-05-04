# pixel-pet-arena 🎮

**A pixel-art pet breeding, training, and battle arena game** with cross-platform support (Web, iOS, Android) and competitive leaderboards.

---

## 📋 Project Overview

pixel-pet-arena combines pet NFT-like mechanics with real-time multiplayer arena battles. Players claim pets via email, train them daily with food buffs, breed to discover rare variants, and compete in speed (RACE) or strength (SUMO) arena tournaments.

**Tech Stack:**
- **Backend:** Node.js 20 + Fastify + PostgreSQL + Redis
- **Frontend:** Phaser.js 3 (2D pixel canvas) + React + TypeScript + Vite
- **Admin:** Vue 3 + ElementPlus
- **Audio:** Web Audio API + HTML5 Audio fallback
- **DevOps:** Docker Compose (local), Kubernetes (production)

**Core Features:**
- 🐾 **Pet System:** Claim via email OTP, randomized stats/rarity (Common 60%, Rare 25%, Epic 12%, Legendary 3%)
- 📈 **Training:** Daily food buffs (temporary/permanent), stat progression caps
- ⚔️ **Arena Battles:** RACE (speed-based), SUMO (strength-based), anti-bot detection, public battle records
- 🏆 **Leaderboards:** Real-time ranking, cacheable snapshots, social share (Open Graph)
- 💱 **Trading System:** Player marketplace, anti-flip controls, dispute resolution
- 🔐 **Admin:** Moderation, GDPR erasure, feature flag config, suspicious activity detection

---

## 📁 Repository Structure

This is a **specification and design documentation repository** — contains game design, API contracts, BDD test scenarios, but NOT implementation code.

```
pixel-pet-arena/
├── docs/                      # Design & specification documents
│   ├── IDEA.md               # Initial concept & problem statement
│   ├── BRD.md                # Business requirements & goals
│   ├── PRD.md                # Product requirements & user stories (91 ACs)
│   ├── PDD.md                # Product/UI design specs (Phaser.js canvas, React components)
│   ├── VDD.md                # Visual design tokens (color, typography, spacing)
│   ├── EDD.md                # Technical architecture & system design
│   ├── ARCH.md               # Component & service architecture
│   ├── API.md                # REST API endpoint specifications (25+ endpoints)
│   ├── SCHEMA.md             # Database schema & ERD (13 tables)
│   ├── AUDIO.md              # Audio design (11 SFX, Web Audio API)
│   ├── ANIM.md               # Animation specs (15+ sprite animations, 32×32px)
│   ├── FRONTEND.md           # Frontend tech architecture & component design
│   ├── ADMIN_IMPL.md         # Admin panel UI & backend specs
│   ├── test-plan.md          # Testing strategy & RTM
│   ├── BDD-server.md         # Server-side BDD strategy (8 feature files)
│   ├── BDD-client.md         # Client-side BDD strategy (9 feature files)
│   ├── RTM.md                # Requirements traceability matrix (131 BDD scenarios)
│   ├── RTM.csv               # Machine-readable traceability matrix
│   ├── background-jobs.md    # Recurring task specifications
│   ├── ALIGN_REPORT.md       # Cross-file alignment audit report
│   └── diagrams/             # Architecture diagrams (PlantUML, PNG)
├── features/                  # BDD specifications in Gherkin
│   ├── server/               # Backend feature files (6 files, 172 steps)
│   │   ├── arena-battle.feature
│   │   ├── claim-flow.feature
│   │   ├── gdpr-erasure.feature
│   │   ├── leaderboard.feature
│   │   ├── suspicious-detection.feature
│   │   └── training-food.feature
│   ├── client/               # Frontend feature files (9 files, 1,071 steps)
│   │   ├── admin-portal.feature
│   │   ├── arena-ui.feature
│   │   ├── battle-records.feature
│   │   ├── claim-flow-ui.feature
│   │   ├── food-system.feature
│   │   ├── leaderboard-ui.feature
│   │   ├── pet-display.feature
│   │   ├── settings.feature
│   │   └── training-ui.feature
│   └── root/                 # Legacy root-level feature files (consolidate into server/client)
│       ├── auth-login.feature
│       ├── arena-combat.feature
│       ├── pet-management.feature
│       ├── pet-training.feature
│       ├── arena-leaderboard.feature
│       ├── trading-system.feature
│       ├── admin-moderation.feature
│       └── admin-gdpr.feature
├── templates/                 # Pipeline configuration
│   ├── pipeline.json         # gendoc step definitions
│   ├── *.gen.md             # Generation rules for each doc type
│   └── *.review.md          # Review standards for each doc type
├── README.md                  # This file
└── .gendoc-state.json        # Pipeline execution state

```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for local database)
- Git

### For Documentation Review

```bash
# Clone repository
git clone https://github.com/pixel-pet-arena/docs.git
cd pixel-pet-arena

# Read the design docs in order
1. docs/IDEA.md              # Understand the vision
2. docs/BRD.md               # Business context
3. docs/PRD.md               # Feature requirements
4. docs/PDD.md + docs/VDD.md # UI/visual design
5. docs/EDD.md               # Technical architecture
6. docs/API.md               # API contracts
7. docs/test-plan.md + RTM.md # Test strategy
8. features/                 # BDD scenarios
```

### For Game Implementation

This repository is **documentation-only**. For actual game code (backend API, frontend game, admin panel), see:
- **Backend Repository:** [pixel-pet-arena/api](https://github.com/pixel-pet-arena/api) (Node.js + Fastify)
- **Frontend Repository:** [pixel-pet-arena/game](https://github.com/pixel-pet-arena/game) (Phaser.js + React)
- **Admin Repository:** [pixel-pet-arena/admin](https://github.com/pixel-pet-arena/admin) (Vue 3)

---

## 📊 Documentation Quality

### Coverage (131 BDD Scenarios)
- **Server-side:** 8 feature files, 172 Gherkin steps covering auth, arena, leaderboard, trading, moderation, GDPR
- **Client-side:** 9 feature files, 1,071 Gherkin steps covering UI, animations, forms, accessibility
- **Requirements Traceability:** 91 Product Requirements → 131 BDD Scenarios (RTM.csv)

### Known Issues / Pending Fixes
See **docs/ALIGN_REPORT.md** for:
- 30 cross-file alignment findings (4 CRITICAL, 12 HIGH, 10 MEDIUM, 4 LOW)
- Auto-fixable documentation improvements
- Blocking items (requires engineering decisions)

### Alignment Audit
Last run: 2026-05-04
- **Dimension 0** (File Existence): 1 HIGH — README.md created ✅
- **Dimension 1** (Doc ↔ Doc): 11 findings — In progress
- **Dimension 2** (Doc ↔ Code): Blocked (no src/ in this repo)
- **Dimension 3** (Code ↔ Test): Blocked (no tests in this repo)
- **Dimension 4** (Doc ↔ Test): 9 findings — In progress
- **Dimension 5** (UML/RTM): 5 findings — In progress

---

## 🔄 Contributing

### Documentation Updates
1. Read the relevant upstream documents first
2. Follow [gendoc workflow](./docs/IDEA.md#gendoc-pipeline)
3. Run alignment audit: `/gendoc-align-check`
4. Fix alignment issues: `/gendoc-align-fix docs`
5. Commit with: `docs(gendoc)[<step>]: <description>`

### Implementation
- Backend, frontend, and admin implementations live in separate repositories
- All code must pass BDD scenarios in `features/`
- RTM.csv tracks requirement coverage

### Feedback
- **Design questions:** Open issue in [Discussions](https://github.com/pixel-pet-arena/docs/discussions)
- **Bug reports:** [Issues](https://github.com/pixel-pet-arena/docs/issues)
- **Alignment gaps:** See [ALIGN_REPORT.md](./docs/ALIGN_REPORT.md)

---

## 📝 Document Conventions

**Cross-references:** Links use relative paths (`docs/PRD.md#section-id`) and markdown anchors.

**Code examples:** Formatted with language tags:
```typescript
// TypeScript examples use ```typescript
const petStats: PetStats = { speed: 50, strength: 60 };
```

**Diagrams:** PlantUML source in `docs/diagrams/puml/` with rendered PNG in `docs/diagrams/`.

**BDD Scenarios:** Gherkin format with:
- **Feature:** User story or AC (links to PRD)
- **Scenario:** Specific test case
- **Given/When/Then:** Executable steps (link to step definitions once implemented)

---

## 📋 Maintenance

### Weekly
- Check [ALIGN_REPORT.md](./docs/ALIGN_REPORT.md) for new misalignments
- Run: `/gendoc-align-check` to validate doc consistency

### Monthly
- Review RTM.csv coverage metrics
- Validate feature list against BDD scenario count

### Quarterly
- Full architectural review (EDD.md, ARCH.md, SCHEMA.md)
- Game balance analysis (stat caps, rarity distribution, training buffs)

---

## 📜 License

[Add license info here — MIT, CC-BY, proprietary, etc.]

---

## 👥 Team

- **Game Design:** [Name]
- **Product Management:** [Name]
- **Technical Architecture:** [Name]
- **QA / Test Strategy:** [Name]

---

**Last Updated:** 2026-05-04  
**Status:** ⚠️ Specification Phase (30 alignment findings pending fixes)  
**Next Phase:** Code Implementation (Backend, Frontend, Admin)
