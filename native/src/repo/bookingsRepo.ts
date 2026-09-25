import type { Reservation, ReservationCreateRequest, ReservationUpdateRequest } from '@trek/shared';
import { apiClient } from '../api/client';

// ─── Full Reservation API ────────────────────────────────────────────────────

export async function listReservations(tripId: number): Promise<Reservation[]> {
  const { data } = await apiClient.get<{ reservations: Reservation[] }>(
    `/trips/${tripId}/reservations`
  );
  return data.reservations ?? [];
}

export async function createReservation(
  tripId: number,
  body: ReservationCreateRequest
): Promise<Reservation> {
  const { data } = await apiClient.post<{ reservation: Reservation }>(
    `/trips/${tripId}/reservations`,
    body
  );
  return data.reservation;
}

export async function updateReservation(
  tripId: number,
  reservationId: number,
  body: ReservationUpdateRequest
): Promise<Reservation> {
  const { data } = await apiClient.put<{ reservation: Reservation }>(
    `/trips/${tripId}/reservations/${reservationId}`,
    body
  );
  return data.reservation;
}

export async function deleteReservation(
  tripId: number,
  reservationId: number
): Promise<boolean> {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/trips/${tripId}/reservations/${reservationId}`
  );
  return data.success;
}

// ─── Bookings Repo (clean interface for screens) ─────────────────────────────

/** Reservation types that represent transit/transport */
const TRANSPORT_TYPES = new Set([
  'flight',
  'train',
  'bus',
  'ferry',
  'car',
  'transit',
  'rideshare',
  'transport',
  'taxi',
  'rental_car',
]);

/** Reservation types that represent accommodation stays */
const STAY_TYPES = new Set(['accommodation', 'hotel', 'hostel', 'airbnb', 'stay', 'campsite']);

export function isTransport(r: Reservation): boolean {
  return TRANSPORT_TYPES.has(r.type);
}

export function isStay(r: Reservation): boolean {
  return STAY_TYPES.has(r.type);
}

export function isActivity(r: Reservation): boolean {
  return !isTransport(r) && !isStay(r);
}

export const bookingsRepo = {
  async list(tripId: number): Promise<Reservation[]> {
    return listReservations(tripId);
  },

  async create(tripId: number, body: ReservationCreateRequest): Promise<Reservation> {
    return createReservation(tripId, body);
  },

  async update(
    tripId: number,
    reservationId: number,
    body: ReservationUpdateRequest
  ): Promise<Reservation> {
    return updateReservation(tripId, reservationId, body);
  },

  async delete(tripId: number, reservationId: number): Promise<boolean> {
    return deleteReservation(tripId, reservationId);
  },

  async stays(tripId: number): Promise<Reservation[]> {
    const all = await listReservations(tripId);
    return all.filter(isStay);
  },

  async transports(tripId: number): Promise<Reservation[]> {
    const all = await listReservations(tripId);
    return all.filter(isTransport);
  },

  async activities(tripId: number): Promise<Reservation[]> {
    const all = await listReservations(tripId);
    return all.filter(isActivity);
  },
};
