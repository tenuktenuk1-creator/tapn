import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval,
  isWithinInterval, parseISO, isSameDay,
} from 'date-fns';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart2, Calendar, Clock, Building2 } from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { usePartnerBookings, usePartnerVenues } from '@/hooks/usePartner';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useIsPartner } from '@/hooks/usePartner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Period = 'daily' | 'weekly' | 'monthly';

function toTugrik(cents: number | null) {
  return (cents ?? 0) / 100;
}

function fmt(v: number) {
  return `₮${Math.round(v).toLocaleString()}`;
}

function compactFmt(v: number) {
  if (v >= 1_000_000) return `₮${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₮${Math.round(v / 1_000)}k`;
  return `₮${v}`;
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(240_10%_9%)] border border-[hsl(240_10%_18%)] rounded-xl px-3.5 py-2.5 shadow-2xl text-sm">
      <p className="text-muted-foreground text-xs mb-1.5">{label}</p>
      <p className="font-bold text-foreground">{fmt(payload[0].value)}</p>
      {payload[1] && (
        <p className="text-xs text-muted-foreground mt-0.5">{payload[1].value} booking{payload[1].value !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

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

export default function RevenueDetailPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: bookings = [], isLoading: bookingsLoading } = usePartnerBookings();
  const { data: venues = [] } = usePartnerVenues();
  const [period, setPeriod] = useState<Period>('daily');

  if (authLoading || partnerLoading) {
    return (
      <PartnerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PartnerLayout>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/partner/analytics/revenue" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  const confirmed = bookings.filter(b => b.status === 'confirmed');

  // ── Summary metrics ────────────────────────────────────────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const todayRevenue = confirmed
    .filter(b => b.booking_date === todayStr)
    .reduce((s, b) => s + toTugrik(b.total_price), 0);

  const weekRevenue = confirmed
    .filter(b => b.booking_date >= weekStart)
    .reduce((s, b) => s + toTugrik(b.total_price), 0);

  const monthRevenue = confirmed
    .filter(b => b.booking_date >= monthStart)
    .reduce((s, b) => s + toTugrik(b.total_price), 0);

  const avgValue = confirmed.length > 0
    ? confirmed.reduce((s, b) => s + toTugrik(b.total_price), 0) / confirmed.length
    : 0;

  const summaryCards = [
    { label: "Today's Revenue", value: fmt(todayRevenue), icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'This Week', value: fmt(weekRevenue), icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'This Month', value: fmt(monthRevenue), icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Avg Booking Value', value: fmt(avgValue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'daily') {
      return Array.from({ length: 14 }, (_, i) => {
        const d = subDays(new Date(), 13 - i);
        const ds = format(d, 'yyyy-MM-dd');
        const dayBookings = confirmed.filter(b => b.booking_date === ds);
        return {
          label: format(d, 'MMM d'),
          revenue: dayBookings.reduce((s, b) => s + toTugrik(b.total_price), 0),
          bookings: dayBookings.length,
        };
      });
    }
    if (period === 'weekly') {
      return Array.from({ length: 8 }, (_, i) => {
        const weekOf = subWeeks(new Date(), 7 - i);
        const ws = format(startOfWeek(weekOf, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const we = format(endOfWeek(weekOf, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekBookings = confirmed.filter(b => b.booking_date >= ws && b.booking_date <= we);
        return {
          label: `W${format(weekOf, 'w')}`,
          revenue: weekBookings.reduce((s, b) => s + toTugrik(b.total_price), 0),
          bookings: weekBookings.length,
        };
      });
    }
    // monthly
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i);
      const ms = format(startOfMonth(m), 'yyyy-MM-dd');
      const me = format(endOfMonth(m), 'yyyy-MM-dd');
      const monthBookings = confirmed.filter(b => b.booking_date >= ms && b.booking_date <= me);
      return {
        label: format(m, 'MMM'),
        revenue: monthBookings.reduce((s, b) => s + toTugrik(b.total_price), 0),
        bookings: monthBookings.length,
      };
    });
  }, [confirmed, period]);

  // ── Revenue by venue ───────────────────────────────────────────────────────
  const byVenue = venues.map(v => {
    const vBookings = confirmed.filter(b => b.venue_id === v.id);
    const rev = vBookings.reduce((s, b) => s + toTugrik(b.total_price), 0);
    return { name: v.name, revenue: rev, bookings: vBookings.length };
  }).sort((a, b) => b.revenue - a.revenue);

  const topVenueRevenue = byVenue[0]?.revenue ?? 0;

  // ── Revenue by time slot ───────────────────────────────────────────────────
  const SLOTS = [
    { label: 'Lunch (11–14)', hours: [11, 12, 13] },
    { label: 'Afternoon (14–18)', hours: [14, 15, 16, 17] },
    { label: 'Dinner (18–21)', hours: [18, 19, 20] },
    { label: 'Late Night (21+)', hours: [21, 22, 23] },
  ];
  const bySlot = SLOTS.map(slot => {
    const slotBookings = confirmed.filter(b => {
      const h = parseInt(b.start_time?.split(':')[0] ?? '0');
      return slot.hours.includes(h);
    });
    return {
      label: slot.label,
      revenue: slotBookings.reduce((s, b) => s + toTugrik(b.total_price), 0),
      bookings: slotBookings.length,
    };
  });
  const topSlotRev = Math.max(...bySlot.map(s => s.revenue), 1);

  // ── Recent confirmed bookings ──────────────────────────────────────────────
  const recentBookings = confirmed
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const axisStyle = { fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'inherit' };
  const gridStyle = { stroke: 'hsl(240 10% 14%)', strokeDasharray: '3 3' };

  return (
    <PartnerLayout>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/4 blur-[100px]" />
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
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Revenue</h1>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
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
              <p className="text-2xl font-bold">
                {bookingsLoading ? <span className="block h-7 w-24 bg-white/5 rounded animate-pulse" /> : card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Period toggle + chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-sm">Confirmed Booking Revenue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {period === 'daily' ? 'Last 14 days' : period === 'weekly' ? 'Last 8 weeks' : 'Last 6 months'}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[hsl(240_10%_11%)] rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    period === p
                      ? 'bg-[hsl(240_10%_18%)] text-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {confirmed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No confirmed revenue yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Confirmed bookings will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(322 100% 60%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(322 100% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => {
                    if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
                    if (v >= 1000) return `${Math.round(v/1000)}k`;
                    return String(v);
                  }} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(255,51,153,0.18)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(322 100% 60%)"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                    dot={{ fill: 'hsl(322 100% 60%)', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: 'hsl(322 100% 60%)', stroke: 'hsl(240 10% 8%)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Revenue by venue + by slot */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* By venue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Section title="Revenue by Venue" subtitle="Confirmed booking revenue per venue">
              {byVenue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No venue data</p>
              ) : (
                <div className="space-y-4">
                  {byVenue.map((v, i) => (
                    <div key={v.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-[hsl(240_10%_12%)] flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[140px]">{v.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmt(v.revenue)}</p>
                          <p className="text-[10px] text-muted-foreground">{v.bookings} booking{v.bookings !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[hsl(240_10%_12%)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: topVenueRevenue > 0 ? `${(v.revenue / topVenueRevenue) * 100}%` : '0%' }}
                          transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full rounded-full"
                          style={{ background: i === 0 ? 'hsl(322 100% 60%)' : 'hsl(280 85% 58%)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </motion.div>

          {/* By time slot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Section title="Peak Earning Windows" subtitle="Revenue by time of day">
              <div className="space-y-4">
                {bySlot.map((slot, i) => (
                  <div key={slot.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{slot.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{fmt(slot.revenue)}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{slot.bookings} bkgs</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[hsl(240_10%_12%)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(slot.revenue / topSlotRev) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.23, 1, 0.32, 1] }}
                        className="h-full rounded-full bg-purple-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        </div>

        {/* Recent confirmed bookings table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Section title="Recent Confirmed Revenue" subtitle="Latest paid bookings">
            {recentBookings.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No confirmed bookings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(240_10%_13%)]">
                      {['Guest', 'Venue', 'Date', 'Guests', 'Amount', 'Source'].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b, i) => (
                      <tr key={b.id} className="border-b border-[hsl(240_10%_11%)] hover:bg-[hsl(240_10%_10%)] transition-colors">
                        <td className="px-5 py-3 font-medium whitespace-nowrap">{b.guest_name ?? '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{(b as any).venues?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{format(parseISO(b.booking_date), 'MMM d, yyyy')}</td>
                        <td className="px-5 py-3 text-muted-foreground">{b.guest_count}</td>
                        <td className="px-5 py-3 font-semibold text-primary whitespace-nowrap">{fmt(toTugrik(b.total_price))}</td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(240_10%_13%)] text-muted-foreground">
                            TAPN Direct
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </motion.div>
      </div>
    </PartnerLayout>
  );
}
