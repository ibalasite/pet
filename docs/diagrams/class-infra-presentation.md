---
diagram: class-infra-presentation
uml-type: Class Diagram（Infrastructure + Presentation Layer）
source: docs/EDD.md §3.8 + §5 + docs/ARCH.md §3 + docs/EDD.md §3.1-§3.7
generated: 2026-05-08T00:00:00Z
---

# Class Diagram — Infrastructure + Presentation Layer（pixel-pet-arena）

> 來源：EDD §3 技術棧 + §5 API 設計 + ARCH.md §3 元件架構

本圖收錄基礎設施層（Repository 實作、外部服務 Adapter）與表現層（Fastify Controller、Request/Response DTO）。
所有 Adapter 與 RepositoryImpl 透過 `<|..` Realization 箭頭實作 Domain/Application 層的抽象介面。

```mermaid
classDiagram
    direction TB

    %% ============================================================
    %% Repository Implementations（實作 Domain 層 IXxxRepository）
    %% ============================================================
    class PetRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        -redis : Redis
        +findById(petId: UUID) Optional~Pet~
        +findByOwnerHash(tokenHash: String) List~Pet~
        +save(pet: Pet) Pet
        +delete(petId: UUID) void
        +findReservedExpired(now: DateTime) List~Pet~
    }

    class ClaimCodeRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +findById(claimId: UUID) Optional~ClaimCode~
        +save(code: ClaimCode) ClaimCode
        +deleteExpired(now: DateTime) Integer
    }

    class ArenaMatchRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +findById(matchId: UUID) Optional~ArenaMatch~
        +save(match: ArenaMatch) ArenaMatch
        +findHistoryByPetId(petId: UUID, limit: Integer) List~ArenaMatch~
    }

    class LeaderboardRepositoryImpl {
        <<RepositoryImpl>>
        -redis : Redis
        -pgPool : Pool
        +addOrUpdate(entry: LeaderboardEntry) void
        +getTop(limit: Integer) List~LeaderboardEntry~
        +getRank(petId: UUID) Integer
        +remove(petId: UUID) void
        +rebuildSnapshot() Integer
    }

    class TrainingLogRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +save(log: TrainingLog) TrainingLog
        +countByPetId(petId: UUID) Integer
    }

    class FoodBuffRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +findActiveByPetId(petId: UUID) List~FoodBuff~
        +save(buff: FoodBuff) FoodBuff
        +consumeAndDelete(buffId: UUID) void
    }

    class ClaimIdentityRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        -encryptionKey : SecretBytes
        +findByEmailHash(emailHash: String) Optional~ClaimIdentity~
        +save(identity: ClaimIdentity) ClaimIdentity
        +findById(identityId: UUID) Optional~ClaimIdentity~
    }

    class GdprRequestRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +save(req: GdprRequest) GdprRequest
        +findById(requestId: UUID) Optional~GdprRequest~
        +findByStatus(status: GdprRequestStatus) List~GdprRequest~
    }

    class AdminRepositoryImpl {
        <<RepositoryImpl>>
        -pgPool : Pool
        +findByUsername(username: String) Optional~AdminAccount~
        +save(admin: AdminAccount) AdminAccount
    }

    %% ============================================================
    %% Adapters（實作 Application 層 IXxxPort）
    %% ============================================================
    class SendGridEmailAdapter {
        <<Adapter>>
        -client : SendGridClient
        -fromAddress : String
        -templateIds : Map~String_String~
        +sendOtpEmail(toEmail: String, otpCode: String, expiresInMin: Integer) void
        +sendErasureConfirmation(toEmail: String) void
    }

    class RedisRateLimiterAdapter {
        <<Adapter>>
        -redis : Redis
        +increment(key: String, windowSeconds: Integer) Integer
        +get(key: String) Integer
        +reset(key: String) void
    }

    class RedisMatchmakingAdapter {
        <<Adapter>>
        -redis : Redis
        +enqueue(petId: UUID, mode: ArenaMode) void
        +findOpponent(petId: UUID, mode: ArenaMode, timeoutMs: Integer) Optional~UUID~
        +dequeue(petId: UUID, mode: ArenaMode) void
    }

    class OtpauthTotpAdapter {
        <<Adapter>>
        -hashAlgorithm : String
        -digits : Integer
        -periodSeconds : Integer
        +verify(secret: String, code: String) Boolean
        +generateSecret(username: String) String
    }

    class RedisSessionStoreAdapter {
        <<Adapter>>
        -redis : Redis
        -keyPrefix : String
        +create(adminId: UUID, ttlSeconds: Integer) String
        +get(sessionToken: String) Optional~AdminSession~
        +revoke(sessionToken: String) void
    }

    class PostgresAuditAdapter {
        <<Adapter>>
        -pgPool : Pool
        +record(adminId: UUID, action: String, targetType: String, targetId: String, detail: Map) void
    }

    class RedisConfigStoreAdapter {
        <<Adapter>>
        -redis : Redis
        -pgPool : Pool
        +get(key: String) Optional~String~
        +put(key: String, value: String, adminId: UUID) void
        +listAll() Map~String_String~
    }

    class CryptoTokenIssuer {
        <<Adapter>>
        +issuePetAccessToken() String
        +hashToken(plainToken: String) String
    }

    class FastifyEventBusAdapter {
        <<Adapter>>
        -listeners : Map~String_List~
        +publish(event: DomainEvent) void
        +subscribe(eventName: String, handler: Function) void
    }

    %% ============================================================
    %% Controllers (Presentation Layer — Fastify Routes)
    %% ============================================================
    class ClaimController {
        <<Controller>>
        -startClaimUC : StartClaimUseCase
        -verifyClaimUC : VerifyClaimUseCase
        -recoverClaimUC : RecoverClaimUseCase
        +postClaim(req: ClaimStartRequestDTO) Promise~ClaimStartResponseDTO~
        +postClaimVerify(req: ClaimVerifyRequestDTO) Promise~ClaimVerifyResponseDTO~
        +postClaimRecover(req: ClaimRecoverRequestDTO) Promise~ClaimRecoverResponseDTO~
    }

    class PetController {
        <<Controller>>
        -trainPetUC : TrainPetUseCase
        -feedPetUC : FeedPetUseCase
        -petQueryService : PetQueryService
        +getPetRandom() Promise~PetResponseDTO~
        +getPetById(petId: UUID) Promise~PetResponseDTO~
        +postTrain(petId: UUID, req: TrainRequestDTO) Promise~TrainResponseDTO~
        +postFeed(petId: UUID, req: FeedRequestDTO) Promise~FeedResponseDTO~
    }

    class ArenaController {
        <<Controller>>
        -enterArenaUC : EnterArenaUseCase
        -getMatchUC : GetArenaMatchUseCase
        +postArenaEnter(req: ArenaEnterRequestDTO) Promise~ArenaEnterResponseDTO~
        +getArenaMatch(matchId: UUID) Promise~ArenaMatchResponseDTO~
        +getArenaHistory(petId: UUID) Promise~List~ArenaMatchResponseDTO~~
    }

    class LeaderboardController {
        <<Controller>>
        -getLeaderboardUC : GetLeaderboardUseCase
        +getLeaderboard(query: LeaderboardQueryDTO) Promise~LeaderboardResponseDTO~
        +getRank(petId: UUID) Promise~RankResponseDTO~
    }

    class GdprController {
        <<Controller>>
        -requestErasureUC : RequestGdprErasureUseCase
        +postGdprErasure(req: GdprErasureRequestDTO) Promise~GdprErasureResponseDTO~
        +getGdprStatus(requestId: UUID) Promise~GdprStatusResponseDTO~
    }

    class AdminAuthController {
        <<Controller>>
        -adminLoginUC : AdminLoginUseCase
        +postLogin(req: AdminLoginRequestDTO) Promise~AdminLoginResponseDTO~
        +postTotpSetup(req: TotpSetupRequestDTO) Promise~TotpSetupResponseDTO~
        +postLogout() Promise~void~
    }

    class AdminPetController {
        <<Controller>>
        -banPetUC : BanPetUseCase
        -unbanPetUC : UnbanPetUseCase
        +getPets(query: AdminPetQueryDTO) Promise~AdminPetListResponseDTO~
        +postBan(petId: UUID, req: BanPetRequestDTO) Promise~PetResponseDTO~
        +postUnban(petId: UUID) Promise~PetResponseDTO~
    }

    class AdminConfigController {
        <<Controller>>
        -updateConfigUC : UpdateRuntimeConfigUseCase
        +getRuntimeConfig() Promise~RuntimeConfigResponseDTO~
        +putRuntimeConfig(req: RuntimeConfigUpdateRequestDTO) Promise~RuntimeConfigResponseDTO~
    }

    %% ============================================================
    %% Request DTOs（Validation Schema 標注）
    %% ============================================================
    class ClaimStartRequestDTO {
        <<RequestDTO>>
        +email : String
        +petId : UUID
        +note : Validation: email RFC 5322, petId v4 UUID
    }

    class ClaimVerifyRequestDTO {
        <<RequestDTO>>
        +claimId : UUID
        +otpCode : String
        +petId : UUID
        +note : Validation: otpCode regex /^[0-9]{6}$/
    }

    class TrainRequestDTO {
        <<RequestDTO>>
        +trainingType : TrainingType
        +note : Validation: enum(SPEED|STRENGTH|STAMINA), Header X-Pet-Token required
    }

    class FeedRequestDTO {
        <<RequestDTO>>
        +foodType : String
        +note : Validation: foodType in CONSTANTS.food_catalog
    }

    class ArenaEnterRequestDTO {
        <<RequestDTO>>
        +petId : UUID
        +mode : ArenaMode
        +acceptAi : Boolean
        +note : Validation: mode enum(RACE|SUMO)
    }

    class BanPetRequestDTO {
        <<RequestDTO>>
        +reason : String
        +note : Validation: reason length 1..500
    }

    class AdminLoginRequestDTO {
        <<RequestDTO>>
        +username : String
        +password : String
        +totpCode : String
        +note : Validation: TOTP regex /^[0-9]{6}$/
    }

    class RuntimeConfigUpdateRequestDTO {
        <<RequestDTO>>
        +keyValuePairs : Map~String_String~
        +note : Validation: keys whitelist + range checks
    }

    %% ============================================================
    %% Response DTOs
    %% ============================================================
    class ClaimStartResponseDTO {
        <<ResponseDTO>>
        +claimId : UUID
        +expiresAt : DateTime
    }

    class ClaimVerifyResponseDTO {
        <<ResponseDTO>>
        +accessToken : String
        +pet : PetView
    }

    class PetResponseDTO {
        <<ResponseDTO>>
        +id : UUID
        +rarity : Rarity
        +stats : PetStats
        +level : Integer
        +isBanned : Boolean
    }

    class TrainResponseDTO {
        <<ResponseDTO>>
        +pet : PetResponseDTO
        +trainingLog : TrainingLogView
    }

    class ArenaMatchResponseDTO {
        <<ResponseDTO>>
        +matchId : UUID
        +mode : ArenaMode
        +winnerPetId : UUID
        +durationSeconds : Integer
        +battleLog : BattleLog
    }

    class LeaderboardResponseDTO {
        <<ResponseDTO>>
        +entries : List~LeaderboardEntryView~
        +snapshotTime : DateTime
        +total : Integer
    }

    class AdminLoginResponseDTO {
        <<ResponseDTO>>
        +sessionToken : String
        +adminProfile : AdminProfileView
        +permissions : List~String~
    }

    class ApiErrorResponseDTO {
        <<ResponseDTO>>
        +error : ErrorEnvelope
        +traceId : String
    }

    %% ============================================================
    %% Relationships
    %% ============================================================

    %% Inheritance（<|--）— Controllers 繼承 Fastify base
    ClaimController --|> FastifyControllerBase
    PetController --|> FastifyControllerBase
    ArenaController --|> FastifyControllerBase
    LeaderboardController --|> FastifyControllerBase
    AdminAuthController --|> FastifyControllerBase

    class FastifyControllerBase {
        <<abstract>>
        #request : FastifyRequest
        #reply : FastifyReply
        #handleError(err: Error) ApiErrorResponseDTO
    }

    %% Realization（<|..）— RepositoryImpl 實作 Domain 層 Repository interface
    IPetRepository <|.. PetRepositoryImpl
    IClaimCodeRepository <|.. ClaimCodeRepositoryImpl
    IArenaMatchRepository <|.. ArenaMatchRepositoryImpl
    ILeaderboardRepository <|.. LeaderboardRepositoryImpl

    %% Realization（<|..）— Adapter 實作 Application 層 Port interface
    IEmailPort <|.. SendGridEmailAdapter
    IRateLimiterPort <|.. RedisRateLimiterAdapter
    IMatchmakingPort <|.. RedisMatchmakingAdapter
    ITotpPort <|.. OtpauthTotpAdapter
    ISessionStorePort <|.. RedisSessionStoreAdapter
    IAuditPort <|.. PostgresAuditAdapter
    IConfigStorePort <|.. RedisConfigStoreAdapter
    ITokenIssuer <|.. CryptoTokenIssuer
    IEventBusPort <|.. FastifyEventBusAdapter

    %% External Domain interface placeholders
    class IPetRepository {
        <<interface>>
    }
    class IClaimCodeRepository {
        <<interface>>
    }
    class IArenaMatchRepository {
        <<interface>>
    }
    class ILeaderboardRepository {
        <<interface>>
    }
    class IEmailPort {
        <<interface>>
    }
    class IRateLimiterPort {
        <<interface>>
    }
    class IMatchmakingPort {
        <<interface>>
    }
    class ITotpPort {
        <<interface>>
    }
    class ISessionStorePort {
        <<interface>>
    }
    class IAuditPort {
        <<interface>>
    }
    class IConfigStorePort {
        <<interface>>
    }
    class ITokenIssuer {
        <<interface>>
    }
    class IEventBusPort {
        <<interface>>
    }

    %% Composition（*--）— Controller 強組合 Request/Response 結構（每次請求一份新的）
    ClaimController "1" *-- "*" ClaimStartRequestDTO : creates per request
    PetController "1" *-- "*" TrainRequestDTO : creates per request
    AdminAuthController "1" *-- "*" AdminLoginRequestDTO : creates per request

    %% Aggregation（o--）— Controller 聚合 UseCase 引用（注入但不擁有）
    ClaimController "1" o-- "1" StartClaimUseCase : injects
    ClaimController "1" o-- "1" VerifyClaimUseCase : injects
    PetController "1" o-- "1" TrainPetUseCase : injects
    PetController "1" o-- "1" FeedPetUseCase : injects
    ArenaController "1" o-- "1" EnterArenaUseCase : injects
    AdminPetController "1" o-- "1" BanPetUseCase : injects

    %% Association（-->）— RepositoryImpl 與 PG/Redis Driver
    PetRepositoryImpl "1" --> "1" PgPool : queries
    LeaderboardRepositoryImpl "1" --> "1" Redis : sortedSet
    SendGridEmailAdapter "1" --> "1" SendGridClient : invokes
    RedisMatchmakingAdapter "1" --> "1" Redis : ZADD/BLPOP

    class PgPool {
        +query(sql: String, params: List) QueryResult
        +transaction(fn: Function) Any
    }
    class Redis {
        +zadd(key: String, score: Double, member: String) void
        +zrevrange(key: String, start: Integer, end: Integer) List~String~
        +incr(key: String) Integer
        +expire(key: String, seconds: Integer) Boolean
    }
    class SendGridClient {
        +send(payload: SendGridPayload) ApiResponse
    }

    %% Dependency（..>）— Controller 依賴 Validation Schema
    ClaimController ..> AjvValidator : validates with
    PetController ..> AjvValidator : validates with
    ArenaController ..> AjvValidator : validates with
    AdminAuthController ..> AjvValidator : validates with

    class AjvValidator {
        <<utility>>
        +validate(schema: JsonSchema, payload: Any) ValidationResult
    }
```

