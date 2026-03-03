/**
 * AnimatedWaveBackground
 *
 * Renders 1–2 layered SVG waves as a purely CSS-animated backdrop.
 * Zero dependencies beyond existing stack (no framer-motion needed).
 *
 * Implementation notes:
 * ─ Each SVG is 200 % wide with the wave pattern tiling at exactly 50 % of
 *   that width. Animating translateX(0) → translateX(-50%) is a perfect seamless loop.
 * ─ Wave A scrolls left-to-right; Wave B scrolls right-to-left.
 *   The two interference directions produce the organic "liquid" feel.
 * ─ Fade-in on mount (one-shot, 1.2 s) + continuous loop.
 * ─ prefers-reduced-motion: stops looping, fades wave in once, stays static.
 * ─ pointer-events: none + aria-hidden — completely inert for assistive tech.
 * ─ No layout shift: the outer container is `absolute`, so it has no effect
 *   on document flow. The parent must be `position: relative` (or absolute/fixed).
 */

import { cn } from '@/lib/utils';

// ─── Wave SVG path data ────────────────────────────────────────────────────────
//
// viewBox "0 0 2880 320" — 2× the tile width (1440).
// The cubic-bezier control points create a smooth sine-like wave.
// Tile 1 spans x 0–1440, tile 2 spans x 1440–2880 (identical control structure),
// so translateX(-50%) ≡ translateX(-1440) creates a gapless loop.
//
// Wave A  — slightly higher baseline, gentler amplitude
const PATH_A =
  'M0,155 C90,113 210,197 360,155 C510,113 630,197 720,155 ' +
  'C810,113 930,197 1080,155 C1230,113 1350,197 1440,155 ' +
  // tile 2 (identical)
  'C1530,113 1650,197 1800,155 C1950,113 2070,197 2160,155 ' +
  'C2250,113 2370,197 2520,155 C2670,113 2790,197 2880,155 ' +
  'L2880,320 L0,320 Z';

// Wave B  — slightly lower baseline, offset phase (+40 px baseline)
const PATH_B =
  'M0,195 C120,153 240,237 360,195 C480,153 600,237 720,195 ' +
  'C840,153 960,237 1080,195 C1200,153 1320,237 1440,195 ' +
  // tile 2
  'C1560,153 1680,237 1800,195 C1920,153 2040,237 2160,195 ' +
  'C2280,153 2400,237 2520,195 C2640,153 2760,237 2880,195 ' +
  'L2880,320 L0,320 Z';

// ─── CSS injected once into the document ─────────────────────────────────────
//
// Using a <style> tag inside the component is safe in React CSR apps.
// All class names are namespaced with "tapn-wave-" to avoid collisions.
const WAVE_STYLES = `
  @keyframes tapn-wave-fwd {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes tapn-wave-rev {
    from { transform: translateX(-50%); }
    to   { transform: translateX(0); }
  }
  @keyframes tapn-wave-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  /* Reduced motion: stop looping, keep the static wave visible */
  @media (prefers-reduced-motion: reduce) {
    .tapn-wave-layer-a,
    .tapn-wave-layer-b {
      animation: none !important;
      transform: translateX(0) !important;
    }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface AnimatedWaveBackgroundProps {
  /**
   * Extra Tailwind classes forwarded to the outermost wrapper div.
   * Useful to override z-index, opacity, etc.
   */
  className?: string;

  /**
   * How vivid/opaque the waves appear.
   * "subtle"  → opacity 0.22 / 0.14  (default, works well on dark pages)
   * "medium"  → opacity 0.38 / 0.26
   */
  intensity?: 'subtle' | 'medium';

  /**
   * Loop speed of the waves.
   * "slow"   → 18 s / 13 s (default — very calming)
   * "normal" → 11 s / 7 s
   */
  speed?: 'slow' | 'normal';

  /**
   * Where the wave is anchored within its relative parent.
   * "bottom" (default) → pinned to bottom edge, ~50 % of parent height
   * "top"              → pinned to top edge,    ~45 % of parent height
   * "full"             → covers the entire parent; gradient mask fades toward top
   */
  variant?: 'top' | 'bottom' | 'full';
}

export function AnimatedWaveBackground({
  className,
  intensity = 'subtle',
  speed = 'slow',
  variant = 'bottom',
}: AnimatedWaveBackgroundProps) {
  // ── Derived values ──────────────────────────────────────────────────────────
  const opacityA = intensity === 'subtle' ? 0.22 : 0.38;
  const opacityB = intensity === 'subtle' ? 0.14 : 0.26;

  const durA = speed === 'slow' ? '18s' : '11s';
  const durB = speed === 'slow' ? '13s' : '8s';

  // Container positioning based on variant
  const positionCls =
    variant === 'top'
      ? 'top-0 left-0 right-0 h-[45%] min-h-[160px]'
      : variant === 'bottom'
      ? 'bottom-0 left-0 right-0 h-[52%] min-h-[180px]'
      : 'inset-0'; // full

  // Gradient mask for "full" variant — fades the wave out near the top so it
  // doesn't cover content in the upper half of the page.
  const maskStyle: React.CSSProperties =
    variant === 'full'
      ? {
          maskImage: 'linear-gradient(to top, black 45%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 45%, transparent 100%)',
        }
      : {};

  return (
    <>
      {/* Inject keyframe styles once — harmless if rendered multiple times
          as browsers de-dup identical @keyframe declarations */}
      <style>{WAVE_STYLES}</style>

      {/* Outermost wrapper — absolute, behind content, no pointer events */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute overflow-hidden pointer-events-none select-none',
          positionCls,
          className,
        )}
        style={{
          // Mount fade-in: one-shot 1.2 s ease-out
          animation: 'tapn-wave-fadein 1.2s ease-out forwards',
          ...maskStyle,
        }}
      >
        {/* ── Wave A — back layer, scrolls left ──────────────────────── */}
        <svg
          className="tapn-wave-layer-a absolute bottom-0 h-full"
          style={{
            width: '200%',
            animation: `tapn-wave-fwd ${durA} linear infinite`,
            opacity: opacityA,
          }}
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <defs>
            {/* TAPN pink → purple */}
            <linearGradient id="tapn-wg-a" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="hsl(322,100%,62%)" />
              <stop offset="55%"  stopColor="hsl(300,90%,58%)" />
              <stop offset="100%" stopColor="hsl(280,85%,55%)" />
            </linearGradient>
          </defs>
          <path d={PATH_A} fill="url(#tapn-wg-a)" />
        </svg>

        {/* ── Wave B — front layer, scrolls right (counter-direction) ── */}
        <svg
          className="tapn-wave-layer-b absolute bottom-0 h-full"
          style={{
            width: '200%',
            animation: `tapn-wave-rev ${durB} linear infinite`,
            opacity: opacityB,
          }}
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <defs>
            {/* TAPN purple → blue */}
            <linearGradient id="tapn-wg-b" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="hsl(280,85%,55%)" />
              <stop offset="55%"  stopColor="hsl(250,88%,57%)" />
              <stop offset="100%" stopColor="hsl(220,90%,58%)" />
            </linearGradient>
          </defs>
          <path d={PATH_B} fill="url(#tapn-wg-b)" />
        </svg>
      </div>
    </>
  );
}
