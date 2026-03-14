/**
 * TapnProductMock
 * ─────────────────────────────────────────────────────────────────────
 * Full TAPN product story in one animated card.
 * Scroll-driven micro-animations via ShowcaseContext (scrollYProgress).
 *
 * Panels:  DISCOVER  |  BOOK  |  NIGHT PLAN
 *
 * Micro-animations keyed to scrollYProgress phases:
 *   0.00–0.38  →  Discover active  (venue highlight pulses)
 *   0.38–0.72  →  Book active      (time slot glows, confirm button pulses, confirmed bar fades in)
 *   0.72–1.00  →  Plan active      (timeline dots illuminate in sequence)
 */

import { useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';
import {
  Search,
  CalendarCheck,
  Clock,
  MapPin,
  Music,
  Sparkles,
  PartyPopper,
  CheckCircle2,
  CreditCard,
  Zap,
  Users,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { useShowcaseProgress } from './ShowcaseContext';

// ─── brand tokens ──────────────────────────────────────────────────────────

const PINK   = 'hsl(322 100% 60%)';
const PURPLE = 'hsl(280 85% 55%)';
const BLUE   = 'hsl(220 90% 60%)';
const PINK_DIM   = 'hsl(322 100% 60% / 0.12)';
const PURPLE_DIM = 'hsl(280 85% 55% / 0.10)';

// ─── static data ────────────────────────────────────────────────────────────

type StatusKey = 'open' | 'popular' | 'busy';

const STATUS_STYLE: Record<StatusKey, { bg: string; color: string }> = {
  open:    { bg: 'hsl(142 76% 45% / 0.15)', color: 'hsl(142 76% 58%)' },
  popular: { bg: 'hsl(322 100% 60% / 0.15)', color: 'hsl(322 100% 68%)' },
  busy:    { bg: 'hsl(45 93% 55% / 0.15)',  color: 'hsl(45 93% 65%)'  },
};

const venues = [
  { name: 'Sky Lounge',  type: 'Lounge', status: 'open'    as StatusKey, time: '9PM–3AM',  price: '₮15,000', active: false },
  { name: 'Empire Club', type: 'Club',   status: 'popular' as StatusKey, time: '11PM–5AM', price: '₮20,000', active: true  },
  { name: 'Velvet Bar',  type: 'Bar',    status: 'busy'    as StatusKey, time: '8PM–2AM',  price: '₮12,000', active: false },
];

const TIME_SLOTS = ['10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM'];
const ACTIVE_SLOT = 2; // 11:30 PM

const TIMELINE = [
  { Icon: Music,       time: '8:00 PM',  name: 'Karaoke Star', tag: 'First stop'    },
  { Icon: Sparkles,    time: '10:30 PM', name: 'Sky Lounge',   tag: 'Chill session' },
  { Icon: PartyPopper, time: '12:00 AM', name: 'Empire Club',  tag: 'Main event'    },
];

const STEPS = ['Discover', 'Book', 'Plan'] as const;

// ─── helpers ────────────────────────────────────────────────────────────────

function pill(label: string, active: boolean) {
  return (
    <span
      key={label}
      className="text-[9px] font-semibold px-2 py-0.5 rounded-full border cursor-default select-none"
      style={
        active
          ? { background: PINK_DIM, borderColor: PINK, color: PINK }
          : { background: 'hsl(240 10% 9%)', borderColor: 'hsl(240 10% 18%)', color: 'hsl(0 0% 40%)' }
      }
    >
      {label}
    </span>
  );
}

// ─── sub-components ─────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]"
      style={{ background: 'hsl(240 13% 5%)' }}
    >
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
      </div>
      <div className="flex-1 mx-3">
        <div className="bg-white/[0.05] rounded px-3 py-0.5 text-[10px] text-white/25 font-mono tracking-tight">
          tapn.mn
        </div>
      </div>
      <span className="text-[10px] font-bold text-white/20 tracking-widest">TAPN</span>
    </div>
  );
}

interface StepBarProps { activeStep: number }