## 技術說明

本層位於六邊形架構的「外圍適配層」，負責把 Domain/Application 層的抽象介面接到實際的技術選型。

**Repository 實作層**：8 個 `<<RepositoryImpl>>` 各自封裝對 PostgreSQL 16（`PgPool` driver）與
Redis 7（`Redis` driver）的存取細節，所有 `<|..` Realization 箭頭從具體實作指向 Domain 層的
`I*Repository` 介面，方向嚴格遵守 DIP（Infrastructure → Domain，不得反向）。
`LeaderboardRepositoryImpl` 同時持有 PG 與 Redis（雙倉儲：Redis 作為授權快取、PG 作為 cold storage
backup），這是 ARCH §1.1 P2 「Dual-Store Authority」原則的實作。

**Adapter 層**：9 個 `<<Adapter>>` 對應 9 個 Application 層 Port 介面，每個 Adapter 封裝特定外部服務
SDK（SendGrid、Redis、otpauth、AES-256-GCM Crypto）。`SendGridEmailAdapter` 透過 SendGrid REST API
寄送 OTP 與 GDPR 確認信，`RedisMatchmakingAdapter` 使用 Redis sorted set + BLPOP 實作 30 秒
matchmaking timeout（`arena_matchmaking_timeout_seconds = 30`）。

