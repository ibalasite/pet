# Arena Battle Prototype Specification

## Overview

The Arena Battle flow covers three sequential screens: opponent selection, live battle animation, and post-battle results. It is the competitive heart of pixel-pet-arena. The flow is implemented in the React 18 player-app (port 5173) with Phaser 3 powering all animated battle sequences. The Fastify 4 API on port 3000 provides opponent data, resolves battle outcomes, and records XP changes. Because `FF_ARENA_SUMO=true` the mode selector (Race vs. Sumo) is shown throughout the challenge selection screen; if the flag were false the mode toggle would be hidden and only Race mode would be available.

---

## Screen 1 — Challenge Selection

The challenge selection screen lists all opponents the player can fight right now. It is reached by navigating to `/arena` from the Pet Display page.

```
┌───────────────────────────────────────────────┐
│  ← Back       Arena Challenge         [Race ▾]│
│                                               │
│  Mode:  ○ Race  ● Sumo          ← FF_ARENA_SUMO=true │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 🐉 Voltclaw   Lv 11  ·  Type: Electric  │  │
│  │  Win rate 61%  ·  Rank #42          [▶] │  │
│  ├─────────────────────────────────────────┤  │
│  │ 🔥 Emberfang  Lv 13  ·  Type: Fire     │  │
│  │  Win rate 48%  ·  Rank #17          [▶] │  │
│  ├─────────────────────────────────────────┤  │
│  │ 💧 Tidecrest  Lv 10  ·  Type: Water    │  │
│  │  Win rate 55%  ·  Rank #88          [▶] │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Showing 3 of 12 available opponents          │
│  [Load more]                                  │
└───────────────────────────────────────────────┘
```

The opponent list is fetched via `GET /api/v1/arena/challenge` on mount. Each row shows the opponent's pet name, level, type, win rate, and current leaderboard rank. A segmented mode toggle (Race / Sumo) appears at the top because `FF_ARENA_SUMO` is `true`; the selected mode is stored in component state and passed as a query param when initiating a battle. Tapping the play button `[▶]` on any row initiates the challenge and transitions to the Battle Animation screen. The list supports infinite scroll, loading 12 opponents per page.

### API Call — GET /api/v1/arena/challenge

```
GET /api/v1/arena/challenge?page=1&limit=12
Authorization: Bearer <token>

Response 200:
{
  "opponents": [
    {
      "petId": "pet_volt42",
      "name": "Voltclaw",
      "level": 11,
      "type": "Electric",
      "spritesheet": "/assets/sprites/electric-11.png",
      "winRate": 0.61,
      "rank": 42
    }
  ],
  "total": 12,
  "page": 1
}
```

---

## Screen 2 — Battle Animation

Once an opponent is selected and `POST /api/v1/arena/battle` resolves, the player is transitioned to the battle animation screen. Phaser 3 renders both pets on a shared canvas. For Race mode the pets sprint from left to right; for Sumo mode they face each other and exchange pushes until one falls off the circular arena mat.

```
┌───────────────────────────────────────────────┐
│  SUMO BATTLE  ·  Round 1 of 3                 │
│                                               │
│  Blazekin               vs          Voltclaw  │
│  HP: ████████░░          HP: █████░░░░░       │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │                                         │  │
│  │         Phaser 3 Battle Canvas          │  │
│  │           480 × 320 px                  │  │
│  │                                         │  │
│  │   [pet A sprite]     [pet B sprite]     │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ⚡ Voltclaw uses Static Shock!               │
│  Blazekin takes 18 damage.                    │
└───────────────────────────────────────────────┘
```

The battle outcome is pre-computed by the API; the animation screen replays the sequence of events returned in the `POST /api/v1/arena/battle` response. Each event in the `battleLog` array is consumed one at a time on a 1.2-second interval timer inside the Phaser scene. HP bars tween smoothly with `Phaser.Tweens`. The battle canvas is 480 × 320 px and scales proportionally on smaller viewports using the same `transform: scale()` technique used on the Pet Display page to maintain pixel art fidelity.

### API Call — POST /api/v1/arena/battle

```
POST /api/v1/arena/battle
Authorization: Bearer <token>
Content-Type: application/json

{
  "challengerPetId": "pet_abc123",
  "opponentPetId":  "pet_volt42",
  "mode": "sumo"
}

Response 200:
{
  "battleId": "battle_xyz789",
  "winnerId": "pet_abc123",
  "xpGain": 120,
  "newRank": 39,
  "battleLog": [
    { "turn": 1, "actorId": "pet_volt42", "move": "Static Shock", "damage": 18 },
    { "turn": 2, "actorId": "pet_abc123", "move": "Fire Slash",   "damage": 25 }
  ]
}
```

