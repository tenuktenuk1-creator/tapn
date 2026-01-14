import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Venue, PublicVenue, VenueType } from '@/types/venue';

// --- MOCK DATABASE ---
// This acts as a temporary local database
let MOCK_VENUES: Venue[] = [
  {
    id: '1',
    name: 'Nebula Lounge',
    description: 'Experience the cosmos in our space-themed lounge with signature galaxy cocktails and ambient beats. Perfect for intimate gatherings or solo unwinding.',
    venue_type: 'lounge',
    address: '142 Seoul Street',
    city: 'Ulaanbaatar',
    latitude: 47.9188,
    longitude: 106.9176,
    price_per_hour: 150000,
    phone: '+976 9911 2233',
    email: 'contact@nebulalounge.mn',
    opening_hours: {
      monday: { open: '18:00', close: '02:00' },
      tuesday: { open: '18:00', close: '02:00' },
      wednesday: { open: '18:00', close: '02:00' },
      thursday: { open: '18:00', close: '03:00' },
      friday: { open: '18:00', close: '04:00' },
      saturday: { open: '18:00', close: '04:00' },
      sunday: { open: '18:00', close: '02:00' },
    },
    amenities: ['WiFi', 'Cocktails', 'Live DJ', 'VIP Rooms', 'Valet Parking'],
    images: [
      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=2574&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?q=80&w=2574&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2670&auto=format&fit=crop'
    ],
    rating: 4.8,
    review_count: 342,
    is_active: true,
    vibe_tags: ['chill', 'luxury', 'romantic'],
    price_tier: 'premium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Cue Masters Pool Hall',
    description: 'Professional grade tables, great atmosphere, and cold drinks. The best place to shoot some pool in UB. We host weekly tournaments.',
    venue_type: 'pool_snooker',
    address: '5th Microdistrict',
    city: 'Ulaanbaatar',
    latitude: 47.9221,
    longitude: 106.8954,
    price_per_hour: 25000,
    phone: '+976 8811 4455',
    email: 'play@cuemasters.mn',
    opening_hours: {
      monday: { open: '12:00', close: '00:00' },
      tuesday: { open: '12:00', close: '00:00' },
      wednesday: { open: '12:00', close: '00:00' },
      thursday: { open: '12:00', close: '00:00' },
      friday: { open: '12:00', close: '02:00' },
      saturday: { open: '12:00', close: '02:00' },
      sunday: { open: '12:00', close: '00:00' },
    },
    amenities: ['Snooker Tables', '8-Ball', 'Bar', 'TV Screens', 'Darts'],
    images: [
      'https://images.unsplash.com/photo-1575365533358-d7e77b629c42?q=80&w=2670&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1575296505022-c5163a1c021a?q=80&w=2669&auto=format&fit=crop'
    ],
    rating: 4.5,
    review_count: 89,
    is_active: true,
    vibe_tags: ['energetic', 'sports'],
    price_tier: 'budget',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Melody Box Karaoke',
    description: 'Private luxury rooms with the latest sound systems and huge song selection. Sing your heart out in comfort and style.',
    venue_type: 'karaoke',
    address: 'Zaisan Hill Complex',
    city: 'Ulaanbaatar',
    latitude: 47.8912,
    longitude: 106.9033,
    price_per_hour: 60000,
    phone: '+976 7711 9900',
    email: 'book@melodybox.mn',
    opening_hours: {
        monday: { open: '14:00', close: '04:00' },
        tuesday: { open: '14:00', close: '04:00' },
        wednesday: { open: '14:00', close: '04:00' },
        thursday: { open: '14:00', close: '04:00' },
        friday: { open: '14:00', close: '06:00' },
        saturday: { open: '14:00', close: '06:00' },
        sunday: { open: '14:00', close: '04:00' },
    },
    amenities: ['Private Rooms', 'Food Service', 'Latest Songs', 'Wireless Mics', 'Tambourines'],
    images: [
      'https://images.unsplash.com/photo-1595159828557-69c277732a32?q=80&w=2670&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=2574&auto=format&fit=crop'
    ],
    rating: 4.2,
    review_count: 56,
    is_active: true,
    vibe_tags: ['party', 'family-friendly', 'energetic'],
    price_tier: 'moderate',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Urban Grind Cafe',
    description: 'A cozy spot for late night talks, board games, and artisanal coffee. The perfect chill spot away from the noise.',
    venue_type: 'cafe',
    address: 'Sukhbaatar Square',
    city: 'Ulaanbaatar',
    latitude: 47.9184,
    longitude: 106.9177,
    price_per_hour: 15000,
    phone: '+976 8080 1234',
    email: 'coffee@urbangrind.mn',
    opening_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '09:00', close: '22:00' },
    },
    amenities: ['WiFi', 'Board Games', 'Patio', 'Pet Friendly', 'Vegan Options'],
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2694&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=2670&auto=format&fit=crop'
    ],
    rating: 4.9,
    review_count: 210,
    is_active: true,
    vibe_tags: ['chill', 'romantic'],
    price_tier: 'budget',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Sky Garden Rooftop',
    description: 'Breathtaking views of the city skyline. Enjoy premium drinks and live jazz on our open-air terrace.',
    venue_type: 'lounge',
    address: 'Shangri-La Mall, 21st Floor',
    city: 'Ulaanbaatar',
    latitude: 47.9150,
    longitude: 106.9190,
    price_per_hour: 250000,
    phone: '+976 7777 8888',
    email: 'reservations@skygarden.mn',
    opening_hours: {
        monday: { open: '17:00', close: '00:00' },
        tuesday: { open: '17:00', close: '00:00' },
        wednesday: { open: '17:00', close: '00:00' },
        thursday: { open: '17:00', close: '01:00' },
        friday: { open: '17:00', close: '03:00' },
        saturday: { open: '17:00', close: '03:00' },
        sunday: { open: '17:00', close: '00:00' },
    },
    amenities: ['Rooftop View', 'Live Jazz', 'Signature Cocktails', 'Heated Terrace'],
    images: [
      'https://images.unsplash.com/photo-1519671482502-9759101d4561?q=80&w=2574&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1570560258879-af7f8e1447ac?q=80&w=2574&auto=format&fit=crop'
    ],
    rating: 4.7,
    review_count: 156,
    is_active: true,
    vibe_tags: ['rooftop', 'luxury', 'romantic', 'live-music'],
    price_tier: 'luxury',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Retro Arcade Bar',
    description: 'Nostalgia meets nightlife. Play classic arcade games while enjoying craft beers and retro-themed snacks.',
    venue_type: 'cafe', // Mapped to cafe/gaming category
    address: 'Beatles Square',
    city: 'Ulaanbaatar',
    latitude: 47.9175,
    longitude: 106.9155,
    price_per_hour: 20000,
    phone: '+976 9900 1122',
    email: 'play@retroarcade.mn',
    opening_hours: {
        monday: { open: '16:00', close: '00:00' },
        tuesday: { open: '16:00', close: '00:00' },
        wednesday: { open: '16:00', close: '00:00' },
        thursday: { open: '16:00', close: '02:00' },
        friday: { open: '16:00', close: '03:00' },
        saturday: { open: '14:00', close: '03:00' },
        sunday: { open: '14:00', close: '00:00' },
    },
    amenities: ['Arcade Games', 'Craft Beer', 'DJ', 'Snacks'],
    images: [
      'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=2671&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559163499-413811fb2344?q=80&w=2670&auto=format&fit=crop'
    ],
    rating: 4.6,
    review_count: 189,
    is_active: true,
    vibe_tags: ['energetic', 'fun', 'chill'],
    price_tier: 'moderate',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

