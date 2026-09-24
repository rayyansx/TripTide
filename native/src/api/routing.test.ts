import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration } from './routing';

describe('routing utility formatters', () => {
  describe('formatDuration', () => {
    it('handles zero or negative duration', () => {
      expect(formatDuration(0)).toBe('0 min');
      expect(formatDuration(-10)).toBe('0 min');
    });

    it('formats minutes under an hour', () => {
      expect(formatDuration(45)).toBe('1 min');
      expect(formatDuration(300)).toBe('5 min');
      expect(formatDuration(3540)).toBe('59 min');
    });

    it('formats exact hours', () => {
      expect(formatDuration(3600)).toBe('1 hr');
      expect(formatDuration(7200)).toBe('2 hr');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3660)).toBe('1 hr 1 min');
      expect(formatDuration(4800)).toBe('1 hr 20 min');
      expect(formatDuration(9000)).toBe('2 hr 30 min');
    });
  });

  describe('formatDistance', () => {
    it('handles zero or negative distance', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(0, true)).toBe('0 ft');
    });

    it('formats metric distances under 1 km as meters', () => {
      expect(formatDistance(250)).toBe('250 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('formats metric distances 1 km and above as km with 1 decimal', () => {
      expect(formatDistance(1000)).toBe('1.0 km');
      expect(formatDistance(2450)).toBe('2.5 km');
      expect(formatDistance(12345)).toBe('12.3 km');
    });

    it('formats imperial distances in ft and mi', () => {
      expect(formatDistance(30, true)).toBe('98 ft');
      expect(formatDistance(1609.344, true)).toBe('1.0 mi');
      expect(formatDistance(5000, true)).toBe('3.1 mi');
    });
  });
});
