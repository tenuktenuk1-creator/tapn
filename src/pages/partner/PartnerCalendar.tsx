import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  addMonths, subMonths, isSameDay, isSameMonth, isToday, parseISO,
  getDay, getHours, startOfDay,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, Users, MapPin,
  X, Check, AlertCircle, Phone, Mail, Building2, ChevronDown,
  Search, Filter,
} from 'lucide-react';
import { usePartnerBookings, usePartnerVenues, useConfirmBooking, useDeclineBooking } from '@/hooks/usePartner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'day';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

interface CalendarBooking {
  id: string;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number | null;
  status: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  created_at: string;
  venues: { name: string; city: string } | null;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string; border: string }> = {
  pending:   { label: 'Pending',   dot: 'bg-amber-400',    badge: 'bg-amber-400/15 text-amber-300 border-amber-400/25',   border: 'border-l-amber-400' },
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-400',  badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25', border: 'border-l-emerald-400' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400',      badge: 'bg-red-400/15 text-red-300 border-red-400/25',         border: 'border-l-red-400' },
  rejected:  { label: 'Declined',  dot: 'bg-red-500',      badge: 'bg-red-500/15 text-red-300 border-red-500/25',         border: 'border-l-red-500' },
  completed: { label: 'Completed', dot: 'bg-blue-400',     badge: 'bg-blue-400/15 text-blue-300 border-blue-400/25',      border: 'border-l-blue-400' },
};

function fmt(cents: number | null) {
  return `₮${Math.round((cents ?? 0) / 100).toLocaleString()}`;
}

// ─── Booking event pill ────────────────────────────────────────────────────────

function EventPill({ booking, onClick }: { booking: CalendarBooking; onClick: () => void }) {
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-all',
        'border-l-2 mb-0.5 hover:brightness-125',
        cfg.border,
        booking.status === 'pending'
          ? 'bg-amber-400/10 text-amber-200'
          : booking.status === 'confirmed'
          ? 'bg-emerald-400/10 text-emerald-200'
          : booking.status === 'cancelled' || booking.status === 'rejected'
          ? 'bg-red-400/10 text-red-200'
          : 'bg-blue-400/10 text-blue-200',
      )}
    >
      {booking.start_time?.slice(0, 5)} {booking.guest_name ?? 'Guest'}
    </button>
  );
}

// ─── Month calendar cell ───────────────────────────────────────────────────────

function MonthCell({
  date,
  currentMonth,
  bookings,
  selected,
  onSelect,
  onEventClick,
}: {
  date: Date;
  currentMonth: Date;
  bookings: CalendarBooking[];
  selected: boolean;
  onSelect: () => void;
  onEventClick: (b: CalendarBooking) => void;
}) {
  const inMonth = isSameMonth(date, currentMonth);
  const todayDate = isToday(date);
  const hasPending = bookings.some(b => b.status === 'pending');
  const visible = bookings.slice(0, 3);
  const overflow = bookings.length - 3;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'min-h-[90px] p-1.5 border-b border-r border-[hsl(240_10%_12%)] cursor-pointer transition-colors',
        inMonth ? 'bg-transparent hover:bg-[hsl(240_10%_9%)]' : 'bg-[hsl(240_10%_6%)]',
        selected && 'bg-[hsl(240_10%_11%)] ring-1 ring-inset ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
          todayDate ? 'bg-primary text-white' : inMonth ? 'text-foreground/80' : 'text-muted-foreground/40',
        )}>
          {format(date, 'd')}
        </span>
        {hasPending && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <div className="space-y-0.5">
        {visible.map(b => (
          <EventPill key={b.id} booking={b} onClick={() => onEventClick(b)} />
        ))}
        {overflow > 0 && (
          <p className="text-[9px] text-muted-foreground pl-1">+{overflow} more</p>
        )}
      </div>
    </div>
  );
}

// ─── Booking detail drawer ─────────────────────────────────────────────────────

