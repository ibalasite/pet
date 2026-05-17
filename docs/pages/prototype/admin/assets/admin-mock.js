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
const _ALLOWED_STATUS  = new Set(['active', 'inactive', 'locked', 'pending', 'resolved', 'flagged', 'banned']);
const _ALLOWED_ACTIVE  = new Set(['dashboard', 'users', 'roles', 'audit']);
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

  /* ── Dashboard Stats ────────────────────────────────────── */
  stats: {
    total_users:      8,
    active_users:     6,
    locked_users:     1,
    total_pets:       1247,
    battles_today:    189,
    suspicious_flags: 3
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

  // Nav list — static entries (no external data interpolated)
  const entries = [
    { key: 'dashboard', href: 'admin-dashboard.html', icon: '📊', label: 'Dashboard' },
    { key: 'users',     href: 'admin-users.html',     icon: '👥', label: 'Users' },
    { key: 'roles',     href: 'admin-roles.html',     icon: '🗝️', label: 'Roles' },
    { key: 'audit',     href: 'admin-audit-log.html', icon: '📜', label: 'Audit Log' }
  ];

  const ul = document.createElement('ul');
  ul.className = 'sidebar-nav';
  entries.forEach(function (e) {
    const li = document.createElement('li');
    li.className = 'nav-item' + (e.key === safeActive ? ' active' : '');
    const a = document.createElement('a');
    a.href = e.href;                           // static string — no interpolation
    a.textContent = e.icon + ' ' + e.label;   // textContent — not innerHTML
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

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

/* ── Expose globals ───────────────────────────────────────── */
window.ADMIN_MOCK    = ADMIN_MOCK;
window.renderSidebar = renderSidebar;
window.roleBadge     = roleBadge;
window.statusBadge   = statusBadge;
window.actionTag     = actionTag;
window.setCell       = setCell;
window._esc          = _esc;
