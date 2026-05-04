# Admin Moderation Prototype Specification

## Overview

The Admin Moderation screens live in the Vue 3 + Element Plus admin portal running on port 5174. They are accessible only after a successful TOTP login, which sets a Redis-backed session cookie. The portal exposes three primary moderation surfaces: a Pet Management table for banning problematic pets, a Suspicious Battles panel for reviewing potentially cheated matches, and a GDPR Erasure workflow for processing right-to-erasure requests. Role-based visibility gates certain destructive actions to `superadmin` users only, while `moderator` users see read-only or limited-action views of the same data.

---

## Screen 1 — Pet Management Table

The Pet Management table is the default landing screen after login. It shows all registered pets across the platform with support for pagination, free-text search, type filtering, and ban/unban actions.

```
┌────────────────────────────────────────────────────────────────────┐
│  pixel-pet-arena Admin                          [admin@arena ▾]    │
├──────────────┬─────────────────────────────────────────────────────┤
│  Pets        │  Pet Management                                      │
│  Battles     │                                                      │
│  GDPR        │  Search: [________________]  Type: [All ▾]  [Filter]│
│  Settings    │                                                      │
│              │  ┌──────┬──────────┬──────┬───────┬────────────────┐│
│              │  │ ID   │ Name     │ Lvl  │ Owner │ Status  Action ││
│              │  ├──────┼──────────┼──────┼───────┼────────────────┤│
│              │  │abc12 │ Blazekin │  12  │ user1 │ Active  [Ban]  ││
│              │  │volt4 │ Voltclaw │  11  │ user2 │ Active  [Ban]  ││
│              │  │emb99 │ Emberfang│  13  │ user3 │ BANNED  [Unban]││
│              │  └──────┴──────────┴──────┴───────┴────────────────┘│
│              │                                                      │
│              │  Showing 3 of 1,204 pets  [< 1  2  3 ... 101 >]     │
└──────────────┴─────────────────────────────────────────────────────┘
```

The table is built with the `el-table` component from Element Plus, using server-side pagination (`el-pagination` component configured with `layout="prev, pager, next, total"`). The search field debounces 300 ms before dispatching `GET /api/v1/admin/pets`. The **Type** dropdown maps to the `type` query param (`Fire`, `Water`, `Electric`, etc.). Each row's Status badge uses `el-tag` with `type="success"` for Active and `type="danger"` for Banned.

### API Call — GET /api/v1/admin/pets

```
GET /api/v1/admin/pets?page=1&limit=20&search=blaze&type=Fire
Cookie: session=<redis-session-token>

Response 200:
{
  "pets": [
    {
      "id": "pet_abc123",
      "name": "Blazekin",
      "level": 12,
      "type": "Fire",
      "ownerId": "user_001",
      "ownerUsername": "dragonfly",
      "status": "active",
      "bannedAt": null,
      "bannedReason": null
    }
  ],
  "total": 1204,
  "page": 1,
  "limit": 20
}
```

### Ban / Unban Action

Clicking **Ban** opens an `el-dialog` confirmation modal that requires the moderator to enter a ban reason (minimum 10 characters, validated client-side before submission). On confirm, `PUT /api/v1/admin/pets/:id/ban` is called with `{ "reason": "..." }`. On success the row status badge updates optimistically. `superadmin` users also see a **Permanent Ban** checkbox in the dialog that sets `{ "permanent": true }` in the request body; moderators see only the standard time-limited ban form.

**Unban** triggers a simpler `el-popconfirm` inline confirmation with the text "Restore this pet to active status?" before calling `DELETE /api/v1/admin/pets/:id/ban`, which lifts the ban and returns the pet to active status. Using a dedicated endpoint keeps the ban and unban operations semantically distinct and easier to audit in server logs.

---

## Screen 2 — Suspicious Battles Panel

The Suspicious Battles panel surfaces battle records that the server's anomaly detection has flagged as potentially manipulated. Each flagged battle has a computed suspicion score (0–100). Moderators can review and clear flags; superadmins can additionally void a battle and roll back the associated XP changes.

