import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminVenues } from '@/hooks/useVenues';
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
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const ITEMS_PER_PAGE = 10;

export default function AdminVenues() {
  const { user, isAdmin, loading } = useAuth();
  // Admin must see all venues (active + inactive) with owner info
  const { data: venues, isLoading, error } = useAdminVenues();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'price'>('name');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Filter and sort venues
  const filteredVenues = useMemo(() => {
    if (!venues) return [];

    let result = [...venues];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.name.toLowerCase().includes(query) || 
        v.address.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(v => 
        statusFilter === 'active' ? v.is_active : !v.is_active
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(v => v.venue_type === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price':
          return (b.price_per_hour || 0) - (a.price_per_hour || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [venues, searchQuery, statusFilter, categoryFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredVenues.length / ITEMS_PER_PAGE);
  const paginatedVenues = filteredVenues.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleActive = async (venueId: string, currentStatus: boolean) => {
    setTogglingId(venueId);
    const { error } = await supabase
      .from('venues')
      .update({ is_active: !currentStatus })
      .eq('id', venueId);

    if (error) {
      toast.error('Failed to update venue status');
    } else {
      toast.success(`Venue ${!currentStatus ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    }
    setTogglingId(null);
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
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
    }
    setDeleteId(null);
  };

  const venueTypes = ['cafe', 'karaoke', 'pool_snooker', 'lounge'];

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
            <p className="text-muted-foreground mt-1">
              {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Link to="/admin/venues/new">
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" /> Add Venue
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-secondary border-border"
              />
            </div>

            {/* Status Filter */}
            <Select 
              value={statusFilter} 
              onValueChange={(value: 'all' | 'active' | 'inactive') => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select 
              value={categoryFilter} 
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {venueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {venueTypeLabels[type as keyof typeof venueTypeLabels]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select 
              value={sortBy} 
              onValueChange={(value: 'name' | 'rating' | 'price') => setSortBy(value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
                <SelectItem value="price">Highest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-20 card-dark rounded-2xl">
            <p className="text-destructive text-lg mb-4">Failed to load venues</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['venues'] })}>
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredVenues.length === 0 && (
          <div className="text-center py-20 card-dark rounded-2xl">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'No venues match your filters'
                : 'No venues yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
              <Link to="/admin/venues/new">
                <Button className="gradient-primary">
                  <Plus className="mr-2 h-4 w-4" /> Add Your First Venue
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && paginatedVenues.length > 0 && (
          <>
            <div className="card-dark rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Venue</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Owner</TableHead>
                    <TableHead className="text-muted-foreground">Location</TableHead>
                    <TableHead className="text-muted-foreground">Rating</TableHead>
                    <TableHead className="text-muted-foreground">Price/hr</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVenues.map((venue) => (
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
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {(venue as any).owner_profile?.full_name ? (
                            <span className="text-foreground truncate max-w-[120px]" title={(venue as any).owner_profile.email ?? ''}>
                              {(venue as any).owner_profile.full_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
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
                          disabled={togglingId === venue.id}
                        >
                          {togglingId === venue.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                          ) : venue.is_active ? (
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
                          <Link to={`/venues/${venue.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredVenues.length)} of{' '}
                  {filteredVenues.length} venues
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-border"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete Venue</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this venue? This action cannot be undone.
                All bookings associated with this venue will also be affected.
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