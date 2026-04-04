import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart2, TrendingUp, DollarSign, Building2, Clock, ArrowUpRight } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useVenues } from '@/hooks/useVenues';
import { useAdminBookings } from '@/hooks/useBookings';
import { cn } from '@/lib/utils';

const axisStyle = { fill: 'hsl(240 5% 50%)', fontSize: 11, fontFamily: 'inherit' };
const gridStyle = { stroke: 'hsl(240 10% 14%)', strokeDasharray: '3 3' };

type Period = 'daily' | 'weekly' | 'monthly';

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

export default function AdminAnalytics() {
  const { user, isAdmin, loading, role } = useAuth();
  const [period, setPeriod] = useState<Period>('daily');
  const { data: venues = [] } = useVenues({ onlyActive: false });
  const { data: bookings = [], isLoading } = useAdminBookings();

  const isReady = !loading && (user === null || role !== null);
  if (!isReady) return <AdminLayout><div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AdminLayout>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const confirmed = bookings.filter(b => b.status === 'confirmed');

  // Revenue metrics
  const today = format(new Date(), 'yyyy-MM-dd');
  const totalRevenue = confirmed.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const todayRev = confirmed.filter(b => b.booking_date === today).reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);

  // Chart data
  const chartData = useMemo(() => {
    if (period === 'daily') {
      return Array.from({ length: 14 }, (_, i) => {
        const d = subDays(new Date(), 13 - i);
        const ds = format(d, 'yyyy-MM-dd');
        const dayConf = confirmed.filter(b => b.booking_date === ds);
        return { label: format(d, 'MMM d'), revenue: dayConf.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0), bookings: bookings.filter(b => b.booking_date === ds).length };
      });
    }
    if (period === 'monthly') {
      return Array.from({ length: 6 }, (_, i) => {
        const m = subMonths(new Date(), 5 - i);
        const ms = format(startOfMonth(m), 'yyyy-MM-dd');
        const me = format(endOfMonth(m), 'yyyy-MM-dd');
        const mConf = confirmed.filter(b => b.booking_date >= ms && b.booking_date <= me);
        return { label: format(m, 'MMM'), revenue: mConf.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0), bookings: bookings.filter(b => b.booking_date >= ms && b.booking_date <= me).length };
      });
    }
    return Array.from({ length: 8 }, (_, i) => {
      const ws = format(subDays(new Date(), (7 - i) * 7), 'yyyy-MM-dd');
      const we = format(subDays(new Date(), (6 - i) * 7), 'yyyy-MM-dd');
      const wConf = confirmed.filter(b => b.booking_date >= ws && b.booking_date <= we);
      return { label: `W${i + 1}`, revenue: wConf.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0), bookings: bookings.filter(b => b.booking_date >= ws && b.booking_date <= we).length };
    });
  }, [bookings, confirmed, period]);

  // Revenue by venue
  const byVenue = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; bookings: number }>();
    confirmed.forEach(b => {
      const name = (b as any).venue?.name ?? 'Unknown';
      const id = b.venue_id;
      const ex = map.get(id) ?? { name, revenue: 0, bookings: 0 };
      map.set(id, { name, revenue: ex.revenue + ((b.total_price ?? 0) / 100), bookings: ex.bookings + 1 });
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [confirmed]);

  // Bookings by hour
  const byHour = useMemo(() => {
    const counts = Array(24).fill(0);
    bookings.forEach(b => { const h = parseInt(b.start_time?.split(':')[0] ?? '0'); counts[h]++; });
    return counts.slice(9, 23).map((count, i) => ({ label: `${i + 9}h`, count }));
  }, [bookings]);

  // Revenue by city
  const byCity = useMemo(() => {
    const map = new Map<string, number>();
    confirmed.forEach(b => { const city = (b as any).venue?.city ?? 'Unknown'; map.set(city, (map.get(city) ?? 0) + ((b.total_price ?? 0) / 100)); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, revenue]) => ({ city, revenue }));
  }, [confirmed]);

  const topVenueRev = byVenue[0]?.revenue ?? 1;
  const maxHour = Math.max(...byHour.map(h => h.count), 1);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-4 border-b border-[hsl(240_10%_12%)]">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">Admin</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide performance metrics</p>
        </motion.div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `₮${Math.round(totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Today Revenue', value: `₮${Math.round(todayRev).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Total Bookings', value: bookings.length, icon: BarChart2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Confirmed', value: confirmed.length, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.07 }}
              className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5">
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold">{isLoading ? <span className="block h-7 w-20 bg-white/5 rounded animate-pulse" /> : c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue chart with period toggle */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-sm">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Confirmed booking revenue across all venues</p>
            </div>
            <div className="flex items-center gap-0.5 bg-[hsl(240_10%_11%)] rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all', period === p ? 'bg-[hsl(240_10%_18%)] text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="anlRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(322 100% 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(322 100% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip formatter={(v: number) => [`₮${Math.round(v).toLocaleString()}`, 'Revenue']} contentStyle={{ background: 'hsl(240 10% 9%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 12, fontSize: 12 }} cursor={{ stroke: 'rgba(255,51,153,0.18)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(322 100% 60%)" strokeWidth={2.5} fill="url(#anlRevGrad)" dot={{ fill: 'hsl(322 100% 60%)', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: 'hsl(322 100% 60%)', stroke: 'hsl(240 10% 8%)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* By venue + hourly */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28 }}>
            <Section title="Revenue by Venue" subtitle="Top venues by confirmed revenue">
              {byVenue.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No data yet</p> : (
                <div className="space-y-4">
                  {byVenue.map((v, i) => (
                    <div key={v.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[hsl(240_10%_13%)] flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                          <span className="text-sm font-medium truncate max-w-[140px]">{v.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-primary">{`₮${Math.round(v.revenue).toLocaleString()}`}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{v.bookings} bkgs</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[hsl(240_10%_12%)] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(v.revenue / topVenueRev) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full rounded-full" style={{ background: i === 0 ? 'hsl(322 100% 60%)' : 'hsl(280 85% 58%)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.33 }}>
            <Section title="Peak Booking Hours" subtitle="Number of bookings by start time">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byHour} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Bookings']} contentStyle={{ background: 'hsl(240 10% 9%)', border: '1px solid hsl(240 10% 18%)', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'hsl(240 10% 14%)' }} />
                  <Bar dataKey="count" fill="hsl(280 85% 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </motion.div>
        </div>

        {/* By city */}
        {byCity.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.38 }}>
            <Section title="Revenue by City" subtitle="Confirmed revenue across locations">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {byCity.map((c, i) => (
                  <div key={c.city} className="p-3 rounded-xl bg-[hsl(240_10%_11%)] border border-[hsl(240_10%_15%)] text-center">
                    <p className="text-base font-bold text-primary">{`₮${(c.revenue / 1000).toFixed(1)}k`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.city}</p>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Insight callouts */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.43 }}
          className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Top Performing Venue', value: byVenue[0]?.name ?? 'N/A', sub: byVenue[0] ? `₮${Math.round(byVenue[0].revenue).toLocaleString()}` : '—', color: 'text-primary' },
            { label: 'Peak Booking Hour', value: byHour.reduce((a, b) => a.count > b.count ? a : b, { label: '—', count: 0 }).label, sub: `${byHour.reduce((a, b) => a.count > b.count ? a : b, { label: '—', count: 0 }).count} bookings`, color: 'text-blue-400' },
            { label: 'Avg Booking Value', value: confirmed.length > 0 ? `₮${Math.round(totalRevenue / confirmed.length).toLocaleString()}` : '—', sub: `from ${confirmed.length} confirmed`, color: 'text-emerald-400' },
          ].map(ins => (
            <div key={ins.label} className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5">
              <p className="text-xs text-muted-foreground mb-2">{ins.label}</p>
              <p className={cn('text-xl font-bold truncate', ins.color)}>{ins.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{ins.sub}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