function BookingDetailDrawer({
  booking,
  onClose,
}: {
  booking: CalendarBooking;
  onClose: () => void;
}) {
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

  async function handleConfirm() {
    try {
      await confirmBooking.mutateAsync(booking.id);
      toast.success('Booking confirmed');
      onClose();
    } catch { toast.error('Failed to confirm'); }
  }

  async function handleDecline() {
    try {
      await declineBooking.mutateAsync({ bookingId: booking.id, status: 'rejected' });
      toast.success('Booking declined');
      onClose();
    } catch { toast.error('Failed to decline'); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="fixed top-[60px] right-0 bottom-0 z-40 w-full max-w-sm bg-[hsl(240_12%_6%)] border-l border-[hsl(240_10%_13%)] flex flex-col shadow-2xl overflow-hidden"
    >
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(240_10%_13%)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
          <span className="font-semibold text-sm">{booking.guest_name ?? 'Guest'}</span>
          <Badge className={cn('text-[10px] border', cfg.badge)}>{cfg.label}</Badge>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[hsl(240_10%_12%)] text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Drawer content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Booking ID */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Booking ID</p>
          <p className="text-xs font-mono text-muted-foreground">{booking.id}</p>
        </div>

        {/* Venue + Date + Time */}
        <div className="p-4 rounded-xl bg-[hsl(240_10%_10%)] border border-[hsl(240_10%_15%)] space-y-3">
          {booking.venues?.name && (
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{booking.venues.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{format(parseISO(booking.booking_date), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{booking.guest_count} guest{booking.guest_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Guest contact */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Guest Contact</p>
          {booking.guest_email && (
            <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {booking.guest_email}
            </a>
          )}
          {booking.guest_phone && (
            <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {booking.guest_phone}
            </a>
          )}
          {!booking.guest_email && !booking.guest_phone && (
            <p className="text-sm text-muted-foreground">No contact details provided</p>
          )}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Special Requests</p>
            <div className="p-3 rounded-xl bg-[hsl(240_10%_10%)] border border-[hsl(240_10%_15%)]">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.notes.split('\n---\n')[0]}</p>
            </div>
          </div>
        )}

        {/* Revenue */}
        {booking.total_price && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15">
            <span className="text-sm text-muted-foreground">Booking value</span>
            <span className="font-bold text-primary">{fmt(booking.total_price)}</span>
          </div>
        )}

        {/* Source */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Source</span>
          <span className="text-xs px-2 py-1 rounded-full bg-[hsl(240_10%_12%)] text-muted-foreground">TAPN Direct</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Received</span>
          <span className="text-xs text-muted-foreground">{format(parseISO(booking.created_at), 'MMM d, HH:mm')}</span>
        </div>
      </div>

      {/* Quick actions */}
      {booking.status === 'pending' && (
        <div className="p-4 border-t border-[hsl(240_10%_13%)] space-y-2 shrink-0">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={handleConfirm}
            disabled={confirmBooking.isPending}
          >
            <Check className="h-4 w-4" />
            {confirmBooking.isPending ? 'Confirming…' : 'Confirm Booking'}
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2"
            onClick={handleDecline}
            disabled={declineBooking.isPending}
          >
            <X className="h-4 w-4" />
            {declineBooking.isPending ? 'Declining…' : 'Decline'}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Week view ─────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  bookings,
  onEventClick,
}: {
  currentDate: Date;
  bookings: CalendarBooking[];
  onEventClick: (b: CalendarBooking) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[hsl(240_10%_13%)]">
        {days.map(d => (
          <div key={d.toISOString()} className={cn('py-3 text-center border-r border-[hsl(240_10%_12%)] last:border-0', isToday(d) && 'bg-primary/5')}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{format(d, 'EEE')}</p>
            <p className={cn('text-lg font-bold mt-0.5', isToday(d) ? 'text-primary' : 'text-foreground')}>{format(d, 'd')}</p>
          </div>
        ))}
      </div>
      {/* Events per day */}
      <div className="grid grid-cols-7 min-h-[300px]">
        {days.map(d => {
          const ds = format(d, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.booking_date === ds);
          return (
            <div key={d.toISOString()} className={cn('p-2 border-r border-[hsl(240_10%_12%)] last:border-0 min-h-[200px]', isToday(d) && 'bg-primary/[0.02]')}>
              {dayBookings.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-[10px] text-muted-foreground/30">—</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {dayBookings.map(b => (
                    <EventPill key={b.id} booking={b} onClick={() => onEventClick(b)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day view ──────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  bookings,
  onEventClick,
}: {
  currentDate: Date;
  bookings: CalendarBooking[];
  onEventClick: (b: CalendarBooking) => void;
}) {
  const ds = format(currentDate, 'yyyy-MM-dd');
  const dayBookings = bookings
    .filter(b => b.booking_date === ds)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
      <div className={cn('px-5 py-4 border-b border-[hsl(240_10%_13%)]', isToday(currentDate) && 'bg-primary/5')}>
        <p className={cn('font-semibold', isToday(currentDate) && 'text-primary')}>{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}</p>
      </div>
      {dayBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No bookings for this day</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Bookings will appear here as they're received</p>
        </div>
      ) : (
        <div className="divide-y divide-[hsl(240_10%_11%)]">
          {dayBookings.map(b => {
            const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
            return (
              <button
                key={b.id}
                onClick={() => onEventClick(b)}
                className={cn('w-full text-left px-5 py-4 hover:bg-[hsl(240_10%_10%)] transition-colors flex items-center gap-4 border-l-2', cfg.border)}
              >
                <div className="text-center w-14 shrink-0">
                  <p className="text-sm font-bold">{b.start_time?.slice(0, 5)}</p>
                  <p className="text-[10px] text-muted-foreground">{b.end_time?.slice(0, 5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{b.guest_name ?? 'Guest'}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.venues?.name} · {b.guest_count} guests</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className={cn('text-[10px] border mb-1', cfg.badge)}>{cfg.label}</Badge>
                  <p className="text-xs font-semibold text-primary">{fmt(b.total_price)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PartnerCalendar() {
  const { data: rawBookings = [], isLoading: bookingsLoading } = usePartnerBookings();
  const { data: venues = [] } = usePartnerVenues();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);

  const bookings = rawBookings as CalendarBooking[];

  // ── Filtered bookings ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = bookings;
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    if (venueFilter !== 'all') result = result.filter(b => b.venue_id === venueFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.guest_name?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, statusFilter, venueFilter, search]);

  // ── Bookings by date (for calendar grid) ───────────────────────────────────
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    filtered.forEach(b => {
      const existing = map.get(b.booking_date) ?? [];
      map.set(b.booking_date, [...existing, b]);
    });
    return map;
  }, [filtered]);

  // ── Month grid ─────────────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) { gridDays.push(cur); cur = addDays(cur, 1); }

  // ── Side panel data ────────────────────────────────────────────────────────
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const todayBookings = bookings.filter(b => b.booking_date === today && b.status !== 'cancelled' && b.status !== 'rejected');
  const tomorrowBookings = bookings.filter(b => b.booking_date === tomorrow && b.status !== 'cancelled' && b.status !== 'rejected');
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  // Pending > 30 min old
  const now = new Date();
  const urgentPending = pendingBookings.filter(b => {
    const created = new Date(b.created_at);
    return (now.getTime() - created.getTime()) > 30 * 60 * 1000;
  });

  // Navigate
  function prev() {
    if (viewMode === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, -7));
    else setCurrentDate(d => addDays(d, -1));
  }
  function next() {
    if (viewMode === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, 7));
    else setCurrentDate(d => addDays(d, 1));
  }

  const titleLabel =
    viewMode === 'month' ? format(currentDate, 'MMMM yyyy') :
    viewMode === 'week' ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}` :
    format(currentDate, 'EEEE, MMMM d, yyyy');

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[120px]" />
      </div>

      <div className="relative container py-8">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[hsl(240_10%_12%)] mb-6"
        >
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.12em] font-medium mb-1">Partner</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Calendar</h1>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-[hsl(240_10%_10%)] rounded-lg p-1 border border-[hsl(240_10%_14%)]">
              {(['month', 'week', 'day'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all',
                    viewMode === m ? 'bg-[hsl(240_10%_18%)] text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(240_10%_16%)] bg-[hsl(240_10%_9%)] hover:bg-[hsl(240_10%_13%)] transition-colors"
              >
                Today
              </button>
              <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[hsl(240_10%_16%)] hover:bg-[hsl(240_10%_12%)] transition-colors text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[hsl(240_10%_16%)] hover:bg-[hsl(240_10%_12%)] transition-colors text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold min-w-[160px] text-center">{titleLabel}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Filters row ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guest or booking…"
              className="pl-8 h-8 text-xs bg-[hsl(240_10%_9%)] border-[hsl(240_10%_15%)]"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium capitalize border transition-all',
                  statusFilter === s
                    ? s === 'pending' ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                    : s === 'confirmed' ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30'
                    : s === 'cancelled' ? 'bg-red-400/15 text-red-300 border-red-400/30'
                    : s === 'completed' ? 'bg-blue-400/15 text-blue-300 border-blue-400/30'
                    : 'bg-[hsl(240_10%_15%)] text-foreground border-[hsl(240_10%_20%)]'
                    : 'text-muted-foreground border-transparent hover:border-[hsl(240_10%_18%)] hover:text-foreground'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Venue filter */}
          {venues.length > 1 && (
            <select
              value={venueFilter}
              onChange={e => setVenueFilter(e.target.value)}
              className="h-8 text-xs bg-[hsl(240_10%_9%)] border border-[hsl(240_10%_15%)] rounded-lg px-2 text-muted-foreground focus:outline-none focus:border-primary/40"
            >
              <option value="all">All Venues</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
        </div>

        {/* ── Main layout: calendar + side panel ──────────────────────────── */}
        <div className="flex gap-5 items-start">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex-1 min-w-0"
          >
            {viewMode === 'month' && (
              <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
                {/* DOW header */}
                <div className="grid grid-cols-7 border-b border-[hsl(240_10%_13%)]">
                  {DOW.map(d => (
                    <div key={d} className="py-2.5 text-center border-r border-[hsl(240_10%_12%)] last:border-0">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{d}</span>
                    </div>
                  ))}
                </div>
                {/* Grid */}
                <div className="grid grid-cols-7">
                  {gridDays.map(d => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const dayBookings = bookingsByDate.get(ds) ?? [];
                    return (
                      <MonthCell
                        key={d.toISOString()}
                        date={d}
                        currentMonth={currentDate}
                        bookings={dayBookings}
                        selected={isSameDay(d, currentDate)}
                        onSelect={() => { setCurrentDate(d); if (viewMode === 'month') {} }}
                        onEventClick={(b) => setSelectedBooking(b)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {viewMode === 'week' && (
              <WeekView
                currentDate={currentDate}
                bookings={filtered}
                onEventClick={setSelectedBooking}
              />
            )}
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                bookings={filtered}
                onEventClick={setSelectedBooking}
              />
            )}

            {/* Empty state if no bookings at all */}
            {!bookingsLoading && bookings.length === 0 && (
              <div className="mt-6 rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-base font-semibold text-muted-foreground">No bookings yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
                  Booking requests from customers will appear here as events.
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Side panel ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-72 shrink-0 space-y-4 hidden xl:block"
          >
            {/* Urgent pending */}
            {urgentPending.length > 0 && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-300">Needs attention</p>
                </div>
                <div className="space-y-2">
                  {urgentPending.slice(0, 3).map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="w-full text-left p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                    >
                      <p className="text-xs font-medium text-amber-200">{b.guest_name ?? 'Guest'}</p>
                      <p className="text-[10px] text-amber-300/70">{b.venues?.name ?? 'Venue'} · {b.booking_date}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(240_10%_13%)] flex items-center justify-between">
                <p className="text-xs font-semibold">Today</p>
                <Badge variant="outline" className="text-[10px]">{todayBookings.length}</Badge>
              </div>
              {todayBookings.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-muted-foreground">No bookings today</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(240_10%_11%)]">
                  {todayBookings.slice(0, 4).map(b => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                    return (
                      <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full text-left px-4 py-3 hover:bg-[hsl(240_10%_10%)] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                          <p className="text-xs font-medium truncate">{b.guest_name ?? 'Guest'}</p>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{b.start_time?.slice(0, 5)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 pl-3.5 truncate">{b.venues?.name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tomorrow preview */}
            <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(240_10%_13%)] flex items-center justify-between">
                <p className="text-xs font-semibold">Tomorrow</p>
                <Badge variant="outline" className="text-[10px]">{tomorrowBookings.length}</Badge>
              </div>
              {tomorrowBookings.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-muted-foreground">Clear tomorrow</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(240_10%_11%)]">
                  {tomorrowBookings.slice(0, 3).map(b => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                    return (
                      <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full text-left px-4 py-3 hover:bg-[hsl(240_10%_10%)] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                          <p className="text-xs font-medium truncate">{b.guest_name ?? 'Guest'}</p>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{b.start_time?.slice(0, 5)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 pl-3.5 truncate">{b.venues?.name ?? 'Unknown Venue'}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending requests */}
            <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(240_10%_13%)] flex items-center justify-between">
                <p className="text-xs font-semibold">Pending Requests</p>
                {pendingBookings.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-bold flex items-center justify-center">
                    {pendingBookings.length}
                  </span>
                )}
              </div>
              {pendingBookings.length === 0 ? (
                <div className="px-4 py-5 text-center">
                  <Check className="h-6 w-6 text-emerald-400/40 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">All caught up</p>
                </div>
              ) : (
                <div className="divide-y divide-[hsl(240_10%_11%)]">
                  {pendingBookings.slice(0, 4).map(b => (
                    <button key={b.id} onClick={() => setSelectedBooking(b)} className="w-full text-left px-4 py-3 hover:bg-[hsl(240_10%_10%)] transition-colors">
                      <p className="text-xs font-medium">{b.guest_name ?? 'Guest'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{b.booking_date} · {b.start_time?.slice(0,5)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Booking detail drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedBooking(null)}
            />
            <BookingDetailDrawer
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
