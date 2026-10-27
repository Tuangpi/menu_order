import { describe, expect, it } from 'vitest';

import { formatMMK } from './currency.js';

describe('formatMMK', () => {
  it('formats an integer amount', () => {
    expect(formatMMK(12500)).toBe('12,500 MMK');
  });
});