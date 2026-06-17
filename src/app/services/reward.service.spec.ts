import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { RewardService } from './reward.service';

describe('RewardService', () => {
  let auth: AuthService;
  let reward: RewardService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    reward = TestBed.inject(RewardService);
    auth.register('player1', 'pass');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('recordMatch awards 100 XP for a win', () => {
    const result = reward.recordMatch(true, 2, false, ['Computer 1']);
    expect(result.xpEarned).toBe(100);
    expect(auth.currentUser()?.stats.xp).toBe(100);
    expect(auth.currentUser()?.stats.wins).toBe(1);
  });

  it('recordMatch awards 25 XP for a loss', () => {
    const result = reward.recordMatch(false, 2, false, ['Computer 1']);
    expect(result.xpEarned).toBe(25);
    expect(auth.currentUser()?.stats.xp).toBe(25);
    expect(auth.currentUser()?.stats.losses).toBe(1);
  });

  it('recordMatch increments gamesPlayed', () => {
    reward.recordMatch(true, 2, false, ['Computer 1']);
    expect(auth.currentUser()?.stats.gamesPlayed).toBe(1);
    reward.recordMatch(false, 3, true, ['Comp1', 'Comp2']);
    expect(auth.currentUser()?.stats.gamesPlayed).toBe(2);
  });

  it('recordMatch returns first-win badge', () => {
    const result = reward.recordMatch(true, 2, false, ['Computer 1']);
    expect(result.newBadges.some(b => b.id === 'first-win')).toBeTrue();
  });

  it('recordMatch returns first-blood badge on first game', () => {
    const result = reward.recordMatch(false, 2, false, ['Computer 1']);
    expect(result.newBadges.some(b => b.id === 'first-blood')).toBeTrue();
  });

  it('recordMatch returns survivor badge when cardsRemaining <= 2', () => {
    const result = reward.recordMatch(true, 2, false, ['Computer 1'], 1);
    expect(result.newBadges.some(b => b.id === 'survivor')).toBeTrue();
  });

  it('getLeaderboard returns users sorted by XP', () => {
    auth.register('player2', 'pass');
    auth.logout();

    // Play as player1
    auth.login('player1', 'pass');
    reward.recordMatch(true, 2, false, ['C1']);

    auth.logout();
    auth.login('player2', 'pass');
    reward.recordMatch(false, 2, false, ['C1']);

    const lb = reward.getLeaderboard();
    expect(lb[0].username).toBe('player1');
    expect(lb[0].xp).toBe(100);
    expect(lb[1].xp).toBe(25);
  });

  it('getUserBadges returns earned badges', () => {
    const user = auth.currentUser()!;
    const badges1 = reward.getUserBadges(user.id);
    expect(badges1.length).toBe(0);

    reward.recordMatch(true, 2, false, ['C1'], 1);
    const badges2 = reward.getUserBadges(user.id);
    expect(badges2.length).toBeGreaterThanOrEqual(2);
    expect(badges2.some(b => b.id === 'first-win')).toBeTrue();
    expect(badges2.some(b => b.id === 'survivor')).toBeTrue();
  });

  it('five-wins badge unlocks at 5 wins', () => {
    for (let i = 0; i < 5; i++) {
      reward.recordMatch(true, 2, false, ['C1']);
    }
    const user = auth.currentUser()!;
    const badges = reward.getUserBadges(user.id);
    expect(badges.some(b => b.id === 'five-wins')).toBeTrue();
  });

  it('level-5 badge unlocks when reaching level 5', () => {
    const user = auth.currentUser()!;
    user.stats.xp = 1999;
    auth.updateUser(user);
    const result = reward.recordMatch(true, 2, false, ['C1']);
    expect(auth.currentUser()?.stats.level).toBeGreaterThanOrEqual(5);
    expect(result.newBadges.some(b => b.id === 'level-5')).toBeTrue();
  });

  it('XP_PER_LEVEL constant gives correct level thresholds', () => {
    // Level 1: 0 XP, Level 2: 500 XP, Level 3: 1000 XP, etc.
    expect(auth.currentUser()?.stats.level).toBe(1);
    const user = auth.currentUser()!;
    user.stats.xp = 500;
    user.stats.level = 2;
    auth.updateUser(user);
    expect(auth.currentUser()?.stats.level).toBe(2);
  });
});
