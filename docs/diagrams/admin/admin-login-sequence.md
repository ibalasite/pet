---
diagram: admin-login-sequence
uml-type: Sequence Diagram（Admin 登入流程）
source: docs/ADMIN_IMPL.md §5 Token 管理 + docs/API.md §6.1 Admin Auth
generated: 2026-05-08T00:00:00Z
---

# Admin Login Sequence Diagram — pixel-pet-arena

> 來源：docs/ADMIN_IMPL.md §5 Token & Session Management + docs/API.md §6.1 Admin Authentication

描述管理員從輸入 credentials + TOTP code 到取得 session token 並動態載入 sidebar 的完整流程。
覆蓋 Happy Path 加 4 個 Error Path（密碼錯誤 / TOTP 失敗 / 帳號鎖定 / 首次登入需 TOTP setup）。

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Browser as Admin Browser (Chrome)
    participant SPA as Admin SPA (Vue 3 + Element Plus)
    participant Gateway as API Gateway (nginx Ingress)
    participant Backend as Admin API Backend (Fastify)
    participant Redis as Redis Session Store
    participant DB as PostgreSQL (admin_accounts + admin_audit_log)

    Note over Admin,DB: Step 1 — Initial Page Load

    Admin->>Browser: visit https://admin.pet.local/login
    Browser->>SPA: GET / (Vue SPA bundle)
    SPA-->>Browser: render LoginForm.vue (username + password + TOTP fields)

    Note over Admin,DB: Step 2 — Submit Credentials + TOTP

    Admin->>SPA: enter username, password, TOTP 6-digit code
    SPA->>Gateway: POST /admin/api/auth/login {username, password, totpCode, ipAddress}
    Gateway->>Backend: forward POST /admin/api/auth/login (with X-Forwarded-For)

    Note over Backend,DB: Step 3 — Lookup admin_account

    Backend->>DB: SELECT FROM admin_accounts WHERE username = $1 AND deactivated_at IS NULL
    DB-->>Backend: AdminAccount {id, password_hash, totp_secret_encrypted, role, failed_attempts, locked_until}

    Note over Backend,DB: Step 4 — Lock check + password verify

    alt account is locked (locked_until > now)
        Backend->>DB: UPDATE admin_audit_log INSERT (action='login.locked')
        Backend-->>Gateway: 429 Too Many Requests {error: "ACCOUNT_LOCKED", lockedUntil: ISO8601}
        Gateway-->>SPA: 429 Too Many Requests
        SPA-->>Admin: show "Account locked. Try after {lockedUntil}."
    else account active
        Backend->>Backend: argon2.verify(password_hash, plainPassword)
        alt password mismatch
            Backend->>DB: UPDATE admin_accounts SET failed_attempts = failed_attempts + 1
            Backend->>DB: INSERT admin_audit_log (action='login.password_failed', detail={attempt: N})
            alt failed_attempts >= 5 (admin_login_max_attempts = 5)
                Backend->>DB: UPDATE admin_accounts SET locked_until = now + INTERVAL exponential
                Backend-->>Gateway: 429 Too Many Requests {error: "ACCOUNT_LOCKED"}
            else still under threshold
                Backend-->>Gateway: 401 Unauthorized {error: "INVALID_CREDENTIALS", remaining: 5-N}
            end
            Gateway-->>SPA: 401 / 429
            SPA-->>Admin: show "Invalid username or password" / "Account locked"
        else password OK
            Note over Backend,DB: Step 5 — Check TOTP setup status
            alt totp_secret_encrypted IS NULL (first login)
                Backend->>Backend: issue short-lived setupToken (15 min JWT)
                Backend-->>Gateway: 403 Forbidden {error: "TOTP_SETUP_REQUIRED", details: {setupToken}}
                Gateway-->>SPA: 403 + setupToken
                SPA-->>Admin: redirect to /admin/totp-setup with setupToken
            else TOTP configured
                Note over Backend,DB: Step 6 — Verify TOTP code
                Backend->>Backend: aes256gcm.decrypt(totp_secret_encrypted)
                Backend->>Backend: otpauth.verify(secret, totpCode, period=30s, window=±1)
                alt TOTP invalid
                    Backend->>DB: UPDATE admin_accounts SET failed_attempts = failed_attempts + 1
                    Backend->>DB: INSERT admin_audit_log (action='login.totp_failed')
                    Backend-->>Gateway: 403 Forbidden {error: "INVALID_TOTP"}
                    Gateway-->>SPA: 403
                    SPA-->>Admin: show "Invalid TOTP code. Try again."
                else TOTP valid
                    Note over Backend,DB: Step 7 — Load roles + permissions
                    Backend->>DB: SELECT roles + permissions via admin_user_roles JOIN role_permissions JOIN permissions WHERE admin_id = $1 AND revoked_at IS NULL
                    DB-->>Backend: roles=[moderator], permissions=[pets.ban, pets.unban, battles.flag, ...]

                    Note over Backend,DB: Step 8 — Issue session
                    Backend->>Backend: generate sessionToken (64-byte random base64)
                    Backend->>Redis: SETEX session:{tokenId} 3600 {adminId, roles, permissions}
                    Redis-->>Backend: OK
                    Backend->>DB: INSERT admin_sessions (token_id, admin_id, ip_hash, ua_hash, expires_at = now+1h)
                    Backend->>DB: UPDATE admin_accounts SET failed_attempts = 0, last_login_at = now
                    Backend->>DB: INSERT admin_audit_log (action='login.success', detail={ip_hash, ua_hash})
                    Backend-->>Gateway: 200 OK {sessionToken, adminProfile, permissions}

                    Note over Gateway,SPA: Step 9 — Set httpOnly cookie + return
                    Gateway-->>SPA: 200 + Set-Cookie: admin_session=...; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
                    SPA->>SPA: store permissions in Pinia adminStore
                    SPA->>SPA: dynamically render Sidebar.vue (filter routes by permissions)
                    SPA-->>Admin: redirect to /admin/dashboard
                end
            end
        end
    end
