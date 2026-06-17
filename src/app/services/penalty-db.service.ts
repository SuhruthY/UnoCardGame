import { Injectable, computed } from '@angular/core';
import { AuthService } from './auth.service';

export interface ComputerRecord {
  name: string;
  wins: number;
  losses: number;
  activePenalties: Record<string, boolean>;
}

interface UserPenaltyStore {
  computers: Record<string, ComputerRecord>;
  playerPenalties: Record<string, boolean>;
}

const STORAGE_KEY = 'uno_penalty_db';

@Injectable({ providedIn: 'root' })
export class PenaltyDbService {
  constructor(private auth: AuthService) {}

  private getDb(): Record<string, UserPenaltyStore> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private saveDb(db: Record<string, UserPenaltyStore>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  private withDb<T>(fn: (db: Record<string, UserPenaltyStore>) => T): T {
    const db = this.getDb();
    const result = fn(db);
    this.saveDb(db);
    return result;
  }

  private ensureUserStore(db: Record<string, UserPenaltyStore>, userId: string): UserPenaltyStore {
    if (!db[userId]) {
      const defaultComputers: Record<string, ComputerRecord> = {};
      for (let i = 1; i <= 3; i++) {
        const name = `Computer ${i}`;
        defaultComputers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
      }
      db[userId] = { computers: defaultComputers, playerPenalties: {} };
    }
    return db[userId];
  }

  getComputerProfiles(): ComputerRecord[] {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      return Object.values(store.computers);
    });
  }

  getComputerNames(): string[] {
    return this.getComputerProfiles().map(c => c.name);
  }

  getOrCreateComputerProfile(name: string): ComputerRecord {
    const user = this.auth.currentUser();
    if (!user) return { name, wins: 0, losses: 0, activePenalties: {} };
    return this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      if (!store.computers[name]) {
        store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
      }
      return store.computers[name];
    });
  }

  saveComputerPenalties(name: string, penalties: Record<string, boolean>): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      if (!store.computers[name]) {
        store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
      }
      store.computers[name].activePenalties = penalties;
    });
  }

  recordMatchResult(computerNames: string[], humanWon: boolean): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      for (const name of computerNames) {
        if (!store.computers[name]) {
          store.computers[name] = { name, wins: 0, losses: 0, activePenalties: {} };
        }
        if (humanWon) {
          store.computers[name].losses++;
        } else {
          store.computers[name].wins++;
        }
      }
    });
  }

  getPlayerPenalties(): Record<string, boolean> {
    const user = this.auth.currentUser();
    if (!user) return {};
    return this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      return { ...store.playerPenalties };
    });
  }

  savePlayerPenalties(penalties: Record<string, boolean>): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.withDb((db) => {
      const store = this.ensureUserStore(db, user.id);
      store.playerPenalties = { ...penalties };
    });
  }

  getStoredPenaltyMap(playerNames: string[]): Record<number, Record<string, boolean>> {
    const result: Record<number, Record<string, boolean>> = {};
    for (let i = 0; i < playerNames.length; i++) {
      const name = playerNames[i];
      const profile = this.getOrCreateComputerProfile(name);
      if (Object.keys(profile.activePenalties).length > 0) {
        result[i] = profile.activePenalties;
      }
    }
    const playerPenalties = this.getPlayerPenalties();
    if (Object.keys(playerPenalties).length > 0) {
      const humanIdx = playerNames.findIndex((_, i) => i === 0);
      if (humanIdx >= 0) result[humanIdx] = { ...(result[humanIdx] || {}), ...playerPenalties };
    }
    return result;
  }
}
