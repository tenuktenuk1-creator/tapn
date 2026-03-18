import { useState, useRef, useCallback, useEffect } from 'react';
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  type Variants,
} from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, useMyPartnerRequest, useApplyPartner } from '@/hooks/usePartner';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, Calendar, Users, ChevronRight,
  CheckCircle, Loader2, Clock, ArrowDown, Zap, Eye, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Static data ─────────────────────────────────────────────────────────────

const AMBIENT_PARTICLES = [
  { id: 0, ox: -155, oy: -28, size: 4, delay: 0,   dur: 4.5, hue: 322 },
  { id: 1, ox:  155, oy: -28, size: 3, delay: 0.8, dur: 5.2, hue: 290 },
  { id: 2, ox: -170, oy:  22, size: 2, delay: 1.6, dur: 3.8, hue: 310 },
  { id: 3, ox:  165, oy:  22, size: 2, delay: 2.4, dur: 4.1, hue: 280 },
  { id: 4, ox:  -90, oy: -54, size: 3, delay: 0.4, dur: 5.5, hue: 330 },
  { id: 5, ox:   90, oy: -54, size: 2, delay: 1.2, dur: 4.8, hue: 300 },
  { id: 6, ox:    0, oy: -65, size: 2, delay: 2.0, dur: 5.0, hue: 315 },
  { id: 7, ox:    0, oy:  52, size: 3, delay: 0.6, dur: 4.3, hue: 295 },
];

const STEPS = [
  {
    num: '01',
    icon: Zap,
    title: 'Apply in Seconds',
    description: 'Create your account and submit a partner application in under 2 minutes. No paperwork, no friction.',
  },
  {
    num: '02',
    icon: Building2,
    title: 'Build Your Listing',
    description: 'Add photos, set pricing, and define your availability. We make your venue look its best.',
  },
  {
    num: '03',
    icon: BarChart2,
    title: 'Watch Bookings Arrive',
    description: 'Customers discover your venue on TAPN and book directly. No chasing, no missed revenue.',
  },
];

const BENEFITS = [
  {
    icon: Eye,
    title: 'Expand Your Reach',
    description: 'Get discovered by groups actively searching for the right venue in Ulaanbaatar.',
    hue: 322,
  },
  {
    icon: TrendingUp,
    title: 'Fill Every Slot',
    description: 'Turn quiet nights into revenue. TAPN surfaces your venue when demand peaks.',
    hue: 300,
  },
  {
    icon: Calendar,
    title: 'Manage with Ease',
    description: 'One dashboard for listings, bookings, availability, and everything in between.',
    hue: 280,
  },
  {
    icon: Users,
    title: 'Grow With the Network',
    description: 'Connect with a growing community of night-life planners who keep coming back.',
    hue: 260,
  },
];

const VENUE_TYPES = [
  'Cafés', 'Karaoke Rooms', 'Pool Halls', 'Lounges',
  'Night Bars', 'Private Event Spaces', 'Game Cafés', 'Rooftop Terraces',
];

// ─── Fade-up entrance variant ─────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── AmbientParticle ──────────────────────────────────────────────────────────

