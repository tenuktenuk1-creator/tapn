import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Users, Clock, Loader2, CheckCircle, LogIn } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { PublicVenue } from '@/types/venue';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BookingFormProps {
  venue: PublicVenue;
}

export function BookingForm({ venue }: BookingFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guestCount, setGuestCount] = useState('2');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch profile data when user is authenticated
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; email: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 10;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const calculateTotal = () => {
    if (!venue.price_per_hour) return 0;
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    const hours = end - start;
    return hours > 0 ? hours * venue.price_per_hour : 0;
  };

  const handleLoginRedirect = () => {
    // Save current location so user returns here after login
    navigate('/auth', { state: { from: location } });
  };

  const handleSubmitBooking = async () => {
    if (!user) {
      handleLoginRedirect();
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      toast.error('Please select valid time slots');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          venue_id: venue.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          guest_count: parseInt(guestCount),
          total_price: total,
          notes: notes || undefined,
          // Use profile data
          guest_name: profile?.full_name || user.email?.split('@')[0] || 'Guest',
          guest_phone: profile?.phone || '',
          guest_email: profile?.email || user.email || '',
          user_id: user.id,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to create booking');
        setIsLoading(false);
        return;
      }

      toast.success('Booking created successfully!');
      navigate('/booking-success', {
        state: {
          venueName: venue.name,
          venueAddress: venue.address,
          bookingDate: format(date, 'PPP'),
          startTime,
          endTime,
          guestCount,
          totalPrice: total,
          bookingId: data?.booking?.id,
        },
      });
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="font-display">Book This Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Selection - still allow browsing */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per hour</span>
              <span>₮{venue.price_per_hour?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">₮{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          <Button 
            className="w-full gradient-primary" 
            size="lg"
            onClick={handleLoginRedirect}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Book
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You need to be signed in to complete your booking
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-display">Book This Venue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>End Time</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Number of Guests (Optional)</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min="1"
              max="50"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Special Requests (Optional)</Label>
          <Textarea
            placeholder="Any special requests..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Price per hour</span>
            <span>${venue.price_per_hour?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span className="text-primary">${calculateTotal().toLocaleString()}</span>
          </div>
        </div>

        <Button 
          className="w-full gradient-primary" 
          size="lg"
          onClick={handleSubmitBooking}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating booking...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Booking
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Booking as {profile?.full_name || user?.email}
        </p>
      </CardContent>
    </Card>
  );
}