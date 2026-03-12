/**
 * Single source of truth for "How TAPN Works" steps.
 * Used by both /how-it-works page and the home page (#how-it-works section).
 * KAN-56 + KAN-59
 */

import { Search, CalendarCheck, PartyPopper } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface HowItWorksStep {
  number: number;
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    number: 1,
    icon: Search,
    title: 'Browse',
    desc: 'Search venues fast and filter by what you want — category, price, availability.',
  },
  {
    number: 2,
    icon: CalendarCheck,
    title: 'Book',
    desc: 'Pick a time, confirm your details, and request your booking in seconds.',
  },
  {
    number: 3,
    icon: PartyPopper,
    title: 'Go',
    desc: 'Show your booking confirmation at the venue and enjoy your night out.',
  },
];