function AmbientParticle({
  ox, oy, size, delay, dur, hue, intensify,
}: (typeof AMBIENT_PARTICLES)[0] & { intensify: boolean }) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;
  return (
    <motion.span
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        x: ox,
        y: oy,
        background: `hsl(${hue} 100% 68%)`,
        boxShadow: `0 0 ${size * 3}px hsl(${hue} 100% 60% / 0.6)`,
      }}
      animate={{
        y: [oy - 9, oy + 9, oy - 9],
        opacity: intensify ? [0.45, 0.85, 0.45] : [0.12, 0.35, 0.12],
        scale: [1, 1.35, 1],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── ConnectionHero ───────────────────────────────────────────────────────────

function ConnectionHero({
  onConnect,
  isLoading,
}: {
  onConnect: () => Promise<void>;
  isLoading: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<'idle' | 'hover' | 'connecting'>('idle');
  const isHovered = phase === 'hover';
  const isConnecting = phase === 'connecting';

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const handleClick = useCallback(async () => {
    if (isConnecting || isLoading) return;
    setPhase('connecting');
    await new Promise(r => setTimeout(r, 900));
    await onConnect();
    if (mountedRef.current) setPhase('idle');
  }, [isConnecting, isLoading, onConnect]);

  const joinX  = isConnecting ? 30 : isHovered ? 10 : 0;
  const tapnX  = isConnecting ? -30 : isHovered ? -10 : 0;
  const glowOpacity = isConnecting ? 1 : isHovered ? 0.75 : 0.3;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Ambient radial glow */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 520,
          height: 220,
          background: 'radial-gradient(ellipse at center, hsl(322 100% 60% / 0.12) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ opacity: isHovered || isConnecting ? 1.6 : 1, scale: isHovered ? 1.15 : 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Ring pulse on connect */}
      <AnimatePresence>
        {isConnecting && !prefersReduced && [0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-primary/25 pointer-events-none"
            style={{ width: 260, height: 80, top: '50%', left: '50%' }}
            initial={{ x: '-50%', y: '-50%', scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 2.8 + i * 0.4, opacity: 0 }}
            transition={{ duration: 1.1, delay: i * 0.14, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Capsule row */}
      <div
        className="relative flex items-center gap-8 sm:gap-12 cursor-pointer"
        onMouseEnter={() => !isConnecting && setPhase('hover')}
        onMouseLeave={() => !isConnecting && setPhase('idle')}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Join TAPN as a partner"
        onKeyDown={e => e.key === 'Enter' && handleClick()}
      >
        {/* Ambient particles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {AMBIENT_PARTICLES.map(p => (
            <AmbientParticle key={p.id} {...p} intensify={isHovered || isConnecting} />
          ))}
        </div>

        {/* JOIN capsule */}
        <motion.div
          animate={{ x: joinX }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            className="relative overflow-hidden px-7 py-3.5 rounded-full font-extrabold text-xl tracking-[0.2em] text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(322 100% 58%) 0%, hsl(300 88% 54%) 100%)',
            }}
            animate={{
              boxShadow: isConnecting
                ? '0 0 50px hsl(322 100% 60% / 0.95), 0 0 90px hsl(322 100% 60% / 0.45)'
                : `0 0 ${isHovered ? 28 : 14}px hsl(322 100% 60% / ${glowOpacity}), 0 0 ${isHovered ? 55 : 25}px hsl(322 100% 60% / ${glowOpacity * 0.45})`,
            }}
            transition={{ duration: 0.4 }}
            whileHover={prefersReduced ? {} : { scale: 1.05 }}
            whileTap={prefersReduced ? {} : { scale: 0.96 }}
          >
            {/* Shimmer sweep */}
            {!prefersReduced && (
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)',
                }}
                animate={{ x: ['-120%', '220%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 2.5 }}
              />
            )}
            {isLoading && isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : 'JOIN'}
          </motion.div>
        </motion.div>

        {/* Connecting beam */}
        <div className="relative w-16 sm:w-20 h-10 flex items-center overflow-hidden pointer-events-none">
          {/* Static line */}
          <motion.div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(322 100% 60% / 0.35), hsl(280 85% 55% / 0.35))',
            }}
            animate={{ scaleX: isHovered || isConnecting ? 1 : 0.55, opacity: isHovered || isConnecting ? 1 : 0.35 }}
            transition={{ duration: 0.4 }}
          />
          {/* Traveling dots */}
          {!prefersReduced && [0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: isHovered ? 4 : 3,
                height: isHovered ? 4 : 3,
                background: `hsl(${315 + i * 10} 100% 70%)`,
                boxShadow: isHovered ? `0 0 8px hsl(322 100% 60%)` : 'none',
              }}
              animate={{
                left: ['-8%', '108%'],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: isHovered || isConnecting ? 0.7 : 2,
                repeat: Infinity,
                delay: i * (isHovered ? 0.18 : 0.55),
                ease: 'easeInOut',
                repeatDelay: isHovered ? 0.05 : 0.3,
              }}
            />
          ))}
        </div>

        {/* TAPN capsule */}
        <motion.div
          animate={{ x: tapnX }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            className="relative overflow-hidden px-7 py-3.5 rounded-full font-extrabold text-xl tracking-[0.2em] text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(280 85% 55%) 0%, hsl(245 78% 60%) 100%)',
            }}
            animate={{
              boxShadow: isConnecting
                ? '0 0 50px hsl(280 85% 55% / 0.95), 0 0 90px hsl(280 85% 55% / 0.45)'
                : `0 0 ${isHovered ? 28 : 14}px hsl(280 85% 55% / ${glowOpacity}), 0 0 ${isHovered ? 55 : 25}px hsl(280 85% 55% / ${glowOpacity * 0.4})`,
            }}
            transition={{ duration: 0.4 }}
          >
            {!prefersReduced && (
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                }}
                animate={{ x: ['-120%', '220%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
              />
            )}
            TAPN
          </motion.div>
        </motion.div>
      </div>

      {/* Hint */}
      <motion.p
        className="mt-5 text-xs font-medium tracking-widest uppercase text-muted-foreground"
        animate={{ opacity: isConnecting ? 0 : 0.7 }}
        transition={{ duration: 0.3 }}
      >
        {isLoading ? 'Connecting…' : 'Tap JOIN to enter the network'}
      </motion.p>
    </div>
  );
}

