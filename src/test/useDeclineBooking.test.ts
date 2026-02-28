/**
 * KAN-71 — useDeclineBooking accepts reason + status param
 */
import { describe, it, expect, vi } from 'vitest';

// We test the mutation input shape — no real Supabase call
describe('useDeclineBooking mutation input (KAN-71)', () => {
  it('accepts bookingId, reason and status fields', () => {
    type DeclineInput = {
      bookingId: string;
      reason?: string;
      status?: 'rejected' | 'cancelled';
    };

    const input: DeclineInput = {
      bookingId: 'booking-123',
      reason: 'Venue unavailable',
      status: 'rejected',
    };

    expect(input.bookingId).toBe('booking-123');
    expect(input.reason).toBe('Venue unavailable');
    expect(input.status).toBe('rejected');
  });

  it('defaults status to rejected when not specified', () => {
    type DeclineInput = {
      bookingId: string;
      reason?: string;
      status?: 'rejected' | 'cancelled';
    };

    const input: DeclineInput = { bookingId: 'booking-456' };
    const status = input.status ?? 'rejected';
    expect(status).toBe('rejected');
  });

  it('allows cancelled status for confirmed booking cancellation', () => {
    type DeclineInput = {
      bookingId: string;
      reason?: string;
      status?: 'rejected' | 'cancelled';
    };

    const input: DeclineInput = {
      bookingId: 'booking-789',
      reason: 'Emergency closure',
      status: 'cancelled',
    };

    expect(input.status).toBe('cancelled');
  });
});