```

## Step 對照表

| Step | 主要動作 | Source |
|------|---------|--------|
| 1 | 載入登入頁 | ADMIN_IMPL.md §3.1 |
| 2 | 表單送出 | ADMIN_IMPL.md §5.1 |
| 3 | DB 查 admin_account | ADMIN_IMPL.md §5.2 |
| 4 | Lock check + 密碼驗證 | ADMIN_IMPL.md §5.3 |
| 5 | TOTP setup status check | API.md §6.1 |
| 6 | TOTP code verify | ADMIN_IMPL.md §5.4 |
| 7 | Role/Permission 載入 | ADMIN_IMPL.md §5.5 |
| 8 | Session 建立（Redis + DB） | ADMIN_IMPL.md §5.6 |
| 9 | Cookie 設定 + sidebar 渲染 | ADMIN_IMPL.md §6.2 |

## Error Paths（4 個獨立分支已涵蓋）

1. **密碼錯誤** → 401 INVALID_CREDENTIALS（含 remaining attempts）
2. **TOTP 錯誤** → 403 INVALID_TOTP
3. **帳號鎖定** → 429 ACCOUNT_LOCKED（含 lockedUntil 時間）
4. **首次登入未設定 TOTP** → 403 TOTP_SETUP_REQUIRED（含 setupToken redirect）

## Security Notes

- **httpOnly cookie**：session token 不暴露給 JavaScript，杜絕 XSS 偷取。
- **Sliding session**：每次 admin API 呼叫延長 Redis TTL 至 +1h。
- **Concurrent sessions**：同一 admin 帳號最多 3 個並行 session（最舊的會被踢除）。
- **TOTP window**：±1 step（±30 秒），允許時鐘輕微偏移。
- **TOTP backup codes**：8 個一次性備援代碼，hash 儲存於 `totp_backup_codes_hash` JSONB。
