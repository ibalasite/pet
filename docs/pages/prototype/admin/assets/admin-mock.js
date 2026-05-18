/* ============================================================
   Pixel Pet Arena — Admin Portal Mock Data v2.0
   RBAC Roles: super_admin / moderator / read_only
   Source: ADMIN_IMPL.md §1.3 + §5.1 (EDD §9.6)

   SECURITY NOTE: All DOM helper functions (renderSidebar,
   roleBadge, statusBadge, actionTag) return HTMLElement nodes
   built exclusively via createElement/textContent — never via
   string interpolation — so they are XSS-safe by construction.
   Callers must use appendChild(), not innerHTML, to insert them.
   ============================================================ */

'use strict';

/* ── Internal: XSS-safe escaper for callers that must use innerHTML ── */
function _esc(val) {
  const span = document.createElement('span');
  span.textContent = (val === null || val === undefined) ? '' : String(val);
  return span.innerHTML; // entity-encoded, safe to splice into HTML
}

/* ── Allowlists (code-level enforcement) ─────────────────── */
const _ALLOWED_ROLES   = new Set(['super_admin', 'moderator', 'read_only']);
const _ALLOWED_STATUS  = new Set(['active', 'inactive', 'locked', 'pending', 'resolved', 'flagged', 'banned', 'processing', 'completed', 'rejected', 'warning']);
const _ALLOWED_ACTIVE  = new Set(['dashboard', 'users', 'roles', 'audit', 'analytics', 'pets', 'battles', 'leaderboard', 'suspicious', 'config', 'gdpr', 'email']);
const _ACTION_CLS_MAP  = { 'auth.': 'auth', 'config.': 'config', 'gdpr.': 'gdpr' };

