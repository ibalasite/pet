/* ============================================================
   Mock data — pixel-pet-arena prototype
   Spec: prototype-spec (updated 2026-05)
   Exposed as window.MOCK
   ============================================================ */
(function () {
  // Sprite emojis keyed to pet name
  const SPRITE_BY_NAME = {
    'Blazewing':    '🔥',
    'Stonecrusher': '🪨',
    'Tidecrawler':  '🌊',
    'StormFang':    '⚡',
    'MireWalker':   '🌿',
    'SilverDart':   '🏹',
    'CoralWing':    '🦋',
    'GlacierTusk':  '❄️',
    'EmberClaw':    '🔴',
    'VoidSpinner':  '🕷️',
    'AI Opponent':  '🤖',
  };

  const pets = [
    {
      id: 'a1b2c3d4', seed: 8472910563, rarity: 'LEGENDARY', pet_name: 'Blazewing',
      stat_speed: 78, stat_strength: 65, stat_stamina: 82, level: 23,
      claimed_at: '2026-04-10', color_palette: ['#FF4500', '#FFD700'], accessory: 'crown',
      total_training_actions: 230, last_trained_at: '2026-05-17T10:20:00Z',
      masked_email: 'to***@yahooinc.com', arena_score: 9841, wins: 82, losses: 18
    },
    {
      id: 'd4e5f6a7', seed: 2910374856, rarity: 'EPIC', pet_name: 'Stonecrusher',
      stat_speed: 45, stat_strength: 89, stat_stamina: 71, level: 18,
      claimed_at: '2026-04-15', color_palette: ['#a29bfe', '#6c5ce7'], accessory: 'shield',
      total_training_actions: 180, last_trained_at: '2026-05-16T14:30:00Z',
      masked_email: 'ke***@example.com', arena_score: 8012, wins: 71, losses: 29
    },
    {
      id: 'b2c3d4e5', seed: 3920174856, rarity: 'RARE', pet_name: 'Tidecrawler',
      stat_speed: 62, stat_strength: 38, stat_stamina: 55, level: 9,
      claimed_at: '2026-04-22', color_palette: ['#4ecdc4', '#00b894'], accessory: 'scarf',
      total_training_actions: 90, last_trained_at: '2026-05-15T09:00:00Z',
      masked_email: 'el***@example.com', arena_score: 5234, wins: 58, losses: 42
    },
    {
      id: 'c3d4e5f6', seed: 5172938465, rarity: 'EPIC', pet_name: 'StormFang',
      stat_speed: 74, stat_strength: 72, stat_stamina: 68, level: 20,
      claimed_at: '2026-04-08', color_palette: ['#74b9ff', '#0984e3'], accessory: 'goggles',
      total_training_actions: 200, last_trained_at: '2026-05-17T08:45:00Z',
      masked_email: 'ja***@gmail.com', arena_score: 8923, wins: 76, losses: 24
    },
    {
      id: 'e5f6a7b8', seed: 6284750193, rarity: 'RARE', pet_name: 'MireWalker',
      stat_speed: 52, stat_strength: 44, stat_stamina: 66, level: 8,
      claimed_at: '2026-04-28', color_palette: ['#55efc4', '#00b894'], accessory: 'none',
      total_training_actions: 80, last_trained_at: '2026-05-14T12:00:00Z',
      masked_email: 'jo***@example.com', arena_score: 4891, wins: 54, losses: 46
    },
    {
      id: 'f6a7b8c9', seed: 7395861204, rarity: 'COMMON', pet_name: 'SilverDart',
      stat_speed: 44, stat_strength: 30, stat_stamina: 38, level: 4,
      claimed_at: '2026-05-01', color_palette: ['#b2bec3', '#dfe6e9'], accessory: 'none',
      total_training_actions: 40, last_trained_at: '2026-05-10T16:30:00Z',
      masked_email: 'le***@yahoo.com', arena_score: 3120, wins: 40, losses: 60
    },
    {
      id: 'a7b8c9d0', seed: 8406972315, rarity: 'EPIC', pet_name: 'CoralWing',
      stat_speed: 66, stat_strength: 58, stat_stamina: 60, level: 14,
      claimed_at: '2026-04-12', color_palette: ['#fd79a8', '#e84393'], accessory: 'wings',
      total_training_actions: 140, last_trained_at: '2026-05-16T19:10:00Z',
      masked_email: 'mi***@example.com', arena_score: 7450, wins: 68, losses: 32
    },
    {
      id: 'b8c9d0e1', seed: 9517083426, rarity: 'LEGENDARY', pet_name: 'GlacierTusk',
      stat_speed: 55, stat_strength: 90, stat_stamina: 88, level: 25,
      claimed_at: '2026-04-05', color_palette: ['#74b9ff', '#a29bfe'], accessory: 'armor',
      total_training_actions: 250, last_trained_at: '2026-05-17T06:00:00Z',
      masked_email: 'ya***@yahoo.com', arena_score: 9210, wins: 85, losses: 15
    },
    {
      id: 'c9d0e1f2', seed: 1628194537, rarity: 'RARE', pet_name: 'EmberClaw',
      stat_speed: 58, stat_strength: 55, stat_stamina: 48, level: 7,
      claimed_at: '2026-04-25', color_palette: ['#e17055', '#d63031'], accessory: 'claws',
      total_training_actions: 70, last_trained_at: '2026-05-13T22:00:00Z',
      masked_email: 'an***@example.com', arena_score: 4200, wins: 45, losses: 55
    },
    {
      id: 'd0e1f2a3', seed: 2739205648, rarity: 'EPIC', pet_name: 'VoidSpinner',
      stat_speed: 70, stat_strength: 62, stat_stamina: 64, level: 16,
      claimed_at: '2026-04-18', color_palette: ['#6c5ce7', '#a29bfe'], accessory: 'web',
      total_training_actions: 160, last_trained_at: '2026-05-17T02:30:00Z',
      masked_email: 'ko***@gmail.com', arena_score: 7890, wins: 72, losses: 28
    },
  ].map(p => Object.assign({}, p, { sprite: SPRITE_BY_NAME[p.pet_name] || '🐾' }));

  const battles = [
    { id: 'm001', date: '2026-05-17', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'Stonecrusher', winner: 'Blazewing',    duration_seconds: 12, completed_at: '2026-05-17T09:45:00Z', is_ai_opponent: false, stat_delta_a: 5, stat_delta_b: 0, outcome: 'WIN' },
    { id: 'm002', date: '2026-05-16', mode: 'SUMO',  pet_a: 'StormFang',    pet_b: 'Blazewing',    winner: 'StormFang',    duration_seconds: 18, completed_at: '2026-05-16T18:22:00Z', is_ai_opponent: false, stat_delta_a: 3, stat_delta_b: 0, outcome: 'LOSS' },
    { id: 'm003', date: '2026-05-16', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'AI Opponent',  winner: 'Blazewing',    duration_seconds: 13, completed_at: '2026-05-16T14:08:00Z', is_ai_opponent: true,  stat_delta_a: 4, stat_delta_b: 0, outcome: 'WIN',  opponent_rarity: 'COMMON' },
    { id: 'm004', date: '2026-05-15', mode: 'SUMO',  pet_a: 'Blazewing',    pet_b: 'GlacierTusk',  winner: 'GlacierTusk',  duration_seconds: 22, completed_at: '2026-05-15T20:15:00Z', is_ai_opponent: false, stat_delta_a: 0, stat_delta_b: 6, outcome: 'LOSS' },
    { id: 'm005', date: '2026-05-15', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'Tidecrawler',  winner: 'Blazewing',    duration_seconds: 10, completed_at: '2026-05-15T11:30:00Z', is_ai_opponent: false, stat_delta_a: 3, stat_delta_b: 0, outcome: 'WIN' },
    { id: 'm006', date: '2026-05-14', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'CoralWing',    winner: 'Blazewing',    duration_seconds: 15, completed_at: '2026-05-14T16:40:00Z', is_ai_opponent: false, stat_delta_a: 4, stat_delta_b: 0, outcome: 'WIN' },
    { id: 'm007', date: '2026-05-14', mode: 'SUMO',  pet_a: 'VoidSpinner',  pet_b: 'Blazewing',    winner: 'Blazewing',    duration_seconds: 19, completed_at: '2026-05-14T09:10:00Z', is_ai_opponent: false, stat_delta_a: 2, stat_delta_b: 0, outcome: 'WIN' },
    { id: 'm008', date: '2026-05-13', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'StormFang',    winner: 'StormFang',    duration_seconds: 14, completed_at: '2026-05-13T21:05:00Z', is_ai_opponent: false, stat_delta_a: 0, stat_delta_b: 5, outcome: 'LOSS' },
    { id: 'm009', date: '2026-05-13', mode: 'SUMO',  pet_a: 'Blazewing',    pet_b: 'AI Opponent',  winner: 'Blazewing',    duration_seconds: 11, completed_at: '2026-05-13T12:00:00Z', is_ai_opponent: true,  stat_delta_a: 3, stat_delta_b: 0, outcome: 'WIN',  opponent_rarity: 'COMMON' },
    { id: 'm010', date: '2026-05-12', mode: 'RACE',  pet_a: 'Blazewing',    pet_b: 'MireWalker',   winner: 'Blazewing',    duration_seconds: 9,  completed_at: '2026-05-12T17:20:00Z', is_ai_opponent: false, stat_delta_a: 2, stat_delta_b: 0, outcome: 'WIN' },
  ];

  const foodInventory = [
    { type: 'SPEED_BERRY',     id: 'speed_berry',      label: 'Speed Berry',      icon: '🫐', buff_stat: 'speed',    magnitude: 5,  duration_hours: 24, quantity: 2, owned: 2 },
    { type: 'POWER_MUSHROOM',  id: 'power_mushroom',   label: 'Power Mushroom',   icon: '🍄', buff_stat: 'strength', magnitude: 3,  duration_hours: null, quantity: 1, owned: 1 },
    { type: 'ENDURANCE_ROOT',  id: 'endurance_root',   label: 'Endurance Root',   icon: '🥕', buff_stat: 'stamina',  magnitude: 4,  duration_hours: 48, quantity: 3, owned: 3 },
    { type: 'RAINBOW_TRUFFLE', id: 'rainbow_truffle',  label: 'Rainbow Truffle',  icon: '✨', buff_stat: 'all',      magnitude: 2,  duration_hours: 12, quantity: 1, owned: 1 },
  ];

  const leaderboard = [...pets]
    .sort((a, b) => b.arena_score - a.arena_score)
    .map((p, idx) => {
      const total = (p.wins + p.losses) || 1;
      return Object.assign({}, p, {
        rank: idx + 1,
        win_rate: ((p.wins / total) * 100).toFixed(1),
      });
    });

  const gdpr_requests = [
    { id: 'gdpr-001', request_type: 'ERASURE', status: 'PENDING',   sla_deadline: '2026-05-25T08:00:00Z', submitted_at: '2026-05-18T08:00:00Z' },
    { id: 'gdpr-002', request_type: 'ACCESS',  status: 'COMPLETED', sla_deadline: '2026-05-15T10:00:00Z', submitted_at: '2026-05-08T10:00:00Z', completed_at: '2026-05-09T11:30:00Z' },
    { id: 'gdpr-003', request_type: 'OBJECT',  status: 'PROCESSING', sla_deadline: '2026-05-22T14:00:00Z', submitted_at: '2026-05-15T14:00:00Z' },
  ];

  const currentPet = pets[0]; // Blazewing (LEGENDARY)

  window.MOCK = {
    pets,
    battles,
    food: foodInventory,
    foodInventory,
    leaderboard,
    gdpr_requests,
    currentPet,
    guestPet: { id: 'guest001', seed: 5678, rarity: 'COMMON', pet_name: '??', unclaimed: true, sprite: '❓' },
    metrics: {
      claimed_today: 14738,
      dau: 800,
      marketplace_unlock_dau: 1000,
      training_streak: 7,
      total_pets: 48291,
    },
    // Demo OTP — NOT a real secret. This is a static UI prototype with no backend.
    otp_code: '847291', // nosec - mock-only demo value, no security boundary
  };
})();
