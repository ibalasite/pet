---
diagram: cicd-pr-gate-activity
uml-type: Activity Diagram（PR Gate）
source: docs/CICD.md §3 PR Gate
generated: 2026-05-08T00:00:00Z
---

# PR Gate Activity Diagram — pixel-pet-arena

> 來源：docs/CICD.md §3 PR Gate Requirements + §2 GitHub Actions Workflows

描述 Pull Request 從建立到滿足合併條件的完整 Gate 檢查流程。每個 Stage 必須通過才能進入下一個。

```mermaid
flowchart TD
    Start(["Developer: open PR to main"]) --> Webhook["GitHub webhook<br/>triggers ci.yml"]
    Webhook --> Checkout["Stage 1: Checkout + cache restore<br/>actions/checkout@v4 + actions/cache@v4"]
    Checkout --> Install["Stage 2: pnpm install --frozen-lockfile<br/>workspace bootstrap"]
    Install --> Lint{"Stage 3: pnpm lint<br/>ESLint + Prettier check"}

    Lint -->|PASS| TypeCheck{"Stage 4: pnpm typecheck<br/>tsc --noEmit on api / player-app / admin-app"}
    Lint -->|FAIL| Reject1(["PR BLOCKED<br/>(lint errors — see annotations)"])

    TypeCheck -->|PASS| Unit{"Stage 5: pnpm test:unit<br/>Jest + coverage ≥80% threshold"}
    TypeCheck -->|FAIL| Reject2(["PR BLOCKED<br/>(type errors — see annotations)"])

    Unit -->|PASS| Coverage{"Coverage check<br/>statements ≥ 80% AND<br/>branches ≥ 75%?"}
    Unit -->|FAIL| Reject3(["PR BLOCKED<br/>(unit test failures)"])

    Coverage -->|PASS| Integration{"Stage 6: pnpm test:integration<br/>Testcontainers PG 16 + Redis 7"}
    Coverage -->|FAIL| Reject4(["PR BLOCKED<br/>(coverage below threshold)"])

    Integration -->|PASS| DockerBuild{"Stage 7: docker build × 3<br/>api + player-app + admin-app images"}
    Integration -->|FAIL| Reject5(["PR BLOCKED<br/>(integration test failures)"])

    DockerBuild -->|PASS| E2E{"Stage 8: pnpm test:e2e:smoke<br/>Playwright + docker-compose stack"}
    DockerBuild -->|FAIL| Reject6(["PR BLOCKED<br/>(image build error)"])

    E2E -->|PASS| Secrets{"Stage 9: detect-secrets scan<br/>baseline diff"}
    E2E -->|FAIL| Reject7(["PR BLOCKED<br/>(smoke test failed — quarantine artifacts)"])

    Secrets -->|PASS| Status["GitHub Status: success ✓<br/>required checks all green"]
    Secrets -->|FAIL| Reject8(["PR BLOCKED<br/>(potential secret leak detected)"])

    Status --> ReviewGate{"Reviewer approval<br/>+ CODEOWNERS rules?"}
    ReviewGate -->|approved| BranchProtect{"Branch protection<br/>up-to-date with main?"}
    ReviewGate -->|changes_requested| Update(["Developer pushes fix<br/>→ workflow re-runs from Stage 1"])

    BranchProtect -->|yes| Mergeable(["PR Ready to Merge<br/>(squash-merge button enabled)"])
    BranchProtect -->|no — behind main| Rebase(["Developer rebases<br/>onto latest main"])

    Update --> Webhook
    Rebase --> BranchProtect

    Reject1 --> FixReturn(["Developer pushes fix"]) --> Webhook
    Reject2 --> FixReturn
    Reject3 --> FixReturn
    Reject4 --> FixReturn
    Reject5 --> FixReturn
    Reject6 --> FixReturn
    Reject7 --> FixReturn
    Reject8 --> FixReturn

    Mergeable --> SquashMerge(["Reviewer clicks Squash & Merge<br/>→ triggers deploy-staging.yml"])

    classDef rejectClass fill:#ffe0e0,stroke:#d33,color:#900
    classDef passClass fill:#e0ffe0,stroke:#393,color:#060
    class Reject1,Reject2,Reject3,Reject4,Reject5,Reject6,Reject7,Reject8 rejectClass
    class Mergeable,SquashMerge,Status passClass
```

## Required Status Checks

從 `.github/branches/main` branch protection 設定中匯入的必要檢查：

| Check Name | Workflow Stage | Failure Behavior |
|-----------|----------------|------------------|
| `lint` | Stage 3 | Block merge |
| `typecheck` | Stage 4 | Block merge |
| `unit-tests` | Stage 5 | Block merge |
| `integration-tests` | Stage 6 | Block merge |
| `docker-build / api` | Stage 7 (matrix) | Block merge |
| `docker-build / player-app` | Stage 7 (matrix) | Block merge |
| `docker-build / admin-app` | Stage 7 (matrix) | Block merge |
| `e2e-smoke` | Stage 8 | Block merge |
| `detect-secrets` | Stage 9 | Block merge |
| `coverage-threshold` | post-Stage 5 | Block merge |

## Branch Protection Rules

- Require PR review from at least 1 CODEOWNER (CICD.md §3.4)
- Require branches to be up to date before merging
- Required status checks must pass (above table)
- Restrict who can dismiss reviews (Admin team only)
- Disallow force-push to `main` and `release/*`
