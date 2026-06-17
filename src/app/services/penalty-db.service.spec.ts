import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { PenaltyDbService } from './penalty-db.service';

describe('PenaltyDbService', () => {
  let auth: AuthService;
  let db: PenaltyDbService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    db = TestBed.inject(PenaltyDbService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('getComputerProfiles returns empty array when not logged in', () => {
    expect(db.getComputerProfiles().length).toBe(0);
  });

  it('getComputerProfiles creates 3 default profiles after login', () => {
    auth.register('player1', 'pass');
    const profiles = db.getComputerProfiles();
    expect(profiles.length).toBe(3);
    expect(profiles[0].name).toBe('Computer 1');
    expect(profiles[1].name).toBe('Computer 2');
    expect(profiles[2].name).toBe('Computer 3');
  });

  it('profiles start with 0 wins, 0 losses, no penalties', () => {
    auth.register('player1', 'pass');
    const profiles = db.getComputerProfiles();
    for (const p of profiles) {
      expect(p.wins).toBe(0);
      expect(p.losses).toBe(0);
      expect(Object.keys(p.activePenalties).length).toBe(0);
    }
  });

  it('saveComputerPenalties stores penalties', () => {
    auth.register('player1', 'pass');
    db.saveComputerPenalties('Computer 1', { 'skips-ahead': true, 'wild-roulette': true });
    const profiles = db.getComputerProfiles();
    const c1 = profiles.find(p => p.name === 'Computer 1')!;
    expect(c1.activePenalties['skips-ahead']).toBeTrue();
    expect(c1.activePenalties['wild-roulette']).toBeTrue();
  });

  it('recordMatchResult increments losses when human wins', () => {
    auth.register('player1', 'pass');
    db.recordMatchResult(['Computer 1', 'Computer 2'], true);
    const profiles = db.getComputerProfiles();
    expect(profiles.find(p => p.name === 'Computer 1')!.losses).toBe(1);
    expect(profiles.find(p => p.name === 'Computer 2')!.losses).toBe(1);
    expect(profiles.find(p => p.name === 'Computer 1')!.wins).toBe(0);
  });

  it('recordMatchResult increments wins when human loses', () => {
    auth.register('player1', 'pass');
    db.recordMatchResult(['Computer 1'], false);
    const profiles = db.getComputerProfiles();
    expect(profiles.find(p => p.name === 'Computer 1')!.wins).toBe(1);
    expect(profiles.find(p => p.name === 'Computer 1')!.losses).toBe(0);
  });

  it('getStoredPenaltyMap returns empty map for fresh profiles', () => {
    auth.register('player1', 'pass');
    const map = db.getStoredPenaltyMap(['You', 'Computer 1']);
    expect(Object.keys(map).length).toBe(0);
  });

  it('getStoredPenaltyMap returns penalties for saved profiles', () => {
    auth.register('player1', 'pass');
    db.saveComputerPenalties('Computer 1', { 'skips-ahead': true });
    const map = db.getStoredPenaltyMap(['You', 'Computer 1']);
    expect(map[1]).toBeDefined();
    expect(map[1]['skips-ahead']).toBeTrue();
  });

  it('savePlayerPenalties and getPlayerPenalties round-trip', () => {
    auth.register('player1', 'pass');
    db.savePlayerPenalties({ 'wild-roulette': true });
    const penalties = db.getPlayerPenalties();
    expect(penalties['wild-roulette']).toBeTrue();
  });

  it('getOrCreateComputerProfile creates profile if missing', () => {
    auth.register('player1', 'pass');
    const profile = db.getOrCreateComputerProfile('Custom Bot');
    expect(profile.name).toBe('Custom Bot');
    expect(profile.wins).toBe(0);
    const profiles = db.getComputerProfiles();
    expect(profiles.some(p => p.name === 'Custom Bot')).toBeTrue();
  });
});
