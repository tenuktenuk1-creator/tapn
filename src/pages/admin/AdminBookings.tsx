import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  ArrowLeft,
  X,
  Clock,
  User,
  Building2,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
type SortOption = 'date' | 'created_at' | 'start_time';

interface BookingWithDetails {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  total_price: number;
  status: BookingStatus;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  notes: string | null;
  venues: {
    id: string;
    name: string;
    city: string;
  };
}

const ITEMS_PER_PAGE = 10;

export default function AdminBookings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [currentPage, setCurrentPage] = useState(1);

  // Actions
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  
  // Detail drawer
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    if (user && isAdmin) {
      fetchBookings();
    }
  }, [user, isAdmin]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        venues:venue_id (id, name, city)
      `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      setError('Failed to load bookings');
      toast.error('Failed to load bookings');
    } else {
      setBookings(data as unknown as BookingWithDetails[]);
    }
    setLoading(false);
  };

  if (authLoading) {
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

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.id.toLowerCase().includes(query) ||
        b.guest_name?.toLowerCase().includes(query) ||
        b.guest_email?.toLowerCase().includes(query) ||
        b.venues?.name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
        case 'start_time':
          return a.start_time.localeCompare(b.start_time);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [bookings, searchQuery, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCancelBooking = async () => {
    if (!confirmCancelId) return;
    
    setCancellingId(confirmCancelId);
    setConfirmCancelId(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId: confirmCancelId },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to cancel booking');
      } else {
        toast.success('Booking cancelled and refunded');
        fetchBookings();
      }
    } catch (err) {
      toast.error('Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: BookingStatus, paymentStatus: string) => {
    const config: Record<BookingStatus, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Pending' },
      confirmed: { className: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Confirmed' },
      cancelled: { className: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Cancelled' },
    };

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className={config[status].className}>
          {config[status].label}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          {paymentStatus}
        </span>
      </div>
    );
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
              <span className="text-gradient">Bookings</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-dark rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, customer, venue..."
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
              onValueChange={(value) => {
                setStatusFilter(value as BookingStatus | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => setSortBy(value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Recently Created</SelectItem>
                <SelectItem value="date">Booking Date</SelectItem>
                <SelectItem value="start_time">Start Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-20 card-dark rounded-2xl">
            <p className="text-destructive text-lg mb-4">{error}</p>
            <Button onClick={fetchBookings}>Try Again</Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="text-center py-20 card-dark rounded-2xl">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {searchQuery || statusFilter !== 'all' 
                ? 'No bookings match your filters'
                : 'No bookings yet'}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && paginatedBookings.length > 0 && (
          <>
            <div className="card-dark rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Booking</TableHead>
                    <TableHead className="text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground">Venue</TableHead>
                    <TableHead className="text-muted-foreground">Date & Time</TableHead>
                    <TableHead className="text-muted-foreground">Guests</TableHead>
                    <TableHead className="text-muted-foreground">Total</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => (
                    <TableRow 
                      key={booking.id} 
                      className="border-border cursor-pointer hover:bg-secondary/50"
                      onClick={() => { setSelectedBooking(booking); setAdminNote(booking.notes || ''); }}
                    >
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-foreground font-medium">
                            #{booking.id.slice(0, 8)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(booking.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              {booking.guest_name || 'Unknown'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {booking.guest_email || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-foreground text-sm">
                              {booking.venues?.name || 'Unknown Venue'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {booking.venues?.city || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-foreground text-sm">
                              {format(new Date(booking.booking_date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {booking.start_time} - {booking.end_time}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {booking.guest_count}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {booking.total_price ? `₮${(booking.total_price / 100).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(booking.status, booking.payment_status)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setSelectedBooking(booking); setAdminNote(booking.notes || ''); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {booking.status === 'confirmed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                              onClick={() => setConfirmCancelId(booking.id)}
                              disabled={cancellingId === booking.id}
                            >
                              {cancellingId === booking.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          )}
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of{' '}
                  {filteredBookings.length} bookings
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

        {/* Booking Detail Sheet */}
        <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <SheetContent className="bg-card border-border overflow-y-auto">
            {selectedBooking && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-foreground">
                    Booking #{selectedBooking.id.slice(0, 8)}
                  </SheetTitle>
                  <SheetDescription>
                    Created on {format(new Date(selectedBooking.created_at), 'PPP')}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedBooking.status, selectedBooking.payment_status)}
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
                    <div className="card-dark rounded-lg p-3 space-y-2">
                      <p className="text-foreground font-medium">{selectedBooking.guest_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.guest_email || '-'}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.guest_phone || '-'}</p>
                    </div>
                  </div>

                  {/* Venue Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Venue</h4>
                    <div className="card-dark rounded-lg p-3">
                      <p className="text-foreground font-medium">{selectedBooking.venues?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedBooking.venues?.city}</p>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
                    <div className="card-dark rounded-lg p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="text-foreground">{format(new Date(selectedBooking.booking_date), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="text-foreground">{selectedBooking.start_time} - {selectedBooking.end_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guests</span>
                        <span className="text-foreground">{selectedBooking.guest_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-foreground font-medium">
                          ₮{selectedBooking.total_price ? (selectedBooking.total_price / 100).toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedBooking.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Special Requests</h4>
                      <div className="card-dark rounded-lg p-3">
                        <p className="text-foreground text-sm">{selectedBooking.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Admin Note */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-note" className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Admin Note
                    </Label>
                    <Textarea
                      id="admin-note"
                      placeholder="Add internal notes about this booking..."
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      className="bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Notes are for internal use only and won't be visible to the customer.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        if (!selectedBooking) return;
                        const { error } = await supabase
                          .from('bookings')
                          .update({ notes: adminNote })
                          .eq('id', selectedBooking.id);
                        if (error) {
                          toast.error('Failed to save note');
                        } else {
                          toast.success('Note saved');
                          fetchBookings();
                        }
                      }}
                    >
                      Save Note
                    </Button>
                  </div>

                  {/* Actions */}
                  {selectedBooking.status === 'confirmed' && (
                    <Button 
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setConfirmCancelId(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel & Refund Booking
                    </Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={!!confirmCancelId} onOpenChange={() => setConfirmCancelId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Cancel Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking? This will also process a refund to the customer.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Keep Booking</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelBooking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel & Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}