import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, usePartnerVenues, usePartnerBookings } from '@/hooks/usePartner';
import { Navigate, Link } from 'react-router-dom';
import { Building2, Calendar, Plus, TrendingUp, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: venues, isLoading: venuesLoading } = usePartnerVenues();
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
    return <Navigate to="/auth?redirect=/partner/dashboard" replace />;
  }

  if (!isPartner) {
    return <Navigate to="/partner" replace />;
  }

  const upcomingBookings = bookings?.filter(b => 
    new Date(b.booking_date) >= new Date() && b.status !== 'cancelled'
  ).slice(0, 5) || [];

  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'approved').length || 0;

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">
              <span className="text-foreground">Partner </span>
              <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">Manage your venues and bookings</p>
          </div>
          <Link to="/partner/venues/new">
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add New Venue
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{venues?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Venues</p>
              </div>
            </div>
          </Card>
          <Card className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBookings}</p>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </Card>
          <Card className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmedBookings}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </Card>
          <Card className="card-dark p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingBookings.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Venues */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Your Venues</h2>
              <Link to="/partner/venues" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            
            {venuesLoading ? (
              <div className="card-dark rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : venues?.length === 0 ? (
              <Card className="card-dark p-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No venues yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first venue to start receiving bookings.
                </p>
                <Link to="/partner/venues/new">
                  <Button className="gradient-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Venue
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-3">
                {venues?.slice(0, 3).map(venue => (
                  <Link key={venue.id} to={`/partner/venues/${venue.id}/edit`}>
                    <Card className="card-dark p-4 hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        {venue.images?.[0] ? (
                          <img 
                            src={venue.images[0]} 
                            alt={venue.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{venue.name}</h3>
                          <p className="text-sm text-muted-foreground">{venue.city}</p>
                        </div>
                        <Badge variant={venue.is_active ? 'default' : 'secondary'}>
                          {venue.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Upcoming Bookings</h2>
              <Link to="/partner/bookings" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            
            {bookingsLoading ? (
              <div className="card-dark rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <Card className="card-dark p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No upcoming bookings</h3>
                <p className="text-sm text-muted-foreground">
                  Bookings will appear here when customers reserve your venues.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map(booking => (
                  <Card key={booking.id} className="card-dark p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{booking.guest_name || 'Guest'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.booking_date), 'MMM d, yyyy')} • {booking.start_time} - {booking.end_time}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{booking.guest_count}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
