import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfile, UserStats, MatchRecord } from '../models/user.model';

const STORAGE_KEY = 'uno_users';
const SESSION_KEY = 'uno_current_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSignal: WritableSignal<UserProfile | null> = signal(null);
  readonly currentUser = computed(() => this.currentUserSignal());

  constructor() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        this.currentUserSignal.set(JSON.parse(saved));
      } catch { }
    }
  }

  private getUsers(): UserProfile[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveUsers(users: UserProfile[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  login(username: string, password: string): boolean {
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return false;
    this.currentUserSignal.set(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return true;
  }

  register(username: string, password: string): string | null {
    const users = this.getUsers();
    if (users.find(u => u.username === username)) {
      return 'Username already exists';
    }
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (password.length < 4) return 'Password must be at least 4 characters';

    const newUser: UserProfile = {
      id: crypto.randomUUID(),
      username,
      password,
      createdAt: Date.now(),
      stats: { gamesPlayed: 0, wins: 0, losses: 0, xp: 0, level: 1 },
      badges: [],
      matchHistory: [],
    };
    users.push(newUser);
    this.saveUsers(users);
    this.currentUserSignal.set(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return null;
  }

  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem(SESSION_KEY);
  }

  updateUser(updated: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx !== -1) {
      users[idx] = updated;
      this.saveUsers(users);
    }
    this.currentUserSignal.set(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  }

  getAllUsers(): UserProfile[] {
    return this.getUsers();
  }
}
