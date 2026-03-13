import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Mail, Phone, Camera, Save,
  MapPin, LogOut, ChevronRight, Heart, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { z } from 'zod';
import { PlannedNightsSection } from '@/components/profile/PlannedNightsSection';
import { venueTypeLabels } from '@/types/venue';

const profileSchema = z.object({
  full_name: z.string().trim().max(100, 'Name must be less than 100 characters').optional(),
  phone: z.string().trim().max(20, 'Phone must be less than 20 characters').optional(),
});

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: favorites = [], isLoading: favoritesLoading } = useMyFavorites();

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

