import { Component, OnInit, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RewardService, BadgeDef } from '../../services/reward.service';
import { PenaltyDbService, ComputerRecord } from '../../services/penalty-db.service';
import { UserProfile, xpInCurrentLevel, xpToNextLevel, MatchRecord } from '../../models/user.model';

const PENALTY_EMOJI: Record<string, { emoji: string; name: string }> = {
  'skips-ahead': { emoji: '⏭️', name: 'Skips Ahead' },
  'wild-roulette': { emoji: '🎰', name: 'Wild Roulette' },
  'hand-reveal': { emoji: '👀', name: 'Hand Reveal' },
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  user: Signal<UserProfile | null>;
  leaderboard: { username: string; xp: number; level: number; wins: number }[];
  badges: BadgeDef[] = [];
  computerProfiles: ComputerRecord[] = [];

  constructor(
    private auth: AuthService,
    private reward: RewardService,
    private penaltyDb: PenaltyDbService,
    private router: Router
  ) {
    this.user = auth.currentUser;
    this.leaderboard = [];
    this.computerProfiles = [];
  }

  ngOnInit(): void {
    const u = this.user();
    if (!u) {
      this.router.navigate(['/login']);
      return;
    }
    this.refreshData();
  }

  refreshData(): void {
    const u = this.user();
    if (!u) return;
    this.leaderboard = this.reward.getLeaderboard();
    this.badges = this.reward.getUserBadges(u.id);
    this.computerProfiles = this.penaltyDb.getComputerProfiles();
  }

  getActivePenaltyKeys(comp: ComputerRecord): string[] {
    return Object.keys(comp.activePenalties).filter(k => comp.activePenalties[k]);
  }

  penaltyEmoji(id: string): string {
    return PENALTY_EMOJI[id]?.emoji || '❓';
  }

  penaltyName(id: string): string {
    return PENALTY_EMOJI[id]?.name || id;
  }

  get xpProgress(): number {
    const u = this.user();
    if (!u) return 0;
    return xpInCurrentLevel(u.stats.xp);
  }

  get xpNeeded(): number {
    const u = this.user();
    if (!u) return 500;
    return xpToNextLevel(u.stats.xp);
  }

  get winRate(): number {
    const u = this.user();
    if (!u || u.stats.gamesPlayed === 0) return 0;
    return Math.round((u.stats.wins / u.stats.gamesPlayed) * 100);
  }

  get recentMatches(): MatchRecord[] {
    const u = this.user();
    return u?.matchHistory.slice(0, 10) || [];
  }

  startGame(): void {
    this.router.navigate(['/game']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
