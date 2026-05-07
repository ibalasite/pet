---
diagram: frontend-state-ui
uml-type: State Machine Diagram（Frontend UI Component）
source: docs/FRONTEND.md §5.3 Training + §5.5 Arena + docs/VDD.md §UI States
generated: 2026-05-08T00:00:00Z
---

# Frontend State Machine — TrainingActionCard UI

> 來源：docs/FRONTEND.md §5.3 Training Interaction + docs/VDD.md §UI States

描述「TrainingActionCard」這個關鍵互動 UI 元件的所有狀態與轉換。
此元件決定玩家是否可訓練、訓練是否成功、是否觸發冷卻。

```mermaid
stateDiagram-v2
    [*] --> IDLE : mount [pet loaded] / read daily quota from PetStore

    state IDLE {
        [*] --> NORMAL_IDLE
        NORMAL_IDLE --> HOVERED : mouse enter [pointer in bounds] / show tooltip
        HOVERED --> NORMAL_IDLE : mouse leave [pointer out of bounds] / hide tooltip
        HOVERED --> ACTIVATED : click [user intent] / call onAction
        NORMAL_IDLE --> ACTIVATED : click via keyboard [Enter / Space pressed] / call onAction
    }

    IDLE --> EXECUTING : click action [daily quota > 0, no inflight] / disable + show spinner
    IDLE --> DISABLED : daily quota === 0 [training_daily_quota_remaining = 0] / show "Daily limit"

    state EXECUTING {
        [*] --> SENDING_REQUEST
        SENDING_REQUEST --> AWAITING_RESPONSE : fetch sent [request inflight] / track promise
    }

    EXECUTING --> SUCCESS : API 200 [response.ok] / update PetStore + show stat delta
    EXECUTING --> ERROR_RATE_LIMIT : API 429 [over daily limit] / show "Daily limit reached"
    EXECUTING --> ERROR_NETWORK : fetch failed [network error or timeout 5s] / show "Network error"
    EXECUTING --> ERROR_AUTH : API 401 [token invalid] / show "Re-claim required" + redirect

    state SUCCESS {
        [*] --> SHOWING_DELTA
        SHOWING_DELTA --> ANIMATING : animation requested [reducedMotion=false] / play stat-up tween
        ANIMATING --> COMPLETE : tween end [duration=2s] / fade indicator
        SHOWING_DELTA --> COMPLETE : reducedMotion [reducedMotion=true] / skip animation
    }

    SUCCESS --> IDLE : timeout [completed delta visible >=2s] / re-enable card
    SUCCESS --> DISABLED : daily quota now 0 [post-action quota reached] / lock card

    state ERROR_RATE_LIMIT {
        [*] --> RATE_BANNER_VISIBLE
        RATE_BANNER_VISIBLE --> COUNTING_DOWN : every 1s tick [ttl > 0] / decrement countdown
        COUNTING_DOWN --> RATE_BANNER_VISIBLE : tick [ttl > 0] / re-render
    }

    ERROR_RATE_LIMIT --> IDLE : daily reset [now > resetAt] / clear banner + re-enable

    state ERROR_NETWORK {
        [*] --> RETRY_PROMPT
        RETRY_PROMPT --> RETRYING : click retry [user gesture] / re-attempt fetch
        RETRY_PROMPT --> CANCELLED : click dismiss [user gesture] / hide toast
    }

    ERROR_NETWORK --> EXECUTING : RETRYING fired [user click retry] / re-send request
    ERROR_NETWORK --> IDLE : CANCELLED [user dismissed] / clear error state

    ERROR_AUTH --> [*] : token cleared [tokenStore.clear()] / redirect to /claim

    DISABLED --> IDLE : daily reset [now >= 00:00 UTC + offset] / restore quota

    note right of EXECUTING
        Loading spinner visible
        Card click disabled
        Other cards remain enabled
        unless they share quota.
    end note

    note right of SUCCESS
        StatChangeIndicator visible
        for training_stat_display_duration_seconds = 2
        Then auto-dismiss.
    end note

    note right of DISABLED
        Visually muted (opacity 0.4)
        Card click is no-op
        Tooltip: "Comes back at 00:00 UTC"
    end note

    note left of ERROR_NETWORK
        Toast persists until dismissed
        or retry succeeds.
        Max 3 retry attempts (1s, 2s, 4s).
    end note
```

## State 對應 UI 變化

| State | Visual | Aria Label | Click Behavior |
|-------|--------|-----------|----------------|
| IDLE.NORMAL_IDLE | full opacity, hover tint | `aria-label="Train Speed"` | enabled |
| IDLE.HOVERED | scale 1.05 + tooltip | (same) | enabled |
| EXECUTING | spinner overlay | `aria-busy="true"` | disabled |
| SUCCESS.ANIMATING | green +2 bubble tween up | `aria-live="polite" Speed +2` | (no-op) |
| SUCCESS.COMPLETE | full opacity + delta gone | (same) | enabled |
| ERROR_RATE_LIMIT | red badge + countdown | `aria-live="assertive"` | disabled |
| ERROR_NETWORK | toast notification | (toast a11y) | enabled (retry) |
| ERROR_AUTH | redirect imminent | `aria-live="assertive"` | (no-op) |
| DISABLED | grey 0.4 opacity | `aria-disabled="true"` | (no-op) |

## Triggers Reference

| Trigger | Source | Frequency |
|---------|--------|-----------|
| `click` | user mouse / touch | once per gesture |
| `keyboard` | Enter/Space on focused card | once per gesture |
| `mouse enter / leave` | pointer event | continuous while present |
| `fetch sent` | TanStack Query useMutation | per attempt |
| `API 200/4xx/5xx` | server response | once per attempt |
| `tween end` | Phaser tween onComplete | per animation |
| `daily reset` | system (clock + interval) | once per day |
| `tick` | setInterval 1s | continuous during ERROR_RATE_LIMIT |

## Notes

- 所有 transition label 使用 `trigger [guard] / action` 格式（無 `<br/>` 違規）
- `DISABLED` 與 `ERROR_RATE_LIMIT` 視覺類似但語意不同：DISABLED 是預期狀態（每日重置），RATE_LIMIT 是 hard error
- Reduced motion preference 影響 SUCCESS 子狀態流（跳過 ANIMATING）
- 所有 ERROR_* 狀態都可從 IDLE 重新進入，這是 React idempotent 設計的好處
