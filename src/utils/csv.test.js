import { describe, it, expect } from 'vitest';
import { downloadCsv } from './csv';

describe('downloadCsv', () => {
  it('does nothing when rows are empty', () => {
    expect(() => downloadCsv([], 'empty.csv')).not.toThrow();
  });
});
