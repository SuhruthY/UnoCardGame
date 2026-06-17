import { Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { UserProfile, calculateLevel, xpInCurrentLevel, xpToNextLevel } from '../models/user.model';

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const ALL_BADGES: BadgeDef[] = [
  { id: 'first-win', name: 'First Victory', emoji: '🏆', description: 'Win your first game' },
  { id: 'five-wins', name: 'Rising Star', emoji: '⭐', description: 'Win 5 games' },
  { id: 'ten-wins', name: 'UNO Champion', emoji: '👑', description: 'Win 10 games' },
  { id: 'twenty-wins', name: 'Legend', emoji: '🔥', description: 'Win 20 games' },
  { id: 'first-blood', name: 'First Game', emoji: '🎮', description: 'Play your first game' },
  { id: 'survivor', name: 'Survivor', emoji: '💪', description: 'Win with 1 or 2 cards remaining' },
  { id: 'comeback', name: 'Comeback King', emoji: '🔄', description: 'Win after losing 3+ games in a row' },
  { id: 'level-5', name: 'Seasoned', emoji: '🎖️', description: 'Reach level 5' },
  { id: 'level-10', name: 'Veteran', emoji: '💎', description: 'Reach level 10' },
  { id: 'win-streak-3', name: 'On Fire', emoji: '🔥', description: 'Win 3 games in a row' },
];

@Injectable({ providedIn: 'root' })
export class RewardService {
  readonly allBadges = ALL_BADGES;

  constructor(private auth: AuthService) {}

  recordMatch(won: boolean, playerCount: number, adultMode: boolean, opponentNames: string[], cardsRemaining?: number): { xpEarned: number; newBadges: BadgeDef[] } {
    const user = this.auth.currentUser();
    if (!user) return { xpEarned: 0, newBadges: [] };

    const xpEarned = won ? 100 : 25;
    const updated: UserProfile = {
      ...user,
      stats: {
        ...user.stats,
        gamesPlayed: user.stats.gamesPlayed + 1,
        wins: user.stats.wins + (won ? 1 : 0),
        losses: user.stats.losses + (won ? 0 : 1),
        xp: user.stats.xp + xpEarned,
        level: calculateLevel(user.stats.xp + xpEarned),
      },
      matchHistory: [
        { date: Date.now(), won, playerCount, adultMode, xpEarned, opponentNames },
        ...user.matchHistory,
      ].slice(0, 50),
    };

    const newBadges = this.checkNewBadges(user, updated, cardsRemaining);
    updated.badges = [...new Set([...user.badges, ...newBadges.map(b => b.id)])];

    this.auth.updateUser(updated);
    return { xpEarned, newBadges };
  }

  private checkNewBadges(oldUser: UserProfile, newUser: UserProfile, cardsRemaining?: number): BadgeDef[] {
    const earned: BadgeDef[] = [];
    const oldStats = oldUser.stats;
    const newStats = newUser.stats;

    if (!oldUser.badges.includes('first-blood') && newStats.gamesPlayed >= 1) {
      earned.push(ALL_BADGES.find(b => b.id === 'first-blood')!);
    }
    if (!oldUser.badges.includes('first-win') && newStats.wins >= 1) {
      earned.push(ALL_BADGES.find(b => b.id === 'first-win')!);
    }
    if (!oldUser.badges.includes('five-wins') && newStats.wins >= 5) {
      earned.push(ALL_BADGES.find(b => b.id === 'five-wins')!);
    }
    if (!oldUser.badges.includes('ten-wins') && newStats.wins >= 10) {
      earned.push(ALL_BADGES.find(b => b.id === 'ten-wins')!);
    }
    if (!oldUser.badges.includes('twenty-wins') && newStats.wins >= 20) {
      earned.push(ALL_BADGES.find(b => b.id === 'twenty-wins')!);
    }
    if (!oldUser.badges.includes('level-5') && newStats.level >= 5) {
      earned.push(ALL_BADGES.find(b => b.id === 'level-5')!);
    }
    if (!oldUser.badges.includes('level-10') && newStats.level >= 10) {
      earned.push(ALL_BADGES.find(b => b.id === 'level-10')!);
    }
    if (!oldUser.badges.includes('survivor') && cardsRemaining !== undefined && cardsRemaining <= 2) {
      earned.push(ALL_BADGES.find(b => b.id === 'survivor')!);
    }

    return earned;
  }

  getLeaderboard(): { username: string; xp: number; level: number; wins: number }[] {
    return this.auth.getAllUsers()
      .map(u => ({ username: u.username, xp: u.stats.xp, level: u.stats.level, wins: u.stats.wins }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 20);
  }

  getUserBadges(userId: string): BadgeDef[] {
    const user = this.auth.getAllUsers().find(u => u.id === userId);
    if (!user) return [];
    return ALL_BADGES.filter(b => user.badges.includes(b.id));
  }
}
