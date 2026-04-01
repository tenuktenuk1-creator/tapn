import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Search, Plus, Trash2, Clock, MapPin,
  Share2, Zap, Music, Coffee, Star,
  CreditCard, ChevronRight, CalendarDays,
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePlannedNight } from '@/hooks/usePlannedNights';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/page-transition';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannedStop {
  id: string;
  venue: PublicVenue;
  arrivalTime: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(min: number) {
  const n = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}
function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2,'0')} ${ampm}`;
}

/** 30-min slots within venue opening hours for today */
function getArrivalSlots(venue: PublicVenue, date: Date): string[] {
  if (!venue.opening_hours || !Object.keys(venue.opening_hours).length) {
    return Array.from({ length: 28 }, (_, i) => minutesToTime(10 * 60 + i * 30));
  }
  const day = DAYS[date.getDay()];
  const hours = venue.opening_hours[day] as { open: string; close: string } | undefined;
  if (!hours || hours.open === 'closed' || hours.close === 'closed') return [];

  const openMin  = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const isCross  = closeMin <= openMin;
  const dur      = isCross ? (1440 - openMin) + closeMin : closeMin - openMin;
  const count    = Math.max(0, Math.floor(dur / 30) - 1);
  return Array.from({ length: count }, (_, i) => minutesToTime(openMin + i * 30));
}

function formatHour(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2,'0')}${ampm}`;
}