```
┌────────────────────────────────────────────────────────────────────┐
│  Suspicious Battles                         Refresh  [Auto ▾]      │
│                                                                     │
│  Filter: Score ≥ [70__]  Status: [Pending ▾]   [Apply]            │
│                                                                     │
│  ┌──────────┬──────────────┬──────┬──────────┬────────────────────┐│
│  │ Battle ID│ Participants │ Mode │ Score    │ Actions            ││
│  ├──────────┼──────────────┼──────┼──────────┼────────────────────┤│
│  │ btl_001  │ Blazekin vs  │ Sumo │ 94 ████▓ │ [Review] [Void]   ││
│  │          │ Emberfang    │      │          │  (superadmin only) ││
│  ├──────────┼──────────────┼──────┼──────────┼────────────────────┤│
│  │ btl_002  │ Voltclaw vs  │ Race │ 72 ███░░ │ [Review]           ││
│  │          │ Tidecrest    │      │          │                    ││
│  └──────────┴──────────────┴──────┴──────────┴────────────────────┘│
│                                                                     │
│  12 flagged battles pending review                                  │
└────────────────────────────────────────────────────────────────────┘
```

The suspicion score renders as a colored `el-progress` bar: green (0–49), amber (50–79), red (80–100). Clicking **Review** opens a side drawer (`el-drawer` direction="rtl") showing the full `battleLog` array in a timeline format built with `el-timeline`. The reviewer can mark the battle as "Cleared — False Positive" or "Confirmed Suspicious" using radio buttons in the drawer footer, which calls `PUT /api/v1/admin/battles/:id/review` with `{ "verdict": "cleared" | "confirmed" }`. The **Void** action is only rendered in the DOM for `superadmin` role sessions; `moderator` sessions never receive the button, avoiding reliance on CSS-only hiding for security-sensitive actions.

### API Calls

```
GET /api/v1/admin/battles/suspicious?minScore=70&status=pending&page=1&limit=20
Cookie: session=<redis-session-token>

Response 200:
{
  "battles": [
    {
      "id": "battle_btl001",
      "mode": "sumo",
      "participants": [
        { "petId": "pet_abc123", "name": "Blazekin" },
        { "petId": "pet_emb99",  "name": "Emberfang" }
      ],
      "suspicionScore": 94,
      "flagReasons": ["abnormal_damage_variance", "frame_timing_anomaly"],
      "status": "pending",
      "foughtAt": "2026-05-04T06:30:00Z"
    }
  ],
  "total": 12
}
```

Auto-refresh uses a 30-second polling interval driven by `setInterval` in the Vue `onMounted` hook, cleared in `onUnmounted`. The interval can be disabled via the **Auto** dropdown which switches between Off / 30 s / 60 s. A WebSocket upgrade path is noted for future implementation — connecting to `ws://localhost:3000/admin/battles/stream` would push new flagged battles in real time without polling.

---

## Screen 3 — GDPR Erasure Workflow

The GDPR Erasure screen provides a structured, auditable multi-step form for processing Article 17 right-to-erasure requests. Only `superadmin` users can access this section. `moderator` sessions never reach this screen: the left nav item is absent entirely (rendered with `v-if="isSuperadmin"`), and the Vue Router `beforeEach` guard redirects any direct `/gdpr` navigation back to the dashboard before the component mounts.

```
┌────────────────────────────────────────────────────────────────────┐
│  GDPR Erasure                                                       │
│                                                                     │
│  Step 1 of 3: Find User                                            │
│  ●──────────────○──────────────○                                   │
│                                                                     │
│  Search by:  ○ Username  ● Email                                   │
│  Email: [user@example.com_________________]   [Search]             │
│                                                                     │
│  Results:                                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  user_001  ·  dragonfly  ·  dragonfly@example.com          │    │
│  │  Registered: 2025-01-15  ·  Pets: 2  ·  Battles: 87  [✓]  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [Next →]                                                           │
└────────────────────────────────────────────────────────────────────┘
```

The workflow is a three-step `el-steps` component:

