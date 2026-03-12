/**
 * BottomSheetTransition
 *
 * Wraps any children with a premium "panel rising from below" entrance
 * animation:  translateY ↑  +  opacity  +  scale  +  optional blur.
 *
 * Motion profile
 * ─────────────────────────────────────────────────────────────────────
 * • y / scale  → spring (stiffness 320, damping 30) — lands with a tiny
 *               overshoot that reads as "organic" rather than mechanical.
 * • opacity    → easeOut 0.5 s — slightly longer so content doesn't pop.
 * • filter     → easeOut 0.35 s — fast enough that text is readable before
 *               the rest of the animation completes.
 *
 * Reduced-motion  (prefers-reduced-motion: reduce)
 * ─────────────────────────────────────────────────────────────────────
 * No translate, scale, or blur. Only a quick opacity fade-in (0.25 s).
 *
 * Usage
 * ─────────────────────────────────────────────────────────────────────
 * <BottomSheetTransition delay={0.05} distance={48}>
 *   <MyCard />
 * </BottomSheetTransition>
 *
 * Props
 * ─────────────────────────────────────────────────────────────────────
 * className?  → forwarded to the positioning wrapper div
 * delay?      → seconds before animation starts (default 0)
 * distance?   → translateY start distance in px   (default 40)
 * blur?       → apply blur(8px) during entrance   (default true)
 * backdrop?   → soft radial glow behind the panel (default true)
 */

import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BottomSheetTransitionProps {
  children: ReactNode;
  /** Extra classes on the outer positioning div */
  className?: string;
  /** Delay before animation starts, in seconds (default: 0) */
  delay?: number;
  /** How far below the final position the panel starts, px (default: 40) */
  distance?: number;
  /** Entrance blur effect (default: true) */
  blur?: boolean;
  /** Subtle radial glow that fades in behind the panel (default: true) */
  backdrop?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BottomSheetTransition({
  children,
  className,
  delay = 0,
  distance = 40,
  blur = true,
  backdrop = true,
}: BottomSheetTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  // ── Initial / animate states ────────────────────────────────────────────────

  const initial = prefersReducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: distance,
        scale: 0.98,
        filter: blur ? 'blur(8px)' : 'blur(0px)',
      };

  const animate = prefersReducedMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
      };

  // Per-property transition config so y/scale get the spring (overshoot)
  // while opacity and blur get easeOut curves (better readability).
  const transition = prefersReducedMotion
    ? { duration: 0.25, ease: 'easeOut', delay }
    : {
        opacity: { duration: 0.50, ease: 'easeOut', delay },
        y: {
          type: 'spring' as const,
          stiffness: 320,
          damping: 30,
          delay,
        },
        scale: {
          type: 'spring' as const,
          stiffness: 320,
          damping: 30,
          delay,
        },
        filter: { duration: 0.35, ease: 'easeOut', delay },
      };

  return (
    <div className={cn('relative', className)}>
      {/* Optional soft backdrop: a radial glow that fades in behind the panel.
          Uses aria-hidden and pointer-events-none so it is fully inert.
          Only rendered when motion is allowed (no point animating for
          prefers-reduced-motion users since it's purely decorative). */}
      {backdrop && !prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 rounded-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.1 }}
          style={{
            // Subtle TAPN-purple radial glow anchored to the panel's bottom edge.
            // Opacity is controlled by Framer; the gradient itself is semi-transparent
            // so the total visual opacity is low even at full animation opacity.
            background:
              'radial-gradient(ellipse 90% 55% at 50% 105%, hsl(280 85% 55% / 0.11) 0%, transparent 72%)',
          }}
        />
      )}

      {/* The rising panel itself */}
      <motion.div
        initial={initial}
        animate={animate}
        transition={transition}
        // willChange hints the browser to promote this layer early,
        // preventing layout thrashing on entrance.
        style={{ willChange: 'transform, opacity, filter' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
