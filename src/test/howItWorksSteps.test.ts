/**
 * KAN-56 / KAN-59 — Single source of truth for How It Works steps
 */
import { describe, it, expect } from 'vitest';
import { HOW_IT_WORKS_STEPS } from '@/lib/howItWorksSteps';

describe('HOW_IT_WORKS_STEPS', () => {
  it('exports exactly 3 steps', () => {
    expect(HOW_IT_WORKS_STEPS).toHaveLength(3);
  });

  it('steps are numbered 1–3 in order', () => {
    HOW_IT_WORKS_STEPS.forEach((step, i) => {
      expect(step.number).toBe(i + 1);
    });
  });

  it('each step has title, desc and icon', () => {
    HOW_IT_WORKS_STEPS.forEach(step => {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.desc).toBe('string');
      expect(step.desc.length).toBeGreaterThan(0);
      // Lucide icons are React components (callable objects in ESM/jsdom)
      expect(step.icon).toBeDefined();
    });
  });
});
