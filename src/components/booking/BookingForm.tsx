import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Users, Clock, CreditCard, Loader2, User, Phone, Mail } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { PublicVenue } from '@/types/venue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with publishable key
const stripePromise = loadStripe('pk_test_51RTEwdPMBd6oo5i5g20h6PN3ZUxnI1UlFqJQbgSUmRPfPVSKL2xD8X27NZcyLWPXFMnL0PnHD0NrYvmW2OelZxPH00F1xQgCRB');

interface BookingFormProps {
  venue: PublicVenue;
}

interface PaymentFormProps {
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
  amount: number;
  guestEmail: string;
}

function PaymentForm({ clientSecret, paymentIntentId, onSuccess, onCancel, amount, guestEmail }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/booking-success',
          receipt_email: guestEmail,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm booking with backend
        const { data, error: confirmError } = await supabase.functions.invoke('confirm-booking', {
          body: { paymentIntentId },
        });

        if (confirmError || data?.error) {
          toast.error(data?.error || 'Failed to confirm booking');
          setIsProcessing(false);
          return;
        }

        toast.success('Booking confirmed! Check your email for confirmation.');
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Amount to pay</span>
          <span className="text-xl font-bold text-primary">${(amount / 100).toLocaleString()}</span>
        </div>
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 gradient-primary"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function BookingForm({ venue }: BookingFormProps) {
  const navigate = useNavigate();

  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guestCount, setGuestCount] = useState('2');
  const [notes, setNotes] = useState('');
  
  // Guest contact info (no auth required)
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
  } | null>(null);

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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInitiatePayment = async () => {
    // Validate contact info
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!guestPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!guestEmail.trim() || !validateEmail(guestEmail)) {
      toast.error('Please enter a valid email address');
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
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          venue_id: venue.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          guest_count: parseInt(guestCount),
          total_price: total,
          notes: notes || undefined,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          guest_email: guestEmail.trim().toLowerCase(),
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to initiate payment');
        setIsLoading(false);
        return;
      }

      setPaymentData({
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        amount: data.amount,
      });
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to start booking process');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/booking-success');
  };

  const handleCancelPayment = () => {
    setPaymentData(null);
  };

  if (paymentData) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Complete Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret: paymentData.clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#e91e63',
                  colorBackground: '#1a1a2e',
                  colorText: '#ffffff',
                  colorDanger: '#ef4444',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm
              clientSecret={paymentData.clientSecret}
              paymentIntentId={paymentData.paymentIntentId}
              amount={paymentData.amount}
              guestEmail={guestEmail}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancelPayment}
            />
          </Elements>
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
        {/* Contact Info Section */}
        <div className="space-y-3 pb-4 border-b border-border">
          <h4 className="text-sm font-medium text-muted-foreground">Your Contact Information</h4>
          
          <div className="space-y-2">
            <Label htmlFor="guestName">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guestName"
                placeholder="John Doe"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestPhone">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guestPhone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guestEmail"
                type="email"
                placeholder="john@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

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
          onClick={handleInitiatePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking availability...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay & Confirm Booking
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Instant confirmation. Your booking is confirmed immediately upon payment.
        </p>
      </CardContent>
    </Card>
  );
}
