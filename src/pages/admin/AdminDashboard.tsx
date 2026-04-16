import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  format, subDays, parseISO, formatDistanceToNow,
} from 'date-fns';
import {
  DollarSign, Building2, Users, BookOpen, TrendingUp, TrendingDown,
  AlertTriangle, ChevronRight, Clock, Check, X, ArrowUpRight,
  Activity, ShieldCheck, Zap,
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { useAdminBookings } from '@/hooks/useBookings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number) { return `₮${Math.round(cents / 100).toLocaleString()}`; }
function compactFmt(v: number) {
  if (v >= 1_000_000) return `₮${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₮${Math.round(v / 1_000)}k`;
  return `₮${v}`;
}
function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

const axisStyle = { fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'inherit' };
const gridStyle = { stroke: 'hsl(240 10% 14%)', strokeDasharray: '3 3' };

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title, value, subLabel, icon: Icon, colorClass, bgClass, to, trend, loading, index = 0,
}: {
  title: string; value: string | number; subLabel?: string; icon: React.ComponentType<{ className?: string }>;
  colorClass: string; bgClass: string; to?: string; trend?: number; loading?: boolean; index?: number;
}) {
  const isUp = trend !== undefined && trend >= 0;
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.23, 1, 0.32, 1] }}
      whileHover={to ? { scale: 1.025, y: -3 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 bg-[hsl(240_10%_8%)] border transition-all duration-300',
        to
          ? 'border-[hsl(240_10%_15%)] hover:border-primary/30 hover:shadow-[0_12px_40px_-8px_hsl(322_100%_60%/0.15)] cursor-pointer group'
          : 'border-[hsl(240_10%_15%)]',
      )}
    >
      <div className={cn('absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-[0.07]', bgClass)} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bgClass)}>
            <Icon className={cn('h-4 w-4', colorClass)} />
          </div>
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn('flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
                isUp ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10')}>
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
            {to && <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />}
          </div>
        </div>
        {loading
          ? <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse mb-1" />
          : <p className="text-2xl font-bold tracking-tight">{value}</p>
        }
        <p className="text-xs font-medium text-foreground/60 mt-1">{title}</p>
        {subLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{subLabel}</p>}
        {to && (
          <div className="mt-3 pt-3 border-t border-[hsl(240_10%_12%)] flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/40 group-hover:text-primary/40 transition-colors">View details</span>
          </div>
        )}
      </div>
    </motion.div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, action, children }: {
  title: string; subtitle?: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <Link to={action.to} className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1">
            {action.label} <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Activity feed helpers ────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
    booking_created:   { icon: BookOpen,     cls: 'bg-blue-500/15 text-blue-400' },
    booking_confirmed: { icon: Check,        cls: 'bg-emerald-500/15 text-emerald-400' },
    booking_cancelled: { icon: X,            cls: 'bg-red-500/15 text-red-400' },
    partner_approved:  { icon: ShieldCheck,  cls: 'bg-primary/15 text-primary' },
    venue_created:     { icon: Building2,    cls: 'bg-purple-500/15 text-purple-400' },
    booking_rejected:  { icon: X,            cls: 'bg-red-500/15 text-red-400' },
  };
  const { icon: Icon, cls } = map[type] ?? { icon: Activity, cls: 'bg-muted/20 text-muted-foreground' };
  return <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', cls)}><Icon className="h-3.5 w-3.5" /></div>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data: allVenues = [], isLoading: venuesLoading } = useVenues({ onlyActive: false });
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings();

  const { data: pendingPartners = 0 } = useQuery({
    queryKey: ['admin-pending-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partner_venues').select('id').eq('status', 'pending');
      if (error) throw error;
      return data?.length ?? 0;
    },
  });

  const { data: pendingPartnerApprovals = 0 } = useQuery({
    queryKey: ['admin-pending-partner-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partner_requests').select('id').eq('status', 'pending');
      if (error) throw error;
      return data?.length ?? 0;
    },
  });


  const isLoading = venuesLoading || bookingsLoading;
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const pending = bookings.filter(b => b.status === 'pending');
  const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');

  // Revenue computations (cents → ₮)
  const totalRevenue = confirmed.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const todayRevenue = confirmed.filter(b => b.booking_date === today).reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const yesterdayRevenue = confirmed.filter(b => b.booking_date === yesterday).reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const weekRevenue = confirmed.filter(b => b.booking_date >= weekAgo).reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);

  const todayBookings = bookings.filter(b => b.booking_date === today);
  const yesterdayBookings = bookings.filter(b => b.booking_date === yesterday);

  const activeVenues = allVenues.filter(v => v.is_active);

  // 14-day chart
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const ds = format(d, 'yyyy-MM-dd');
      const dayConfirmed = confirmed.filter(b => b.booking_date === ds);
      return {
        label: format(d, 'MMM d'),
        revenue: dayConfirmed.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0),
        bookings: bookings.filter(b => b.booking_date === ds).length,
      };
    });
  }, [bookings, confirmed]);

  // Activity feed from recent bookings
  const activityFeed = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map(b => ({
        id: b.id,
        type: b.status === 'confirmed' ? 'booking_confirmed'
          : b.status === 'cancelled' || b.status === 'rejected' ? 'booking_cancelled'
          : 'booking_created',
        message: b.status === 'confirmed'
          ? `Booking confirmed — ${(b as any).venues?.name ?? 'Unknown Venue'}`
          : b.status === 'cancelled' || b.status === 'rejected'
          ? `Booking ${b.status} — ${(b as any).venues?.name ?? 'Unknown Venue'}`
          : `New booking — ${(b as any).venues?.name ?? 'Unknown Venue'}`,
        meta: b.guest_name ?? 'Guest',
        time: formatDistanceToNow(parseISO(b.created_at), { addSuffix: true }),
      }));
  }, [bookings]);

  // Top venues by revenue
  const topVenues = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; bookings: number }>();
    confirmed.forEach(b => {
      const name = (b as any).venue?.name ?? 'Unknown';
      const id = b.venue_id;
      const existing = map.get(id) ?? { name, revenue: 0, bookings: 0 };
      map.set(id, { name, revenue: existing.revenue + ((b.total_price ?? 0) / 100), bookings: existing.bookings + 1 });
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [confirmed]);

  const topVenueRev = topVenues[0]?.revenue ?? 1;

  // Alerts
  const alerts = [
    pendingPartnerApprovals > 0 && { type: 'warning', msg: `${pendingPartnerApprovals} partner application${pendingPartnerApprovals > 1 ? 's' : ''} awaiting approval`, to: '/admin/partners' },
    pendingPartners > 0 && { type: 'warning', msg: `${pendingPartners} venue submission${pendingPartners > 1 ? 's' : ''} pending review`, to: '/admin/venues' },
    pending.length > 5 && { type: 'info', msg: `${pending.length} bookings awaiting confirmation`, to: '/admin/bookings' },
  ].filter(Boolean) as { type: string; msg: string; to: string }[];

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full bg-primary/4 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/3 blur-[120px]" />
      </div>

      <div className="relative p-6 space-y-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between pb-4 border-b border-[hsl(240_10%_12%)]"
        >
          <div>
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Platform Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">TAPN admin control centre</p>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 rounded-full">
                <AlertTriangle className="h-3.5 w-3.5" />
                {alerts.length} alert{alerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link to={a.to} className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors group',
                  a.type === 'warning'
                    ? 'bg-amber-500/8 border-amber-500/25 hover:bg-amber-500/12'
                    : 'bg-blue-500/8 border-blue-500/25 hover:bg-blue-500/12',
                )}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn('h-4 w-4 shrink-0', a.type === 'warning' ? 'text-amber-400' : 'text-blue-400')} />
                    <span className="text-sm text-foreground/90">{a.msg}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard index={0} title="Today Revenue" value={isLoading ? '—' : `₮${Math.round(todayRevenue).toLocaleString()}`} trend={pct(todayRevenue, yesterdayRevenue)} subLabel="vs yesterday" icon={DollarSign} colorClass="text-primary" bgClass="bg-primary/10" to="/admin/payments" loading={isLoading} />
          <KpiCard index={1} title="Total Revenue" value={isLoading ? '—' : `₮${Math.round(totalRevenue / 1000)}k`} subLabel="all confirmed" icon={TrendingUp} colorClass="text-emerald-400" bgClass="bg-emerald-500/10" to="/admin/analytics" loading={isLoading} />
          <KpiCard index={2} title="Bookings Today" value={isLoading ? '—' : todayBookings.length} trend={pct(todayBookings.length, yesterdayBookings.length)} subLabel="vs yesterday" icon={BookOpen} colorClass="text-blue-400" bgClass="bg-blue-500/10" to="/admin/bookings" loading={isLoading} />
          <KpiCard index={3} title="Pending" value={isLoading ? '—' : pending.length} subLabel={pending.length > 0 ? 'needs action' : 'all clear'} icon={Clock} colorClass="text-amber-400" bgClass="bg-amber-500/10" to="/admin/bookings?status=pending" loading={isLoading} />
          <KpiCard index={4} title="Active Venues" value={isLoading ? '—' : activeVenues.length} subLabel={`${allVenues.length} total`} icon={Building2} colorClass="text-purple-400" bgClass="bg-purple-500/10" to="/admin/venues" loading={isLoading} />
          <KpiCard index={5} title="Partner Queue" value={isLoading ? '—' : pendingPartnerApprovals + pendingPartners} subLabel="pending approvals" icon={Users} colorClass="text-pink-400" bgClass="bg-pink-500/10" to="/admin/partners" loading={isLoading} />
        </div>

        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-sm">Platform Revenue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 14 days — confirmed bookings</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{fmt(weekRevenue * 100)}</p>
              <p className="text-[11px] text-muted-foreground">this week</p>
            </div>
          </div>
          <div className="p-5">
            {bookings.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No booking data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(322 100% 60%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(322 100% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : String(v)} />
                  <Tooltip
                    formatter={(v: number) => [`₮${Math.round(v).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ background: 'hsl(240 10% 9%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 12, fontSize: 12 }}
                    cursor={{ stroke: 'rgba(255,51,153,0.18)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(322 100% 60%)" strokeWidth={2.5} fill="url(#adminRevGrad)"
                    dot={{ fill: 'hsl(322 100% 60%)', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: 'hsl(322 100% 60%)', stroke: 'hsl(240 10% 8%)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Bottom 3-col grid */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Top venues */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
          >
            <Section title="Top Venues" subtitle="by confirmed revenue" action={{ label: 'All venues', to: '/admin/venues' }}>
              {topVenues.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No revenue data</p>
              ) : (
                <div className="space-y-4">
                  {topVenues.map((v, i) => (
                    <div key={v.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[hsl(240_10%_13%)] flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                          <span className="text-sm font-medium truncate max-w-[120px]">{v.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-primary">{`₮${Math.round(v.revenue).toLocaleString()}`}</span>
                      </div>
                      <div className="h-1 bg-[hsl(240_10%_12%)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(v.revenue / topVenueRev) * 100}%` }}
                          transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.23, 1, 0.32, 1] }}
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

          {/* Live activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.33 }}
          >
            <Section title="Recent Activity" subtitle="Latest platform events" action={{ label: 'All bookings', to: '/admin/bookings' }}>
              {activityFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activityFeed.map(item => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <ActivityIcon type={item.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.meta} · {item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <Section title="Quick Actions" subtitle="Common admin tasks">
              <div className="space-y-2">
                {[
                  { label: 'Review Partner Applications', to: '/admin/partners', badge: pendingPartnerApprovals > 0 ? pendingPartnerApprovals : undefined, color: 'text-primary' },
                  { label: 'Pending Venue Submissions', to: '/admin/venues?filter=pending', badge: pendingPartners > 0 ? pendingPartners : undefined, color: 'text-amber-400' },
                  { label: 'Pending Bookings', to: '/admin/bookings?status=pending', badge: pending.length > 0 ? pending.length : undefined, color: 'text-blue-400' },
                  { label: 'Platform Analytics', to: '/admin/analytics', color: 'text-purple-400' },
                  { label: 'Payment Overview', to: '/admin/payments', color: 'text-emerald-400' },
                  { label: 'Send Announcement', to: '/admin/notifications', color: 'text-pink-400' },
                ].map(action => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="flex items-center justify-between p-3 rounded-xl bg-[hsl(240_10%_11%)] hover:bg-[hsl(240_10%_13%)] border border-[hsl(240_10%_14%)] hover:border-[hsl(240_10%_18%)] transition-all group"
                  >
                    <span className={cn('text-xs font-medium group-hover:text-foreground transition-colors', action.color)}>{action.label}</span>
                    <div className="flex items-center gap-2">
                      {action.badge && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[9px] font-bold flex items-center justify-center">{action.badge}</span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          </motion.div>
        </div>

        {/* Booking stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.42 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'text-foreground' },
            { label: 'Confirmed', value: confirmed.length, color: 'text-emerald-400' },
            { label: 'Pending', value: pending.length, color: 'text-amber-400' },
            { label: 'Cancelled', value: cancelled.length, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-4 text-center">
              <p className={cn('text-2xl font-bold', stat.color)}>{isLoading ? '—' : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
