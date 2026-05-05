/* =========================================================
   PIXEL PET ARENA — Mock Data
   window.MOCK_DATA is available globally after this script loads
   ========================================================= */
(function () {
  'use strict';

  var pets = [
    { id: 'pet-001', seed: 8472938471, rarity: 'RARE',      pet_name: 'Teal Spark',    stat_speed: 42, stat_strength: 31, stat_stamina: 55, level: 7,  last_trained_at: '2026-05-04T10:23:00Z', arena_score: 2470, win_rate: 0.58, emoji: '🌊' },
    { id: 'pet-002', seed: 1234567890, rarity: 'LEGENDARY',  pet_name: 'Golden Flare',  stat_speed: 88, stat_strength: 79, stat_stamina: 91, level: 22, last_trained_at: '2026-05-05T06:00:00Z', arena_score: 4150, win_rate: 0.83, emoji: '🔥' },
    { id: 'pet-003', seed: 9876543210, rarity: 'EPIC',       pet_name: 'Purple Storm',  stat_speed: 63, stat_strength: 71, stat_stamina: 58, level: 14, last_trained_at: '2026-05-03T20:00:00Z', arena_score: 3210, win_rate: 0.71, emoji: '⚡' },
    { id: 'pet-004', seed: 1111111111, rarity: 'COMMON',     pet_name: 'Grey Pebble',   stat_speed: 18, stat_strength: 22, stat_stamina: 25, level: 3,  last_trained_at: '2026-05-01T08:00:00Z', arena_score: 940,  win_rate: 0.32, emoji: '🪨' },
    { id: 'pet-005', seed: 5555555555, rarity: 'EPIC',       pet_name: 'Void Stalker',  stat_speed: 71, stat_strength: 68, stat_stamina: 74, level: 18, last_trained_at: '2026-05-05T09:00:00Z', arena_score: 3820, win_rate: 0.76, emoji: '🌑' },
    { id: 'pet-006', seed: 2222222222, rarity: 'RARE',       pet_name: 'Aqua Drifter',  stat_speed: 49, stat_strength: 38, stat_stamina: 62, level: 9,  last_trained_at: '2026-05-04T16:00:00Z', arena_score: 2150, win_rate: 0.54, emoji: '💧' },
    { id: 'pet-007', seed: 3333333333, rarity: 'COMMON',     pet_name: 'Dusty Mole',    stat_speed: 12, stat_strength: 28, stat_stamina: 19, level: 2,  last_trained_at: '2026-04-30T12:00:00Z', arena_score: 610,  win_rate: 0.21, emoji: '🐾' },
    { id: 'pet-008', seed: 4444444444, rarity: 'EPIC',       pet_name: 'Crimson Fang',  stat_speed: 77, stat_strength: 82, stat_stamina: 65, level: 20, last_trained_at: '2026-05-05T07:30:00Z', arena_score: 3640, win_rate: 0.73, emoji: '🦷' },
    { id: 'pet-009', seed: 6666666666, rarity: 'RARE',       pet_name: 'Silver Wisp',   stat_speed: 55, stat_strength: 44, stat_stamina: 48, level: 11, last_trained_at: '2026-05-03T11:00:00Z', arena_score: 2630, win_rate: 0.62, emoji: '✨' },
    { id: 'pet-010', seed: 7777777777, rarity: 'LEGENDARY',  pet_name: 'Neon Phantom',  stat_speed: 93, stat_strength: 85, stat_stamina: 97, level: 28, last_trained_at: '2026-05-05T10:00:00Z', arena_score: 4780, win_rate: 0.91, emoji: '👻' },
  ];

  var leaderboard = [
    { rank: 1,  pet_id: 'pet-010', pet_name: 'Neon Phantom',  rarity: 'LEGENDARY', level: 28, arena_score: 4780, win_rate: 0.91 },
    { rank: 2,  pet_id: 'pet-002', pet_name: 'Golden Flare',  rarity: 'LEGENDARY', level: 22, arena_score: 4150, win_rate: 0.83 },
    { rank: 3,  pet_id: 'pet-005', pet_name: 'Void Stalker',  rarity: 'EPIC',      level: 18, arena_score: 3820, win_rate: 0.76 },
    { rank: 4,  pet_id: 'pet-008', pet_name: 'Crimson Fang',  rarity: 'EPIC',      level: 20, arena_score: 3640, win_rate: 0.73 },
    { rank: 5,  pet_id: 'pet-003', pet_name: 'Purple Storm',  rarity: 'EPIC',      level: 14, arena_score: 3210, win_rate: 0.71 },
    { rank: 6,  pet_id: 'pet-009', pet_name: 'Silver Wisp',   rarity: 'RARE',      level: 11, arena_score: 2630, win_rate: 0.62 },
    { rank: 7,  pet_id: 'pet-001', pet_name: 'Teal Spark',    rarity: 'RARE',      level: 7,  arena_score: 2470, win_rate: 0.58 },
    { rank: 8,  pet_id: 'pet-006', pet_name: 'Aqua Drifter',  rarity: 'RARE',      level: 9,  arena_score: 2150, win_rate: 0.54 },
    { rank: 9,  pet_id: 'pet-004', pet_name: 'Grey Pebble',   rarity: 'COMMON',    level: 3,  arena_score: 940,  win_rate: 0.32 },
    { rank: 10, pet_id: 'pet-007', pet_name: 'Dusty Mole',    rarity: 'COMMON',    level: 2,  arena_score: 610,  win_rate: 0.21 },
  ];

  var battleRecords = [
    { match_id: 'm1',  date: '2026-05-04T14:30:00Z', mode: 'RACE', opponent_name: 'Golden Flare',  opponent_rarity: 'LEGENDARY', outcome: 'WIN',  stat_delta: 5 },
    { match_id: 'm2',  date: '2026-05-03T18:00:00Z', mode: 'RACE', opponent_name: 'Void Stalker',  opponent_rarity: 'EPIC',      outcome: 'LOSS', stat_delta: 0 },
    { match_id: 'm3',  date: '2026-05-02T11:00:00Z', mode: 'RACE', opponent_name: 'Purple Storm',  opponent_rarity: 'EPIC',      outcome: 'WIN',  stat_delta: 3 },
    { match_id: 'm4',  date: '2026-05-01T20:30:00Z', mode: 'RACE', opponent_name: 'Aqua Drifter',  opponent_rarity: 'RARE',      outcome: 'WIN',  stat_delta: 2 },
    { match_id: 'm5',  date: '2026-04-30T09:00:00Z', mode: 'RACE', opponent_name: 'Silver Wisp',   opponent_rarity: 'RARE',      outcome: 'LOSS', stat_delta: 0 },
    { match_id: 'm6',  date: '2026-04-29T15:00:00Z', mode: 'RACE', opponent_name: 'Crimson Fang',  opponent_rarity: 'EPIC',      outcome: 'LOSS', stat_delta: 0 },
    { match_id: 'm7',  date: '2026-04-28T12:00:00Z', mode: 'RACE', opponent_name: 'Grey Pebble',   opponent_rarity: 'COMMON',    outcome: 'WIN',  stat_delta: 1 },
    { match_id: 'm8',  date: '2026-04-27T18:45:00Z', mode: 'RACE', opponent_name: 'Dusty Mole',    opponent_rarity: 'COMMON',    outcome: 'WIN',  stat_delta: 1 },
    { match_id: 'm9',  date: '2026-04-26T10:20:00Z', mode: 'RACE', opponent_name: 'Neon Phantom',  opponent_rarity: 'LEGENDARY', outcome: 'LOSS', stat_delta: 0 },
    { match_id: 'm10', date: '2026-04-25T22:00:00Z', mode: 'RACE', opponent_name: 'Aqua Drifter',  opponent_rarity: 'RARE',      outcome: 'WIN',  stat_delta: 2 },
  ];

  var food = [
    { id: 'f1', food_type: 'speed_berry',     buff_stat: 'speed',    magnitude: 5, is_permanent: false, expires_at: '2026-05-06T10:23:00Z', emoji: '🫐' },
    { id: 'f2', food_type: 'power_mushroom',  buff_stat: 'strength', magnitude: 3, is_permanent: false, expires_at: '2026-05-07T08:00:00Z', emoji: '🍄' },
    { id: 'f3', food_type: 'stamina_root',    buff_stat: 'stamina',  magnitude: 8, is_permanent: true,  expires_at: null,                   emoji: '🌿' },
    { id: 'f4', food_type: 'turbo_seed',      buff_stat: 'speed',    magnitude: 10, is_permanent: false, expires_at: '2026-05-08T00:00:00Z', emoji: '🌱' },
    { id: 'f5', food_type: 'iron_bark',       buff_stat: 'strength', magnitude: 6, is_permanent: false, expires_at: '2026-05-09T12:00:00Z', emoji: '🪵' },
    { id: 'f6', food_type: 'crystal_water',   buff_stat: 'stamina',  magnitude: 4, is_permanent: false, expires_at: '2026-05-06T20:00:00Z', emoji: '💎' },
  ];

  var marketplaceListings = [
    { id: 'ml-001', pet_id: 'pet-007', pet_name: 'Dusty Mole',   rarity: 'COMMON',    price_coins: 500,  seller: 'player_xyz', listed_at: '2026-05-04T10:00:00Z' },
    { id: 'ml-002', pet_id: 'pet-009', pet_name: 'Silver Wisp',  rarity: 'RARE',      price_coins: 2400, seller: 'player_abc', listed_at: '2026-05-04T12:00:00Z' },
    { id: 'ml-003', pet_id: 'pet-006', pet_name: 'Aqua Drifter', rarity: 'RARE',      price_coins: 2000, seller: 'player_mno', listed_at: '2026-05-03T18:00:00Z' },
    { id: 'ml-004', pet_id: 'pet-003', pet_name: 'Purple Storm', rarity: 'EPIC',      price_coins: 5500, seller: 'player_rst', listed_at: '2026-05-02T09:00:00Z' },
    { id: 'ml-005', pet_id: 'pet-008', pet_name: 'Crimson Fang', rarity: 'EPIC',      price_coins: 6200, seller: 'player_uvw', listed_at: '2026-05-01T20:00:00Z' },
  ];

  window.MOCK_DATA = {
    pets: pets,
    leaderboard: leaderboard,
    battleRecords: battleRecords,
    food: food,
    marketplaceListings: marketplaceListings,
    currentPetId: 'pet-001',
  };
})();
