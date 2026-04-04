import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ArrowLeft, Building2, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { usePartnerBookings, usePartnerVenues, useIsPartner } from '@/hooks/usePartner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 9am–10pm

function intensityClass(count: number, max: number): string {
  if (max === 0 || count === 0) return 'bg-[hsl(240_10%_12%)]';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-primary/80';
  if (ratio >= 0.5) return 'bg-primary/50';
  if (ratio >= 0.25) return 'bg-primary/25';
  return 'bg-primary/10';
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)]">
        <h2 className="font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OccupancyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: bookings = [], isLoading: bookingsLoading } = usePartnerBookings();
  const { data: venues = [] } = usePartnerVenues();

  if (authLoading || partnerLoading) {
    return (
      <PartnerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PartnerLayout>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/partner/analytics/occupancy" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeVenues = venues.filter(v => v.is_active);
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');

  // ── Today's metrics ────────────────────────────────────────────────────────
  const todayBookings = activeBookings.filter(b => b.booking_date === today);
  const venuesWithTodayBooking = new Set(todayBookings.map(b => b.venue_id));
  const todayOccupancy = activeVenues.length > 0
    ? Math.round((venuesWithTodayBooking.size / activeVenues.length) * 100)
    : 0;
  const totalGuests = todayBookings.reduce((s, b) => s + b.guest_count, 0);
  const avgParty = todayBookings.length > 0 ? Math.round(totalGuests / todayBookings.length) : 0;

  // ── 7-day trend ────────────────────────────────────────────────────────────
  const trend7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const ds = format(d, 'yyyy-MM-dd');
    const dayBookings = activeBookings.filter(b => b.booking_date === ds);
    const occupied = new Set(dayBookings.map(b => b.venue_id)).size;
    return {
      label: format(d, 'EEE'),
      occupancyRate: activeVenues.length > 0 ? Math.round((occupied / activeVenues.length) * 100) : 0,
      bookings: dayBookings.length,
    };
  });

  // ── Per-venue occupancy ────────────────────────────────────────────────────
  const perVenue = activeVenues.map(v => {
    const vBookings = todayBookings.filter(b => b.venue_id === v.id);
    return {
      id: v.id,
      name: v.name,
      bookings: vBookings.length,
      guests: vBookings.reduce((s, b) => s + b.guest_count, 0),
      // Mock capacity of 10 slots/day since we don't have real capacity data
      // TODO: replace with actual capacity from venues table when available
      capacity: 10,
    };
  });

  // ── Hourly heatmap ─────────────────────────────────────────────────────────
  const hourlyBookings = HOURS.map(h => {
    const count = activeBookings.filter(b => {
      const bh = parseInt(b.start_time?.split(':')[0] ?? '-1');
      return bh === h;
    }).length;
    return { hour: h, count };
  });
  const maxHourly = Math.max(...hourlyBookings.map(h => h.count), 1);

  // ── Slot tension: upcoming today ───────────────────────────────────────────
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcomingToday = todayBookings
    .filter(b => b.start_time > nowStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 5);

  const axisStyle = { fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'inherit' };
  const gridStyle = { stroke: 'hsl(240 10% 14%)', strokeDasharray: '3 3' };

  return (
    <PartnerLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <div className="relative container py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4 pb-2 border-b border-[hsl(240_10%_12%)]"
        >
          <button
            onClick={() => navigate('/partner/dashboard')}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-[hsl(240_10%_16%)] bg-[hsl(240_10%_8%)] hover:bg-[hsl(240_10%_12%)] transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.12em] font-medium">Analytics</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Occupancy</h1>
          </div>
        </motion.div>

        {/* Alert: high demand today */}
        {todayOccupancy >= 80 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-300">
              <strong>High demand today.</strong> {todayOccupancy}% of your venues have confirmed bookings. Consider staffing up.
            </p>
          </motion.div>
        )}
        {todayOccupancy > 0 && todayOccupancy < 30 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-xl border border-blue-500/25 bg-blue-500/8 px-4 py-3"
          >
            <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-300">
              <strong>Low fill rate today.</strong> Consider creating a promotion to drive bookings for available slots.
            </p>
          </motion.div>
        )}

        {/* Summary KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Occupancy Today', value: `${todayOccupancy}%`, icon: BarChart2 ?? Building2, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Active Venues', value: activeVenues.length, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Bookings Today', value: todayBookings.length, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Guests Today', value: totalGuests, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5"
            >
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{bookingsLoading ? <span className="block h-7 w-16 bg-white/5 rounded animate-pulse" /> : card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 7-day trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)]">
            <h2 className="font-semibold text-sm">Occupancy Rate · 7 days</h2>
            <p className="text-xs text-muted-foreground mt-0.5">% of active venues with confirmed bookings per day</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend7} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, 'Occupancy']}
                  contentStyle={{ background: 'hsl(240 10% 9%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: 'hsl(240 10% 14%)' }}
                />
                <Bar dataKey="occupancyRate" fill="hsl(280 85% 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Heatmap + per-venue */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Hourly heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Section title="Busiest Hours" subtitle="Booking volume by hour across all time">
              <div className="grid grid-cols-7 gap-1.5">
                {hourlyBookings.map(({ hour, count }) => (
                  <div key={hour} className="flex flex-col items-center gap-1">
                    <div
                      className={cn('w-full h-10 rounded-md transition-colors', intensityClass(count, maxHourly))}
                      title={`${hour}:00 — ${count} bookings`}
                    />
                    <span className="text-[9px] text-muted-foreground/60">{hour}h</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-[10px] text-muted-foreground">Low</span>
                {['bg-primary/10', 'bg-primary/25', 'bg-primary/50', 'bg-primary/80'].map(c => (
                  <div key={c} className={cn('w-5 h-3 rounded', c)} />
                ))}
                <span className="text-[10px] text-muted-foreground">High</span>
              </div>
            </Section>
          </motion.div>

          {/* Per-venue today */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Section title="Venue Occupancy Today" subtitle="Individual venue fill rate">
              {perVenue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active venues</p>
              ) : (
                <div className="space-y-4">
                  {perVenue.map((v, i) => {
                    const pct = Math.min(Math.round((v.bookings / v.capacity) * 100), 100);
                    return (
                      <div key={v.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate max-w-[160px]">{v.name}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold">{pct}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{v.bookings}/{v.capacity} slots</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[hsl(240_10%_12%)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.23, 1, 0.32, 1] }}
                            className={cn('h-full rounded-full', pct >= 80 ? 'bg-primary' : pct >= 50 ? 'bg-purple-500' : 'bg-purple-500/50')}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </motion.div>
        </div>

        {/* Upcoming today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Section title="Upcoming Slots Today" subtitle="Confirmed bookings remaining today">
            {upcomingToday.length === 0 ? (
              <div className="py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming bookings for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingToday.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-[hsl(240_10%_11%)] border border-[hsl(240_10%_14%)]">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-primary/60" />
                      <div>
                        <p className="text-sm font-medium">{b.guest_name ?? 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">{(b as any).venues?.name ?? 'Unknown Venue'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{b.start_time}</p>
                      <p className="text-xs text-muted-foreground">{b.guest_count} guests</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </motion.div>
      </div>
    </PartnerLayout>
  );
}
