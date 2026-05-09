---
diagram: object-snapshot
uml-type: 物件圖（Object Diagram / Snapshot）
source: docs/EDD.md §4.5.3
generated: 2026-05-10T00:50:00Z
---

# Object Diagram — Runtime Snapshot

下圖呈現一個典型運行期物件配置：玩家 Alex 領養了 LEGENDARY 等級寵物 `pet_alex_001`，在某次 Race 比賽中（`arena_match_77`）獲勝，且 `claim_code_42` 為其領養所用 OTP 紀錄。

```mermaid
classDiagram
    class pet_alex_001 {
        id = "uuid-pet-001"
        seed = 42
        rarity = LEGENDARY
        speed = 78
        strength = 65
        stamina = 70
        level = 14
    }
    class identity_alex {
        id = "uuid-id-007"
        emailHash = "sha256(alex@example.com)"
    }
    class claim_code_42 {
        id = "uuid-cc-042"
        codeHash = "sha256(123456)"
        expiresAt = "2026-05-10T14:15:00Z"
    }
    class arena_match_77 {
        id = "uuid-match-077"
        petAId = "uuid-pet-001"
        petBId = "uuid-pet-019"
        winnerPetId = "uuid-pet-001"
        mode = RACE
    }
    pet_alex_001 --> identity_alex : claimed_by
    claim_code_42 --> pet_alex_001 : unlocks
    arena_match_77 --> pet_alex_001 : pet_a
```

> Snapshot 為某時點實例化結果，輔助理解 Class Diagram 的執行期樣貌。
