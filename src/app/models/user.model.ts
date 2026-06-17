export interface UserProfile {
  id: string;
  username: string;
  password: string;
  createdAt: number;
  stats: UserStats;
  badges: string[];
  matchHistory: MatchRecord[];
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  xp: number;
  level: number;
}

export interface MatchRecord {
  date: number;
  won: boolean;
  playerCount: number;
  adultMode: boolean;
  xpEarned: number;
  opponentNames: string[];
}

export const XP_PER_LEVEL = 500;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

export function xpToNextLevel(xp: number): number {
  const nextLevelXp = xpForLevel(calculateLevel(xp) + 1);
  return nextLevelXp - xp;
}

export function xpInCurrentLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const currentLevelXp = xpForLevel(currentLevel);
  return xp - currentLevelXp;
}
