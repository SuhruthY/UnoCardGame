import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('currentUser is null on start', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('register creates a new user and logs in', () => {
    const err = service.register('testuser', 'pass123');
    expect(err).toBeNull();
    expect(service.currentUser()?.username).toBe('testuser');
  });

  it('register rejects duplicate usernames', () => {
    service.register('dup', 'pass123');
    const err = service.register('dup', 'other456');
    expect(err).toBe('Username already exists');
  });

  it('register rejects short username', () => {
    const err = service.register('ab', 'pass123');
    expect(err).toContain('Username');
  });

  it('register rejects short password', () => {
    const err = service.register('validuser', '12');
    expect(err).toContain('Password');
  });

  it('login succeeds with correct credentials', () => {
    service.register('user1', 'pass123');
    service.logout();
    expect(service.currentUser()).toBeNull();
    const ok = service.login('user1', 'pass123');
    expect(ok).toBeTrue();
    expect(service.currentUser()?.username).toBe('user1');
  });

  it('login fails with wrong password', () => {
    service.register('user1', 'pass123');
    service.logout();
    const ok = service.login('user1', 'wrong');
    expect(ok).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('login fails for non-existent user', () => {
    const ok = service.login('nobody', 'pass');
    expect(ok).toBeFalse();
  });

  it('logout clears current user', () => {
    service.register('user1', 'pass');
    service.logout();
    expect(service.currentUser()).toBeNull();
  });

  it('getAllUsers returns all registered users', () => {
    service.register('alice', 'pass');
    service.logout();
    service.register('bob', 'pass');
    const users = service.getAllUsers();
    expect(users.length).toBe(2);
    expect(users.map(u => u.username).sort()).toEqual(['alice', 'bob']);
  });

  it('updateUser saves stats correctly', () => {
    service.register('test', 'pass');
    const user = service.currentUser()!;
    user.stats.xp = 300;
    service.updateUser(user);
    expect(service.currentUser()?.stats.xp).toBe(300);
    const stored = JSON.parse(localStorage.getItem('uno_users')!);
    const found = stored.find((u: any) => u.username === 'test');
    expect(found.stats.xp).toBe(300);
  });
});
