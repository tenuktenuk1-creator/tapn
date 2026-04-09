import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  DollarSign,
  CalendarCheck,
  AlertCircle,
  BarChart2,
  Building2,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useIsPartner,
  usePartnerVenues,
  usePartnerBookings,
  useConfirmBooking,
  useDeclineBooking,
} from '@/hooks/usePartner';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { BookingsLineChart, RevenueBarChart } from '@/components/dashboard/PerformanceCharts';
import { VenuePerformance } from '@/components/dashboard/VenuePerformance';
import { CustomerInsights } from '@/components/dashboard/CustomerInsights';
import { POSInsights } from '@/components/dashboard/POSInsights';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';

// ─── Derived metric helpers ──────────────────────────────────────────────────

// total_price is stored in cents (×100) by the create-booking edge function.
// Divide by 100 here so every consumer of this helper gets real ₮ amounts.
function computeRevenue(
  bookings: Array<{ booking_date: string; status: string; total_price: number | null }>,
  date: string
) {
  return bookings
    .filter((b) => b.booking_date === date && b.status === 'confirmed')
    .reduce((sum, b) => sum + ((b.total_price ?? 0) / 100), 0);
}

function computeBookingCount(
  bookings: Array<{ booking_date: string; status: string }>,
  date: string
) {
  return bookings.filter(
    (b) => b.booking_date === date && b.status === 'confirmed'
  ).length;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: venues = [], isLoading: venuesLoading } = usePartnerVenues();
  const { data: bookings = [], isLoading: bookingsLoading } = usePartnerBookings();

  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading || partnerLoading) {
    return (
      <PartnerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PartnerLayout>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/partner/dashboard" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  // ── Date strings ──────────────────────────────────────────────────────────
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // ── Metrics ───────────────────────────────────────────────────────────────
  const todayRevenue = computeRevenue(bookings, today);
  const yesterdayRevenue = computeRevenue(bookings, yesterday);
  const revenueTrend = pctChange(todayRevenue, yesterdayRevenue);

  const todayBookingCount = computeBookingCount(bookings, today);
  const yesterdayBookingCount = computeBookingCount(bookings, yesterday);
  const bookingTrend = pctChange(todayBookingCount, yesterdayBookingCount);

  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  const activeVenues = venues.filter((v) => v.is_active);
  const venuesWithBookingToday = new Set(
    bookings
      .filter((b) => b.booking_date === today && b.status === 'confirmed')
      .map((b) => b.venue_id)
  );
  const occupancyRate =
    activeVenues.length > 0
      ? Math.round((venuesWithBookingToday.size / activeVenues.length) * 100)
      : 0;

  // ── 7-day chart data ──────────────────────────────────────────────────────
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      date: format(date, 'MMM d'),
      bookings: computeBookingCount(bookings, dateStr),
      revenue: computeRevenue(bookings, dateStr),
    };
  });

  // ── Onboarding / approval state ───────────────────────────────────────────
  const hasVenue = venues.length > 0;
  const hasPhotos = venues.some((v) => v.images && v.images.length > 0);
  const hasAvailability = venues.some(
    (v) => v.opening_hours && Object.keys(v.opening_hours).length > 0
  );
  const showOnboarding = !hasVenue;

  // Venues that exist in partner_venues but are not yet admin-approved.
  // Partners can SEE bookings for these but cannot confirm/reject them.
  const pendingApprovalVenues = venues.filter(
    (v) => (v as typeof v & { partnerStatus?: string }).partnerStatus !== 'approved'
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAccept(id: string) {
    setAcceptingId(id);
    try {
      await confirmBooking.mutateAsync(id);
      toast.success('Booking accepted');
    } catch {
      toast.error('Failed to accept booking');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(id: string) {
    setRejectingId(id);
    try {
      await declineBooking.mutateAsync({ bookingId: id, status: 'rejected' });
      toast.success('Booking declined');
    } catch {
      toast.error('Failed to decline booking');
    } finally {
      setRejectingId(null);
    }
  }

  const isLoading = venuesLoading || bookingsLoading;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PartnerLayout>
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/4 blur-[100px]" />
      </div>

      <div className="relative container py-8 space-y-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-2 border-b border-[hsl(240_10%_12%)]"
        >
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.12em] mb-1.5 font-medium">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
              <span className="text-foreground">Overview</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Here's what's happening with your venues today.
            </p>
          </div>
          <QuickActions />
        </motion.div>

        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            index={0}
            title="Today's Revenue"
            value={`₮${todayRevenue.toLocaleString()}`}
            trend={revenueTrend}
            subLabel="vs yesterday"
            icon={DollarSign}
            colorClass="text-primary"
            bgClass="bg-primary/10"
            loading={isLoading}
            to="/partner/analytics/revenue"
          />
          <MetricCard
            index={1}
            title="Bookings Today"
            value={todayBookingCount}
            trend={bookingTrend}
            subLabel="vs yesterday"
            icon={CalendarCheck}
            colorClass="text-blue-400"
            bgClass="bg-blue-500/10"
            loading={isLoading}
            to="/partner/bookings?filter=today"
          />
          <MetricCard
            index={2}
            title="Pending Requests"
            value={pendingBookings.length}
            subLabel={pendingBookings.length > 0 ? 'requires action' : 'all caught up'}
            icon={AlertCircle}
            colorClass={pendingBookings.length > 0 ? 'text-amber-400' : 'text-emerald-400'}
            bgClass={pendingBookings.length > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}
            loading={isLoading}
            to="/partner/bookings?filter=pending"
          />
          <MetricCard
            index={3}
            title="Occupancy Rate"
            value={`${occupancyRate}%`}
            subLabel="active venues booked today"
            icon={BarChart2}
            colorClass="text-purple-400"
            bgClass="bg-purple-500/10"
            loading={isLoading}
            to="/partner/analytics/occupancy"
          />
        </div>

        {/* ── Pending approval banner ──────────────────────────────────────── */}
        {!isLoading && pendingApprovalVenues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3"
          >
            <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-amber-300">
                {pendingApprovalVenues.length === 1
                  ? `"${pendingApprovalVenues[0].name}" is awaiting admin approval.`
                  : `${pendingApprovalVenues.length} venues are awaiting admin approval.`}
              </span>
              <span className="text-amber-400/80 ml-1">
                You can see incoming bookings below, but Accept / Reject will be enabled once approved.
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Onboarding checklist (empty state) ────────────────────────────── */}
        {showOnboarding && !isLoading && (
          <OnboardingChecklist
            hasVenue={hasVenue}
            hasPhotos={hasPhotos}
            hasAvailability={hasAvailability}
          />
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {!showOnboarding && (
          <>
            {/* Action Center + Charts */}
            <div className="grid lg:grid-cols-5 gap-5">
              {/* Action Center */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25 }}
                className="lg:col-span-2 rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-sm">Action Center</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pendingBookings.length > 0
                        ? `${pendingBookings.length} request${pendingBookings.length !== 1 ? 's' : ''} waiting`
                        : 'No pending requests'}
                    </p>
                  </div>
                  {pendingBookings.length > 0 && (
                    <Link
                      to="/partner/bookings"
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                    >
                      View all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-20 rounded-xl bg-white/[0.03] animate-pulse border border-[hsl(240_10%_14%)]"
                      />
                    ))}
                  </div>
                ) : (
                  <ActionCenter
                    bookings={pendingBookings as Parameters<typeof ActionCenter>[0]['bookings']}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    acceptingId={acceptingId}
                    rejectingId={rejectingId}
                  />
                )}
              </motion.div>

              {/* Charts column */}
              <div className="lg:col-span-3 space-y-4">
                <BookingsLineChart data={chartData} />
                <RevenueBarChart data={chartData} />
              </div>
            </div>

            {/* ── Bottom analytics row ─────────────────────────────────────── */}
            <div className="grid md:grid-cols-3 gap-5">
              <VenuePerformance venues={venues} />
              <CustomerInsights bookings={bookings} venues={venues} />
              <POSInsights />
            </div>

            {/* ── Venues quick list ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.75 }}
              className="rounded-2xl bg-[hsl(240_10%_8%)] border border-[hsl(240_10%_15%)] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-sm">Your Venues</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {venues.length} venue{venues.length !== 1 ? 's' : ''} registered
                  </p>
                </div>
                <Link
                  to="/partner/venues"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
                >
                  Manage all
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {venues.slice(0, 6).map((venue, i) => (
                  <motion.div
                    key={venue.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.78 + i * 0.04 }}
                    whileHover={{ scale: 1.015, y: -2 }}
                  >
                    <Link
                      to={`/partner/venues/${venue.id}/edit`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(240_10%_14%)] hover:border-primary/30 hover:bg-primary/5 transition-all group"
                    >
                      {venue.images?.[0] ? (
                        <img
                          src={venue.images[0]}
                          alt={venue.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[hsl(240_10%_12%)] flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {venue.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{venue.city}</p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          venue.is_active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-[hsl(240_10%_14%)] text-muted-foreground'
                        }`}
                      >
                        {venue.is_active ? 'Live' : 'Inactive'}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </PartnerLayout>
  );
}
