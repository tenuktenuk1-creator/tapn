import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, usePartnerVenues } from '@/hooks/usePartner';
import { Navigate, Link } from 'react-router-dom';
import { Building2, Plus, Edit, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { venueTypeLabels } from '@/types/venue';

export default function PartnerVenues() {
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const { data: venues, isLoading: venuesLoading } = usePartnerVenues();

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
    return <Navigate to="/auth?redirect=/partner/venues" replace />;
  }

  if (!isPartner) {
    return <Navigate to="/partner" replace />;
  }

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
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">
              <span className="text-foreground">My </span>
              <span className="text-gradient">Venues</span>
            </h1>
          </div>
          <Link to="/partner/venues/new">
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Venue
            </Button>
          </Link>
        </div>

        {/* Content */}
        {venuesLoading ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : venues?.length === 0 ? (
          <div className="card-dark rounded-xl p-12 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No venues yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first venue to start receiving bookings through TAPN.
            </p>
            <Link to="/partner/venues/new">
              <Button className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Venue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="card-dark rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Venue</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price/Hour</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues?.map(venue => (
                  <TableRow key={venue.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {venue.images?.[0] ? (
                          <img 
                            src={venue.images[0]} 
                            alt={venue.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{venue.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {venueTypeLabels[venue.venue_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {venue.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      {venue.price_per_hour ? `₮${venue.price_per_hour.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={venue.is_active ? 'default' : 'secondary'}>
                        {venue.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/partner/venues/${venue.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
