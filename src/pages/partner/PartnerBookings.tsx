import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, usePartnerBookings } from '@/hooks/usePartner';
import { Navigate, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Users, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

export default function PartnerBookings() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: bookings, isLoading: bookingsLoading } = usePartnerBookings();

  if (authLoading || partnerLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/partner/bookings" replace />;
  }

  if (!isPartner) {
    return <Navigate to="/partner" replace />;
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

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
            <p className="text-muted-foreground">All bookings for your venues</p>
          </div>
        </div>

        {/* Content */}
        {bookingsLoading ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : bookings?.length === 0 ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No bookings yet</h3>
            <p className="text-muted-foreground">
              Bookings will appear here when customers reserve your venues.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings?.map(booking => (
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
                        {booking.start_time} - {booking.end_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.guest_count} guests
                      </div>
                    </div>

                    {booking.guest_email && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {booking.guest_email} {booking.guest_phone && `• ${booking.guest_phone}`}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ₮{booking.total_price?.toLocaleString() || '0'}
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
        )}
      </div>
    </Layout>
  );
}