**Controller 層**：8 個 `<<Controller>>` 直接對應 API.md §5 / §6 的端點群（Claim / Pet / Arena /
Leaderboard / GDPR / Admin Auth / Admin Pet / Admin Config），每個 Controller method 對應一個 HTTP
endpoint，注入對應的 UseCase 並透過 `AjvValidator` 對 RequestDTO 做 schema 驗證後執行。

關係涵蓋 6 種：
1. **Inheritance（`<|--`）**: Controller 繼承 `FastifyControllerBase` 抽象基類
2. **Realization（`<|..`）**: 8 個 RepositoryImpl + 9 個 Adapter 實作對應介面（總計 17 條 Realization 箭頭）
3. **Composition（`*--`）**: Controller `*-- RequestDTO`（每次請求建立新的 DTO 物件）
4. **Aggregation（`o--`）**: Controller 聚合注入 UseCase（共享單例）
5. **Association（`-->`）**: RepositoryImpl `--> PgPool / Redis`、Adapter `--> SendGridClient`
6. **Dependency（`..>`）**: Controller `..> AjvValidator`（驗證工具依賴）

## 白話說明

這層是「實際的零件」：把抽象的「儲存」具體變成 PostgreSQL 查詢、把「寄信」變成 SendGrid 呼叫、
把「網路請求」變成 Fastify 路由。換言之，這層讓系統真的能跑起來，但業務邏輯仍然鎖在前兩層。
