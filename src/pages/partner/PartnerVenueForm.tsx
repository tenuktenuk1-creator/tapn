import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsPartner, useCreatePartnerVenue, useUpdatePartnerVenue } from '@/hooks/usePartner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { VenueType, venueTypeLabels } from '@/types/venue';
import { Badge } from '@/components/ui/badge';

const venueTypes: VenueType[] = ['cafe', 'karaoke', 'pool_snooker', 'lounge'];

const DAYS = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  { key: 'saturday',  label: 'Sat' },
  { key: 'sunday',    label: 'Sun' },
];

type OpeningHours = Record<string, { open: string; close: string } | null>;

const defaultOpeningHours = (): OpeningHours => ({
  monday:    { open: '09:00', close: '22:00' },
  tuesday:   { open: '09:00', close: '22:00' },
  wednesday: { open: '09:00', close: '22:00' },
  thursday:  { open: '09:00', close: '22:00' },
  friday:    { open: '09:00', close: '23:00' },
  saturday:  { open: '10:00', close: '23:00' },
  sunday:    null,
});

export default function PartnerVenueForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isPartner, isLoading: partnerLoading } = useIsPartner();
  const createVenue = useCreatePartnerVenue();
  const updateVenue = useUpdatePartnerVenue();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    venue_type: 'cafe' as VenueType,
    description: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    price_per_hour: '',
    is_active: true,
    images: [] as string[],
    amenities: [] as string[],
  });
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours());
  const [newAmenity, setNewAmenity] = useState('');

  useEffect(() => {
    if (isEditing && user) fetchVenue();
  }, [id, user]);

  const fetchVenue = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Failed to load venue');
      navigate('/partner/venues');
      return;
    }

    setFormData({
      name: data.name,
      venue_type: data.venue_type,
      description: data.description || '',
      address: data.address,
      city: data.city,
      phone: data.phone || '',
      email: data.email || '',
      price_per_hour: data.price_per_hour?.toString() || '',
      is_active: data.is_active ?? true,
      images: data.images || [],
      amenities: data.amenities || [],
    });

    if (data.opening_hours && Object.keys(data.opening_hours).length > 0) {
      setOpeningHours(data.opening_hours as OpeningHours);
    }
  };

  if (authLoading || partnerLoading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/partner/venues/new" replace />;
  if (!isPartner) return <Navigate to="/partner" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanedHours: Record<string, { open: string; close: string }> = {};
    for (const day of DAYS) {
      const h = openingHours[day.key];
      if (h) cleanedHours[day.key] = h;
    }

    const venueData = {
      name: formData.name,
      venue_type: formData.venue_type,
      description: formData.description || null,
      address: formData.address,
      city: formData.city,
      phone: formData.phone || null,
      email: formData.email || null,
      price_per_hour: formData.price_per_hour ? parseFloat(formData.price_per_hour) : null,
      is_active: formData.is_active,
      images: formData.images,
      amenities: formData.amenities,
      opening_hours: Object.keys(cleanedHours).length > 0 ? cleanedHours : null,
    };

    try {
      if (isEditing) {
        await updateVenue.mutateAsync({ id, ...venueData });
        toast.success('Venue updated successfully');
      } else {
        await createVenue.mutateAsync(venueData);
        toast.success('Venue created successfully');
      }
      navigate('/partner/venues');
    } catch (error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} venue`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image file`); continue; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB limit`); continue; }

      const fileExt = file.name.split('.').pop();
      const filePath = `venues/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('venue-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) { toast.error(`Failed to upload ${file.name}: ${uploadError.message}`); continue; }

      const { data: urlData } = supabase.storage.from('venue-images').getPublicUrl(filePath);
      uploadedUrls.push(urlData.publicUrl);
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded successfully`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = async (index: number) => {
    const imageUrl = formData.images[index];
    const supabaseStorageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/venue-images/`;
    if (imageUrl.startsWith(supabaseStorageUrl)) {
      await supabase.storage.from('venue-images').remove([imageUrl.replace(supabaseStorageUrl, '')]);
    }
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setFormData(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));
  };

  const toggleDay = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: prev[day] ? null : { open: '09:00', close: '22:00' },
    }));
  };

  const updateHour = (day: string, field: 'open' | 'close', value: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [field]: value } : { open: '09:00', close: '22:00', [field]: value },
    }));
  };

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/partner/venues">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display text-3xl font-bold">
            <span className="text-foreground">{isEditing ? 'Edit' : 'Add'} </span>
            <span className="text-gradient">Venue</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-dark rounded-2xl p-6 space-y-6">

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Venue Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue_type">Venue Type *</Label>
                <Select value={formData.venue_type} onValueChange={(value: VenueType) => setFormData(prev => ({ ...prev, venue_type: value }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {venueTypes.map(type => <SelectItem key={type} value={type}>{venueTypeLabels[type]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} className="bg-secondary border-border" placeholder="Describe your venue, atmosphere, and what makes it special..." />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Location</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} required className="bg-secondary border-border" placeholder="e.g., Ulaanbaatar" />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="bg-secondary border-border" />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Pricing</h3>
              <div className="space-y-2">
                <Label htmlFor="price_per_hour">Price per Hour (₮)</Label>
                <Input id="price_per_hour" type="number" value={formData.price_per_hour} onChange={(e) => setFormData(prev => ({ ...prev, price_per_hour: e.target.value }))} className="bg-secondary border-border" placeholder="e.g., 50000" />
              </div>
            </div>

            {/* Opening Hours */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Opening Hours</h3>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const isOpen = !!openingHours[key];
                  const hours = openingHours[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={`w-12 text-xs font-semibold rounded-lg py-1.5 transition-colors ${
                          isOpen ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {label}
                      </button>
                      {isOpen && hours ? (
                        <>
                          <Input type="time" value={hours.open} onChange={(e) => updateHour(key, 'open', e.target.value)} className="bg-secondary border-border h-8 text-sm w-32" />
                          <span className="text-muted-foreground text-sm">–</span>
                          <Input type="time" value={hours.close} onChange={(e) => updateHour(key, 'close', e.target.value)} className="bg-secondary border-border h-8 text-sm w-32" />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Click a day to toggle open/closed</p>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Images</h3>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              <div className="grid grid-cols-3 gap-3">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img src={img} alt={`Venue ${index + 1}`} className="w-full h-full object-cover rounded-xl border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground text-center px-2">Add Image</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Supported: JPG, PNG, WebP, GIF · Max 5MB per image</p>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Amenities</h3>
              <div className="flex gap-2">
                <Input placeholder="Enter amenity (e.g., WiFi, Parking)" value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)} className="bg-secondary border-border"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }} />
                <Button type="button" onClick={addAmenity} variant="outline" className="border-border">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="bg-secondary text-foreground flex items-center gap-1">
                      {amenity}
                      <button type="button" onClick={() => removeAmenity(index)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-sm text-muted-foreground">Venue will be visible to users</p>
              </div>
              <Switch id="is_active" checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || uploading} className="gradient-primary flex-1">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <><Save className="mr-2 h-4 w-4" />{isEditing ? 'Update Venue' : 'Create Venue'}</>
              )}
            </Button>
            <Link to="/partner/venues" className="flex-1">
              <Button type="button" variant="outline" className="w-full border-border">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