const ADMIN_MOCK = {

  /* ── Current Logged-in Admin ────────────────────────────── */
  currentUser: {
    id: 1,
    username: 'superadmin',
    name: 'Super Admin',
    role: 'super_admin',
    mfa_enabled: true,
    last_login: '2026-05-18 09:00'
  },

  /* ── Admin Users (8 records) ────────────────────────────── */
  users: [
    { id:1, username:'superadmin',   name:'Super Admin',  email:'super@pixel-pet.io',  role:'super_admin', status:'active',   mfa_enabled: true,  last_login:'2026-05-18 09:00' },
    { id:2, username:'mod_alice',    name:'Alice Chen',   email:'alice@pixel-pet.io',  role:'moderator',   status:'active',   mfa_enabled: true,  last_login:'2026-05-18 08:30' },
    { id:3, username:'mod_bob',      name:'Bob Wang',     email:'bob@pixel-pet.io',    role:'moderator',   status:'active',   mfa_enabled: true,  last_login:'2026-05-17 17:00' },
    { id:4, username:'reader_carol', name:'Carol Liu',    email:'carol@pixel-pet.io',  role:'read_only',   status:'active',   mfa_enabled: false, last_login:'2026-05-17 14:00' },
    { id:5, username:'mod_dave',     name:'Dave Lee',     email:'dave@pixel-pet.io',   role:'moderator',   status:'inactive', mfa_enabled: true,  last_login:'2026-05-10 11:00' },
    { id:6, username:'reader_eve',   name:'Eve Huang',    email:'eve@pixel-pet.io',    role:'read_only',   status:'active',   mfa_enabled: false, last_login:'2026-05-16 10:30' },
    { id:7, username:'mod_frank',    name:'Frank Zhao',   email:'frank@pixel-pet.io',  role:'moderator',   status:'locked',   mfa_enabled: false, last_login:'2026-05-01 09:00' },
    { id:8, username:'reader_grace', name:'Grace Wu',     email:'grace@pixel-pet.io',  role:'read_only',   status:'active',   mfa_enabled: false, last_login:'2026-05-18 07:55' }
  ],

  /* ── RBAC Roles (v2.0) ──────────────────────────────────── */
  roles: [
    {
      id: 'super_admin',
      display_name: '超級管理員',
      description: '擁有所有 /admin/api/* 端點存取權，包含 GDPR、Config、Role 管理與 Audit Log。系統內唯一完整授權角色。',
      user_count: 1,
      permissions: [
        'pet.update', 'pet.ban', 'pet.unban',
        'arena_match.flag', 'arena_match.unflag',
        'leaderboard.remove',
        'config.runtime.update', 'config.economy.update', 'config.flag.toggle',
        'gdpr.delete', 'gdpr.update',
        'admin_user.create', 'admin_user.deactivate', 'admin_user.totp_reset',
        'audit.read', 'dashboard.read', 'analytics.read', 'email.read'
      ]
    },
    {
      id: 'moderator',
      display_name: '內容審查員',
      description: '可存取 Dashboard、Pets 列表/ban/unban、排行榜、戰鬥旗標、可疑佇列、Email 監控與 Analytics。不可存取 Config、GDPR、角色管理或 Audit Log。',
      user_count: 4,
      permissions: [
        'pet.ban', 'pet.unban',
        'arena_match.flag', 'arena_match.unflag',
        'leaderboard.remove',
        'dashboard.read', 'analytics.read', 'email.read'
      ]
    },
    {
      id: 'read_only',
      display_name: '唯讀分析師',
      description: '可存取所有 GET endpoints（Dashboard、Pets、排行榜、戰鬥記錄、Email 監控、Analytics）。無任何 mutation 權限；不可存取 Audit Log、角色管理或 GDPR。',
      user_count: 3,
      permissions: [
        'dashboard.read', 'analytics.read', 'email.read'
      ]
    }
  ],

  /* ── Pets (20 records) ─────────────────────────────────── */
  pets: [
    { id:'pet-0001', name:'FlameWing',   rarity:'Legendary', level:45, owner_email:'alice@pixel-pet.io',  status:'active',  ban_reason:null,             created_at:'2026-01-10 08:00' },
    { id:'pet-0002', name:'ShadowFang',  rarity:'Epic',      level:38, owner_email:'bob@pixel-pet.io',    status:'active',  ban_reason:null,             created_at:'2026-01-15 10:30' },
    { id:'pet-0003', name:'VoidCrawler', rarity:'Epic',      level:41, owner_email:'carol@pixel-pet.io',  status:'banned',  ban_reason:'bot detected',   created_at:'2026-02-02 09:15' },
    { id:'pet-0004', name:'TerraShell',  rarity:'Rare',      level:27, owner_email:'dave@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-02-14 14:20' },
    { id:'pet-0005', name:'StormWing',   rarity:'Legendary', level:50, owner_email:'eve@pixel-pet.io',    status:'active',  ban_reason:null,             created_at:'2026-02-20 11:45' },
    { id:'pet-0006', name:'GlacierBear', rarity:'Rare',      level:22, owner_email:'frank@pixel-pet.io',  status:'active',  ban_reason:null,             created_at:'2026-03-01 09:30' },
    { id:'pet-0007', name:'NeonProwler', rarity:'Common',    level:15, owner_email:'grace@pixel-pet.io',  status:'active',  ban_reason:null,             created_at:'2026-03-10 16:00' },
    { id:'pet-0008', name:'LavaToad',    rarity:'Uncommon',  level:18, owner_email:'henry@pixel-pet.io',  status:'banned',  ban_reason:'tos violation',  created_at:'2026-03-15 13:00' },
    { id:'pet-0009', name:'CrystalDrake',rarity:'Epic',      level:35, owner_email:'iris@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-03-22 10:10' },
    { id:'pet-0010', name:'ThunderBoar', rarity:'Rare',      level:30, owner_email:'jake@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-04-01 08:45' },
    { id:'pet-0011', name:'MistRaven',   rarity:'Uncommon',  level:19, owner_email:'kate@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-04-08 12:30' },
    { id:'pet-0012', name:'IronGolem',   rarity:'Legendary', level:48, owner_email:'leo@pixel-pet.io',    status:'active',  ban_reason:null,             created_at:'2026-04-12 15:20' },
    { id:'pet-0013', name:'CoralSerpent',rarity:'Rare',      level:25, owner_email:'mia@pixel-pet.io',    status:'active',  ban_reason:null,             created_at:'2026-04-18 09:00' },
    { id:'pet-0014', name:'DustWalker',  rarity:'Common',    level:12, owner_email:'noah@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-04-25 11:15' },
    { id:'pet-0015', name:'EmberFox',    rarity:'Uncommon',  level:21, owner_email:'olivia@pixel-pet.io', status:'active',  ban_reason:null,             created_at:'2026-05-02 14:00' },
    { id:'pet-0016', name:'TideStalker', rarity:'Epic',      level:40, owner_email:'paul@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-05-05 10:45' },
    { id:'pet-0017', name:'BoulderBrute',rarity:'Rare',      level:28, owner_email:'quinn@pixel-pet.io',  status:'banned',  ban_reason:'suspicious win', created_at:'2026-05-08 08:30' },
    { id:'pet-0018', name:'VenomSprite', rarity:'Uncommon',  level:16, owner_email:'rose@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-05-10 17:00' },
    { id:'pet-0019', name:'ArcticWolf',  rarity:'Epic',      level:37, owner_email:'sam@pixel-pet.io',    status:'active',  ban_reason:null,             created_at:'2026-05-13 09:20' },
    { id:'pet-0020', name:'SunSphinx',   rarity:'Legendary', level:46, owner_email:'tina@pixel-pet.io',   status:'active',  ban_reason:null,             created_at:'2026-05-15 11:30' }
  ],

  /* ── Battles (15 records) ───────────────────────────────── */
  battles: [
    { id:'match-10921', pet_a:'FlameWing',    pet_b:'ShadowFang',    winner:'FlameWing',    mode:'RACE',    flagged:true,  flag_reason:'suspicious win rate',  created_at:'2026-05-18 08:44' },
    { id:'match-10920', pet_a:'StormWing',    pet_b:'TerraShell',    winner:'StormWing',    mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-18 08:30' },
    { id:'match-10919', pet_a:'CrystalDrake', pet_b:'ThunderBoar',   winner:'CrystalDrake', mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-18 08:15' },
    { id:'match-10918', pet_a:'IronGolem',    pet_b:'MistRaven',     winner:'IronGolem',    mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-18 07:50' },
    { id:'match-10917', pet_a:'TideStalker',  pet_b:'VoidCrawler',   winner:'TideStalker',  mode:'RACE',    flagged:true,  flag_reason:'>50 battles/60min',    created_at:'2026-05-18 07:30' },
    { id:'match-10916', pet_a:'EmberFox',     pet_b:'DustWalker',    winner:'EmberFox',     mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-17 22:10' },
    { id:'match-10915', pet_a:'ArcticWolf',   pet_b:'VenomSprite',   winner:'ArcticWolf',   mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-17 21:45' },
    { id:'match-10914', pet_a:'SunSphinx',    pet_b:'GlacierBear',   winner:'SunSphinx',    mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-17 20:00' },
    { id:'match-10913', pet_a:'CoralSerpent', pet_b:'BoulderBrute',  winner:'CoralSerpent', mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-17 18:30' },
    { id:'match-10912', pet_a:'NeonProwler',  pet_b:'LavaToad',      winner:'NeonProwler',  mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-17 17:00' },
    { id:'match-10911', pet_a:'FlameWing',    pet_b:'IronGolem',     winner:'IronGolem',    mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-17 16:00' },
    { id:'match-10910', pet_a:'StormWing',    pet_b:'ArcticWolf',    winner:'StormWing',    mode:'BATTLE',  flagged:true,  flag_reason:'anomalous win rate',   created_at:'2026-05-17 15:20' },
    { id:'match-10909', pet_a:'CrystalDrake', pet_b:'TideStalker',   winner:'TideStalker',  mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-17 14:40' },
    { id:'match-10908', pet_a:'TerraShell',   pet_b:'EmberFox',      winner:'TerraShell',   mode:'BATTLE',  flagged:false, flag_reason:null,                   created_at:'2026-05-17 13:10' },
    { id:'match-10907', pet_a:'SunSphinx',    pet_b:'MistRaven',     winner:'SunSphinx',    mode:'RACE',    flagged:false, flag_reason:null,                   created_at:'2026-05-17 12:00' }
  ],

  /* ── Leaderboard (10 records) ───────────────────────────── */
  leaderboard: [
    { rank:1,  pet_name:'StormWing',    rarity:'Legendary', owner:'player_eve',   arena_score:9820, win_rate:91, suspicious:false },
    { rank:2,  pet_name:'IronGolem',    rarity:'Legendary', owner:'player_leo',   arena_score:9741, win_rate:88, suspicious:false },
    { rank:3,  pet_name:'SunSphinx',    rarity:'Legendary', owner:'player_tina',  arena_score:9655, win_rate:86, suspicious:false },
    { rank:4,  pet_name:'FlameWing',    rarity:'Legendary', owner:'player_alice', arena_score:9480, win_rate:84, suspicious:false },
    { rank:5,  pet_name:'TideStalker',  rarity:'Epic',      owner:'player_paul',  arena_score:9120, win_rate:82, suspicious:true  },
    { rank:6,  pet_name:'CrystalDrake', rarity:'Epic',      owner:'player_iris',  arena_score:8990, win_rate:79, suspicious:false },
    { rank:7,  pet_name:'ArcticWolf',   rarity:'Epic',      owner:'player_sam',   arena_score:8820, win_rate:77, suspicious:false },
    { rank:8,  pet_name:'VoidCrawler',  rarity:'Epic',      owner:'player_carol', arena_score:8650, win_rate:75, suspicious:true  },
    { rank:9,  pet_name:'ThunderBoar',  rarity:'Rare',      owner:'player_jake',  arena_score:8410, win_rate:72, suspicious:false },
    { rank:10, pet_name:'ShadowFang',   rarity:'Epic',      owner:'player_bob',   arena_score:8200, win_rate:70, suspicious:false }
  ],

  /* ── Suspicious Pets (3 records) ────────────────────────── */
  suspiciousPets: [
    { pet_id:'pet-0003', pet_name:'VoidCrawler', battle_count_60m:78, flagged_battles:8, owner_email:'carol@pixel-pet.io', detected_at:'2026-05-18 07:30' },
    { pet_id:'pet-0005', pet_name:'StormWing',   battle_count_60m:65, flagged_battles:6, owner_email:'eve@pixel-pet.io',   detected_at:'2026-05-17 22:15' },
    { pet_id:'pet-0016', pet_name:'TideStalker', battle_count_60m:62, flagged_battles:5, owner_email:'paul@pixel-pet.io',  detected_at:'2026-05-17 20:00' }
  ],

  /* ── Email Logs (10 records) ─────────────────────────────── */
  emailLogs: [
    { id:'EMail-1001', to:'alice@pixel-pet.io',  subject:'Welcome to Pixel Pet Arena',         status:'delivered', ts:'2026-05-18 09:00', bounce_reason:null },
    { id:'EMail-1002', to:'bob@pixel-pet.io',    subject:'Your pet StormWing reached Rank #2!', status:'delivered', ts:'2026-05-18 08:55', bounce_reason:null },
    { id:'EMail-1003', to:'bad@invalid.com',     subject:'Arena Weekly Digest',                 status:'bounced',   ts:'2026-05-18 08:30', bounce_reason:'User unknown' },
    { id:'EMail-1004', to:'carol@pixel-pet.io',  subject:'Ban Notice: VoidCrawler',             status:'delivered', ts:'2026-05-18 08:15', bounce_reason:null },
    { id:'EMail-1005', to:'dave@pixel-pet.io',   subject:'Account Inactive Warning',            status:'delivered', ts:'2026-05-17 22:00', bounce_reason:null },
    { id:'EMail-1006', to:'eve@pixel-pet.io',    subject:'Suspicious Activity Detected',        status:'delivered', ts:'2026-05-17 20:10', bounce_reason:null },
    { id:'EMail-1007', to:'noserver@ghost.io',   subject:'Arena Weekly Digest',                 status:'failed',    ts:'2026-05-17 18:00', bounce_reason:'Connection timeout' },
    { id:'EMail-1008', to:'frank@pixel-pet.io',  subject:'Account Locked Notification',         status:'delivered', ts:'2026-05-17 15:30', bounce_reason:null },
    { id:'EMail-1009', to:'grace@pixel-pet.io',  subject:'New Admin Account Created',           status:'delivered', ts:'2026-05-17 12:00', bounce_reason:null },
    { id:'EMail-1010', to:'iris@pixel-pet.io',   subject:'GDPR Erasure Request Received',       status:'delivered', ts:'2026-05-16 17:45', bounce_reason:null }
  ],

  /* ── Feature Flags (8 records) ─────────────────────────── */
  featureFlags: [
    { id:'FF_MARKETPLACE',    desc:'寵物交易市場功能',               enabled:false, updated:'2026-05-17 14:00' },
    { id:'FF_ARENA_RANKED',   desc:'排名賽系統',                     enabled:true,  updated:'2026-05-10 09:00' },
    { id:'FF_DAILY_QUEST',    desc:'每日任務系統',                   enabled:true,  updated:'2026-04-28 11:30' },
    { id:'FF_FUSION',         desc:'寵物融合功能（Beta）',           enabled:false, updated:'2026-05-01 15:00' },
    { id:'FF_LEADERBOARD_V2', desc:'新排行榜 UI（A/B 測試）',       enabled:true,  updated:'2026-05-12 10:15' },
    { id:'FF_NOTIFICATION',   desc:'站內推播通知',                   enabled:true,  updated:'2026-05-15 08:00' },
    { id:'FF_AI_MATCHMAKER',  desc:'AI 智能配對系統（實驗性）',     enabled:false, updated:'2026-05-05 16:00' },
    { id:'FF_SEASONAL_EVENT', desc:'限時節日活動框架',               enabled:true,  updated:'2026-05-18 07:00' }
  ],

  /* ── GDPR Requests (6 records) ──────────────────────────── */
  gdprRequests: [
    { id:'GDPR-2026-0017', type:'erasure',     status:'resolved',   email:'user9021@example.com', submitted:'2026-05-15 10:00', sla_deadline:'2026-05-29', sla_urgent:false },
    { id:'GDPR-2026-0018', type:'data_access', status:'pending',    email:'user8812@example.com', submitted:'2026-05-17 09:30', sla_deadline:'2026-05-31', sla_urgent:false },
    { id:'GDPR-2026-0019', type:'erasure',     status:'pending',    email:'user7705@example.com', submitted:'2026-05-18 07:00', sla_deadline:'2026-05-21', sla_urgent:true  },
    { id:'GDPR-2026-0020', type:'restrict',    status:'processing', email:'user6644@example.com', submitted:'2026-05-16 14:00', sla_deadline:'2026-05-30', sla_urgent:false },
    { id:'GDPR-2026-0021', type:'data_access', status:'pending',    email:'user5533@example.com', submitted:'2026-05-18 08:00', sla_deadline:'2026-05-20', sla_urgent:true  },
    { id:'GDPR-2026-0022', type:'object',      status:'resolved',   email:'user4422@example.com', submitted:'2026-05-14 11:00', sla_deadline:'2026-05-28', sla_urgent:false }
  ],

  /* ── Dashboard Stats ────────────────────────────────────── */
  stats: {
    total_users:        8,
    active_users:       6,
    locked_users:       1,
    total_pets:         1247,
    battles_today:      189,
    suspicious_flags:   3,
    email_success_rate: 92,
    email_bounce_rate:  2,
    emails_today:       47
  },

  /* ── Audit Logs (15 records) ────────────────────────────── */
  auditLogs: [
    { id:1,  actor:'superadmin', action:'pet.ban',               target:'pet#3847',       ip_hash:'a1b2c3', ts:'2026-05-18 08:58', detail:'ban reason: bot detected' },
    { id:2,  actor:'mod_alice',  action:'arena_match.flag',      target:'match#10921',    ip_hash:'d4e5f6', ts:'2026-05-18 08:45', detail:'suspicious win rate' },
    { id:3,  actor:'superadmin', action:'config.runtime.update', target:'battle_rate',    ip_hash:'a1b2c3', ts:'2026-05-18 08:30', detail:'rate: 5 → 6 battles/min' },
    { id:4,  actor:'mod_bob',    action:'leaderboard.remove',    target:'pet#2201',       ip_hash:'g7h8i9', ts:'2026-05-18 08:15', detail:'anomalous ranking entry' },
    { id:5,  actor:'mod_alice',  action:'pet.unban',             target:'pet#1055',       ip_hash:'d4e5f6', ts:'2026-05-18 07:50', detail:'ban appeal approved' },
    { id:6,  actor:'superadmin', action:'gdpr.delete',           target:'user#u_9021',    ip_hash:'a1b2c3', ts:'2026-05-17 22:10', detail:'erasure request #GDR-017' },
    { id:7,  actor:'superadmin', action:'admin_user.create',     target:'reader_grace',   ip_hash:'a1b2c3', ts:'2026-05-17 20:00', detail:'role: read_only' },
    { id:8,  actor:'mod_alice',  action:'arena_match.unflag',    target:'match#10780',    ip_hash:'d4e5f6', ts:'2026-05-17 18:33', detail:'reviewed — false positive' },
    { id:9,  actor:'superadmin', action:'config.economy.update', target:'arena_fee',      ip_hash:'a1b2c3', ts:'2026-05-17 16:45', detail:'fee: 50 → 40 coins' },
    { id:10, actor:'mod_bob',    action:'pet.ban',               target:'pet#4412',       ip_hash:'g7h8i9', ts:'2026-05-17 15:20', detail:'ban reason: tos violation' },
    { id:11, actor:'superadmin', action:'config.flag.toggle',    target:'FF_MARKETPLACE', ip_hash:'a1b2c3', ts:'2026-05-17 14:00', detail:'enabled → disabled' },
    { id:12, actor:'mod_alice',  action:'arena_match.flag',      target:'match#10651',    ip_hash:'d4e5f6', ts:'2026-05-17 12:30', detail:'>50 battles/60min' },
    { id:13, actor:'superadmin', action:'admin_user.totp_reset', target:'mod_frank',      ip_hash:'a1b2c3', ts:'2026-05-17 11:05', detail:'TOTP device change request' },
    { id:14, actor:'superadmin', action:'admin_user.deactivate', target:'mod_dave',       ip_hash:'a1b2c3', ts:'2026-05-17 09:40', detail:'account inactive 30 days' },
    { id:15, actor:'mod_bob',    action:'pet.unban',             target:'pet#3300',       ip_hash:'g7h8i9', ts:'2026-05-16 17:22', detail:'ban duration expired' }
  ]
};

/* ============================================================
   DOM Helper Functions — return HTMLElement nodes, never strings.
   XSS-safe by construction: all user-visible text set via
   .textContent; CSS classes come from allowlisted constants only.
   ============================================================ */

/**
 * Render the sidebar navigation as a <nav> DOM node.
 * @param {string} active - one of: 'dashboard' | 'users' | 'roles' | 'audit'
 * @returns {HTMLElement}
 */
function renderSidebar(active) {
  const safeActive = _ALLOWED_ACTIVE.has(active) ? active : '';

  const nav = document.createElement('nav');
  nav.className = 'admin-sidebar';

  // Brand
  const brand = document.createElement('div');
  brand.className = 'sidebar-brand';
  brand.textContent = '🛡️ Admin Portal';
  nav.appendChild(brand);

  // Nav sections — 3-section structure: Primary / Moderation / Tools
  const sections = [
    {
      label: '主要功能',
      entries: [
        { key: 'dashboard',  href: 'admin-dashboard.html', icon: '📊', label: 'Dashboard' },
        { key: 'users',      href: 'admin-users.html',     icon: '👥', label: 'Users' },
        { key: 'roles',      href: 'admin-roles.html',     icon: '🗝️', label: 'Roles' },
        { key: 'audit',      href: 'admin-audit-log.html', icon: '📜', label: 'Audit Log' }
      ]
    },
    {
      label: '待辦事項',
      entries: [
        { key: 'suspicious', href: 'suspicious.html', icon: '⚠️', label: 'Suspicious' },
        { key: 'gdpr',       href: 'gdpr.html',       icon: '🔏', label: 'GDPR' },
        { key: 'email',      href: 'email.html',      icon: '📧', label: 'Email' }
      ]
    },
    {
      label: '工具',
      entries: [
        { key: 'pets',        href: 'pets.html',        icon: '🐾', label: 'Pets' },
        { key: 'battles',     href: 'battles.html',     icon: '⚔️', label: 'Battles' },
        { key: 'leaderboard', href: 'leaderboard.html', icon: '🏆', label: 'Leaderboard' },
        { key: 'config',      href: 'config.html',      icon: '⚙️', label: 'Config' },
        { key: 'analytics',   href: 'analytics.html',   icon: '📈', label: 'Analytics' }
      ]
    }
  ];

  sections.forEach(function (section) {
    // Section heading
    const sectionHead = document.createElement('div');
    sectionHead.className = 'sidebar-section-label';
    sectionHead.textContent = section.label;   // textContent — not innerHTML
    nav.appendChild(sectionHead);

    const ul = document.createElement('ul');
    ul.className = 'sidebar-nav';
    section.entries.forEach(function (e) {
      const li = document.createElement('li');
      li.className = 'nav-item' + (e.key === safeActive ? ' active' : '');
      const a = document.createElement('a');
      a.href = e.href;                           // static string — no interpolation
      a.textContent = e.icon + ' ' + e.label;   // textContent — not innerHTML
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
  });

  // Footer — username from ADMIN_MOCK (set via textContent)
  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';

  const userDiv = document.createElement('div');
  userDiv.className = 'sidebar-user';
  userDiv.textContent = '👤 ' + ADMIN_MOCK.currentUser.name; // textContent, not innerHTML

  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = '登出';
  logoutBtn.addEventListener('click', function () {
    location.href = 'admin-login.html';
  });

  footer.appendChild(userDiv);
  footer.appendChild(logoutBtn);
  nav.appendChild(footer);

  return nav;
}

/**
 * Return a role badge <span> DOM node.
 * CSS class chosen from allowlist; label set via textContent.
 * @param {string} role
 * @returns {HTMLElement}
 */
function roleBadge(role) {
  const labels = { super_admin: 'Super Admin', moderator: 'Moderator', read_only: 'Read Only' };
  const span = document.createElement('span');
  // Only apply class when role is in the allowlist
  span.className = 'role-badge' + (_ALLOWED_ROLES.has(role) ? ' ' + role : '');
  span.textContent = _ALLOWED_ROLES.has(role) ? labels[role] : _esc(role);
  return span;
}

/**
 * Return a status badge <span> DOM node.
 * @param {string} status
 * @returns {HTMLElement}
 */
function statusBadge(status) {
  const icons = { active: '🟢', inactive: '⚪', locked: '🔴', pending: '🟡', resolved: '🟢', flagged: '🟡', banned: '🔴' };
  const span = document.createElement('span');
  span.className = 'status-badge' + (_ALLOWED_STATUS.has(status) ? ' ' + status : '');
  span.textContent = (icons[status] || '') + ' ' + (_ALLOWED_STATUS.has(status) ? status : '');
  return span;
}

/**
 * Return an action tag <span> DOM node.
 * CSS class derived purely from string prefix matching (no data interpolation).
 * @param {string} action
 * @returns {HTMLElement}
 */
function actionTag(action) {
  let cls = 'write';
  if (typeof action === 'string') {
    if (action.startsWith('auth.'))    cls = 'auth';
    else if (action.startsWith('config.')) cls = 'config';
    else if (action.startsWith('gdpr.'))   cls = 'gdpr';
    else if (action === 'audit.read' || action.endsWith('.read')) cls = 'read';
  }
  const span = document.createElement('span');
  span.className = 'action-tag ' + cls; // cls is from our own if-chain, never from input
  span.textContent = typeof action === 'string' ? action : '';
  return span;
}

/**
 * Convenience: append a DOM node or esc()-encoded string into a table cell.
 * @param {HTMLTableCellElement} td
 * @param {HTMLElement|string} content
 */
function setCell(td, content) {
  if (content instanceof HTMLElement) {
    td.appendChild(content);
  } else {
    td.textContent = String(content === null || content === undefined ? '' : content);
  }
}

/* ── PF-01: escapeHtml alias (DOM-based, same as _esc) ───── */
function escapeHtml(val) {
  const span = document.createElement('span');
  span.textContent = (val === null || val === undefined) ? '' : String(val);
  return span.innerHTML;
}

/* ── PF-02: roleDisplayName helper ───────────────────────── */
const _ROLE_DISPLAY = { super_admin: 'Super Admin', moderator: 'Moderator', read_only: 'Read Only' };
function roleDisplayName(role) { return _ROLE_DISPLAY[role] || String(role || ''); }

/* ── Shared UI helpers ────────────────────────────────────── */

/**
 * Show a toast notification.
 * @param {string} msg
 * @param {'success'|'warning'|'error'|'info'} [type]
 */
function showToast(msg, type) {
  var TYPE_COLORS = { success: '#10b981', warning: '#f59e0b', error: '#e87c7c', info: '#2d9ef5' };
  var color = TYPE_COLORS[type] || TYPE_COLORS.info;

  var toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'background:' + color, 'color:#fff', 'padding:10px 18px',
    'border-radius:8px', 'font-size:13.5px', 'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
    'max-width:340px', 'word-break:break-word',
    'opacity:0', 'transition:opacity 0.2s ease'
  ].join(';');
  toast.textContent = String(msg === null || msg === undefined ? '' : msg);

  document.body.appendChild(toast);
  requestAnimationFrame(function () { toast.style.opacity = '1'; });
  setTimeout(function () {
    toast.style.opacity = '0';
    setTimeout(function () { if (toast.parentNode) { toast.parentNode.removeChild(toast); } }, 250);
  }, 3000);
}

/**
 * Open a modal overlay by element ID.
 * @param {string} id
 */
function openModal(id) {
  if (typeof id !== 'string') { return; }
  var el = document.getElementById(id);
  if (el) { el.classList.add('open'); }
}

/**
 * Close a modal overlay by element ID.
 * @param {string} id
 */
function closeModal(id) {
  if (typeof id !== 'string') { return; }
  var el = document.getElementById(id);
  if (el) { el.classList.remove('open'); }
}

/* ── Expose globals ───────────────────────────────────────── */
window.ADMIN_MOCK        = ADMIN_MOCK;
window.renderSidebar     = renderSidebar;
window.roleBadge         = roleBadge;
window.statusBadge       = statusBadge;
window.actionTag         = actionTag;
window.setCell           = setCell;
window._esc              = _esc;
window.escapeHtml        = escapeHtml;
window.roleDisplayName   = roleDisplayName;
window.showToast         = showToast;
window.openModal         = openModal;
window.closeModal        = closeModal;