**Step 1 — Find User:** Free-text search against username or email. Returns a single matched user record with summary stats. The admin selects the target user and advances.

**Step 2 — Confirm Scope:** A checklist (`el-checkbox-group`) shows what will be erased: account credentials, pet records, battle history, leaderboard entries. All checkboxes are pre-ticked and non-interactive (erasure is always full scope to comply with GDPR completeness requirements). A mandatory text input requires the admin to type the user's email address verbatim as a deliberate confirmation step — the **Confirm Erasure** button remains disabled until the typed email exactly matches the selected user record.

**Step 3 — Erasure Receipt:** After `DELETE /api/v1/admin/users/:id/gdpr-erase` returns 200, the screen shows a non-dismissible confirmation panel displaying the erasure reference ID, timestamp, and the admin's session username for audit log purposes. The admin can print or copy this receipt. No navigation away from this screen is possible until the receipt is acknowledged.

### API Call — DELETE /api/v1/admin/users/:id/gdpr-erase

```
DELETE /api/v1/admin/users/user_001/gdpr-erase
Cookie: session=<redis-session-token>
Content-Type: application/json

{
  "confirmationEmail": "dragonfly@example.com",
  "requestReference": "GDPR-2026-0504-001"
}

Response 200:
{
  "erasureId": "erasure_abc789",
  "erasedAt": "2026-05-04T10:45:00Z",
  "adminUsername": "admin@arena",
  "userId": "user_001",
  "recordsDeleted": {
    "account": true,
    "pets": 2,
    "battles": 87,
    "leaderboardEntries": 1
  }
}
```

If the user has outstanding marketplace listings (when `FF_MARKETPLACE` becomes `true`) the API will return `409 Conflict` with a `pendingListings` field. The erasure workflow will surface a blocking warning at Step 2 instructing the admin to first cancel all listings through the Marketplace admin screen before retrying erasure.

---

## Component Reuse Patterns

The admin portal uses Element Plus consistently across all three screens to ensure visual coherence and reduce custom CSS surface area.

| Pattern | Element Plus Component | Usage |
|---|---|---|
| Data tables | `el-table` + `el-table-column` | Pet list, suspicious battles list |
| Pagination | `el-pagination` | All paginated tables |
| Search input | `el-input` with `prefix-icon` | Pet search, GDPR user search |
| Dropdown filter | `el-select` + `el-option` | Type filter, status filter |
| Confirm dialogs | `el-dialog` (rich) or `el-popconfirm` (inline) | Ban reason, void battle |
| Side detail view | `el-drawer` | Battle log review |
| Multi-step form | `el-steps` + `el-step` | GDPR erasure flow |
| Notifications | `ElMessage.success/error` | Post-action feedback toasts |
| Role badges | `el-tag` | Status indicators, role chips |
| Progress | `el-progress` | Suspicion score visualization |

All tables share a composable `useAdminTable` that wraps pagination state (`currentPage`, `pageSize`, `total`), loading state, and the generic fetch function. This composable is injected into each screen's `setup()` function, keeping page components lean and the pagination logic DRY. The `el-table` `row-class-name` prop is used on the Pet Management table to apply a `.row--banned` CSS class for banned pets (desaturated row background), and `.row--high-suspicion` on the battles table for scores above 80.

---

## Authorization Gating

Role enforcement is layered at two levels. The Vue Router `beforeEach` guard reads the `role` field from the Pinia `adminSession` store (populated from the `POST /api/v1/admin/auth/login` response after successful TOTP verification — the httpOnly session cookie is inaccessible to JavaScript by design) and redirects `moderator` users away from the `/gdpr` route entirely. Within permitted screens, individual action buttons check a `useAdminSession` composable that exposes `isSuperadmin: boolean`. Destructive controls (Permanent Ban checkbox, Void Battle button, GDPR nav item) are conditionally rendered with `v-if="isSuperadmin"` rather than `v-show` to ensure the elements are not present in the DOM for moderator sessions, preventing any client-side bypass. The Fastify API enforces the same role check independently on every request using the Redis session data, so frontend-only role checks are treated as UX improvements rather than security boundaries.
