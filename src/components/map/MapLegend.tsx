import { useState, memo } from 'react';
import { HelpCircle, X } from 'lucide-react';

/**
 * MapLegend — small toggleable overlay (bottom-right of map) that explains
 * what the map icons and states mean.
 */
export const MapLegend = memo(function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-12 right-3 z-[6] flex flex-col items-end gap-2">
      {/* Legend panel */}
      {open && (
        <div
          className="rounded-xl p-4 w-56 text-xs"
          style={{
            background: 'rgba(8,8,20,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.2)',
            animation: 'fadeScaleIn 200ms ease-out both',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-white/90 text-sm">Map Legend</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 rounded text-white/40 hover:text-white/80 transition-colors"
              aria-label="Close legend"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Avatar marker */}
            <LegendRow
              icon={
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-primary bg-secondary/60 text-[10px] font-bold text-primary">
                  A
                </span>
              }
              label="Venue marker"
              desc="Profile pic of the venue. Border colour = busyness."
            />

            {/* Cluster */}
            <LegendRow
              icon={
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}
                >
                  3+
                </span>
              }
              label="Cluster"
              desc="Multiple venues close together. Zoom in to expand."
            />

            {/* Busy indicators */}
            <div>
              <p className="text-white/60 mb-1.5">Marker border = busyness</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-white/70">Quiet — few people</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-white/70">Moderate — getting busy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-white/70">Busy — full capacity</span>
                </div>
              </div>
            </div>

            {/* Saved heart */}
            <LegendRow
              icon={
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm"
                  style={{ background: '#ec4899' }}
                >
                  ♥
                </span>
              }
              label="Saved venue"
              desc="Heart badge on marker = you've saved this venue."
            />

            {/* Primary ring */}
            <LegendRow
              icon={
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-primary bg-transparent" />
              }
              label="Selected"
              desc="Pink ring = currently viewing this venue's preview."
            />
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close map legend' : 'Open map legend'}
        aria-pressed={open}
        className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          open
            ? 'bg-primary text-white'
            : 'bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-background'
        }`}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(4px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
});

function LegendRow({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-white/80">{label}</p>
        <p className="text-white/45 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
