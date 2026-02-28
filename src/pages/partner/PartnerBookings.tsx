import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, usePartnerBookings, useConfirmBooking, useDeclineBooking } from '@/hooks/usePartner';
import { Navigate, Link } from 'react-router-dom';
import {
  Calendar, ArrowLeft, Users, Clock, MapPin, Check, X,
  Search, ChevronLeft, ChevronRight, DollarSign, Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 8;

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
  pending:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  rejected:  'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function PartnerBookings() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: bookings = [], isLoading: bookingsLoading } = usePartnerBookings();
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();

  // Decline dialog (pending bookings → rejected)
  const [declineDialogId, setDeclineDialogId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Cancel dialog (confirmed bookings → cancelled)
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);

  if (authLoading || partnerLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/partner/bookings" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  const handleConfirm = async (bookingId: string) => {
    try {
      await confirmBooking.mutateAsync(bookingId);
      toast.success('Booking confirmed!');
    } catch {
      toast.error('Failed to confirm booking');
    }
  };

  const handleDecline = async () => {
    if (!declineDialogId) return;
    try {
      await declineBooking.mutateAsync({ bookingId: declineDialogId, reason: declineReason, status: 'rejected' });
      toast.success('Booking declined');
      setDeclineDialogId(null);
      setDeclineReason('');
    } catch {
      toast.error('Failed to decline booking');
    }
  };

  const handleCancel = async () => {
    if (!cancelDialogId) return;
    try {
      await declineBooking.mutateAsync({ bookingId: cancelDialogId, reason: cancelReason, status: 'cancelled' });
      toast.success('Booking cancelled');
      setCancelDialogId(null);
      setCancelReason('');
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  // --- Stats ---
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const totalRevenue   = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_price || 0), 0) / 100;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCount = bookings.filter(b =>
    b.status !== 'cancelled' && b.status !== 'rejected' && b.booking_date === todayStr
  ).length;

  // --- Filter + Search ---
  const filtered = useMemo(() => {
    let result = [...bookings];
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.guest_name?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q) ||
        (b as any).venues?.name?.toLowerCase().includes(q)
      );
    }
    // pending first, then newest
    result.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [bookings, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/partner/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">
              <span className="text-foreground">Venue </span>
              <span className="text-gradient">Bookings</span>
            </h1>
            <p className="text-muted-foreground">Manage booking requests for your venues</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending',   value: pendingCount,   icon: Clock,       color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Confirmed', value: confirmedCount, icon: Check,       color: 'text-green-500',  bg: 'bg-green-500/10'  },
            { label: "Today's",   value: todayCount,     icon: Calendar,    color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
            { label: 'Revenue',   value: `₮${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="card-dark p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold truncate">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name, email or venue..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 bg-secondary border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {bookingsLoading ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No bookings found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Booking requests will appear here when customers reserve your venues.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginated.map(booking => {
                const isPending   = booking.status === 'pending';
                const isConfirmed = booking.status === 'confirmed';
                const sc = STATUS_COLORS[booking.status] ?? STATUS_COLORS.cancelled;
                return (
                  <Card
                    key={booking.id}
                    className={`card-dark p-5 border ${isPending ? 'border-yellow-500/30' : 'border-border'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-lg">{booking.guest_name || 'Guest'}</h3>
                          <Badge className={sc}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 shrink-0" />
                            {(booking as any).venues?.name || 'Unknown Venue'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 shrink-0" />
                            {format(new Date(booking.booking_date), 'MMMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 shrink-0" />
                            {booking.start_time} – {booking.end_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 shrink-0" />
                            {booking.guest_count} guests
                          </span>
                        </div>
                        {booking.guest_email && (
                          <p className="text-sm text-muted-foreground truncate">
                            {booking.guest_email}
                            {booking.guest_phone && ` · ${booking.guest_phone}`}
                          </p>
                        )}
                        {booking.notes && (
                          <p className="text-sm text-muted-foreground bg-secondary/50 rounded p-2">
                            <span className="text-foreground font-medium">Note: </span>
                            {booking.notes.split('\n---\n')[0]}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <p className="text-2xl font-bold text-primary">
                          ₮{((booking.total_price || 0) / 100).toLocaleString()}
                        </p>

                        {/* Pending actions */}
                        {isPending && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleConfirm(booking.id)}
                              disabled={confirmBooking.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={() => { setDeclineDialogId(booking.id); setDeclineReason(''); }}
                              disabled={declineBooking.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {/* Confirmed actions */}
                        {isConfirmed && (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge variant="outline" className="text-xs">
                              {booking.payment_status || 'unpaid'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                              onClick={() => { setCancelDialogId(booking.id); setCancelReason(''); }}
                              disabled={declineBooking.isPending}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Terminal status — just show payment */}
                        {!isPending && !isConfirmed && (
                          <Badge variant="outline" className="text-xs">
                            {booking.payment_status || 'unpaid'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-border"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-border"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Decline Dialog (pending → rejected) ── */}
      <AlertDialog
        open={!!declineDialogId}
        onOpenChange={(open) => { if (!open) { setDeclineDialogId(null); setDeclineReason(''); } }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Booking Request</AlertDialogTitle>
            <AlertDialogDescription>
              This booking will be marked as <strong>rejected</strong> and the customer will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="decline-reason" className="text-sm font-medium">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="decline-reason"
              placeholder="e.g. Venue unavailable on that date…"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={declineBooking.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {declineBooking.isPending ? 'Declining…' : 'Decline Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel Dialog (confirmed → cancelled) ── */}
      <AlertDialog
        open={!!cancelDialogId}
        onOpenChange={(open) => { if (!open) { setCancelDialogId(null); setCancelReason(''); } }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Confirmed Booking</AlertDialogTitle>
            <AlertDialogDescription>
              This confirmed booking will be <strong>cancelled</strong>. The customer will be notified.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="e.g. Emergency closure, force majeure…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={declineBooking.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {declineBooking.isPending ? 'Cancelling…' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