interface VenueFilters {
  search?: string;
  venueType?: VenueType | 'all';
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Mock helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useVenues(filters?: VenueFilters) {
  return useQuery({
    queryKey: ['public-venues', filters],
    queryFn: async () => {
      // Simulate API call
      await delay(600);

      let data = [...MOCK_VENUES];

      // Client-side filtering simulation
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(v => 
          v.name.toLowerCase().includes(searchLower) || 
          v.description?.toLowerCase().includes(searchLower) ||
          v.city.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.venueType && filters.venueType !== 'all') {
        data = data.filter(v => v.venue_type === filters.venueType);
      }

      if (filters?.city) {
        data = data.filter(v => v.city.toLowerCase().includes(filters.city!.toLowerCase()));
      }

      if (filters?.minPrice !== undefined) {
        data = data.filter(v => v.price_per_hour! >= filters.minPrice!);
      }

      if (filters?.maxPrice !== undefined) {
        data = data.filter(v => v.price_per_hour! <= filters.maxPrice!);
      }

      return data as PublicVenue[];
    },
  });
}

export function useVenue(id: string | undefined) {
  return useQuery({
    queryKey: ['public-venue', id],
    queryFn: async () => {
      await delay(400);
      if (!id) return null;
      return MOCK_VENUES.find(v => v.id === id) as PublicVenue || null;
    },
    enabled: !!id,
  });
}

export function useFullVenue(id: string | undefined) {
  return useQuery({
    queryKey: ['venue', id],
    queryFn: async () => {
      await delay(400);
      if (!id) return null;
      return MOCK_VENUES.find(v => v.id === id) || null;
    },
    enabled: !!id,
  });
}

export function useAdminVenues() {
  return useQuery({
    queryKey: ['admin-venues'],
    queryFn: async () => {
      await delay(500);
      return [...MOCK_VENUES] as Venue[];
    },
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venue: Omit<Venue, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>) => {
      await delay(800);
      
      const newVenue: Venue = {
        ...venue,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rating: 0,
        review_count: 0,
        images: venue.images || [],
        amenities: venue.amenities || [],
        vibe_tags: venue.vibe_tags || [],
        price_tier: venue.price_tier || 'moderate',
        opening_hours: venue.opening_hours || null
      };
      
      MOCK_VENUES.unshift(newVenue);
      return newVenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...venue }: Partial<Venue> & { id: string }) => {
      await delay(500);
      
      const index = MOCK_VENUES.findIndex(v => v.id === id);
      if (index === -1) throw new Error('Venue not found');
      
      const updatedVenue = {
        ...MOCK_VENUES[index],
        ...venue,
        updated_at: new Date().toISOString()
      };
      
      MOCK_VENUES[index] = updatedVenue;
      return updatedVenue;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', data.id] });
      queryClient.invalidateQueries({ queryKey: ['public-venue', data.id] });
    },
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await delay(500);
      MOCK_VENUES = MOCK_VENUES.filter(v => v.id !== id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] });
      queryClient.invalidateQueries({ queryKey: ['public-venues'] });
    },
  });
}