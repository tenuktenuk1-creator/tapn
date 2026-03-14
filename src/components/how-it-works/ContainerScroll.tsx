import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import { ShowcaseContext } from './ShowcaseContext';

interface ContainerScrollProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Scroll-driven 3D container reveal.
 * Provides ShowcaseContext so children can consume scrollYProgress
 * for micro-animations (progress indicator, step labels, etc.).
 * Respects prefers-reduced-motion.
 */
export function ContainerScroll({
  titleComponent,
  children,
  className,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.9', 'start 0.15'],
  });

  // Raw transforms
  const rotateX    = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale      = useTransform(scrollYProgress, [0, 1], [0.87, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);
  const titleY       = useTransform(scrollYProgress, [0, 0.35], [24, 0]);

  // Spring-smooth the card transforms only
  const springCfg   = { stiffness: 80, damping: 28, restDelta: 0.001 };
  const sRotateX    = useSpring(rotateX,    springCfg);
  const sScale      = useSpring(scale,      springCfg);
  const sTranslateY = useSpring(translateY, springCfg);

  const reduced = !!prefersReducedMotion;

  return (
    <ShowcaseContext.Provider value={scrollYProgress}>
      <div ref={containerRef} className={`flex flex-col items-center ${className ?? ''}`}>

        {/* Title block fades in as card enters view */}
        <motion.div
          style={reduced ? {} : { opacity: titleOpacity, y: titleY }}
          className="text-center mb-10 md:mb-14 px-4 z-10 w-full"
        >
          {titleComponent}
        </motion.div>

        {/* Backdrop glow — sits behind the card, never clips it */}
        <div className="relative w-full px-4 md:px-6">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                'radial-gradient(ellipse 55% 45% at 50% 50%, hsl(322 100% 60% / 0.13) 0%, transparent 60%)',
                'radial-gradient(ellipse 70% 55% at 45% 60%, hsl(280 85% 55% / 0.10) 0%, transparent 65%)',
                'radial-gradient(ellipse 50% 40% at 60% 40%, hsl(220 90% 55% / 0.07) 0%, transparent 60%)',
              ].join(', '),
              filter: 'blur(32px)',
              transform: 'translateY(8%)',
            }}
          />

          {/* Perspective wrapper */}
          <div style={{ perspective: '1200px' }}>
            <motion.div
              style={
                reduced
                  ? {}
                  : { rotateX: sRotateX, scale: sScale, y: sTranslateY }
              }
              className="w-full max-w-5xl mx-auto origin-top will-change-transform"
              whileHover={
                reduced
                  ? {}
                  : {
                      // Subtle glow lift on hover — no layout movement
                      filter: 'brightness(1.04)',
                      transition: { duration: 0.25, ease: 'easeOut' },
                    }
              }
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </ShowcaseContext.Provider>
  );
}
