import { describe, it, expect } from 'vitest';
import { determineTier } from '../src/lib/git';

describe('determineTier', () => {
  it('returns first-of-day when no previous commit', () => {
    expect(determineTier(5, null, '2026-04-29T10:00:00+05:30')).toBe('first-of-day');
  });

  it('returns first-of-day when previous commit on different day', () => {
    expect(determineTier(5, '2026-04-28T10:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('first-of-day');
  });

  it('returns big when lines changed >= 100', () => {
    expect(determineTier(150, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('big');
  });

  it('returns medium when lines changed >= 10', () => {
    expect(determineTier(25, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('medium');
  });

  it('returns small when lines changed < 10', () => {
    expect(determineTier(3, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('small');
  });

  it('returns small for empty commit (0 lines)', () => {
    expect(determineTier(0, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('small');
  });

  it('first-of-day takes priority over big', () => {
    expect(determineTier(200, '2026-04-28T10:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('first-of-day');
  });
});
