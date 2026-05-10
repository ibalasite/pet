/* ==========================================================
   Pixel Pet Arena — Admin Portal Mock Data
   Used by all admin-*.html prototype pages.
   ========================================================== */

const ADMIN_MOCK = {
  currentUser: {
    id: 1,
    username: 'admin',
    name: 'System Admin',
    email: 'admin@pixelpet.arena',
    role: 'super_admin',
    role_display: 'Super Admin',
    mfa_enabled: true,
    last_login: '2026-05-11 09:23:11',
  },

  users: [
    {
      id: 1,
      username: 'admin',
      name: 'System Admin',
      email: 'admin@pixelpet.arena',
      role: 'super_admin',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-11 09:23:11',
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
      last_login: '2026-05-11 08:51:42',
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
      last_login: '2026-05-10 22:18:09',
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
      last_login: '2026-05-11 07:02:33',
      created_at: '2025-10-04 09:00:00',
    },
    {
      id: 5,
      username: 'dave',
      name: 'Dave Müller',
      email: 'dave@pixelpet.arena',
      role: 'auditor',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-10 16:45:21',
      created_at: '2025-10-18 11:30:00',
    },
    {
      id: 6,
      username: 'eve',
      name: 'Eve Johansson',
      email: 'eve@pixelpet.arena',
      role: 'auditor',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-09 14:22:50',
      created_at: '2025-11-02 08:45:00',
    },
    {
      id: 7,
      username: 'frank',
      name: 'Frank Oliveira',
      email: 'frank@pixelpet.arena',
      role: 'support_agent',
      status: 'locked',
      mfa_enabled: false,
      last_login: '2026-04-28 11:10:00',
      created_at: '2025-12-01 13:00:00',
      lock_reason: '5 failed login attempts',
    },
    {
      id: 8,
      username: 'grace',
      name: 'Grace Park',
      email: 'grace@pixelpet.arena',
      role: 'analyst',
      status: 'active',
      mfa_enabled: true,
      last_login: '2026-05-11 06:14:08',
      created_at: '2026-01-14 10:00:00',
    },
  ],

  roles: [
    {
      id: 'super_admin',
      display: 'Super Admin',
      description: 'Full system access. Can manage roles, users, runtime config, and review every audit log.',
      user_count: 1,
      color_class: 'super',
      permissions: [
        'pet.view', 'pet.ban', 'pet.flag', 'pet.unban',
        'leaderboard.view', 'leaderboard.adjust', 'leaderboard.exclude',
        'battle.view', 'battle.invalidate',
        'user.view', 'user.create', 'user.edit', 'user.lock', 'user.unlock', 'user.delete',
        'role.view', 'role.assign', 'role.create', 'role.edit', 'role.delete',
        'audit.view', 'audit.export',
        'config.view', 'config.edit',
        'email.view', 'email.resend',
        'analytics.view', 'analytics.export',
        'gdpr.view', 'gdpr.process',
      ],
    },
    {
      id: 'moderator',
      display: 'Moderator',
      description: 'Pet, leaderboard, and battle moderation. Cannot manage admin users or runtime config.',
      user_count: 3,
      color_class: 'moderator',
      permissions: [
        'pet.view', 'pet.ban', 'pet.flag', 'pet.unban',
        'leaderboard.view', 'leaderboard.adjust', 'leaderboard.exclude',
        'battle.view', 'battle.invalidate',
        'user.view',
        'audit.view',
      ],
    },
    {
      id: 'auditor',
      display: 'Auditor',
      description: 'Read-only access plus audit log export. Cannot mutate any state.',
      user_count: 2,
      color_class: 'auditor',
      permissions: [
        'pet.view',
        'leaderboard.view',
        'battle.view',
        'user.view',
        'role.view',
        'audit.view', 'audit.export',
        'config.view',
        'email.view',
        'analytics.view',
      ],
    },
    {
      id: 'support_agent',
      display: 'Support Agent',
      description: 'GDPR queue and email delivery monitoring. Limited customer-facing tools.',
      user_count: 1,
      color_class: 'support',
      permissions: [
        'user.view',
        'gdpr.view', 'gdpr.process',
        'email.view', 'email.resend',
        'audit.view',
      ],
    },
    {
      id: 'analyst',
      display: 'Analyst',
      description: 'Analytics dashboards and read-only data exports. No moderation rights.',
      user_count: 1,
      color_class: 'analyst',
      permissions: [
        'pet.view',
        'leaderboard.view',
        'battle.view',
        'user.view',
        'analytics.view', 'analytics.export',
      ],
    },
  ],

  permissions: [
    { module: 'pet', action: 'view', desc: 'View pet profiles and history' },
    { module: 'pet', action: 'ban', desc: 'Ban pets violating ToS' },
    { module: 'pet', action: 'flag', desc: 'Flag pets for review' },
    { module: 'pet', action: 'unban', desc: 'Reverse ban / unban pets' },
    { module: 'leaderboard', action: 'view', desc: 'View arena leaderboard' },
    { module: 'leaderboard', action: 'adjust', desc: 'Manually adjust ELO entries' },
    { module: 'leaderboard', action: 'exclude', desc: 'Exclude entries from public board' },
    { module: 'battle', action: 'view', desc: 'View battle records' },
    { module: 'battle', action: 'invalidate', desc: 'Invalidate disputed battles' },
    { module: 'user', action: 'view', desc: 'View end-user accounts' },
    { module: 'user', action: 'create', desc: 'Create admin users' },
    { module: 'user', action: 'edit', desc: 'Edit admin user details' },
    { module: 'user', action: 'lock', desc: 'Lock admin accounts' },
    { module: 'user', action: 'unlock', desc: 'Unlock admin accounts' },
    { module: 'user', action: 'delete', desc: 'Delete admin accounts' },
    { module: 'role', action: 'view', desc: 'View roles' },
    { module: 'role', action: 'assign', desc: 'Assign roles to users' },
    { module: 'role', action: 'create', desc: 'Create custom roles' },
    { module: 'role', action: 'edit', desc: 'Edit role permissions' },
    { module: 'role', action: 'delete', desc: 'Delete custom roles' },
    { module: 'audit', action: 'view', desc: 'View audit log' },
    { module: 'audit', action: 'export', desc: 'Export audit log to CSV' },
    { module: 'config', action: 'view', desc: 'View runtime config' },
    { module: 'config', action: 'edit', desc: 'Modify runtime tunables' },
    { module: 'email', action: 'view', desc: 'View email delivery dashboard' },
    { module: 'email', action: 'resend', desc: 'Resend bounced emails' },
    { module: 'analytics', action: 'view', desc: 'View analytics dashboards' },
    { module: 'analytics', action: 'export', desc: 'Export analytics reports' },
    { module: 'gdpr', action: 'view', desc: 'View GDPR data requests' },
    { module: 'gdpr', action: 'process', desc: 'Process erasure / export requests' },
  ],

  auditLogs: [
    { id: 18001, operator: 'admin',  operator_name: 'System Admin',   action: 'CONFIG_CHANGE',     target: 'arena.matchmaking.elo_window',   ip: '10.20.30.40',  ts: '2026-05-11 09:24:55', result: 'success', detail: 'Adjusted from 200 to 250' },
    { id: 18000, operator: 'alice',  operator_name: 'Alice Chen',     action: 'PET_BAN',           target: 'pet#3045 (RoarBeast)',           ip: '10.20.30.41',  ts: '2026-05-11 09:18:02', result: 'success', detail: 'Inappropriate name' },
    { id: 17999, operator: 'bob',    operator_name: 'Bob Tanaka',     action: 'PET_FLAG',          target: 'pet#3102 (xxx_fart_xxx)',        ip: '10.20.30.42',  ts: '2026-05-11 09:01:39', result: 'success', detail: 'Suspected slur' },
    { id: 17998, operator: 'admin',  operator_name: 'System Admin',   action: 'USER_CREATE',       target: 'admin_user#9 (henry)',           ip: '10.20.30.40',  ts: '2026-05-11 08:47:21', result: 'success', detail: 'Created with role analyst' },
    { id: 17997, operator: 'frank',  operator_name: 'Frank Oliveira', action: 'LOGIN_FAILED',      target: 'frank',                          ip: '203.0.113.7',  ts: '2026-05-11 08:30:11', result: 'failed',  detail: 'Wrong TOTP — 5th attempt' },
    { id: 17996, operator: 'admin',  operator_name: 'System Admin',   action: 'USER_LOCK',         target: 'admin_user#7 (frank)',           ip: '10.20.30.40',  ts: '2026-05-11 08:31:02', result: 'success', detail: 'Auto-locked after 5 failures' },
    { id: 17995, operator: 'carol',  operator_name: 'Carol Singh',    action: 'BATTLE_INVALIDATE', target: 'battle#88712',                   ip: '10.20.30.43',  ts: '2026-05-10 22:14:08', result: 'success', detail: 'Bot abuse confirmed' },
    { id: 17994, operator: 'dave',   operator_name: 'Dave Müller',    action: 'AUDIT_EXPORT',      target: 'audit_log range=14d',            ip: '10.20.30.44',  ts: '2026-05-10 16:45:55', result: 'success', detail: '342 rows exported' },
    { id: 17993, operator: 'grace',  operator_name: 'Grace Park',     action: 'ANALYTICS_EXPORT',  target: 'dau_report 2026-05',             ip: '10.20.30.46',  ts: '2026-05-10 11:20:14', result: 'success', detail: 'CSV download' },
    { id: 17992, operator: 'admin',  operator_name: 'System Admin',   action: 'ROLE_ASSIGN',       target: 'admin_user#8 (grace) → analyst', ip: '10.20.30.40',  ts: '2026-05-09 18:02:39', result: 'success', detail: 'Promoted from support_agent' },
    { id: 17991, operator: 'eve',    operator_name: 'Eve Johansson',  action: 'AUDIT_VIEW',        target: 'audit_log filter=ROLE_ASSIGN',   ip: '10.20.30.45',  ts: '2026-05-09 14:21:09', result: 'success', detail: 'Compliance report' },
    { id: 17990, operator: 'alice',  operator_name: 'Alice Chen',     action: 'PET_UNBAN',         target: 'pet#2814 (NekoSan)',             ip: '10.20.30.41',  ts: '2026-05-09 10:11:48', result: 'success', detail: 'False positive resolved' },
    { id: 17989, operator: 'frank',  operator_name: 'Frank Oliveira', action: 'GDPR_PROCESS',      target: 'gdpr_req#GDPR-2026-0042',        ip: '10.20.30.47',  ts: '2026-05-08 16:33:21', result: 'success', detail: 'Data export delivered' },
    { id: 17988, operator: 'frank',  operator_name: 'Frank Oliveira', action: 'EMAIL_RESEND',      target: 'tx#tx-20260508-77891',           ip: '10.20.30.47',  ts: '2026-05-08 09:18:55', result: 'success', detail: 'Bounced — soft bounce retry' },
    { id: 17987, operator: 'bob',    operator_name: 'Bob Tanaka',     action: 'LEADERBOARD_EXCLUDE',target: 'pet#1207 (HackerCat)',          ip: '10.20.30.42',  ts: '2026-05-07 20:47:33', result: 'success', detail: 'ELO manipulation detected' },
    { id: 17986, operator: 'admin',  operator_name: 'System Admin',   action: 'CONFIG_CHANGE',     target: 'email.smtp.timeout_ms',          ip: '10.20.30.40',  ts: '2026-05-06 11:55:02', result: 'success', detail: '5000 → 8000' },
    { id: 17985, operator: 'carol',  operator_name: 'Carol Singh',    action: 'PET_BAN',           target: 'pet#2901 (BadWord_McGee)',       ip: '10.20.30.43',  ts: '2026-05-04 14:21:40', result: 'success', detail: 'Profanity filter override' },
    { id: 17984, operator: 'admin',  operator_name: 'System Admin',   action: 'ROLE_ASSIGN',       target: 'admin_user#3 (bob) → moderator', ip: '10.20.30.40',  ts: '2026-04-28 09:12:02', result: 'success', detail: 'Onboarding complete' },
  ],

  stats: {
    total_users: 8,
    active_users: 6,
    locked_users: 1,
    inactive_users: 1,
    total_roles: 5,
    audit_today: 7,
    audit_month: 89,
    suspicious_pets_today: 3,
    gdpr_pending: 2,
    email_bounce_rate: 1.2,
    last_refresh: '2026-05-11 09:30',
  },

  pets: [
    { id: 3045, name: 'RoarBeast',     emoji: '🐉', owner: 'user#11023', status: 'banned',  flagged_reason: 'Inappropriate name', flagged_at: '2026-05-11 09:18' },
    { id: 3102, name: 'xxx_fart_xxx',  emoji: '🐱', owner: 'user#11198', status: 'flagged', flagged_reason: 'Suspected slur',     flagged_at: '2026-05-11 09:01' },
    { id: 3110, name: 'GiantPickle',   emoji: '🐸', owner: 'user#11201', status: 'flagged', flagged_reason: 'Auto-flag: profanity score 0.87', flagged_at: '2026-05-11 08:42' },
    { id: 3088, name: 'NormalDoggo',   emoji: '🐶', owner: 'user#11154', status: 'flagged', flagged_reason: 'User report x3',     flagged_at: '2026-05-10 22:14' },
    { id: 2901, name: 'BadWord_McGee', emoji: '🦊', owner: 'user#10987', status: 'banned',  flagged_reason: 'Profanity override', flagged_at: '2026-05-04 14:21' },
    { id: 2814, name: 'NekoSan',       emoji: '🐈', owner: 'user#10845', status: 'active',  flagged_reason: 'Unbanned (false positive)', flagged_at: '2026-05-09 10:11' },
    { id: 2780, name: 'PixelDragon',   emoji: '🐲', owner: 'user#10823', status: 'active',  flagged_reason: '—', flagged_at: '—' },
    { id: 2755, name: 'Munchkin',      emoji: '🐹', owner: 'user#10798', status: 'active',  flagged_reason: '—', flagged_at: '—' },
    { id: 1207, name: 'HackerCat',     emoji: '😼', owner: 'user#9123',  status: 'flagged', flagged_reason: 'ELO manipulation',   flagged_at: '2026-05-07 20:47' },
    { id: 999,  name: 'OldFriend',     emoji: '🐰', owner: 'user#8001',  status: 'active',  flagged_reason: '—', flagged_at: '—' },
    { id: 750,  name: 'Goldfishie',    emoji: '🐠', owner: 'user#7541',  status: 'active',  flagged_reason: '—', flagged_at: '—' },
    { id: 612,  name: 'BananaBear',    emoji: '🐻', owner: 'user#7299',  status: 'flagged', flagged_reason: 'User report x2',     flagged_at: '2026-05-11 06:55' },
  ],

  battles: [
    { id: 88712, attacker: 'pet#1207 (HackerCat)', defender: 'pet#2780 (PixelDragon)', winner: 'pet#1207', status: 'invalidated', ts: '2026-05-10 22:08:14' },
    { id: 88711, attacker: 'pet#2814 (NekoSan)',   defender: 'pet#999 (OldFriend)',    winner: 'pet#2814', status: 'valid',       ts: '2026-05-10 21:55:00' },
    { id: 88710, attacker: 'pet#2780 (PixelDragon)', defender: 'pet#612 (BananaBear)', winner: 'pet#2780', status: 'valid',       ts: '2026-05-10 21:30:42' },
  ],

  gdprRequests: [
    { id: 'GDPR-2026-0044', user_id: 'user#12345', type: 'erasure',  submitted: '2026-05-10 18:22', status: 'pending',     deadline: '2026-06-09', assignee: '—' },
    { id: 'GDPR-2026-0043', user_id: 'user#12108', type: 'export',   submitted: '2026-05-09 11:08', status: 'pending',     deadline: '2026-06-08', assignee: '—' },
    { id: 'GDPR-2026-0042', user_id: 'user#11942', type: 'export',   submitted: '2026-05-07 09:14', status: 'in_progress', deadline: '2026-06-06', assignee: 'frank' },
    { id: 'GDPR-2026-0041', user_id: 'user#11804', type: 'erasure',  submitted: '2026-05-04 14:50', status: 'completed',   deadline: '2026-06-03', assignee: 'frank' },
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
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 250);
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

function roleDisplay(roleId) {
  const r = ADMIN_MOCK.roles.find((x) => x.id === roleId);
  return r ? r.display : roleId;
}

function roleColorClass(roleId) {
  const r = ADMIN_MOCK.roles.find((x) => x.id === roleId);
  return r ? r.color_class : 'auditor';
}

/* CSV download for audit-log page */
function downloadCSV(filename, rows) {
  const csvRows = rows.map((row) =>
    row
      .map((cell) => {
        const s = String(cell == null ? '' : cell);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      })
      .join(',')
  );
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
