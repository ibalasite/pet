/* ==========================================================
   Pixel Pet Arena — Admin Portal Mock Data v2.0
   Roles: super_admin / moderator / read_only
   Used by all admin prototype pages.
   ========================================================== */

const ADMIN_MOCK = {
  currentUser: {
    id: 1,
    username: 'admin',
    name: '系統管理員',
    email: 'admin@pixelpet.arena',
    role: 'super_admin',
    mfa_enabled: true,
    last_login: '2026-05-18 09:23:11',
  },

  users: [
    {
      id: 1,
      username: 'admin',
      name: '系統管理員',
      email: 'admin@pixelpet.arena',
      role: 'super_admin',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-18 09:23:11',
      created_at: '2025-08-01 00:00:00',
    },
    {
      id: 2,
      username: 'alice',
      name: 'Alice Chen',
      email: 'alice@pixelpet.arena',
      role: 'moderator',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-18 08:51:42',
      created_at: '2025-09-15 10:24:00',
    },
    {
      id: 3,
      username: 'bob',
      name: 'Bob Tanaka',
      email: 'bob@pixelpet.arena',
      role: 'moderator',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-17 22:18:09',
      created_at: '2025-09-20 14:11:00',
    },
    {
      id: 4,
      username: 'carol',
      name: 'Carol Singh',
      email: 'carol@pixelpet.arena',
      role: 'moderator',
      status: 'active',
      mfa_enabled: false,
      last_login: '2026-05-18 07:02:33',
      created_at: '2025-10-04 09:00:00',
    },
    {
      id: 5,
      username: 'dave',
      name: 'Dave Müller',
      email: 'dave@pixelpet.arena',
      role: 'read_only',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-17 16:45:21',
      created_at: '2025-10-18 11:30:00',
    },
    {
      id: 6,
      username: 'eve',
      name: 'Eve Johansson',
      email: 'eve@pixelpet.arena',
      role: 'read_only',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-16 14:22:50',
      created_at: '2025-11-02 08:45:00',
    },
    {
      id: 7,
      username: 'frank',
      name: 'Frank Oliveira',
      email: 'frank@pixelpet.arena',
      role: 'moderator',
      status: 'locked',
      mfa_enabled: false,
      last_login: '2026-04-28 11:10:00',
      created_at: '2025-12-01 13:00:00',
      lock_reason: '連續 5 次登入失敗',
    },
    {
      id: 8,
      username: 'grace',
      name: 'Grace Park',
      email: 'grace@pixelpet.arena',
      role: 'read_only',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-18 06:14:08',
      created_at: '2026-01-14 10:00:00',
    },
  ],

  roles: [
    {
      id: 1,
      name: 'super_admin',
      display: '超級管理員',
      color_class: 'super',
      user_count: 1,
      permissions: [
        'pet:list', 'pet:ban', 'pet:unban',
        'battle:list', 'battle:flag', 'battle:unflag',
        'suspicious:list', 'suspicious:dismiss',
        'leaderboard:list', 'leaderboard:remove',
        'config:runtime:view', 'config:runtime:update',
        'config:economy:view', 'config:economy:update',
        'config:flags:view', 'config:flags:update',
        'gdpr:list', 'gdpr:process', 'gdpr:complete', 'gdpr:reject',
        'audit:view', 'audit:export',
        'analytics:view',
        'email:monitor',
        'roles:list', 'roles:create', 'roles:delete', 'roles:totp_reset',
      ],
    },
    {
      id: 2,
      name: 'moderator',
      display: '內容審查員',
      color_class: 'moderator',
      user_count: 3,
      permissions: [
        'pet:list', 'pet:ban', 'pet:unban',
        'battle:list', 'battle:flag', 'battle:unflag',
        'suspicious:list', 'suspicious:dismiss',
        'leaderboard:list', 'leaderboard:remove',
        'analytics:view',
        'email:monitor',
      ],
    },
    {
      id: 3,
      name: 'read_only',
      display: '唯讀分析師',
      color_class: 'read_only',
      user_count: 2,
      permissions: [
        'pet:list',
        'battle:list',
        'leaderboard:list',
        'analytics:view',
        'email:monitor',
      ],
    },
  ],

  pets: [
    {
      id: 'pet_a1b2c3d4',
      name: 'RoarBeast',
      rarity: 'Epic',
      level: 42,
      owner_email: 'us***@example.com',
      status: 'banned',
      ban_reason: '違反使用條款：不當名稱',
      created_at: '2026-03-15 10:22:00',
    },
    {
      id: 'pet_e5f6g7h8',
      name: 'PixelDragon',
      rarity: 'Legendary',
      level: 87,
      owner_email: 'pi***@gmail.com',
      status: 'active',
      ban_reason: null,
      created_at: '2026-01-20 08:14:00',
    },
    {
      id: 'pet_i9j0k1l2',
      name: 'NekoSan',
      rarity: 'Rare',
      level: 33,
      owner_email: 'ne***@yahoo.com',
      status: 'active',
      ban_reason: null,
      created_at: '2026-02-10 14:30:00',
    },
    {
      id: 'pet_m3n4o5p6',
      name: 'BadWord_McGee',
      rarity: 'Common',
      level: 5,
      owner_email: 'ba***@hotmail.com',
      status: 'banned',
      ban_reason: '自動偵測：髒話分數 0.91',
      created_at: '2026-04-01 09:00:00',
    },
    {
      id: 'pet_q7r8s9t0',
      name: 'HackerCat',
      rarity: 'Rare',
      level: 61,
      owner_email: 'ha***@proton.me',
      status: 'banned',
      ban_reason: 'ELO 操作行為確認',
      created_at: '2025-12-05 17:45:00',
    },
    {
      id: 'pet_u1v2w3x4',
      name: 'Munchkin',
      rarity: 'Common',
      level: 18,
      owner_email: 'mu***@gmail.com',
      status: 'active',
      ban_reason: null,
      created_at: '2026-04-22 11:10:00',
    },
    {
      id: 'pet_y5z6a7b8',
      name: 'BananaBear',
      rarity: 'Epic',
      level: 55,
      owner_email: 'bb***@outlook.com',
      status: 'active',
      ban_reason: null,
      created_at: '2026-03-08 16:00:00',
    },
    {
      id: 'pet_c9d0e1f2',
      name: 'Goldfishie',
      rarity: 'Common',
      level: 9,
      owner_email: 'go***@icloud.com',
      status: 'active',
      ban_reason: null,
      created_at: '2026-05-01 07:30:00',
    },
  ],

  battles: [
    {
      id: 'match_aa11bb22',
      pet_a: 'PixelDragon',
      pet_b: 'RoarBeast',
      winner: 'PixelDragon',
      mode: 'STRENGTH',
      flagged: false,
      created_at: '2026-05-18 09:15:00',
    },
    {
      id: 'match_cc33dd44',
      pet_a: 'HackerCat',
      pet_b: 'NekoSan',
      winner: 'HackerCat',
      mode: 'RACE',
      flagged: true,
      flag_reason: 'Bot 自動旗標：60min 內 78 次戰鬥',
      created_at: '2026-05-18 08:47:00',
    },
    {
      id: 'match_ee55ff66',
      pet_a: 'BananaBear',
      pet_b: 'Munchkin',
      winner: 'BananaBear',
      mode: 'RACE',
      flagged: false,
      created_at: '2026-05-18 08:30:00',
    },
    {
      id: 'match_gg77hh88',
      pet_a: 'HackerCat',
      pet_b: 'Goldfishie',
      winner: 'HackerCat',
      mode: 'STRENGTH',
      flagged: true,
      flag_reason: '異常連勝：12 連勝無失敗',
      created_at: '2026-05-18 07:55:00',
    },
    {
      id: 'match_ii99jj00',
      pet_a: 'NekoSan',
      pet_b: 'BananaBear',
      winner: 'BananaBear',
      mode: 'RACE',
      flagged: false,
      created_at: '2026-05-17 23:40:00',
    },
    {
      id: 'match_kk11ll22',
      pet_a: 'Munchkin',
      pet_b: 'Goldfishie',
      winner: 'Munchkin',
      mode: 'STRENGTH',
      flagged: false,
      created_at: '2026-05-17 22:10:00',
    },
    {
      id: 'match_mm33nn44',
      pet_a: 'PixelDragon',
      pet_b: 'BananaBear',
      winner: 'PixelDragon',
      mode: 'RACE',
      flagged: false,
      created_at: '2026-05-17 20:05:00',
    },
    {
      id: 'match_oo55pp66',
      pet_a: 'NekoSan',
      pet_b: 'Munchkin',
      winner: 'NekoSan',
      mode: 'STRENGTH',
      flagged: false,
      created_at: '2026-05-17 18:30:00',
    },
  ],

  suspiciousPets: [
    {
      pet_id: 'pet_q7r8s9t0',
      pet_name: 'HackerCat',
      battle_count_60m: 78,
      flagged_battles: 5,
      owner_email: 'ha***@proton.me',
      detected_at: '2026-05-18 08:50:00',
    },
    {
      pet_id: 'pet_zz11yy22',
      pet_name: 'SpeedDemon99',
      battle_count_60m: 95,
      flagged_battles: 12,
      owner_email: 'sp***@gmail.com',
      detected_at: '2026-05-18 08:30:00',
    },
    {
      pet_id: 'pet_ww33xx44',
      pet_name: 'InfiniteRunner',
      battle_count_60m: 63,
      flagged_battles: 3,
      owner_email: 'in***@hotmail.com',
      detected_at: '2026-05-18 07:45:00',
    },
    {
      pet_id: 'pet_vv55uu66',
      pet_name: 'AutoBattler',
      battle_count_60m: 57,
      flagged_battles: 2,
      owner_email: 'au***@yahoo.com',
      detected_at: '2026-05-18 07:10:00',
    },
    {
      pet_id: 'pet_tt77ss88',
      pet_name: 'NightCrawler',
      battle_count_60m: 51,
      flagged_battles: 1,
      owner_email: 'ni***@outlook.com',
      detected_at: '2026-05-18 06:55:00',
    },
  ],

  leaderboard: [
    { rank: 1,  pet_name: 'PixelDragon',   rarity: 'Legendary', owner: 'pi***@gmail.com',   arena_score: 9842, win_rate: 94.2, suspicious: false },
    { rank: 2,  pet_name: 'HackerCat',     rarity: 'Rare',      owner: 'ha***@proton.me',   arena_score: 9511, win_rate: 97.8, suspicious: true  },
    { rank: 3,  pet_name: 'SpeedDemon99',  rarity: 'Epic',      owner: 'sp***@gmail.com',   arena_score: 9234, win_rate: 96.1, suspicious: true  },
    { rank: 4,  pet_name: 'BananaBear',    rarity: 'Epic',      owner: 'bb***@outlook.com', arena_score: 8901, win_rate: 81.5, suspicious: false },
    { rank: 5,  pet_name: 'NekoSan',       rarity: 'Rare',      owner: 'ne***@yahoo.com',   arena_score: 8750, win_rate: 78.4, suspicious: false },
    { rank: 6,  pet_name: 'Munchkin',      rarity: 'Common',    owner: 'mu***@gmail.com',   arena_score: 8432, win_rate: 72.1, suspicious: false },
    { rank: 7,  pet_name: 'NightCrawler',  rarity: 'Rare',      owner: 'ni***@outlook.com', arena_score: 8201, win_rate: 68.9, suspicious: false },
    { rank: 8,  pet_name: 'Goldfishie',    rarity: 'Common',    owner: 'go***@icloud.com',  arena_score: 7980, win_rate: 65.3, suspicious: false },
    { rank: 9,  pet_name: 'RoarBeast',     rarity: 'Epic',      owner: 'us***@example.com', arena_score: 7644, win_rate: 61.0, suspicious: false },
    { rank: 10, pet_name: 'InfiniteRunner',rarity: 'Rare',      owner: 'in***@hotmail.com', arena_score: 7521, win_rate: 59.8, suspicious: false },
  ],

  featureFlags: [
    { id: 'FF_MARKETPLACE',   desc: 'Marketplace 功能',   enabled: false, updated: '2026-04-01' },
    { id: 'FF_BATTLE_REPLAY', desc: '戰鬥回放',            enabled: false, updated: '2026-04-15' },
    { id: 'FF_GDPR_BULK',     desc: 'GDPR 批次處理',       enabled: false, updated: '2026-05-01' },
    { id: 'FF_ANALYTICS_V2',  desc: 'Analytics v2',       enabled: true,  updated: '2026-05-10' },
  ],

  gdprRequests: [
    {
      id: 'GDPR-2026-0051',
      type: 'erasure',
      status: 'pending',
      email: 'us***@gmail.com',
      submitted: '2026-05-17 18:22:00',
      sla_deadline: '2026-05-19 18:22:00',
      sla_urgent: true,
    },
    {
      id: 'GDPR-2026-0050',
      type: 'data_access',
      status: 'pending',
      email: 'da***@yahoo.com',
      submitted: '2026-05-17 09:08:00',
      sla_deadline: '2026-05-19 09:08:00',
      sla_urgent: true,
    },
    {
      id: 'GDPR-2026-0049',
      type: 'restrict',
      status: 'processing',
      email: 're***@hotmail.com',
      submitted: '2026-05-14 14:30:00',
      sla_deadline: '2026-05-24 14:30:00',
      sla_urgent: false,
    },
    {
      id: 'GDPR-2026-0048',
      type: 'object',
      status: 'pending',
      email: 'ob***@outlook.com',
      submitted: '2026-05-13 11:15:00',
      sla_deadline: '2026-05-23 11:15:00',
      sla_urgent: false,
    },
    {
      id: 'GDPR-2026-0047',
      type: 'rectification',
      status: 'completed',
      email: 're***@proton.me',
      submitted: '2026-05-10 08:00:00',
      sla_deadline: '2026-05-20 08:00:00',
      sla_urgent: false,
    },
    {
      id: 'GDPR-2026-0046',
      type: 'erasure',
      status: 'completed',
      email: 'er***@icloud.com',
      submitted: '2026-05-08 16:45:00',
      sla_deadline: '2026-05-18 16:45:00',
      sla_urgent: false,
    },
    {
      id: 'GDPR-2026-0045',
      type: 'data_access',
      status: 'rejected',
      email: 'da***@gmail.com',
      submitted: '2026-05-05 10:30:00',
      sla_deadline: '2026-05-15 10:30:00',
      sla_urgent: false,
    },
    {
      id: 'GDPR-2026-0044',
      type: 'restrict',
      status: 'completed',
      email: 're***@example.com',
      submitted: '2026-05-01 09:00:00',
      sla_deadline: '2026-05-11 09:00:00',
      sla_urgent: false,
    },
  ],

  auditLogs: [
    { id: 18020, operator: 'admin',  action: 'config:runtime:update',  target: 'max_battles_per_minute: 10→12',    ip: '10.20.***.40', ts: '2026-05-18 09:24:55', result: 'success' },
    { id: 18019, operator: 'alice',  action: 'pet:ban',                target: 'pet_a1b2c3d4 (RoarBeast)',          ip: '10.20.***.41', ts: '2026-05-18 09:18:02', result: 'success' },
    { id: 18018, operator: 'bob',    action: 'battle:flag',            target: 'match_cc33dd44',                   ip: '10.20.***.42', ts: '2026-05-18 09:01:39', result: 'success' },
    { id: 18017, operator: 'admin',  action: 'gdpr:process',           target: 'GDPR-2026-0049',                   ip: '10.20.***.40', ts: '2026-05-18 08:47:21', result: 'success' },
    { id: 18016, operator: 'carol',  action: 'leaderboard:remove',     target: 'rank#2 HackerCat',                 ip: '10.20.***.43', ts: '2026-05-18 08:30:11', result: 'success' },
    { id: 18015, operator: 'admin',  action: 'config:economy:update',  target: 'speed_boost_multiplier: 1.5→2.0', ip: '10.20.***.40', ts: '2026-05-17 22:14:08', result: 'success' },
    { id: 18014, operator: 'alice',  action: 'pet:unban',              target: 'pet_i9j0k1l2 (NekoSan)',            ip: '10.20.***.41', ts: '2026-05-17 16:45:55', result: 'success' },
    { id: 18013, operator: 'admin',  action: 'config:flags:update',    target: 'FF_ANALYTICS_V2: false→true',      ip: '10.20.***.40', ts: '2026-05-17 11:20:14', result: 'success' },
    { id: 18012, operator: 'bob',    action: 'battle:unflag',          target: 'match_oo55pp66',                   ip: '10.20.***.42', ts: '2026-05-16 18:02:39', result: 'success' },
    { id: 18011, operator: 'admin',  action: 'gdpr:complete',          target: 'GDPR-2026-0046',                   ip: '10.20.***.40', ts: '2026-05-16 14:21:09', result: 'success' },
    { id: 18010, operator: 'carol',  action: 'pet:ban',                target: 'pet_m3n4o5p6 (BadWord_McGee)',      ip: '10.20.***.43', ts: '2026-05-15 10:11:48', result: 'success' },
    { id: 18009, operator: 'admin',  action: 'gdpr:process',           target: 'GDPR-2026-0047',                   ip: '10.20.***.40', ts: '2026-05-14 16:33:21', result: 'success' },
    { id: 18008, operator: 'alice',  action: 'leaderboard:remove',     target: 'rank#3 SpeedDemon99',              ip: '10.20.***.41', ts: '2026-05-13 09:18:55', result: 'success' },
    { id: 18007, operator: 'admin',  action: 'config:runtime:update',  target: 'legendary_weight: 3→2',            ip: '10.20.***.40', ts: '2026-05-12 20:47:33', result: 'success' },
    { id: 18006, operator: 'bob',    action: 'battle:flag',            target: 'match_gg77hh88',                   ip: '10.20.***.42', ts: '2026-05-12 11:55:02', result: 'success' },
  ],

  stats: {
    active_pets: 15847,
    claims_today: 234,
    gdpr_pending: 3,
    battles_today: 8934,
    suspicious_today: 5,
    email_success_rate: 99.2,
    email_bounce_rate: 0.3,
    emails_today: 1847,
    last_refresh: '2026-05-18 09:30',
  },

  emailLogs: [
    { id: 'tx_001', to: 'us***@gmail.com',   subject: '歡迎加入 Pixel Pet Arena', status: 'delivered', ts: '2026-05-18 09:20:00' },
    { id: 'tx_002', to: 'da***@yahoo.com',   subject: 'Claim 確認碼',             status: 'delivered', ts: '2026-05-18 09:18:00' },
    { id: 'tx_003', to: 'sp***@hotmail.com', subject: '異常登入警告',             status: 'bounced',   ts: '2026-05-18 09:15:00', bounce_reason: '信箱不存在' },
    { id: 'tx_004', to: 'pi***@outlook.com', subject: 'GDPR 資料請求確認',        status: 'delivered', ts: '2026-05-18 09:10:00' },
    { id: 'tx_005', to: 'ne***@proton.me',   subject: 'Claim 確認碼',             status: 'delivered', ts: '2026-05-18 09:05:00' },
    { id: 'tx_006', to: 'ba***@icloud.com',  subject: 'Arena 排名更新',           status: 'failed',    ts: '2026-05-18 09:00:00', bounce_reason: '伺服器拒絕' },
    { id: 'tx_007', to: 'ha***@gmail.com',   subject: '歡迎加入 Pixel Pet Arena', status: 'delivered', ts: '2026-05-18 08:55:00' },
    { id: 'tx_008', to: 'mu***@yahoo.com',   subject: 'Claim 確認碼',             status: 'delivered', ts: '2026-05-18 08:50:00' },
    { id: 'tx_009', to: 'bb***@gmail.com',   subject: '異常登入警告',             status: 'bounced',   ts: '2026-05-18 08:45:00', bounce_reason: '信箱已滿' },
    { id: 'tx_010', to: 'go***@hotmail.com', subject: 'Arena 排名更新',           status: 'delivered', ts: '2026-05-18 08:40:00' },
  ],
};

