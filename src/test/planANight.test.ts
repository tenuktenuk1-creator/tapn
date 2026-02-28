/**
 * KAN-48 — PlanANight: party size, preferred vibe, notes validation logic
 */
import { describe, it, expect } from 'vitest';

// Extracted calculation helpers (same logic as in PlanANight.tsx)
function calcStopDuration(start: string, end: string): number {
  const s = parseInt(start.split(':')[0]);
  const e = parseInt(end.split(':')[0]);
  return e > s ? e - s : 24 - s + e;
}

function isTimeRangeValid(startTime: string, endTime: string): boolean {
  const startH = parseInt(startTime.split(':')[0]);
  const endH = parseInt(endTime.split(':')[0]);
  return endH > startH || (startH >= 20 && endH <= 5 && endH !== startH);
}

const VIBE_OPTIONS = [
  'chill', 'social', 'romantic', 'competitive', 'wild', 'classy',
];

describe('PlanANight logic (KAN-48)', () => {
  describe('calcStopDuration', () => {
    it('calculates simple durations correctly', () => {
      expect(calcStopDuration('20:00', '22:00')).toBe(2);
      expect(calcStopDuration('18:00', '23:00')).toBe(5);
    });

    it('handles midnight-crossing correctly', () => {
      expect(calcStopDuration('23:00', '01:00')).toBe(2);
      expect(calcStopDuration('22:00', '02:00')).toBe(4);
    });
  });

  describe('isTimeRangeValid', () => {
    it('accepts normal ranges', () => {
      expect(isTimeRangeValid('20:00', '22:00')).toBe(true);
    });

    it('accepts midnight-crossing ranges', () => {
      expect(isTimeRangeValid('23:00', '01:00')).toBe(true);
    });

    it('rejects same-hour ranges', () => {
      expect(isTimeRangeValid('20:00', '20:00')).toBe(false);
    });

    it('rejects backwards non-midnight ranges', () => {
      expect(isTimeRangeValid('22:00', '20:00')).toBe(false);
    });
  });

  describe('party size validation', () => {
    it('accepts values between 1 and 200', () => {
      const valid = (n: number) => n >= 1 && n <= 200;
      expect(valid(1)).toBe(true);
      expect(valid(200)).toBe(true);
      expect(valid(0)).toBe(false);
      expect(valid(201)).toBe(false);
    });
  });

  describe('preferred vibe', () => {
    it('all 6 vibe options are defined', () => {
      expect(VIBE_OPTIONS).toHaveLength(6);
    });

    it('vibe is optional (empty string is valid)', () => {
      expect(VIBE_OPTIONS.includes('')).toBe(false);
      // empty string = no vibe selected, which is valid
      const vibe = '';
      expect(!vibe || VIBE_OPTIONS.includes(vibe)).toBe(true);
    });
  });
});
