---
diagram: frontend-activity-ui
uml-type: Activity Diagram（Frontend UI Interaction）
source: docs/FRONTEND.md §5.3 Training + §5.4 Feed + §5.7 Leaderboard
generated: 2026-05-08T00:00:00Z
---

# Frontend Activity Diagram — UI Interaction Flow（Training Action）

> 來源：docs/FRONTEND.md §5.3 Training Interaction + docs/PDD.md §UI flows

描述「點擊訓練按鈕」這個關鍵 UI 互動的完整流程：從點擊事件到狀態更新到 UI 刷新。
明確劃分 Player（使用者）、ClientApp（前端）、Server（後端）三條泳道。

```mermaid
flowchart TD
    subgraph Player ["Player Lane"]
        A_Click(["玩家於 TrainingPage<br/>點擊 'Train Speed' 卡片"])
    end

    subgraph ClientApp ["ClientApp Lane (TrainingActionCard + TanStack Query)"]
        B_Validate{"前端 validation：<br/>useState quota > 0？"}
        B_Disable["setLoading(true)<br/>disable card + spinner"]
        B_Optimistic["optimistic update PetStore<br/>(speed += 2 預估值)"]
        B_BuildReq["build TrainRequest<br/>{trainingType: 'SPEED'}"]
        B_FireApi["TanStack Query<br/>mutation.mutate(req)"]
        B_AwaitResp{"等待 server response<br/>(timeout 5s)"}
        B_Success["onSuccess:<br/>update PetStore with real value<br/>show StatChangeIndicator (+2)"]
        B_RollbackOpt["onError:<br/>rollback optimistic PetStore<br/>show error toast"]
        B_Reenable["setLoading(false)<br/>re-enable card<br/>(if quota>0)"]
        B_LockCard["if quota now 0:<br/>setDisabled(true)<br/>show 'Daily limit'"]
    end

    subgraph Server ["Server Lane"]
        S_AuthCheck{"驗證 X-Pet-Token<br/>header？"}
        S_RateCheck{"check rl:train:{petId}<br/>< daily limit?"}
        S_DBTxn["BEGIN TRANSACTION<br/>INSERT training_logs<br/>UPDATE pets SET stat_speed += 2<br/>COMMIT"]
        S_Resp200["return 200<br/>{pet, trainingLog}"]
        S_Resp401(["return 401 Unauthorized<br/>INVALID_TOKEN"])
        S_Resp429(["return 429 Too Many Requests<br/>{retryAfter: 86400}"])
        S_Resp500(["return 500 Internal Server Error<br/>(rare)"])
    end

    A_Click --> B_Validate
    B_Validate -->|YES| B_Disable
    B_Validate -->|NO（quota=0）| Q_Toast(["顯示 toast<br/>'Daily limit reached'"])

    B_Disable --> B_Optimistic
    B_Optimistic --> B_BuildReq
    B_BuildReq --> B_FireApi
    B_FireApi -->|HTTP POST| S_AuthCheck

    S_AuthCheck -->|valid| S_RateCheck
    S_AuthCheck -->|invalid| S_Resp401

    S_RateCheck -->|under limit| S_DBTxn
    S_RateCheck -->|over limit| S_Resp429

    S_DBTxn --> S_Resp200

    S_Resp200 -->|response 200| B_AwaitResp
    S_Resp401 -->|response 401| B_AwaitResp
    S_Resp429 -->|response 429| B_AwaitResp
    S_Resp500 -->|response 500| B_AwaitResp

    B_AwaitResp -->|200 OK| B_Success
    B_AwaitResp -->|4xx / 5xx| B_RollbackOpt

    B_Success --> B_Reenable
    B_Success --> B_LockCard
    B_RollbackOpt --> B_Reenable

    B_Reenable --> A_View(["玩家看到 stat 上升動畫<br/>或 error toast"])
    B_LockCard --> A_View
    Q_Toast --> A_View

    classDef errClass fill:#ffe0e0,stroke:#d33
    classDef okClass fill:#e0ffe0,stroke:#393
    class S_Resp401,S_Resp429,S_Resp500,Q_Toast,B_RollbackOpt errClass
    class S_DBTxn,S_Resp200,B_Success okClass
```

## Swimlane 說明

| Swimlane | 主要負責元件 | 主要動作 |
|----------|-------------|---------|
| Player | (使用者本人) | 點擊、看畫面 |
| ClientApp | TrainingActionCard、TanStack Query mutation、PetStore | 驗證、optimistic update、API call、rollback |
| Server | Fastify route handler、PG transaction、Redis rate-limiter | 認證、限速、寫資料、回應 |

## Optimistic Update 策略

1. **Optimistic apply**：`B_Optimistic` 立即把 `speed += 2` 寫進 PetStore，UI 立刻反映
2. **Server-of-truth wait**：API 呼叫 inflight，畫面顯示 spinner
3. **Reconcile on success**：`onSuccess` 用 server 回傳的真實值覆蓋 optimistic guess（可能是 +1, +2 or +3）
4. **Rollback on error**：`onError` 把 PetStore 還原到 pre-optimistic 狀態

## Decision Points

| Decision | True 條件 | False 條件 |
|----------|----------|-----------|
| `前端 validation` | quota > 0 | quota === 0 |
| `驗證 X-Pet-Token` | hash matches stored owner_token_hash | not match |
| `check rl:train` | `rl:train:{petId} < training_daily_quota = 3` | counter ≥ 3 |
| `等待 server response` | API 回傳 200 | 4xx / 5xx / timeout |

## Error Branches

- **B_Validate NO**：前端先攔，不送 API（節省往返）
- **S_Resp401**：token 失效 → 後續會導去 /claim
- **S_Resp429**：當天額度已用完 → DISABLED 狀態，等次日重置
- **S_Resp500**：罕見伺服器錯誤 → toast 並 rollback optimistic update

## Notes

- 所有 API call 透過 TanStack Query `useMutation`，自動處理 inflight cancellation 與 retry
- Optimistic update 使顯著感受到 UI snappy（即使 server 慢 200ms 也感覺即時）
- Rollback 策略確保畫面不會出現「+2 又變回 +0 又變 +1」的閃爍