### Real-Time Polling and WebSocket Considerations

For the current prototype, battle resolution is synchronous: the POST call blocks until the server has fully computed the outcome (typically under 200 ms). The battle log is then replayed client-side as a scripted animation, so no WebSocket connection is required for MVP. A future enhancement would stream `battleLog` events over a WebSocket at `ws://localhost:3000/arena/battle/:battleId/stream`, allowing spectators to watch ongoing battles in real time. The client would subscribe on battle start and unsubscribe on `{ event: "battle_end" }`. For the prototype, the polling fallback is `GET /api/v1/arena/battle/:battleId/status` at a 2-second interval if the initial POST exceeds a 5-second timeout threshold, which may occur under API load.

---

## Screen 3 — Post-Battle Result

After the battle animation finishes playing, the result screen fades in automatically. It celebrates the winner, quantifies XP gained, and shows the player's updated leaderboard rank delta.

```
┌───────────────────────────────────────────────┐
│                                               │
│           🏆  BLAZEKIN WINS!                  │
│                                               │
│        ┌────────────────────────┐             │
│        │  Phaser victory anim   │             │
│        │  (confetti + sparkles) │             │
│        └────────────────────────┘             │
│                                               │
│  XP Gained:    +120                           │
│  New Rank:     #39  (was #43  ↑ +4)           │
│  Total XP:     4,820 / 6,000 to Lv 13        │
│                                               │
│  ┌────────────────┐    ┌────────────────────┐ │
│  │  Fight Again   │    │   Back to Pet View  │ │
│  └────────────────┘    └────────────────────┘ │
└───────────────────────────────────────────────┘
```

The XP gain and rank change values are read directly from the `POST /api/v1/arena/battle` response stored in component state — no additional API call is needed. **Fight Again** resets the state machine to `IDLE` and re-navigates to `/arena` with the opponent pre-selected. **Back to Pet View** navigates to `/` (the Pet Display page) which will re-fetch `GET /api/v1/pet` and show updated stats reflecting the XP gain.

---

## State Machine

The arena battle flow is governed by a four-state machine managed with `useReducer` inside the `ArenaBattle` page component:

```
          ┌─────────────────────────────────────────────────────┐
          │                                                     │
  ┌───────▼──────┐   user selects   ┌────────────────────┐      │
  │    IDLE      │─────opponent────▶│   CHALLENGING      │      │
  │ (opponent    │                  │ (POST /arena/battle│      │
  │  list shown) │                  │  in-flight)        │      │
  └──────────────┘                  └─────────┬──────────┘      │
          ▲                                   │ response 200     │
          │                                   ▼                  │
          │                         ┌──────────────────┐        │
          │                         │    BATTLING      │        │
          │                         │ (Phaser animates │        │
          │                         │  battle log)     │        │
          │                         └────────┬─────────┘        │
          │                                  │ animation done   │
          │                                  ▼                  │
          │                         ┌──────────────────┐        │
          └──────"Fight Again"───── │     RESULT       │────────┘
                                    │  (winner, XP,    │  "Back to
                                    │   rank shown)    │   Pet View"
                                    └──────────────────┘
```

| State | Rendered Screen | Allowed Transitions |
|---|---|---|
| `IDLE` | Challenge Selection | → `CHALLENGING` on opponent select |
| `CHALLENGING` | Loading spinner overlay on selection list | → `BATTLING` on API success; → `IDLE` on API error |
| `BATTLING` | Battle Animation canvas | → `RESULT` when last `battleLog` event is consumed |
| `RESULT` | Post-Battle Result screen | → `IDLE` on Fight Again; unmount on Back to Pet View |

Errors during `CHALLENGING` (network failure, 503) show a dismissible toast and return to `IDLE`. There is no automatic retry to avoid double-billing XP on the server.

---

## Responsive Behavior and FF_ARENA_SUMO Behavior

On mobile (< 768 px) the battle canvas shrinks to 320 × 213 px via CSS scale. The opponent list collapses the win-rate stat to a tooltip on tap to save horizontal space. On tablet and desktop the canvas expands to full 480 × 320 px within a centered 600 px card.

When `FF_ARENA_SUMO=true` (current configuration) the mode toggle renders as a visible radio group labeled "Race" and "Sumo" on the challenge selection screen. The selected mode flows through to the `POST /api/v1/arena/battle` body as `"mode": "race"` or `"mode": "sumo"`, and the Phaser scene loads the appropriate tileset and animation keys (`race_run` vs `sumo_push`). If `FF_ARENA_SUMO` were ever set to `false`, the toggle component would not mount, the mode field would be hardcoded to `"race"` in the API call, and the sumo tileset assets would not be loaded — no code path changes are required beyond the flag check in the toggle component.