/* ==========================================================
   Shared helpers used by all pages
   ========================================================== */

function showToast(message, variant) {
  variant = variant || 'success';
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + variant;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('fade-out');
    setTimeout(function () { toast.remove(); }, 250);
  }, 2500);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function roleDisplayName(roleName) {
  const r = ADMIN_MOCK.roles.find(function (x) { return x.name === roleName; });
  return r ? r.display : roleName;
}

function roleColorClass(roleName) {
  const r = ADMIN_MOCK.roles.find(function (x) { return x.name === roleName; });
  return r ? r.color_class : 'read_only';
}

function canAccess(permission) {
  const role = ADMIN_MOCK.currentUser.role;
  const r = ADMIN_MOCK.roles.find(function (x) { return x.name === role; });
  if (!r) return false;
  return r.permissions.indexOf(permission) !== -1;
}

/* CSV download */
function downloadCSV(filename, rows) {
  const csvRows = rows.map(function (row) {
    return row.map(function (cell) {
      const s = String(cell == null ? '' : cell);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',');
  });
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* renderSidebar — shared across all non-login pages */
function renderSidebar(active) {
  const role = ADMIN_MOCK.currentUser.role;
  const isSuperAdmin = role === 'super_admin';
  const isModerator = role === 'moderator';
  const canSuspicious = isSuperAdmin || isModerator;

  function navItem(label, href, key) {
    const isActive = active === key ? ' active' : '';
    return '<li class="nav-item' + isActive + '"><a href="' + href + '">' + label + '</a></li>';
  }

  function navSection(title) {
    return '<li class="nav-section">' + title + '</li>';
  }

  let html = '';

  html += navSection('主要功能');
  html += navItem('📊 控制台',      'admin-dashboard.html',  'dashboard');
  html += navItem('🐾 寵物管理',    'pets.html',             'pets');
  html += navItem('⚔️ 戰鬥記錄',    'battles.html',          'battles');
  if (canSuspicious) {
    html += navItem('🚨 可疑活動',  'suspicious.html',       'suspicious');
  }
  html += navItem('🏆 排行榜管理',  'leaderboard.html',      'leaderboard');

  if (isSuperAdmin) {
    html += navSection('系統管理');
    html += navItem('🚩 Feature Flags',  'config-flags.html',    'config-flags');
    html += navItem('⚙️ Runtime 設定',   'config.html',          'config');
    html += navItem('💰 Economy 設定',   'config-economy.html',  'config-economy');
    html += navItem('🔐 GDPR 佇列',      'gdpr.html',            'gdpr');
    html += navItem('📜 稽核日誌',       'admin-audit-log.html', 'audit');
  }

  html += navSection('分析');
  html += navItem('📈 Analytics',   'analytics.html',        'analytics');
  html += navItem('📧 Email 監控',  'email.html',            'email');
  if (isSuperAdmin) {
    html += navItem('👥 角色管理',  'admin-roles.html',      'roles');
  }

  const roleClass = roleColorClass(role);
  const roleLabel = roleDisplayName(role);

  return '<nav class="admin-sidebar">'
    + '<div class="sidebar-brand">🛡️ Admin Portal</div>'
    + '<ul class="sidebar-nav">' + html + '</ul>'
    + '<div class="sidebar-footer">'
    + '<span class="role-tag ' + roleClass + '">' + roleLabel + '</span>'
    + '<span class="sidebar-username">' + escapeHtml(ADMIN_MOCK.currentUser.username) + '</span>'
    + '<button class="logout-btn sidebar-logout" onclick="location.href=\'admin-login.html\'">登出</button>'
    + '</div>'
    + '</nav>';
}
