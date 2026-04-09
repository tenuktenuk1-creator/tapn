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
import { format, addDays, startOfDay } from 'date-fns';
import { PublicVenue } from '@/types/venue';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { notify } from '@/lib/notifications';

interface BookingFormProps {
  venue: PublicVenue;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Returns hourly time slots within the venue's opening hours for a given date.
 *  Returns { slots, isClosed, openTime, closeTime }
 *  Handles midnight-crossing schedules (e.g. 21:00 → 02:00). */
function getVenueSlots(venue: PublicVenue, date: Date | undefined) {
  if (!date) return { slots: [] as string[], isClosed: false, openTime: '10:00', closeTime: '00:00' };

  // No hours configured — fall back to 10:00–00:00
  if (!venue.opening_hours || Object.keys(venue.opening_hours).length === 0) {
    const slots = Array.from({ length: 14 }, (_, i) => minutesToTime((10 + i) * 60));
    return { slots, isClosed: false, openTime: '10:00', closeTime: '00:00' };
  }

  const dayName = DAYS[date.getDay()];
  const hours = venue.opening_hours[dayName] as { open: string; close: string } | undefined;

  if (!hours || hours.open === 'closed' || hours.close === 'closed') {
    return { slots: [] as string[], isClosed: true, openTime: '', closeTime: '' };
  }

  const openMin  = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const isMidnightCross = closeMin <= openMin;

  // Total operating minutes → number of full hours available
  const durationMin = isMidnightCross ? (1440 - openMin) + closeMin : closeMin - openMin;
  const totalHours  = Math.floor(durationMin / 60);

  // One slot per hour starting from open; last slot must leave ≥1 hr before close
  const slots = Array.from({ length: totalHours }, (_, i) => minutesToTime(openMin + i * 60));

  return { slots, isClosed: false, openTime: hours.open, closeTime: hours.close };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingForm({ venue }: BookingFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; email: string | null } | null>(null);

  // Derive slots from selected date
  const { slots, isClosed, openTime, closeTime } = getVenueSlots(venue, date);
  // End time options = all slots after startTime + the closing time itself
  const startSlots = slots.slice(0, -1); // last slot can't be a start (no room for end)
  const endSlots   = startTime
    ? [...slots.slice(slots.indexOf(startTime) + 1), closeTime].filter(Boolean)
    : [];

  // When date changes, reset to first valid slot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (slots.length >= 2) {
      setStartTime(slots[0]);
      setEndTime(slots[1]);
    } else {
      setStartTime('');
      setEndTime('');
    }
  }, [date, slots.length]);

  // When startTime changes, reset end to next slot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!startTime || slots.length === 0) return;
    const idx = slots.indexOf(startTime);
    if (idx === -1) { setEndTime(''); return; }
    const nextSlot = idx + 1 < slots.length ? slots[idx + 1] : closeTime;
    setEndTime(nextSlot || '');
  }, [startTime, closeTime]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user?.id)
      .single();
    if (data) setProfile(data);
  };

  const calculateTotal = () => {
    if (!venue.price_per_hour || !startTime || !endTime) return 0;
    let diffMin = toMinutes(endTime) - toMinutes(startTime);
    if (diffMin <= 0) diffMin += 1440; // midnight crossing
    const hours = diffMin / 60;
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
      // Get current session token so edge function can verify + save user_id
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

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
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      });

      if (error || data?.error) {
        // Show specific server error message if available
        const errorMsg = data?.error || error?.message || 'Failed to create booking';
        console.error('Booking error:', { error, data });
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      toast.success('Booking created successfully!');

      // Notify the venue partner(s) about the new booking (fire-and-forget)
      const bookingId = data?.booking?.id as string | undefined;
      if (bookingId) {
        supabase
          .from('partner_venues')
          .select('user_id')
          .eq('venue_id', venue.id)
          .eq('status', 'approved')
          .then(({ data: partners }) => {
            partners?.forEach((p: { user_id: string }) => {
              void notify.bookingReceived(p.user_id, venue.name, bookingId);
            });
          });
      }

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
                  disabled={(date) => date < startOfDay(new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {isClosed ? (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
              <p className="text-sm text-red-400 font-medium">Closed on this day</p>
              <p className="text-xs text-muted-foreground mt-1">Please select a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent>
                    {startSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime} disabled={!startTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent>
                    {endSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!isClosed && openTime && (
            <p className="text-xs text-muted-foreground text-center">
              Open {openTime} – {closeTime}
            </p>
          )}

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
                disabled={(date) => date < startOfDay(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {isClosed ? (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
            <p className="text-sm text-red-400 font-medium">Closed on this day</p>
            <p className="text-xs text-muted-foreground mt-1">Please select a different date</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="--:--" />
                </SelectTrigger>
                <SelectContent>
                  {startSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime} disabled={!startTime}>
                <SelectTrigger>
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="--:--" />
                </SelectTrigger>
                <SelectContent>
                  {endSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {!isClosed && openTime && (
          <p className="text-xs text-muted-foreground text-center">
            Open {openTime} – {closeTime}
          </p>
        )}

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
          onClick={handleSubmitBooking}
          disabled={isLoading || isClosed || !startTime || !endTime}
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