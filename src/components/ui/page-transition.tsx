/**
 * PageTransition
 *
 * Lightweight entrance animation wrapper for route-level page components.
 * Wrap the outermost JSX returned by each page in <PageTransition> and pick
 * a variant that fits the page's purpose.
 *
 * Because React Router v6 fully unmounts/remounts page components on
 * navigation, the entrance animation re-triggers automatically on every
 * route change — no AnimatePresence or location keys required for
 * enter-only transitions.
 *
 * Variants
 * ─────────────────────────────────────────────────────────────────────────
 * rise        — translateY ↑ + opacity + scale  (spring, slight overshoot)
 * slide-left  — translateX ← + opacity          (spring)
 * slide-right — translateX → + opacity          (spring)
 * fade        — opacity only                    (easeOut, fast)
 * fade-scale  — opacity + subtle scale pop      (spring for scale)
 * blur-in     — opacity + blur dissolve         (easeOut)
 *
 * Reduced-motion  (prefers-reduced-motion: reduce)
 * ─────────────────────────────────────────────────────────────────────────
 * All variants collapse to a simple 0.22 s opacity fade — no translate,
 * scale, or blur.
 *
 * Usage
 * ─────────────────────────────────────────────────────────────────────────
 * export default function MyPage() {
 *   return (
 *     <PageTransition variant="rise">
 *       <Layout>...</Layout>
 *     </PageTransition>
 *   );
 * }
 *
 * Props
 * ─────────────────────────────────────────────────────────────────────────
 * variant?   → animation style (default: 'fade-scale')
 * className? → forwarded to the motion wrapper div
 * delay?     → seconds before animation starts (default: 0)
 * distance?  → translate distance in px for rise/slide variants (default: 28)
 */

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PageTransitionVariant =
  | 'rise'
  | 'slide-left'
  | 'slide-right'
  | 'fade'
  | 'fade-scale'
  | 'blur-in';

export interface PageTransitionProps {
  children: ReactNode;
  /** Animation style — choose based on the page's purpose (default: 'fade-scale') */
  variant?: PageTransitionVariant;
  /** Extra classes on the motion wrapper div */
  className?: string;
  /** Seconds before animation starts (default: 0) */
  delay?: number;
  /** Translate distance in px for rise / slide variants (default: 28) */
  distance?: number;
}

// ─── Variant config ───────────────────────────────────────────────────────────

interface VariantConfig {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  // framer-motion accepts per-property transition maps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition: any;
}

function getVariantConfig(
  variant: PageTransitionVariant,
  distance: number,
  delay: number,
  reduced: boolean,
): VariantConfig {
  // Reduced-motion: collapse everything to a simple fast fade
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.22, ease: 'easeOut', delay },
    };
  }

  switch (variant) {
    case 'rise':
      return {
        initial: { opacity: 0, y: distance, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: {
          opacity: { duration: 0.55, ease: 'easeOut', delay },
          y:       { type: 'spring', stiffness: 200, damping: 26, delay },
          scale:   { type: 'spring', stiffness: 200, damping: 26, delay },
        },
      };

    case 'slide-left':
      return {
        initial: { opacity: 0, x: -distance },
        animate: { opacity: 1, x: 0 },
        transition: {
          opacity: { duration: 0.4, ease: 'easeOut', delay },
          x:       { type: 'spring', stiffness: 240, damping: 28, delay },
        },
      };

    case 'slide-right':
      return {
        initial: { opacity: 0, x: distance },
        animate: { opacity: 1, x: 0 },
        transition: {
          opacity: { duration: 0.4, ease: 'easeOut', delay },
          x:       { type: 'spring', stiffness: 240, damping: 28, delay },
        },
      };

    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.4, ease: 'easeOut', delay },
      };

    case 'fade-scale':
      return {
        initial: { opacity: 0, scale: 0.97 },
        animate: { opacity: 1, scale: 1 },
        transition: {
          opacity: { duration: 0.45, ease: 'easeOut', delay },
          scale:   { type: 'spring', stiffness: 260, damping: 24, delay },
        },
      };

    case 'blur-in':
      return {
        initial: { opacity: 0, filter: 'blur(10px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        transition: {
          opacity: { duration: 0.5,  ease: 'easeOut', delay },
          filter:  { duration: 0.35, ease: 'easeOut', delay },
        },
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageTransition({
  children,
  variant = 'fade-scale',
  className,
  delay = 0,
  distance = 28,
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  const { initial, animate, transition } = getVariantConfig(
    variant,
    distance,
    delay,
    !!prefersReducedMotion,
  );

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      animate={animate}
      transition={transition}
      // Hint the browser to promote this layer early, avoiding paint jank.
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