function getOpenHours(venue: PublicVenue, date: Date): string {
  if (!venue.opening_hours) return '';
  const day = DAYS[date.getDay()];
  const h = venue.opening_hours[day] as { open: string; close: string } | undefined;
  if (!h || h.open === 'closed') return 'Closed today';
  return `${formatHour(h.open)}–${formatHour(h.close)}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STOP_ICONS = [Music, Star, Coffee, Zap, Music, Star, Coffee];
const STOP_ROLES = ['First stop', 'Chill session', 'Main event', 'After party', 'Nightcap', 'Warm-up', 'Late night'];

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  lounge:       { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-400' },
  karaoke:      { bg: 'bg-pink-500/15',   text: 'text-pink-400',   dot: 'bg-pink-400'   },
  cafe:         { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  pool_snooker: { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400'   },
};

const FILTER_TAGS = [
  { label: '✦ Open Now',  key: 'open'         },
  { label: 'Lounge',      key: 'lounge'        },
  { label: 'Karaoke',     key: 'karaoke'       },
  { label: 'Cafe',        key: 'cafe'          },
  { label: 'Billiards',   key: 'pool_snooker'  },
];

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelLabel({ step, label, active }: { step: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {step}
      </div>
      <span className={cn(
        'text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-300',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanANight() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { data: venues, isLoading } = useVenues();
  const createPlannedNight = useCreatePlannedNight();

  const today = addDays(new Date(), 0);

  const [query,         setQuery]         = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<PublicVenue | null>(null);
  const [selectedTime,  setSelectedTime]  = useState<string>('');
  const [payMethod,     setPayMethod]     = useState<'qpay' | 'card'>('qpay');
  const [confirmed,     setConfirmed]     = useState(false);
  const [plannedStops,  setPlannedStops]  = useState<PlannedStop[]>([]);

  const timeSlots = useMemo(
    () => selectedVenue ? getArrivalSlots(selectedVenue, today) : [],
    [selectedVenue]
  );

  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    return venues.filter(v => {
      const matchesQuery  = !query || v.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = activeFilters.length === 0 || activeFilters.every(f => {
        if (f === 'open') return true;
        return v.venue_type === f;
      });
      return matchesQuery && matchesFilter;
    });
  }, [venues, query, activeFilters]);

  const toggleFilter = (key: string) => {
    setActiveFilters(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectVenue = (venue: PublicVenue) => {
    setSelectedVenue(venue);
    setSelectedTime('');
    setConfirmed(false);
  };

  const confirmStop = () => {
    if (!selectedVenue || !selectedTime) return;
    const idx = plannedStops.length;
    setPlannedStops(prev => [...prev, {
      id:          crypto.randomUUID(),
      venue:       selectedVenue,
      arrivalTime: selectedTime,
      role:        STOP_ROLES[idx % STOP_ROLES.length],
    }]);
    setConfirmed(true);
    toast.success(`${selectedVenue.name} added to your plan!`);
  };

  const removeStop = (id: string) => {
    setPlannedStops(prev => prev.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (!user) { navigate('/auth'); return; }
    if (plannedStops.length === 0) { toast.error('Add at least one stop'); return; }
    try {
      await createPlannedNight.mutateAsync({
        name: `Night Out - ${format(today, 'MMM d')}`,
        planned_date: format(today, 'yyyy-MM-dd'),
        stops: plannedStops.map((s, i) => ({
          venue_id:    s.venue.id,
          start_time:  s.arrivalTime,
          end_time:    minutesToTime(toMinutes(s.arrivalTime) + 120),
          order_index: i,
        })),
      });
      toast.success('Night plan saved!');
      navigate('/profile');
    } catch {
      toast.error('Failed to save plan');
    }
  };

  const panelStep = selectedVenue ? (plannedStops.length > 0 ? 2 : 1) : 0;

  return (
    <Layout>
      <PageTransition variant="rise" distance={48}>
        <div className="min-h-screen bg-background">

          {/* ── Step bar ──────────────────────────────────────────────────── */}
          <div className="border-b border-border bg-background/90 backdrop-blur-md sticky top-16 z-30">
            <div className="container flex items-center justify-center py-3">
              {(['Discover', 'Book', 'Plan'] as const).map((label, i) => (
                <div key={label} className="flex items-center">
                  <div className="flex items-center gap-2 px-4">
                    <div className={cn(
                      'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300',
                      panelStep >= i
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {i + 1}
                    </div>
                    <span className={cn(
                      'text-xs font-semibold tracking-widest uppercase transition-colors duration-300',
                      panelStep >= i ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="flex items-center">
                      <div className={cn(
                        'w-12 h-px transition-colors duration-500',
                        panelStep > i ? 'bg-primary' : 'bg-border'
                      )} />
                      <ChevronRight className={cn(
                        'h-3 w-3 -ml-1 transition-colors duration-500',
                        panelStep > i ? 'text-primary' : 'text-border'
                      )} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Three panels ──────────────────────────────────────────────── */}
          <div className="container py-6">
            <div className="grid lg:grid-cols-3 gap-5 h-[calc(100vh-172px)]">

              {/* ── LEFT: DISCOVER ──────────────────────────────────────── */}
              <div className="flex flex-col overflow-hidden">
                <PanelLabel step={1} label="Discover" active={panelStep >= 0} />

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {FILTER_TAGS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => toggleFilter(f.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200',
                        activeFilters.includes(f.key)
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search clubs, bars, lounges..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-xl outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground transition-colors"
                  />
                </div>

                {/* Venue list */}
                <div
                  className="flex-1 overflow-y-auto space-y-2"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
                    ))
                  ) : filteredVenues.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No venues found
                    </div>
                  ) : filteredVenues.map(venue => {
                    const isActive = selectedVenue?.id === venue.id;
                    const isAdded  = plannedStops.some(s => s.venue.id === venue.id);
                    const hours    = getOpenHours(venue, today);
                    const isClosed = hours === 'Closed today';
                    const statusLabel = isClosed ? 'Closed'
                      : venue.busy_status === 'busy' ? 'Busy'
                      : venue.busy_status === 'moderate' ? 'Popular' : 'Open';
                    const statusColor = isClosed ? 'text-red-400'
                      : venue.busy_status === 'busy' ? 'text-yellow-400'
                      : venue.busy_status === 'moderate' ? 'text-pink-400' : 'text-green-400';

                    return (
                      <motion.button
                        key={venue.id}
                        onClick={() => selectVenue(venue)}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          'w-full text-left rounded-2xl px-4 py-3.5 border transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-card border-border hover:border-primary/25'
                        )}
                      >
                        {/* Row 1: name + status */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-[15px] text-foreground truncate leading-tight">
                            {venue.name}
                          </p>
                          <span className={cn('text-xs font-semibold flex-shrink-0', statusColor)}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Row 2: type · hours */}
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {venueTypeLabels[venue.venue_type]}
                          {hours && ` · ${hours}`}
                        </p>

                        {/* Row 3: price */}
                        {venue.price_per_hour && (
                          <p className="text-[15px] font-bold text-primary mt-1.5">
                            ₮{venue.price_per_hour.toLocaleString()}
                          </p>
                        )}

                        {isAdded && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary/70 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            In your plan
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── CENTER: BOOK ────────────────────────────────────────── */}
              <div className="flex flex-col overflow-hidden">
                <PanelLabel step={2} label="Book" active={panelStep >= 1} />

                <div className="flex-1 overflow-y-auto">
                  {!selectedVenue ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                      <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center">
                        <MapPin className="h-8 w-8 opacity-20" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground/70">No venue selected</p>
                        <p className="text-xs mt-1 opacity-50">Pick one from Discover</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected venue card */}
                      <div className="rounded-2xl border border-primary/20 overflow-hidden">
                        {/* Header gradient */}
                        <div className="bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                              (TYPE_COLORS[selectedVenue.venue_type] ?? TYPE_COLORS.lounge).bg
                            )}>
                              {selectedVenue.venue_type === 'karaoke' ? '🎤'
                                : selectedVenue.venue_type === 'cafe' ? '☕'
                                : selectedVenue.venue_type === 'pool_snooker' ? '🎱'
                                : '🍸'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-base text-foreground leading-tight">
                                {selectedVenue.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {venueTypeLabels[selectedVenue.venue_type]}
                                {selectedVenue.city && ` · ${selectedVenue.city}`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {selectedVenue.price_per_hour && (
                              <div className="bg-black/20 rounded-xl px-3 py-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</p>
                                <p className="text-sm font-bold text-primary">
                                  ₮{selectedVenue.price_per_hour.toLocaleString()}
                                  <span className="text-xs font-normal text-muted-foreground">/цаг</span>
                                </p>
                              </div>
                            )}
                            <div className="bg-black/20 rounded-xl px-3 py-2">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hours</p>
                              <p className="text-sm font-semibold text-foreground/90 text-xs">
                                {getOpenHours(selectedVenue, today)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Address strip */}
                        {selectedVenue.address && (
                          <div className="px-4 py-2 border-t border-border/50 bg-card/50 flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">{selectedVenue.address}</p>
                          </div>
                        )}
                      </div>

                      {/* Arrival time */}
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Choose Arrival Time
                          </p>
                        </div>
                        {timeSlots.length === 0 ? (
                          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                            <p className="text-sm text-red-400 font-medium">Closed today</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Try selecting another venue</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {timeSlots.map(t => (
                              <button
                                key={t}
                                onClick={() => { setSelectedTime(t); setConfirmed(false); }}
                                className={cn(
                                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150',
                                  selectedTime === t
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30'
                                    : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                )}
                              >
                                {formatTime12(t)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Payment */}
                      <AnimatePresence>
                        {selectedTime && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-2.5">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Payment
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => setPayMethod('qpay')}
                                  className={cn(
                                    'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all duration-150',
                                    payMethod === 'qpay'
                                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                                  )}
                                >
                                  <Zap className="h-4 w-4" />
                                  QPay
                                </button>
                                <button
                                  onClick={() => setPayMethod('card')}
                                  className={cn(
                                    'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all duration-150',
                                    payMethod === 'card'
                                      ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                      : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                                  )}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Card
                                </button>
                              </div>
                            </div>

                            {/* Summary row */}
                            {selectedVenue.price_per_hour && (
                              <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-card border border-border">
                                <span className="text-sm text-muted-foreground">2 hours estimate</span>
                                <span className="text-sm font-bold text-foreground">
                                  ₮{(selectedVenue.price_per_hour * 2).toLocaleString()}
                                </span>
                              </div>
                            )}

                            <Button
                              className="w-full gradient-primary"
                              size="lg"
                              disabled={confirmed}
                              onClick={confirmStop}
                            >
                              {confirmed ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
                                  Added to Night Plan
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Add to Night Plan
                                </span>
                              )}
                            </Button>

                            {confirmed && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2.5 rounded-xl bg-green-500/10 border border-green-500/25 px-4 py-3"
                              >
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">✓</div>
                                <div>
                                  <p className="text-sm text-green-400 font-semibold">Confirmed for {formatTime12(selectedTime)}</p>
                                  <p className="text-xs text-muted-foreground">Show confirmation at the door</p>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT: NIGHT PLAN ─────────────────────────────────── */}
              <div className="flex flex-col overflow-hidden">
                <PanelLabel step={3} label="Night Plan" active={panelStep >= 2} />

                {/* Date badge */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-card border border-border">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(today, 'EEEE, MMM d')}
                  </span>
                  {plannedStops.length > 0 && (
                    <span className="ml-auto text-xs font-bold text-primary">
                      {plannedStops.length} {plannedStops.length === 1 ? 'stop' : 'stops'}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {plannedStops.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center">
                          <Music className="h-8 w-8 opacity-15" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Plus className="h-3.5 w-3.5 text-primary opacity-60" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/60">Your night is empty</p>
                        <p className="text-xs mt-1 text-muted-foreground opacity-60">
                          Select a venue and time to begin
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0 pb-2">
                      {plannedStops.map((stop, i) => {
                        const Icon = STOP_ICONS[i % STOP_ICONS.length];
                        const isLast = i === plannedStops.length - 1;
                        const typeStyle = TYPE_COLORS[stop.venue.venue_type] ?? TYPE_COLORS.lounge;

                        return (
                          <motion.div
                            key={stop.id}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
                            className="relative flex gap-3"
                          >
                            {/* Timeline line */}
                            {!isLast && (
                              <div className="absolute left-[18px] top-[42px] bottom-0 w-px bg-gradient-to-b from-primary/30 to-border" />
                            )}

                            {/* Icon node */}
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-2 border-2 z-10',
                              typeStyle.bg,
                              `border-${typeStyle.dot.replace('bg-', '')}`
                            )}>
                              <Icon className={cn('h-3.5 w-3.5', typeStyle.text)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-5">
                              <div className="bg-card border border-border rounded-2xl px-3 py-2.5 group relative">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {formatTime12(stop.arrivalTime)}
                                      <span className="mx-1.5 opacity-40">·</span>
                                      <span className={typeStyle.text}>{stop.role}</span>
                                    </p>
                                    <p className="font-semibold text-sm text-foreground truncate mt-0.5">
                                      {stop.venue.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {venueTypeLabels[stop.venue.venue_type]}
                                      {stop.venue.city && ` · ${stop.venue.city}`}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeStop(stop.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-150 flex-shrink-0 p-0.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <button
                    onClick={() => { setSelectedVenue(null); setConfirmed(false); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-150"
                  >
                    <Plus className="h-4 w-4" />
                    Add another stop
                  </button>
                  <Button
                    className="w-full gradient-primary"
                    size="lg"
                    disabled={plannedStops.length === 0 || createPlannedNight.isPending}
                    onClick={handleSave}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {createPlannedNight.isPending ? 'Saving…' : 'Save & Share Plan'}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
