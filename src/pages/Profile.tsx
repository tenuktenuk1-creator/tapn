import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserBookings, useCancelBooking } from '@/hooks/useBookings';
import { useMyFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Mail, Phone, Camera, Save, Calendar, Clock,
  MapPin, LogOut, ChevronRight, Heart, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, isAfter, isBefore } from 'date-fns';
import { PlannedNightsSection } from '@/components/profile/PlannedNightsSection';
import { venueTypeLabels } from '@/types/venue';

const profileSchema = z.object({
  full_name: z.string().trim().max(100, 'Name must be less than 100 characters').optional(),
  phone: z.string().trim().max(20, 'Phone must be less than 20 characters').optional(),
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: bookings = [], isLoading: bookingsLoading } = useUserBookings();
  const { data: favorites = [], isLoading: favoritesLoading } = useMyFavorites();
  const cancelBooking = useCancelBooking();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } else if (data) {
      setFormData({
        full_name: data.full_name || '',
        email: data.email || user?.email || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
      });
    } else {
      setFormData(prev => ({ ...prev, email: user?.email || '' }));
    }
    setLoading(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Add cache-busting param so browser reloads the new image
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithBust })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: urlWithBust }));
      toast.success('Avatar updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      // Reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationResult = profileSchema.safeParse({
      full_name: formData.full_name || undefined,
      phone: formData.phone || undefined,
    });
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name || null,
        phone: formData.phone || null,
      })
      .eq('id', user!.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return formData.email?.charAt(0).toUpperCase() || 'U';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter bookings
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const upcomingBookings = activeBookings.filter(
    b => isAfter(new Date(b.booking_date), now) || format(new Date(b.booking_date), 'yyyy-MM-dd') === todayStr
  );
  const pastBookings = bookings.filter(
    b => b.status === 'cancelled' || b.status === 'rejected' ||
      (b.status === 'confirmed' && isBefore(new Date(b.booking_date), now) &&
        format(new Date(b.booking_date), 'yyyy-MM-dd') !== todayStr)
  );

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            <span className="text-foreground">My </span>
            <span className="text-gradient">Profile</span>
          </h1>
          <p className="text-muted-foreground">Manage your account and view your bookings</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar — click to upload */}
                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                      <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-xl font-semibold text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingAvatar
                          ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                          : <Camera className="h-5 w-5 text-white" />
                        }
                      </div>
                    </div>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />

                    <div>
                      <h2 className="font-semibold text-foreground text-xl">
                        {formData.full_name || 'Your Name'}
                      </h2>
                      <p className="text-muted-foreground text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {formData.email}
                      </p>
                      {formData.phone && (
                        <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {formData.phone}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">Click avatar to change photo</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="border-border"
                  >
                    {isEditing ? (
                      <><X className="h-3 w-3 mr-1" />Cancel</>
                    ) : 'Edit Profile'}
                  </Button>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-border pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Enter your full name"
                          className="bg-secondary border-border"
                        />
                        {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter your phone number"
                          className="bg-secondary border-border"
                        />
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} className="gradient-primary">
                      {saving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Save className="mr-2 h-4 w-4" />Save Changes</>
                      }
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Bookings Section */}
            <Card className="card-dark border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  My Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                    <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="space-y-3">
                    {bookingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : upcomingBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No upcoming bookings</p>
                        <Button variant="outline" className="mt-4 border-border" onClick={() => navigate('/venues')}>
                          Browse Venues
                        </Button>
                      </div>
                    ) : (
                      upcomingBookings.map((booking) => (
                        <BookingItem
                          key={booking.id}
                          booking={booking}
                          getStatusBadge={getStatusBadge}
                          onViewDetails={() => navigate(`/venues/${booking.venue_id}`)}
                          cancelBooking={cancelBooking}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="past" className="space-y-3">
                    {bookingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : pastBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No past bookings</p>
                      </div>
                    ) : (
                      pastBookings.map((booking) => (
                        <BookingItem
                          key={booking.id}
                          booking={booking}
                          getStatusBadge={getStatusBadge}
                          onViewDetails={() => navigate(`/venues/${booking.venue_id}`)}
                          cancelBooking={cancelBooking}
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Favorites Section */}
            <Card className="card-dark border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Heart className="h-5 w-5 text-primary" />
                  Saved Venues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favoritesLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No saved venues yet</p>
                    <Button variant="outline" className="mt-4 border-border" onClick={() => navigate('/venues')}>
                      Browse Venues
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {favorites.map((fav: any) => {
                      const venue = fav.venues;
                      if (!venue) return null;
                      const img = Array.isArray(venue.images) ? venue.images[0] : null;
                      return (
                        <Link
                          key={fav.venue_id}
                          to={`/venues/${fav.venue_id}`}
                          className="group rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors bg-secondary/50"
                        >
                          {/* Thumbnail */}
                          <div className="h-24 bg-secondary relative overflow-hidden">
                            {img ? (
                              <img
                                src={img}
                                alt={venue.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <MapPin className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-2">
                            <p className="font-medium text-sm text-foreground truncate">{venue.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {venueTypeLabels[venue.venue_type as keyof typeof venueTypeLabels] ?? venue.venue_type}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Planned Nights Section */}
            <PlannedNightsSection />

            {/* Account Actions */}
            <Card className="card-dark border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogout}
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

interface BookingItemProps {
  booking: any;
  getStatusBadge: (status: string) => React.ReactNode;
  onViewDetails: () => void;
  cancelBooking: ReturnType<typeof useCancelBooking>;
}

function BookingItem({ booking, getStatusBadge, onViewDetails, cancelBooking }: BookingItemProps) {
  const venueName = booking.venue?.name || 'Unknown Venue';
  const venueAddress = booking.venue?.address || '';
  const canCancel = booking.status === 'pending';

  const handleCancel = () => {
    cancelBooking.mutate(booking.id, {
      onSuccess: () => toast.success('Booking cancelled'),
      onError: () => toast.error('Failed to cancel booking'),
    });
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-foreground truncate">{venueName}</h4>
          {getStatusBadge(booking.status)}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(booking.booking_date), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
          </span>
          {venueAddress && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {venueAddress}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cancel your booking at <strong>{venueName}</strong> on{' '}
                  {format(new Date(booking.booking_date), 'MMM d, yyyy')}? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Cancel
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="text-primary hover:text-primary"
        >
          View
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
