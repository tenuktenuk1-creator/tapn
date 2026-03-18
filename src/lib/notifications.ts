/**
 * Centralised notification creation helpers.
 * Call these from mutation onSuccess callbacks — they fire-and-forget
 * without blocking the caller.
 */
import { supabase } from '@/integrations/supabase/client';

export type NotificationType =
  // Booking
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_received'
  // Partner programme
  | 'partner_approved'
  | 'partner_rejected'
  | 'partner_submitted'
  // Venue
  | 'venue_approved'
  | 'venue_rejected'
  | 'venue_submitted';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/** Fire-and-forget: creates one notification row for a user. */
export async function createNotification(p: CreateNotificationParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id:     p.userId,
    type:        p.type,
    title:       p.title,
    message:     p.message,
    link:        p.link ?? null,
    entity_type: p.entityType ?? null,
    entity_id:   p.entityId ?? null,
  });
  if (error) {
    // Non-critical — log but never throw
    console.warn('[notifications] insert failed', error.message);
  }
}

// ─── Domain-specific helpers ──────────────────────────────────────────────────

export const notify = {
  bookingConfirmed(userId: string, venueName: string, bookingId: string) {
    return createNotification({
      userId,
      type:       'booking_confirmed',
      title:      'Booking Confirmed',
      message:    `Your booking at ${venueName} has been confirmed.`,
      link:       '/bookings',
      entityType: 'booking',
      entityId:   bookingId,
    });
  },

  bookingRejected(userId: string, venueName: string, bookingId: string) {
    return createNotification({
      userId,
      type:       'booking_rejected',
      title:      'Booking Not Approved',
      message:    `Your booking at ${venueName} was not approved.`,
      link:       '/bookings',
      entityType: 'booking',
      entityId:   bookingId,
    });
  },

  bookingCancelled(userId: string, venueName: string, bookingId: string) {
    return createNotification({
      userId,
      type:       'booking_cancelled',
      title:      'Booking Cancelled',
      message:    `Your booking at ${venueName} has been cancelled.`,
      link:       '/bookings',
      entityType: 'booking',
      entityId:   bookingId,
    });
  },

  /** Notify venue partner that a new booking arrived. */
  bookingReceived(partnerId: string, venueName: string, bookingId: string) {
    return createNotification({
      userId:     partnerId,
      type:       'booking_received',
      title:      'New Booking',
      message:    `A new booking request has arrived for ${venueName}.`,
      link:       '/partner/bookings',
      entityType: 'booking',
      entityId:   bookingId,
    });
  },

  partnerApproved(userId: string) {
    return createNotification({
      userId,
      type:    'partner_approved',
      title:   'Partner Request Approved',
      message: 'Congratulations! Your TAPN partner application has been approved.',
      link:    '/partner/dashboard',
    });
  },

  partnerRejected(userId: string) {
    return createNotification({
      userId,
      type:    'partner_rejected',
      title:   'Partner Request Not Approved',
      message: 'Your partner application was reviewed but not approved at this time.',
      link:    '/partner',
    });
  },

  venueApproved(userId: string, venueName: string, venueId: string) {
    return createNotification({
      userId,
      type:       'venue_approved',
      title:      'Venue Approved',
      message:    `Your venue "${venueName}" is now live on TAPN.`,
      link:       `/venues/${venueId}`,
      entityType: 'venue',
      entityId:   venueId,
    });
  },

  venueRejected(userId: string, venueName: string, venueId: string) {
    return createNotification({
      userId,
      type:       'venue_rejected',
      title:      'Venue Not Approved',
      message:    `Your venue "${venueName}" was not approved. Please review and resubmit.`,
      link:       '/partner/venues',
      entityType: 'venue',
      entityId:   venueId,
    });
  },
};