// ─── StepsSection ─────────────────────────────────────────────────────────────

function StepsSection({ onApply, isLoading }: { onApply: () => void; isLoading: boolean }) {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 800px 400px at 50% 60%, hsl(280 85% 55% / 0.05) 0%, transparent 70%)',
        }}
      />

      <div className="container max-w-4xl mx-auto px-4">
        <motion.div
          className="text-center mb-20"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="text-xs tracking-widest uppercase text-primary/70 font-semibold mb-3">
            The Process
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            How It{' '}
            <span className="text-gradient">Works</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="hidden md:block absolute left-[calc(2rem+1px)] top-8 bottom-8 w-px">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(to bottom, hsl(322 100% 60% / 0.6), hsl(280 85% 55% / 0.4), hsl(245 78% 60% / 0.2))',
              }}
              initial={{ scaleY: 0, originY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="space-y-10">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative flex gap-8 items-start"
                variants={fadeUp}
                custom={i * 0.12}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
              >
                {/* Step circle */}
                <div className="shrink-0 relative z-10">
                  <motion.div
                    className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, hsl(${322 - i * 20} 100% 58%), hsl(${280 - i * 20} 85% 52%))`,
                      boxShadow: `0 0 20px hsl(${322 - i * 20} 100% 60% / 0.3)`,
                    }}
                    whileInView={{
                      boxShadow: [`0 0 0px hsl(${322 - i * 20} 100% 60% / 0)`, `0 0 20px hsl(${322 - i * 20} 100% 60% / 0.3)`],
                    }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.2, duration: 0.6 }}
                  >
                    <step.icon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>

                {/* Step card */}
                <motion.div
                  className="flex-1 rounded-2xl p-7"
                  style={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  whileHover={{
                    borderColor: `hsl(${322 - i * 20} 100% 60% / 0.35)`,
                    boxShadow: `0 0 30px hsl(${322 - i * 20} 100% 60% / 0.08)`,
                  }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="text-xs font-mono text-primary/50 tracking-widest">{step.num}</span>
                  <h3 className="font-display text-xl font-bold mt-1 mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BenefitCard ──────────────────────────────────────────────────────────────

function BenefitCard({
  icon: Icon, title, description, hue, index,
}: (typeof BENEFITS)[0] & { index: number }) {
  return (
    <motion.div
      className="relative rounded-2xl p-7 overflow-hidden cursor-default group"
      style={{
        background: `linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box,
          linear-gradient(135deg, hsl(${hue} 100% 60% / 0.15), transparent 60%) border-box`,
        border: '1px solid transparent',
      }}
      variants={fadeUp}
      custom={index * 0.08}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{
        y: -6,
        boxShadow: `0 20px 50px hsl(${hue} 100% 60% / 0.1)`,
        background: `linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box, linear-gradient(135deg, hsl(${hue} 100% 60% / 0.45), hsl(${hue - 30} 80% 55% / 0.2)) border-box`,
        border: '1px solid transparent',
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Ambient light blob */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, hsl(${hue} 100% 60% / 0.1) 0%, transparent 70%)`,
        }}
      />

      {/* Icon */}
      <motion.div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 100% 58%), hsl(${hue - 30} 85% 52%))`,
          boxShadow: `0 0 14px hsl(${hue} 100% 60% / 0.25)`,
        }}
        whileHover={{ scale: 1.1, rotate: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Icon className="h-5 w-5 text-white" />
      </motion.div>

      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── BenefitsSection ──────────────────────────────────────────────────────────

function BenefitsSection() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 900px 500px at 50% 50%, hsl(322 100% 60% / 0.05) 0%, transparent 65%)',
        }}
      />

      <div className="container max-w-6xl mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="text-xs tracking-widest uppercase text-primary/70 font-semibold mb-3">
            The Value
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Why Partner With{' '}
            <span className="text-gradient">TAPN</span>?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-base">
            Everything your venue needs to grow, in one seamlessly connected platform.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b, i) => (
            <BenefitCard key={b.title} {...b} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── TrustStrip ───────────────────────────────────────────────────────────────

const marqueeStyle = `
  @keyframes tapn-marquee {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .tapn-marquee { animation: tapn-marquee 28s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .tapn-marquee { animation: none; }
  }
`;

function TrustStrip() {
  const doubled = [...VENUE_TYPES, ...VENUE_TYPES];
  return (
    <section className="py-16 border-y border-border/40 overflow-hidden relative">
      <style>{marqueeStyle}</style>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 100px at 50% 50%, hsl(280 85% 55% / 0.06) 0%, transparent 70%)',
        }}
      />
      <p className="text-center text-xs tracking-widest uppercase text-muted-foreground mb-8 font-medium">
        Built for every type of venue
      </p>
      <div className="overflow-hidden">
        <div className="tapn-marquee flex gap-6 w-max">
          {doubled.map((v, i) => (
            <span
              key={i}
              className="shrink-0 px-5 py-2.5 rounded-full text-sm font-medium border border-border/60 text-muted-foreground bg-secondary/30 whitespace-nowrap"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FinalCTASection ──────────────────────────────────────────────────────────

function FinalCTASection({ onApply, isLoading }: { onApply: () => void; isLoading: boolean }) {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background gradient blob */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 700px 350px at 50% 50%,
              hsl(322 100% 60% / 0.09) 0%,
              hsl(280 85% 55% / 0.07) 40%,
              transparent 70%)
          `,
        }}
      />

      <div className="container max-w-2xl mx-auto px-4 text-center relative z-10">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <p className="text-xs tracking-widest uppercase text-primary/70 font-semibold mb-4">
            Ready to grow?
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-5">
            Your venue deserves{' '}
            <span className="text-gradient">better nights</span>.
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-md mx-auto">
            Join the venues already using TAPN to build their customer base and fill their calendar.
          </p>

          {/* Mini connection badge */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase text-white"
              style={{ background: 'linear-gradient(135deg, hsl(322 100% 58%), hsl(300 88% 54%))' }}
            >
              JOIN
            </span>
            <div className="w-8 h-px bg-gradient-to-r from-primary/40 to-accent/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
            <div className="w-8 h-px bg-gradient-to-r from-accent/40 to-primary/40" />
            <span
              className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase text-white"
              style={{ background: 'linear-gradient(135deg, hsl(280 85% 55%), hsl(245 78% 60%))' }}
            >
              TAPN
            </span>
          </div>

          <Button
            size="lg"
            onClick={onApply}
            disabled={isLoading}
            className="gradient-primary text-white font-semibold text-base px-10 py-6 rounded-full shadow-lg hover:shadow-primary/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                Become a Partner
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PartnerLanding() {
  const { user, loading: authLoading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: myRequest, isLoading: requestLoading } = useMyPartnerRequest();
  const applyPartner = useApplyPartner();

  const handleApply = useCallback(async () => {
    if (!user) {
      navigate('/auth?redirect=/partner');
      return;
    }
    try {
      await applyPartner.mutateAsync();
      await refreshRole(user.id);
      toast.success('Welcome to the TAPN Partner Program!');
      navigate('/partner/dashboard');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('duplicate') || msg.includes('already')) {
        await refreshRole(user.id);
        navigate('/partner/dashboard');
      } else {
        toast.error('Failed to join partner program. Please try again.');
      }
    }
  }, [user, navigate, applyPartner, refreshRole]);

  // ── Loading ────────────────────────────────────────────────────────
  if (authLoading || partnerLoading || requestLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  // ── Already a partner ─────────────────────────────────────────────
  if (isPartner) {
    return (
      <Layout>
        <div className="container py-20 text-center max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, hsl(322 100% 58%), hsl(280 85% 55%))' }}
            >
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">
              You're already a <span className="text-gradient">Partner!</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Head to your dashboard to manage your venues and bookings.
            </p>
            <Button onClick={() => navigate('/partner/dashboard')} className="gradient-primary rounded-full px-8">
              Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Pending ───────────────────────────────────────────────────────
  if (myRequest?.status === 'pending') {
    return (
      <Layout>
        <div className="container py-20 text-center max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6 border border-yellow-500/20">
              <Clock className="h-10 w-10 text-yellow-500" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">
              Application <span className="text-yellow-500">Under Review</span>
            </h1>
            <p className="text-muted-foreground mb-4">
              Your partner application has been submitted. Our team will review it and notify you once approved.
            </p>
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(myRequest.created_at).toLocaleDateString()}
            </p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Rejected ──────────────────────────────────────────────────────
  if (myRequest?.status === 'rejected') {
    return (
      <Layout>
        <div className="container py-20 text-center max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <CheckCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">
              Application <span className="text-red-500">Not Approved</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              Unfortunately your application was not approved at this time. You may reapply below.
            </p>
            <Button
              onClick={handleApply}
              disabled={applyPartner.isPending}
              className="gradient-primary rounded-full px-8"
            >
              {applyPartner.isPending ? 'Submitting…' : 'Reapply'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Main landing ──────────────────────────────────────────────────
  return (
    <Layout>
      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden py-20">
        {/* Background dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Hero ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 900px 500px at 50% 40%,
                hsl(322 100% 60% / 0.07) 0%,
                hsl(280 85% 55% / 0.05) 45%,
                transparent 70%)
            `,
          }}
        />

        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-semibold tracking-widest uppercase mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Join the Network
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-display text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
          >
            Your Venue.{' '}
            <span className="text-gradient">Their Night Out.</span>
          </motion.h1>

          {/* Sub-copy */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-14 leading-relaxed"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
          >
            Partner with TAPN and connect with thousands of customers planning
            their perfect night in Ulaanbaatar.
          </motion.p>

          {/* Connection animation */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
          >
            <ConnectionHero
              onConnect={handleApply}
              isLoading={applyPartner.isPending}
            />
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="mt-20 flex flex-col items-center gap-2 text-muted-foreground/40"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.5}
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowDown className="h-4 w-4" />
            </motion.div>
            <span className="text-xs tracking-widest uppercase">Learn how it works</span>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <StepsSection onApply={handleApply} isLoading={applyPartner.isPending} />

      {/* ── WHY PARTNER ── */}
      <BenefitsSection />

      {/* ── TRUST STRIP ── */}
      <TrustStrip />

      {/* ── FINAL CTA ── */}
      <FinalCTASection onApply={handleApply} isLoading={applyPartner.isPending} />
    </Layout>
  );
}