function StepBar({ activeStep }: StepBarProps) {
  return (
    <div
      className="flex items-center justify-center gap-0 px-6 py-2.5 border-b border-white/[0.05]"
      style={{ background: 'hsl(240 12% 5.5%)' }}
    >
      {STEPS.map((label, i) => {
        const isActive = i === activeStep;
        const isPast   = i < activeStep;
        return (
          <div key={label} className="flex items-center">
            {/* Connector line */}
            {i > 0 && (
              <div
                className="w-10 h-px mx-1"
                style={{
                  background: isPast
                    ? `linear-gradient(90deg, ${PINK}, ${PURPLE})`
                    : 'hsl(240 10% 18%)',
                  transition: 'background 0.4s ease',
                }}
              />
            )}
            {/* Dot + label */}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full transition-all duration-400"
                style={{
                  background: isActive ? PINK : isPast ? PURPLE : 'hsl(240 10% 20%)',
                  boxShadow: isActive ? `0 0 6px ${PINK}` : 'none',
                }}
              />
              <span
                className="text-[8px] font-semibold uppercase tracking-wider transition-colors duration-400"
                style={{ color: isActive ? PINK : isPast ? 'hsl(280 85% 65%)' : 'hsl(0 0% 30%)' }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DiscoverPanelProps { isFocused: boolean }

function DiscoverPanel({ isFocused }: DiscoverPanelProps) {
  return (
    <div className="p-4 space-y-2.5 flex flex-col">
      {/* Panel heading */}
      <div className="flex items-center gap-1.5 mb-1">
        <Search className="h-3 w-3" style={{ color: PINK }} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">Discover</span>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {pill('Open Now', isFocused)}
        {pill('Lounge',   false)}
        {pill('Rooftop',  false)}
      </div>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border"
        style={{ background: 'hsl(240 10% 8%)', borderColor: isFocused ? 'hsl(322 100% 60% / 0.25)' : 'hsl(240 10% 15%)' }}
      >
        <Search className="h-2.5 w-2.5 text-white/20 flex-shrink-0" />
        <span className="text-[10px] text-white/25 truncate">Clubs, bars, lounges…</span>
      </div>

      {/* Venue cards */}
      <div className="space-y-2">
        {venues.map((v) => {
          const st = STATUS_STYLE[v.status];
          return (
            <motion.div
              key={v.name}
              animate={
                v.active && isFocused
                  ? { boxShadow: [`0 0 10px hsl(322 100% 60% / 0.10)`, `0 0 18px hsl(322 100% 60% / 0.22)`, `0 0 10px hsl(322 100% 60% / 0.10)`] }
                  : { boxShadow: '0 0 0px transparent' }
              }
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-xl p-2.5 border cursor-default"
              style={
                v.active
                  ? { background: 'hsl(322 100% 60% / 0.07)', borderColor: 'hsl(322 100% 60% / 0.32)' }
                  : { background: 'hsl(240 10% 9%)',           borderColor: 'hsl(240 10% 15%)' }
              }
            >
              <div className="flex items-start justify-between mb-0.5">
                <p className="text-[11px] font-semibold" style={{ color: v.active ? '#fff' : 'hsl(0 0% 65%)' }}>
                  {v.name}
                </p>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-1 flex-shrink-0" style={st}>
                  {v.status === 'popular' ? 'Popular' : v.status === 'open' ? 'Open' : 'Busy'}
                </span>
              </div>
              <p className="text-[9px] text-white/30">{v.type} · {v.time}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: 'hsl(322 100% 65%)' }}>
                {v.price}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main export ────────────────────────────────────────────────────────────

export function TapnProductMock() {
  // Consume scroll progress from ContainerScroll context
  const ctxProgress = useShowcaseProgress();
  const ownProgress = useMotionValue(0); // stable fallback if rendered outside context
  const p = ctxProgress ?? ownProgress;

  // Reactive step state — updated via motion value event (no scroll handler spam)
  const [activeStep, setActiveStep] = useState(0);
  useMotionValueEvent(p, 'change', (v) => {
    if (v < 0.38)      setActiveStep(0);
    else if (v < 0.72) setActiveStep(1);
    else               setActiveStep(2);
  });

  // Confirm bar: fades in from 0 at 0.55 → 1 at 0.70
  const confirmOpacity = useTransform(p, [0.55, 0.72], [0, 1]);

  // Timeline dot opacities: each lights up in sequence in the Plan phase
  const dot0 = useTransform(p, [0.66, 0.76], [0.3, 1]);
  const dot1 = useTransform(p, [0.76, 0.86], [0.3, 1]);
  const dot2 = useTransform(p, [0.86, 0.96], [0.3, 1]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden group"
      style={{
        background: 'linear-gradient(165deg, hsl(240 12% 7%) 0%, hsl(240 15% 5%) 100%)',
        border: '1px solid hsl(240 10% 14%)',
        boxShadow: [
          '0 0 0 1px hsl(240 10% 17% / 0.6)',
          '0 0 70px hsl(322 100% 60% / 0.09)',
          '0 0 40px hsl(280 85% 55% / 0.07)',
          '0 40px 90px -20px hsl(240 15% 3% / 0.95)',
        ].join(', '),
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* Top radial glow inside card */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 55% 30% at 50% 0%, hsl(322 100% 60% / 0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <TopBar />
        <StepBar activeStep={activeStep} />

        {/* Three panels */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
          <DiscoverPanel isFocused={activeStep === 0} />

          {/* Center glow accent */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-px pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, hsl(322 100% 60% / 0.18) 40%, hsl(280 85% 55% / 0.12) 60%, transparent 100%)',
              }}
            />
            <BookingPanelWrapper isFocused={activeStep === 1} confirmOpacity={confirmOpacity} />
          </div>

          <PlanPanelWrapper dot0={dot0} dot1={dot1} dot2={dot2} />
        </div>
      </div>
    </div>
  );
}

// ─── wrappers that bridge MotionValue → number for child props ───────────────

// BookPanel needs confirmOpacity as a number for the motion.div opacity style —
// framer-motion supports MotionValue directly in motion.* style props, so we pass it through.

function BookingPanelWrapper({
  isFocused,
  confirmOpacity,
}: {
  isFocused: boolean;
  confirmOpacity: ReturnType<typeof useTransform>;
}) {
  return (
    <div className="p-4 space-y-2.5 flex flex-col">
      {/* Panel heading */}
      <div className="flex items-center gap-1.5 mb-1">
        <CalendarCheck className="h-3 w-3" style={{ color: PURPLE }} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">Book</span>
      </div>

      {/* Selected venue */}
      <div
        className="rounded-xl p-2.5 border"
        style={{ background: PURPLE_DIM, borderColor: 'hsl(280 85% 55% / 0.28)' }}
      >
        <p className="text-[11px] font-bold text-white leading-tight">Empire Club</p>
        <p className="text-[9px] text-white/40 mt-0.5">Club · 11PM–5AM · Downtown UB</p>
      </div>

      {/* Time slots */}
      <div>
        <p className="text-[8px] text-white/30 mb-1.5 font-semibold uppercase tracking-wider">Arrival time</p>
        <div className="grid grid-cols-3 gap-1">
          {TIME_SLOTS.map((t, i) => {
            const isActive = i === ACTIVE_SLOT;
            return (
              <motion.button
                key={t}
                animate={
                  isActive && isFocused
                    ? { boxShadow: ['0 0 8px hsl(322 100% 60% / 0.3)', '0 0 18px hsl(322 100% 60% / 0.5)', '0 0 8px hsl(322 100% 60% / 0.3)'] }
                    : { boxShadow: '0 0 0px transparent' }
                }
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[9px] py-1.5 rounded-lg border font-semibold cursor-default"
                style={
                  isActive
                    ? { background: `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`, borderColor: 'transparent', color: '#fff' }
                    : { background: 'hsl(240 10% 8%)', borderColor: 'hsl(240 10% 16%)', color: 'hsl(0 0% 40%)' }
                }
              >
                {t}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 px-0.5">
        <div className="flex items-center gap-1">
          <Users className="h-2.5 w-2.5 text-white/25" />
          <span className="text-[8px] text-white/30">4 guests</span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-2.5 w-2.5" style={{ color: 'hsl(322 100% 60% / 0.55)' }} />
          <span className="text-[8px] text-white/30">Verified</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="h-2.5 w-2.5" style={{ color: 'hsl(45 93% 55% / 0.7)' }} />
          <span className="text-[8px] text-white/30">Instant</span>
        </div>
      </div>

      {/* Payment */}
      <div
        className="rounded-xl p-2.5 border space-y-1.5"
        style={{ background: 'hsl(240 10% 7%)', borderColor: 'hsl(240 10% 14%)' }}
      >
        <p className="text-[8px] text-white/28 font-bold uppercase tracking-wider">Pay with</p>
        <div className="flex gap-1.5">
          <div
            className="flex-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 border"
            style={{ background: 'hsl(322 100% 60% / 0.08)', borderColor: 'hsl(322 100% 60% / 0.28)' }}
          >
            <Zap className="h-2.5 w-2.5" style={{ color: PINK }} />
            <span className="text-[9px] font-bold text-white/65">QPay</span>
          </div>
          <div
            className="flex-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 border"
            style={{ background: 'hsl(240 10% 9%)', borderColor: 'hsl(240 10% 15%)' }}
          >
            <CreditCard className="h-2.5 w-2.5 text-white/22" />
            <span className="text-[9px] text-white/30">Card</span>
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <motion.button
        animate={
          isFocused
            ? { boxShadow: ['0 0 14px hsl(322 100% 60% / 0.22)', '0 0 28px hsl(322 100% 60% / 0.42)', '0 0 14px hsl(322 100% 60% / 0.22)'] }
            : { boxShadow: '0 0 14px hsl(322 100% 60% / 0.15)' }
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-full py-2 rounded-xl text-[10px] font-bold text-white cursor-default"
        style={{ background: `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)` }}
      >
        Confirm Booking
      </motion.button>

      {/* Confirmed bar — opacity driven by scroll */}
      <motion.div
        style={{
          opacity: confirmOpacity,
          background: 'hsl(142 76% 45% / 0.08)',
          borderColor: 'hsl(142 76% 45% / 0.25)',
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      >
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" style={{ color: 'hsl(142 76% 55%)' }} />
        <p className="text-[9px] font-semibold" style={{ color: 'hsl(142 76% 60%)' }}>
          Booking confirmed — show at door
        </p>
      </motion.div>
    </div>
  );
}

function PlanPanelWrapper({
  dot0,
  dot1,
  dot2,
}: {
  dot0: ReturnType<typeof useTransform>;
  dot1: ReturnType<typeof useTransform>;
  dot2: ReturnType<typeof useTransform>;
}) {
  const dotMVs = [dot0, dot1, dot2];

  return (
    <div className="p-4 flex flex-col">
      {/* Panel heading */}
      <div className="flex items-center gap-1.5 mb-3">
        <Clock className="h-3 w-3" style={{ color: BLUE }} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">Night Plan</span>
      </div>

      {/* Timeline — dots use MotionValue for live opacity */}
      <div className="relative flex-1">
        {TIMELINE.map(({ Icon, time, name, tag }, i) => (
          <div key={name} className="flex gap-3 relative">
            {/* Connector */}
            {i < TIMELINE.length - 1 && (
              <motion.div
                className="absolute left-[13px] top-7 w-px"
                style={{
                  bottom: '-4px',
                  opacity: dotMVs[i],
                  background: `linear-gradient(to bottom, hsl(322 100% 60% / 0.4), hsl(280 85% 55% / 0.1))`,
                }}
              />
            )}
            {/* Glowing dot */}
            <motion.div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                opacity: dotMVs[i],
                border: `1px solid hsl(322 100% 60% / 0.4)`,
                background: `linear-gradient(135deg, hsl(322 100% 60% / 0.22) 0%, hsl(280 85% 55% / 0.22) 100%)`,
              }}
            >
              <Icon className="h-3 w-3" style={{ color: 'hsl(322 100% 65%)' }} />
            </motion.div>
            {/* Content */}
            <motion.div className="pb-5" style={{ opacity: dotMVs[i] }}>
              <p className="text-[9px] text-white/35 font-mono leading-none mb-0.5">{time}</p>
              <p className="text-[11px] font-semibold text-white/90 leading-snug">{name}</p>
              <p className="text-[9px] text-white/30">{tag}</p>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="space-y-1.5 mt-1">
        <button
          className="w-full py-1.5 rounded-xl text-[9px] font-semibold border cursor-default"
          style={{ borderColor: 'hsl(240 10% 18%)', color: 'hsl(0 0% 38%)', background: 'hsl(240 10% 8%)' }}
        >
          + Add another stop
        </button>
        <button
          className="w-full py-1.5 rounded-xl text-[9px] font-semibold border cursor-default"
          style={{ borderColor: 'hsl(280 85% 55% / 0.3)', background: 'hsl(280 85% 55% / 0.07)', color: 'hsl(280 85% 72%)' }}
        >
          Share Plan
        </button>
        <div className="flex items-center justify-center gap-1 pt-0.5">
          <MapPin className="h-2.5 w-2.5 text-white/20" />
          <span className="text-[8px] text-white/22">3 venues · Ulaanbaatar</span>
        </div>
      </div>
    </div>
  );
}
