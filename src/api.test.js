import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, getAuthToken, getRole, clearSession, isLoggedIn } from './api';

beforeEach(() => {
  clearSession();
});

describe('session helpers', () => {
  it('stores accessToken and role from saveSession', () => {
    saveSession({
      accessToken: 'jwt-abc',
      role: 'STANDARD',
      email: 'user@example.com',
      name: 'User',
      employeeId: '7',
    });
    expect(getAuthToken()).toBe('jwt-abc');
    expect(getRole()).toBe('STANDARD');
    expect(isLoggedIn()).toBe(true);
  });

  it('accepts token field as alternative to accessToken', () => {
    saveSession({ token: 'jwt-xyz', role: 'ADMIN', email: 'a@b.com' });
    expect(getAuthToken()).toBe('jwt-xyz');
  });

  it('clearSession removes credentials', () => {
    saveSession({ role: 'STANDARD', email: 'x@y.com', accessToken: 't' });
    clearSession();
    expect(isLoggedIn()).toBe(false);
    expect(getAuthToken()).toBe('');
  });
});
