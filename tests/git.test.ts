import { describe, it, expect } from 'vitest';
import { parseDiffStats } from '../src/lib/git';

describe('parseDiffStats', () => {
  it('parses insertions and deletions', () => {
    expect(parseDiffStats(' 3 files changed, 50 insertions(+), 20 deletions(-)')).toBe(70);
  });

  it('parses insertions only', () => {
    expect(parseDiffStats(' 1 file changed, 10 insertions(+)')).toBe(10);
  });

  it('parses deletions only', () => {
    expect(parseDiffStats(' 2 files changed, 5 deletions(-)')).toBe(5);
  });

  it('returns 0 for empty string', () => {
    expect(parseDiffStats('')).toBe(0);
  });
});
