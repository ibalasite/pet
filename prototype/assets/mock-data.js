/* ============================================================
   Mock data 1:1 from prototype-spec.yaml mock_data.
   Exposed as window.MOCK
   ============================================================ */
(function () {
  // Sprite emojis assigned by rarity for visual variety
  const SPRITE_BY_NAME = {
    'Crimson Phoenix': '🔥',
    'Azure Whisper':   '🐉',
    'Mossy Cub':       '🐻',
    'Sandbar Pip':     '🦊',
    'Onyx Sprinter':   '🐺',
    'Twilight Tuft':   '🦉',
    'Pebble Pup':      '🐶',
    'Solar Drake':     '☀️',
    'Cobalt Dasher':   '⚡',
    'Ember Whisker':   '🐱',
    'AI Opponent':     '🤖',
  };

  const pets = [
    { id: '11111111-1111-4111-8111-111111111111', seed: 9876543210, rarity: 'LEGENDARY', pet_name: 'Crimson Phoenix',  stat_speed: 87, stat_strength: 64, stat_stamina: 72, level: 15, total_training_actions: 145, last_trained_at: '2026-05-10T08:32:00Z', masked_email: 'to***@yahooinc.com', arena_score: 2450, wins: 32, losses: 8 },
    { id: '22222222-2222-4222-8222-222222222222', seed: 1234567890, rarity: 'EPIC',      pet_name: 'Azure Whisper',   stat_speed: 71, stat_strength: 58, stat_stamina: 60, level: 11, total_training_actions: 102, last_trained_at: '2026-05-10T07:11:00Z', masked_email: 'ja***@gmail.com',    arena_score: 1980, wins: 22, losses: 9 },
    { id: '33333333-3333-4333-8333-333333333333', seed: 1357924680, rarity: 'RARE',      pet_name: 'Mossy Cub',       stat_speed: 55, stat_strength: 49, stat_stamina: 52, level: 7,  total_training_actions: 64,  last_trained_at: '2026-05-09T22:08:00Z', masked_email: 'el***@example.com', arena_score: 1450, wins: 14, losses: 10 },
    { id: '44444444-4444-4444-8444-444444444444', seed: 2468135790, rarity: 'COMMON',    pet_name: 'Sandbar Pip',     stat_speed: 38, stat_strength: 32, stat_stamina: 41, level: 3,  total_training_actions: 28,  last_trained_at: '2026-05-08T15:30:00Z', masked_email: 'jo***@example.com', arena_score: 870,  wins: 6,  losses: 9 },
    { id: '55555555-5555-4555-8555-555555555555', seed: 9192939495, rarity: 'EPIC',      pet_name: 'Onyx Sprinter',   stat_speed: 81, stat_strength: 51, stat_stamina: 55, level: 9,  total_training_actions: 88,  last_trained_at: '2026-05-09T19:45:00Z', masked_email: 'le***@yahoo.com',   arena_score: 2080, wins: 24, losses: 7 },
    { id: '66666666-6666-4666-8666-666666666666', seed: 1112131415, rarity: 'RARE',      pet_name: 'Twilight Tuft',   stat_speed: 60, stat_strength: 44, stat_stamina: 50, level: 5,  total_training_actions: 47,  last_trained_at: '2026-05-09T11:00:00Z', masked_email: 'ke***@example.com', arena_score: 1340, wins: 12, losses: 11 },
    { id: '77777777-7777-4777-8777-777777777777', seed: 8081828384, rarity: 'COMMON',    pet_name: 'Pebble Pup',      stat_speed: 33, stat_strength: 35, stat_stamina: 39, level: 2,  total_training_actions: 19,  last_trained_at: '2026-05-07T10:30:00Z', masked_email: 'an***@example.com', arena_score: 690,  wins: 4,  losses: 8 },
    { id: '88888888-8888-4888-8888-888888888888', seed: 5051525354, rarity: 'LEGENDARY', pet_name: 'Solar Drake',     stat_speed: 92, stat_strength: 78, stat_stamina: 81, level: 20, total_training_actions: 192, last_trained_at: '2026-05-11T05:00:00Z', masked_email: 'ya***@yahoo.com',   arena_score: 2780, wins: 41, losses: 6 },
    { id: '99999999-9999-4999-8999-999999999999', seed: 6061626364, rarity: 'EPIC',      pet_name: 'Cobalt Dasher',   stat_speed: 76, stat_strength: 53, stat_stamina: 57, level: 10, total_training_actions: 95,  last_trained_at: '2026-05-10T13:25:00Z', masked_email: 'ko***@gmail.com',   arena_score: 1850, wins: 19, losses: 9 },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', seed: 7071727374, rarity: 'RARE',      pet_name: 'Ember Whisker',   stat_speed: 58, stat_strength: 52, stat_stamina: 48, level: 8,  total_training_actions: 71,  last_trained_at: '2026-05-09T16:42:00Z', masked_email: 'mi***@example.com', arena_score: 1280, wins: 11, losses: 10 },
  ].map(p => Object.assign(p, { sprite: SPRITE_BY_NAME[p.pet_name] || '🐾' }));

  const battles = [
    { id: 'b1111111-1111-4111-8111-111111111111', pet_a: 'Crimson Phoenix', pet_b: 'Onyx Sprinter',  mode: 'RACE', winner: 'Crimson Phoenix', duration_seconds: 12, completed_at: '2026-05-11T09:45:00Z', is_ai_opponent: false, stat_delta_a: 5, stat_delta_b: 0 },
    { id: 'b2222222-2222-4222-8222-222222222222', pet_a: 'Crimson Phoenix', pet_b: 'Twilight Tuft',  mode: 'SUMO', winner: 'Crimson Phoenix', duration_seconds: 18, completed_at: '2026-05-10T18:22:00Z', is_ai_opponent: false, stat_delta_a: 3, stat_delta_b: 0 },
    { id: 'b3333333-3333-4333-8333-333333333333', pet_a: 'Azure Whisper',  pet_b: 'Crimson Phoenix', mode: 'RACE', winner: 'Azure Whisper',   duration_seconds: 14, completed_at: '2026-05-10T11:10:00Z', is_ai_opponent: false, stat_delta_a: 4, stat_delta_b: 0 },
    { id: 'b4444444-4444-4444-8444-444444444444', pet_a: 'Solar Drake',    pet_b: 'Cobalt Dasher',   mode: 'RACE', winner: 'Solar Drake',     duration_seconds: 11, completed_at: '2026-05-11T05:30:00Z', is_ai_opponent: false, stat_delta_a: 6, stat_delta_b: 0 },
    { id: 'b5555555-5555-4555-8555-555555555555', pet_a: 'Mossy Cub',      pet_b: 'Pebble Pup',      mode: 'SUMO', winner: 'Mossy Cub',       duration_seconds: 22, completed_at: '2026-05-09T20:15:00Z', is_ai_opponent: false, stat_delta_a: 2, stat_delta_b: 0 },
    { id: 'b6666666-6666-4666-8666-666666666666', pet_a: 'Crimson Phoenix', pet_b: 'AI Opponent',    mode: 'RACE', winner: 'Crimson Phoenix', duration_seconds: 13, completed_at: '2026-05-09T14:08:00Z', is_ai_opponent: true,  stat_delta_a: 4, stat_delta_b: 0 },
  ];

  const food = [
    { id: 'speed_berry',     name: 'Speed Berry',     buff_stat: 'speed',    magnitude: 5, duration_hours: 24, owned: 3, icon: '🫐' },
    { id: 'muscle_jerky',    name: 'Muscle Jerky',    buff_stat: 'strength', magnitude: 5, duration_hours: 24, owned: 2, icon: '🥩' },
    { id: 'endurance_root',  name: 'Endurance Root',  buff_stat: 'stamina',  magnitude: 5, duration_hours: 24, owned: 4, icon: '🥕' },
    { id: 'rainbow_truffle', name: 'Rainbow Truffle', buff_stat: 'all',      magnitude: 3, duration_hours: 12, owned: 1, icon: '🍄' },
  ];

  const marketplace_listings = [
    { id: 'ml-001', pet_name: 'Onyx Sprinter',  rarity: 'EPIC',      price_credits: 3500, listed_at: '2026-05-08T11:00:00Z', looking_for: 'Epic+ pet with stamina >= 70' },
    { id: 'ml-002', pet_name: 'Twilight Tuft',  rarity: 'RARE',      price_credits: 1200, listed_at: '2026-05-09T14:30:00Z', looking_for: 'Common with high speed' },
    { id: 'ml-003', pet_name: 'Solar Drake',    rarity: 'LEGENDARY', price_credits: 9800, listed_at: '2026-05-10T09:00:00Z', looking_for: null },
  ].map(l => {
    const p = pets.find(x => x.pet_name === l.pet_name);
    return Object.assign({}, l, { sprite: p ? p.sprite : '🐾' });
  });

  const gdpr_requests = [
    { id: 'gdpr-001', request_type: 'ERASURE',   status: 'PENDING',   sla_deadline: '2026-05-18T08:00:00Z', submitted_at: '2026-05-11T08:00:00Z' },
    { id: 'gdpr-002', request_type: 'ACCESS',    status: 'COMPLETED', sla_deadline: '2026-05-15T10:00:00Z', submitted_at: '2026-05-08T10:00:00Z', completed_at: '2026-05-09T11:30:00Z' },
  ];

  // Rank-sorted leaderboard (descending arena_score)
  const leaderboard = [...pets]
    .sort((a, b) => b.arena_score - a.arena_score)
    .map((p, idx) => {
      const totalBattles = (p.wins + p.losses) || 1; // guard against divide-by-zero for fresh pets
      return Object.assign({}, p, {
        rank: idx + 1,
        win_rate: ((p.wins / totalBattles) * 100).toFixed(1),
      });
    });

  // Default current pet = Crimson Phoenix (the LEGENDARY first pet)
  const currentPet = pets[0];

  window.MOCK = {
    pets,
    battles,
    food,
    marketplace_listings,
    gdpr_requests,
    leaderboard,
    currentPet,
    // simulated metrics
    metrics: {
      claimed_today: 12453,
      dau: 800,
      marketplace_unlock_dau: 1000,
      training_streak: 7,
    },
    // Claim-flow demo OTP. NOT a real secret — this is a static UI prototype with no backend
    // and no real auth. The "code" is shown plainly inline in screen-02 for the demo wizard.
    otp_code: '123456', // nosec - mock-only demo value, no security boundary
  };
})();
