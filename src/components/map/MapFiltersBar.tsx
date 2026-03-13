import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import {
  MapFilterState,
  TONIGHT_CHIPS,
  activeFilterCount,
  DEFAULT_MAP_FILTERS,
} from '@/lib/mapUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapFiltersBarProps {
  filters: MapFilterState;
  onChange: (next: MapFilterState) => void;
  venueCount: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0 ${
        active
          ? 'text-white border border-primary/60'
          : 'text-white/60 border border-white/10 hover:border-white/25 hover:text-white/80'
      }`}
      style={
        active
          ? {
              background: 'rgba(236,72,153,0.18)',
              boxShadow: '0 0 0 1px rgba(236,72,153,0.35)',
            }
          : { background: 'rgba(255,255,255,0.05)' }
      }
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MapFiltersBar — overlaid at the top of the map canvas.
 * Row 1: quick filters (Open Now, min-rating chips, price-tier chips) + Hide control
 * Row 2: Tonight chips (DJs, Live Music, Karaoke, Sports, Rooftop, Lounge)
 *
 * Collapses into a compact "Filters" pill when hidden; all selections preserved.
 */
export const MapFiltersBar = memo(function MapFiltersBar({
  filters,
  onChange,
  venueCount,
}: MapFiltersBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const count = activeFilterCount(filters);

  const set = (patch: Partial<MapFilterState>) =>
    onChange({ ...filters, ...patch });

  const toggleRating = (val: number) =>
    set({ minRating: filters.minRating === val ? null : val });

  const togglePrice = (val: MapFilterState['priceTier']) =>
    set({ priceTier: filters.priceTier === val ? null : val });

  const toggleTonightChip = (key: string) => {
    const next = filters.tonightChips.includes(key)
      ? filters.tonightChips.filter((k) => k !== key)
      : [...filters.tonightChips, key];
    set({ tonightChips: next });
  };

  return (
    <div
      className="absolute top-0 left-0 right-14 z-[6] pointer-events-none"
      // right-14 leaves room for MapControls (top-right)
    >
      <div className="mx-3 mt-3">

        {/* ── Collapsed: compact pill button ──────────────────────────── */}
        <div
          className="pointer-events-auto"
          style={{
            opacity: isOpen ? 0 : 1,
            pointerEvents: isOpen ? 'none' : 'auto',
            transform: isOpen ? 'scale(0.92) translateY(-4px)' : 'scale(1) translateY(0)',
            transition: 'opacity 200ms ease, transform 200ms ease',
            position: isOpen ? 'absolute' : 'relative',
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Show filters"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[13px] font-semibold text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              background: 'rgba(8,8,20,0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow:
                '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.18)',
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary/80" />
            Filters
            {count > 0 && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
                style={{ background: '#ec4899' }}
              >
                {count}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          </button>
        </div>

        {/* ── Expanded: full filter panel ──────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            maxHeight: isOpen ? '320px' : '0',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: 'max-height 220ms ease-in-out, opacity 200ms ease',
            background: isOpen ? 'rgba(8,8,20,0.88)' : 'transparent',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isOpen
              ? '0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(168,85,247,0.15)'
              : 'none',
          }}
        >
          {/* ── Row 1: Quick filters ──────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Open Now */}
            <Chip active={filters.openNow} onClick={() => set({ openNow: !filters.openNow })}>
              🟢 Open Now
            </Chip>

            {/* Divider */}
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />

            {/* Rating chips */}
            {([4.5, 4.0, 3.5] as const).map((r) => (
              <Chip
                key={r}
                active={filters.minRating === r}
                onClick={() => toggleRating(r)}
              >
                ★ {r}+
              </Chip>
            ))}

            {/* Divider */}
            <div className="h-5 w-px bg-white/10 flex-shrink-0" />

            {/* Price tier chips */}
            {(
              [
                { val: 'budget', label: '₮ Budget' },
                { val: 'moderate', label: '₮₮ Mid' },
                { val: 'premium', label: '₮₮₮ Premium' },
              ] as const
            ).map(({ val, label }) => (
              <Chip
                key={val}
                active={filters.priceTier === val}
                onClick={() => togglePrice(val)}
              >
                {label}
              </Chip>
            ))}

            {/* Spacer */}
            <div className="flex-1 min-w-2" />

            {/* Clear button (only when filters active) */}
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...DEFAULT_MAP_FILTERS })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-primary/80 hover:text-primary border border-primary/30 hover:border-primary/60 whitespace-nowrap flex-shrink-0 transition-colors"
                style={{ background: 'rgba(236,72,153,0.08)' }}
              >
                <X className="h-3 w-3" />
                Clear {count}
              </button>
            )}

            {/* Hide button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Hide filters"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 whitespace-nowrap flex-shrink-0 transition-colors ml-1"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <ChevronUp className="h-3 w-3" />
              Hide
            </button>
          </div>

          {/* Divider between rows */}
          <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.07)' }} />

          {/* ── Row 2: Tonight chips ──────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            <span className="text-[11px] text-white/35 font-medium flex-shrink-0 tracking-wide uppercase">
              Tonight
            </span>
            {TONIGHT_CHIPS.map((chip) => (
              <Chip
                key={chip.key}
                active={filters.tonightChips.includes(chip.key)}
                onClick={() => toggleTonightChip(chip.key)}
              >
                {chip.emoji} {chip.label}
              </Chip>
            ))}
          </div>

          {/* Results count — only when filters are active */}
          {count > 0 && (
            <div
              className="px-3 py-1.5 text-[11px] text-white/40 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              {venueCount} venue{venueCount !== 1 ? 's' : ''} match
              {count === 1 ? 'es' : ''} your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
