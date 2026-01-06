import { useState, useEffect } from 'react';
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
  CreditCard
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

type BookingStatus = 'confirmed' | 'cancelled';

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
  venues: {
    name: string;
    city: string;
  };
}

export default function AdminBookings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      fetchBookings();
    }
  }, [user, isAdmin]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        venues:venue_id (name, city)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
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

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { bookingId },
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
    const config = {
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

  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === statusFilter);

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
              All bookings are payment-confirmed. Cancel to issue refunds.
            </p>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as BookingStatus | 'all')}
          >
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 card-dark rounded-2xl">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No bookings found</p>
          </div>
        ) : (
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
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="border-border">
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
                      {booking.total_price ? `$${(booking.total_price / 100).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(booking.status, booking.payment_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.status === 'confirmed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                        >
                          {cancellingId === booking.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Cancel & Refund
                            </>
                          )}
                        </Button>
                      )}
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
