import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { parseLocalDate, isTaskOverdue, isTaskDueToday, startOfToday } from './dateUtils';

describe('parseLocalDate', () => {
  it('parses a valid YYYY-MM-DD string as a local date', () => {
    const d = parseLocalDate('2025-03-15');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March = index 2
    expect(d.getDate()).toBe(15);
  });

  it('returns null for null input', () => {
    expect(parseLocalDate(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseLocalDate('')).toBeNull();
  });

  it('returns null for malformed string', () => {
    expect(parseLocalDate('not-a-date')).toBeNull();
  });
});

describe('isTaskOverdue', () => {
  // Pin "today" to 2025-06-01 so tests are deterministic
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 1)); // June 1, 2025
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns true for a past due date on a non-completed task', () => {
    expect(isTaskOverdue('2025-05-31', 'TODO')).toBe(true);
    expect(isTaskOverdue('2025-01-01', 'IN_PROGRESS')).toBe(true);
  });

  it('returns false for a past due date on a COMPLETED task', () => {
    expect(isTaskOverdue('2025-05-31', 'COMPLETED')).toBe(false);
  });

  it('returns false for today (not yet overdue)', () => {
    expect(isTaskOverdue('2025-06-01', 'TODO')).toBe(false);
  });

  it('returns false for a future due date', () => {
    expect(isTaskOverdue('2025-12-31', 'TODO')).toBe(false);
  });

  it('returns false for null dueDate', () => {
    expect(isTaskOverdue(null, 'TODO')).toBe(false);
  });
});

describe('isTaskDueToday', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 1)); // June 1, 2025
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns true when dueDate is today', () => {
    expect(isTaskDueToday('2025-06-01', 'TODO')).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isTaskDueToday('2025-05-31', 'TODO')).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isTaskDueToday('2025-06-02', 'TODO')).toBe(false);
  });

  it('returns false for a COMPLETED task even if due today', () => {
    expect(isTaskDueToday('2025-06-01', 'COMPLETED')).toBe(false);
  });
});
