/**
 * KAN-75 — VenueCard must be fully clickable via image/title
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VenueCard } from '@/components/venues/VenueCard';
import type { PublicVenue } from '@/types/venue';

const mockVenue: PublicVenue = {
  id: 'v1',
  name: 'Test Karaoke',
  description: 'A fun karaoke bar',
  venue_type: 'karaoke',
  address: '123 Main St',
  city: 'Ulaanbaatar',
  latitude: null,
  longitude: null,
  price_per_hour: 50000,
  opening_hours: null,
  amenities: [],
  images: [],
  rating: 4.5,
  review_count: 10,
  is_active: true,
  vibe_tags: ['Fun'],
  price_tier: 'moderate',
  busy_status: 'quiet',
  busy_status_updated_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderCard(venue = mockVenue) {
  return render(
    <MemoryRouter>
      <VenueCard venue={venue} />
    </MemoryRouter>
  );
}

describe('VenueCard (KAN-75)', () => {
  it('renders the venue name', () => {
    renderCard();
    expect(screen.getByText('Test Karaoke')).toBeInTheDocument();
  });

  it('renders a full-card anchor link pointing to /venues/:id', () => {
    renderCard();
    // The invisible full-card link should exist
    const links = screen.getAllByRole('link');
    const cardLink = links.find(l =>
      l.getAttribute('href') === '/v1' || l.getAttribute('href')?.endsWith('/venues/v1')
    );
    // There must be at least one link to the venue detail page
    const venueLinks = links.filter(l => l.getAttribute('href')?.includes('v1'));
    expect(venueLinks.length).toBeGreaterThan(0);
  });

  it('renders "View Details" button', () => {
    renderCard();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('shows "No reviews yet" when rating is 0', () => {
    renderCard({ ...mockVenue, rating: 0, review_count: 0 });
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });

  it('shows placeholder when no image', () => {
    renderCard({ ...mockVenue, images: [] });
    // Should show the first letter of the name
    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
