/**
 * KAN-70 — AdminVenue type extends Venue with owner_profile
 */
import { describe, it, expect } from 'vitest';
import type { AdminVenue } from '@/hooks/useVenues';

describe('AdminVenue type (KAN-70)', () => {
  it('AdminVenue can include owner_profile with full_name and email', () => {
    const av: AdminVenue = {
      id: 'v1',
      name: 'Test Venue',
      venue_type: 'lounge',
      address: '1 Main St',
      city: 'UB',
      description: null,
      latitude: null,
      longitude: null,
      price_per_hour: null,
      opening_hours: null,
      amenities: [],
      images: [],
      rating: null,
      review_count: 0,
      is_active: true,
      vibe_tags: [],
      price_tier: null,
      busy_status: null,
      busy_status_updated_at: null,
      phone: null,
      email: null,
      owner_id: 'user-1',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_profile: {
        full_name: 'John Doe',
        email: 'john@example.com',
      },
    };

    expect(av.owner_profile?.full_name).toBe('John Doe');
    expect(av.owner_profile?.email).toBe('john@example.com');
  });

  it('owner_profile is optional and can be null', () => {
    const av: AdminVenue = {
      id: 'v2',
      name: 'Unowned Venue',
      venue_type: 'cafe',
      address: '2 Main St',
      city: 'UB',
      description: null,
      latitude: null,
      longitude: null,
      price_per_hour: null,
      opening_hours: null,
      amenities: [],
      images: [],
      rating: null,
      review_count: 0,
      is_active: true,
      vibe_tags: [],
      price_tier: null,
      busy_status: null,
      busy_status_updated_at: null,
      phone: null,
      email: null,
      owner_id: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_profile: null,
    };

    expect(av.owner_profile).toBeNull();
  });
});
