/* ============================================================
   Mock Data — Pixel Pet Arena Prototype
   ============================================================ */

const MOCK_DATA = {
  pets: [
    { id: "d4f9a1b2-3c4e-5678-9abc-def012345678", seed: 8472918374655, rarity: "LEGENDARY", petName: "Azure Flame Dragon", statSpeed: 72, statStrength: 85, statStamina: 64, level: 15, lastTrainedAt: "2026-05-18T14:30:00Z", claimedAt: "2026-05-01T09:00:00Z", isBanned: false },
    { id: "a1b2c3d4-e5f6-7890-abcd-ef0123456789", seed: 1234567890123, rarity: "EPIC", petName: "Shadow Viper", statSpeed: 88, statStrength: 45, statStamina: 72, level: 22, lastTrainedAt: "2026-05-19T08:00:00Z", claimedAt: "2026-03-15T11:00:00Z", isBanned: false },
    { id: "b2c3d4e5-f6a7-8901-bcde-f01234567890", seed: 9876543210987, rarity: "RARE", petName: "Coral Tide Turtle", statSpeed: 35, statStrength: 65, statStamina: 95, level: 8, lastTrainedAt: "2026-05-19T07:00:00Z", claimedAt: "2026-04-10T14:00:00Z", isBanned: false },
    { id: "c3d4e5f6-a7b8-9012-cdef-123456789abc", seed: 5555555555555, rarity: "COMMON", petName: "Mossy Stone Golem", statSpeed: 20, statStrength: 90, statStamina: 100, level: 5, lastTrainedAt: "2026-05-10T12:00:00Z", claimedAt: "2026-05-05T09:00:00Z", isBanned: false },
    { id: "e5f6a7b8-c9d0-1234-5678-90abcdef1234", seed: 1111111111111, rarity: "EPIC", petName: "Thunder Lynx", statSpeed: 95, statStrength: 78, statStamina: 52, level: 18, lastTrainedAt: "2026-05-18T22:00:00Z", claimedAt: "2026-02-20T16:00:00Z", isBanned: false }
  ],

  myPet: {
    id: "d4f9a1b2-3c4e-5678-9abc-def012345678",
    seed: 8472918374655,
    rarity: "LEGENDARY",
    petName: "Azure Flame Dragon",
    statSpeed: 72,
    statStrength: 85,
    statStamina: 64,
    level: 15,
    totalTrainingActions: 150,
    lastTrainedAt: "2026-05-18T14:30:00Z",
    claimedAt: "2026-05-01T09:00:00Z",
    isBanned: false,
    actionsRemaining: 4,
    nextResetIn: "14h 32m"
  },

  foodInventory: [
    { id: "f1", foodType: "SPEED_BERRY",      buffStat: "SPEED",    magnitude: 5, isPermanent: false, durationSeconds: 86400 },
    { id: "f2", foodType: "STRENGTH_CRYSTAL", buffStat: "STRENGTH", magnitude: 8, isPermanent: false, durationSeconds: 86400 },
    { id: "f3", foodType: "STAMINA_MUSHROOM", buffStat: "STAMINA",  magnitude: 3, isPermanent: true,  durationSeconds: 0 }
  ],

  leaderboard: [
    { rank: 1,  petId: "a1b2c3d4-e5f6-7890-abcd-ef0123456789", petName: "Shadow Viper",        rarity: "EPIC",      arenaScore: 4921, winRate: 0.84, battlesPlayed: 103, level: 22 },
    { rank: 2,  petId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petName: "Azure Flame Dragon",  rarity: "LEGENDARY", arenaScore: 4872, winRate: 0.78, battlesPlayed: 89,  level: 15 },
    { rank: 3,  petId: "e5f6a7b8-c9d0-1234-5678-90abcdef1234", petName: "Thunder Lynx",        rarity: "EPIC",      arenaScore: 4650, winRate: 0.77, battlesPlayed: 120, level: 18 },
    { rank: 4,  petId: "f6a7b8c9-d0e1-2345-6789-0abcdef12345", petName: "Crimson Phoenix",     rarity: "LEGENDARY", arenaScore: 4380, winRate: 0.75, battlesPlayed: 72,  level: 25 },
    { rank: 5,  petId: "a7b8c9d0-e1f2-3456-789a-bcdef0123456", petName: "Frost Wyvern",        rarity: "RARE",      arenaScore: 4200, winRate: 0.71, battlesPlayed: 140, level: 30 },
    { rank: 6,  petId: "b8c9d0e1-f2a3-4567-89ab-cdef01234567", petName: "Golden Koi Dragon",   rarity: "LEGENDARY", arenaScore: 4010, winRate: 0.69, battlesPlayed: 98,  level: 12 },
    { rank: 7,  petId: "c9d0e1f2-a3b4-5678-9abc-def012345678", petName: "Magma Tortoise",      rarity: "EPIC",      arenaScore: 3880, winRate: 0.68, battlesPlayed: 85,  level: 20 },
    { rank: 8,  petId: "d0e1f2a3-b4c5-6789-abcd-ef0123456789", petName: "Storm Hawk",          rarity: "RARE",      arenaScore: 3720, winRate: 0.65, battlesPlayed: 112, level: 16 },
    { rank: 9,  petId: "e1f2a3b4-c5d6-789a-bcde-f01234567890", petName: "Neon Jellyfish",      rarity: "EPIC",      arenaScore: 3600, winRate: 0.63, battlesPlayed: 95,  level: 11 },
    { rank: 10, petId: "f2a3b4c5-d6e7-89ab-cdef-012345678901", petName: "Iron Badger",         rarity: "COMMON",    arenaScore: 3450, winRate: 0.60, battlesPlayed: 200, level: 35 },
    { rank: 11, petId: "b2c3d4e5-f6a7-8901-bcde-f01234567890", petName: "Coral Tide Turtle",   rarity: "RARE",      arenaScore: 3200, winRate: 0.58, battlesPlayed: 78,  level: 8  },
    { rank: 12, petId: "a3b4c5d6-e7f8-9012-abcd-ef0123456789", petName: "Ember Fox",           rarity: "RARE",      arenaScore: 3100, winRate: 0.56, battlesPlayed: 90,  level: 14 },
    { rank: 13, petId: "b4c5d6e7-f8a9-0123-bcde-f01234567890", petName: "Void Mantis",         rarity: "EPIC",      arenaScore: 2980, winRate: 0.54, battlesPlayed: 66,  level: 9  },
    { rank: 14, petId: "c3d4e5f6-a7b8-9012-cdef-123456789abc", petName: "Mossy Stone Golem",   rarity: "COMMON",    arenaScore: 2700, winRate: 0.50, battlesPlayed: 88,  level: 5  },
    { rank: 15, petId: "c5d6e7f8-a9b0-1234-cdef-012345678901", petName: "Pixel Bunny",         rarity: "COMMON",    arenaScore: 2500, winRate: 0.48, battlesPlayed: 102, level: 7  }
  ],

  battleHistory: [
    { id: "e5f6a7b8-c9d0-1234-5678-90abcdef1234", petAId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petBId: "a1b2c3d4-e5f6-7890-abcd-ef0123456789", mode: "RACE",  winnerPetId: "d4f9a1b2-3c4e-5678-9abc-def012345678", isAiOpponent: false, createdAt: "2026-05-18T15:00:00Z", opponentName: "Shadow Viper",       outcome: "WIN",  statDelta: { speed: 2 } },
    { id: "f6a7b8c9-d0e1-2345-6789-0abcdef12345", petAId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petBId: "e5f6a7b8-c9d0-1234-5678-90abcdef1234", mode: "SUMO",  winnerPetId: "e5f6a7b8-c9d0-1234-5678-90abcdef1234", isAiOpponent: false, createdAt: "2026-05-18T16:00:00Z", opponentName: "Thunder Lynx",       outcome: "LOSS", statDelta: {} },
    { id: "a7b8c9d0-e1f2-3456-789a-bcdef0123456", petAId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petBId: "b8c9d0e1-f2a3-4567-89ab-cdef01234567", mode: "RACE",  winnerPetId: "d4f9a1b2-3c4e-5678-9abc-def012345678", isAiOpponent: true,  createdAt: "2026-05-17T10:00:00Z", opponentName: "AI: Golden Koi Dragon", outcome: "WIN", statDelta: { speed: 1 } },
    { id: "b8c9d0e1-f2a3-4567-89ab-cdef01234567", petAId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petBId: "c9d0e1f2-a3b4-5678-9abc-def012345678", mode: "RACE",  winnerPetId: "d4f9a1b2-3c4e-5678-9abc-def012345678", isAiOpponent: false, createdAt: "2026-05-17T14:00:00Z", opponentName: "Magma Tortoise",     outcome: "WIN",  statDelta: {} },
    { id: "c9d0e1f2-a3b4-5678-9abc-def012345678", petAId: "d4f9a1b2-3c4e-5678-9abc-def012345678", petBId: "f2a3b4c5-d6e7-89ab-cdef-012345678901", mode: "SUMO",  winnerPetId: "d4f9a1b2-3c4e-5678-9abc-def012345678", isAiOpponent: false, createdAt: "2026-05-16T09:00:00Z", opponentName: "Iron Badger",        outcome: "WIN",  statDelta: { strength: 3 } }
  ],

  listings: [
    { id: "list-001", petId: "f2a3b4c5-d6e7-89ab-cdef-012345678901", petName: "Iron Badger",  rarity: "COMMON", ownerDescription: "High stamina veteran — 200 battles, rank #10!", minPrice: 0, createdAt: "2026-05-18T10:00:00Z" },
    { id: "list-002", petId: "a3b4c5d6-e7f8-9012-abcd-ef0123456789", petName: "Ember Fox",    rarity: "RARE",   ownerDescription: "Speed specialist, level 14. Perfect for RACE mode!", minPrice: 0, createdAt: "2026-05-19T08:00:00Z" },
    { id: "list-003", petId: "b4c5d6e7-f8a9-0123-bcde-f01234567890", petName: "Void Mantis",  rarity: "EPIC",   ownerDescription: "Rare find — EPIC tier with balanced stats.", minPrice: 0, createdAt: "2026-05-19T09:30:00Z" }
  ],

  socialProof: { claimedToday: 247, totalPets: 12847 }
};
