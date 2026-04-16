import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { CreditCard, DollarSign, AlertTriangle, Check, Clock, ArrowUpRight, Filter } from 'lucide-react';
import { useAdminBookings } from '@/hooks/useBookings';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function fmtCents(cents: number | null) { return `₮${Math.round((cents ?? 0) / 100).toLocaleString()}`; }

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  paid:     { label: 'Paid',     cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25' },
  pending:  { label: 'Pending',  cls: 'bg-amber-400/15 text-amber-300 border-amber-400/25' },
  unpaid:   { label: 'Unpaid',   cls: 'bg-[hsl(240_10%_15%)] text-muted-foreground border-[hsl(240_10%_20%)]' },
  refunded: { label: 'Refunded', cls: 'bg-red-400/15 text-red-300 border-red-400/25' },
  failed:   { label: 'Failed',   cls: 'bg-red-500/15 text-red-300 border-red-500/25' },
};

export default function AdminPayments() {
  const { data: bookings = [], isLoading } = useAdminBookings();
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState('all');

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmed.reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const paidRevenue = confirmed.filter(b => b.payment_status === 'paid').reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);
  const pendingRevenue = confirmed.filter(b => !b.payment_status || b.payment_status === 'unpaid').reduce((s, b) => s + ((b.total_price ?? 0) / 100), 0);

  const transactions = useMemo(() => {
    let res = bookings.filter(b => b.status === 'confirmed' || b.status === 'cancelled');
    if (payFilter !== 'all') res = res.filter(b => (b.payment_status ?? 'unpaid') === payFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(b => b.guest_name?.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || (b as any).venue?.name?.toLowerCase().includes(q));
    }
    return res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, payFilter, search]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="pb-4 border-b border-[hsl(240_10%_12%)]">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium mb-1">Admin</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Transaction overview and payout management</p>
        </motion.div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Processed', value: `₮${Math.round(totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Paid Out', value: `₮${Math.round(paidRevenue).toLocaleString()}`, icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Pending Payouts', value: `₮${Math.round(pendingRevenue).toLocaleString()}`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Transactions', value: confirmed.length, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
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

        {/* Filters + table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(240_10%_13%)] flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-sm flex-1">Transactions</h2>
            <div className="relative">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest, booking, venue…" className="h-8 text-xs bg-[hsl(240_10%_11%)] border-[hsl(240_10%_18%)] w-52" />
            </div>
            <div className="flex gap-1">
              {['all', 'paid', 'unpaid', 'pending'].map(f => (
                <button key={f} onClick={() => setPayFilter(f)} className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium capitalize border transition-all',
                  payFilter === f ? 'bg-[hsl(240_10%_18%)] text-foreground border-[hsl(240_10%_24%)]' : 'text-muted-foreground border-transparent hover:border-[hsl(240_10%_18%)]')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(240_10%_13%)]">
                    {['Booking ID', 'Guest', 'Venue', 'Date', 'Amount', 'Method', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 50).map(b => {
                    const ps = b.payment_status ?? 'unpaid';
                    const cfg = STATUS_CFG[ps] ?? STATUS_CFG.unpaid;
                    return (
                      <tr key={b.id} className="border-b border-[hsl(240_10%_11%)] hover:bg-[hsl(240_10%_9%)] transition-colors">
                        <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">{b.id.slice(0, 8)}…</td>
                        <td className="px-5 py-3 font-medium whitespace-nowrap">{b.guest_name ?? '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{(b as any).venue?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{format(parseISO(b.booking_date), 'MMM d, yyyy')}</td>
                        <td className="px-5 py-3 font-semibold text-primary whitespace-nowrap">{fmtCents(b.total_price)}</td>
                        <td className="px-5 py-3 text-muted-foreground">QPay</td>
                        <td className="px-5 py-3">
                          <Badge className={cn('text-[10px] border', cfg.cls)}>{cfg.label}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-[hsl(240_10%_20%)]"
                            onClick={() => toast.info('Payout marking — connect to payment API')}>
                            Mark Paid
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {transactions.length > 50 && (
            <div className="px-5 py-3 border-t border-[hsl(240_10%_13%)] text-xs text-muted-foreground">
              Showing 50 of {transactions.length} transactions
            </div>
          )}
        </motion.div>

        {/* Payout placeholder */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5">
          <h2 className="font-semibold text-sm mb-1">Partner Payouts</h2>
          <p className="text-xs text-muted-foreground mb-4">Batch payout processing and partner remittance — connect to your payment provider.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-[hsl(240_10%_20%)] text-xs gap-1.5" onClick={() => toast.info('QPay integration — coming soon')}>
              <CreditCard className="h-3.5 w-3.5" /> Process via QPay
            </Button>
            <Button variant="outline" className="border-[hsl(240_10%_20%)] text-xs" onClick={() => toast.info('Export — coming soon')}>
              Export CSV
            </Button>
          </div>
        </motion.div>
      </div>
  );
}
