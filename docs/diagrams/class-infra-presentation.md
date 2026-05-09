---
diagram: class-infra-presentation
uml-type: 類別圖 — Infrastructure / Presentation Layer
source: docs/EDD.md §4.5.2
generated: 2026-05-10T00:50:00Z
---

# Class Diagram — Infrastructure / Presentation Layer

Infrastructure 層提供 Postgres / Redis Repository 實作與 SendGrid / SMTP Email Adapter（含 Circuit Breaker fallback wrapper）；Presentation 層為 Fastify Controller（Claim / Arena / Admin），承接 HTTP 請求並 delegate 給 Application UseCase。

```mermaid
classDiagram
    class IPetRepository {
        <<interface>>
        +findById(id) Pet
        +save(pet)
    }
    class PostgresPetRepository {
        <<Repository>>
        -Pool pgPool
        +findById(id) Pet
        +save(pet)
    }
    class ICacheRepository {
        <<interface>>
        +get(key) string
        +set(key, val, ttl)
    }
    class RedisCacheRepository {
        <<Repository>>
        -RedisClient redis
        +get(key) string
        +set(key, val, ttl)
    }
    class IEmailDeliveryPort {
        <<interface>>
        +send(to, subject, body) DeliveryResult
    }
    class SendGridEmailAdapter {
        <<Adapter>>
        +send(to, subject, body) DeliveryResult
    }
    class SmtpEmailAdapter {
        <<Adapter>>
        +send(to, subject, body) DeliveryResult
    }
    class EmailDeliveryWithFallback {
        <<Adapter>>
        -SendGridEmailAdapter primary
        -SmtpEmailAdapter fallback
        -CircuitBreaker breaker
        +send(to, subject, body) DeliveryResult
    }
    class ClaimController {
        <<Controller>>
        -ClaimPetUseCase claimUC
        -VerifyClaimCodeUseCase verifyUC
        +postClaim(req, reply)
        +postVerify(req, reply)
    }
    class ArenaController {
        <<Controller>>
        -EnterArenaUseCase enterUC
        +postEnter(req, reply)
        +getMatch(req, reply)
    }
    class AdminController {
        <<Controller>>
        -BanPetUseCase banUC
        -RuntimeConfigService cfg
        +postBan(req, reply)
        +putConfig(req, reply)
    }

    PostgresPetRepository ..|> IPetRepository : realization
    RedisCacheRepository ..|> ICacheRepository : realization
    SendGridEmailAdapter ..|> IEmailDeliveryPort : realization
    SmtpEmailAdapter ..|> IEmailDeliveryPort : realization
    EmailDeliveryWithFallback ..|> IEmailDeliveryPort : realization
    EmailDeliveryWithFallback *-- SendGridEmailAdapter : composition
    EmailDeliveryWithFallback *-- SmtpEmailAdapter : composition
    ClaimController --> ClaimPetUseCase : association
    ArenaController --> EnterArenaUseCase : association
    AdminController --> BanPetUseCase : association
```

> EmailDeliveryWithFallback 為 Decorator pattern：對外實作 IEmailDeliveryPort，內部以 SendGrid 為 primary、SMTP 為 fallback，並由 CircuitBreaker 控制切換。
