import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVenues } from '@/hooks/useVenues';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Star,
  ToggleLeft,
  ToggleRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import { venueTypeLabels } from '@/types/venue';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminVenues() {
  const { user, isAdmin, loading } = useAuth();
  const { data: venues, isLoading } = useVenues({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleToggleActive = async (venueId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('venues')
      .update({ is_active: !currentStatus })
      .eq('id', venueId);

    if (error) {
      toast.error('Failed to update venue status');
    } else {
      toast.success(`Venue ${!currentStatus ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete venue');
    } else {
      toast.success('Venue deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['venues'] });
    }
    setDeleteId(null);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              <span className="text-foreground">Manage </span>
              <span className="text-gradient">Venues</span>
            </h1>
          </div>
          <Link to="/admin/venues/new">
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" /> Add Venue
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : venues?.length === 0 ? (
          <div className="text-center py-20 card-dark rounded-2xl">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">No venues yet</p>
            <Link to="/admin/venues/new">
              <Button className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Venue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="card-dark rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Venue</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Location</TableHead>
                  <TableHead className="text-muted-foreground">Rating</TableHead>
                  <TableHead className="text-muted-foreground">Price/hr</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues?.map((venue) => (
                  <TableRow key={venue.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary">
                          {venue.images?.[0] ? (
                            <img 
                              src={venue.images[0]} 
                              alt={venue.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Building2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{venue.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                        {venueTypeLabels[venue.venue_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {venue.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-foreground">{venue.rating?.toFixed(1) || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {venue.price_per_hour ? `₮${venue.price_per_hour.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(venue.id, venue.is_active || false)}
                        className="flex items-center gap-2"
                      >
                        {venue.is_active ? (
                          <>
                            <ToggleRight className="h-6 w-6 text-green-500" />
                            <span className="text-green-500 text-sm">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                            <span className="text-muted-foreground text-sm">Inactive</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/venues/${venue.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(venue.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete Venue</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this venue? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
