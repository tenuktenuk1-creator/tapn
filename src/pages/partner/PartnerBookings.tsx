import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, usePartnerBookings, useConfirmBooking, useDeclineBooking } from '@/hooks/usePartner';
import { Navigate, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Users, Clock, MapPin, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

export default function PartnerBookings() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: bookings, isLoading: bookingsLoading } = usePartnerBookings();
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();

  const [declineDialogId, setDeclineDialogId] = useState<string | null>(null);

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

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
    pending:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      await confirmBooking.mutateAsync(bookingId);
      toast.success('Booking confirmed!');
    } catch {
      toast.error('Failed to confirm booking');
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      await declineBooking.mutateAsync(bookingId);
      toast.success('Booking declined');
      setDeclineDialogId(null);
    } catch {
      toast.error('Failed to decline booking');
    }
  };

  // Split into pending vs others
  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const otherBookings = bookings?.filter(b => b.status !== 'pending') || [];

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
            <p className="text-muted-foreground">
              Manage booking requests for your venues
            </p>
          </div>
        </div>

        {bookingsLoading ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : bookings?.length === 0 ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No bookings yet</h3>
            <p className="text-muted-foreground">
              Booking requests will appear here when customers reserve your venues.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending requests — action required */}
            {pendingBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-semibold text-lg text-foreground">Pending Requests</h2>
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    {pendingBookings.length} new
                  </Badge>
                </div>
                <div className="space-y-4">
                  {pendingBookings.map(booking => (
                    <Card key={booking.id} className="card-dark p-6 border border-yellow-500/20">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{booking.guest_name || 'Guest'}</h3>
                            <Badge className={statusColors['pending']}>Pending</Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {(booking as any).venues?.name || 'Unknown Venue'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(booking.booking_date), 'MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.start_time} – {booking.end_time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {booking.guest_count} guests
                            </div>
                          </div>
                          {booking.guest_email && (
                            <p className="text-sm text-muted-foreground">
                              Contact: {booking.guest_email}
                              {booking.guest_phone && ` • ${booking.guest_phone}`}
                            </p>
                          )}
                          {booking.notes && (
                            <p className="text-sm text-muted-foreground">
                              <span className="text-foreground font-medium">Note:</span> {booking.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <p className="text-2xl font-bold text-primary">
                            ₮{((booking.total_price || 0) / 100).toLocaleString()}
                          </p>
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
                              onClick={() => setDeclineDialogId(booking.id)}
                              disabled={declineBooking.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed & Cancelled bookings */}
            {otherBookings.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg text-foreground mb-4">All Bookings</h2>
                <div className="space-y-4">
                  {otherBookings.map(booking => (
                    <Card key={booking.id} className="card-dark p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{booking.guest_name || 'Guest'}</h3>
                            <Badge className={statusColors[booking.status || 'pending']}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {(booking as any).venues?.name || 'Unknown Venue'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(booking.booking_date), 'MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.start_time} – {booking.end_time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {booking.guest_count} guests
                            </div>
                          </div>
                          {booking.guest_email && (
                            <p className="text-sm text-muted-foreground">
                              Contact: {booking.guest_email}
                              {booking.guest_phone && ` • ${booking.guest_phone}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            ₮{((booking.total_price || 0) / 100).toLocaleString()}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {booking.payment_status || 'unpaid'}
                          </Badge>
                        </div>
                      </div>
                      {booking.notes && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Notes:</span> {booking.notes}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decline confirmation dialog */}
      <AlertDialog open={!!declineDialogId} onOpenChange={() => setDeclineDialogId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this booking request? The customer will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => declineDialogId && handleDecline(declineDialogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Decline Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
