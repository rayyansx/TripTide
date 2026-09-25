import axios from 'axios';

/**
 * Flight lookup service — resolves an IATA flight number (e.g. "BA117") to
 * basic schedule data using AviationStack's free tier. If no API key is
 * configured the function falls back to a structural parse of the flight
 * number alone (airline code + number) so callers always get a useful result.
 *
 * The free AviationStack tier gives 100 requests/month — enough for manual
 * flight number lookups. No key = parsed-only mode (still useful for pre-fill).
 *
 * Set EXPO_PUBLIC_AVIATIONSTACK_KEY in your .env to enable live data.
 */

export interface FlightLeg {
  flightNumber: string;
  airline: string | null;
  /** IATA departure airport code, e.g. "LHR" */
  from: string | null;
  fromName: string | null;
  /** IATA arrival airport code, e.g. "JFK" */
  to: string | null;
  toName: string | null;
  /** Scheduled departure local time, e.g. "09:00" */
  departureTime: string | null;
  /** Scheduled arrival local time */
  arrivalTime: string | null;
  terminal: string | null;
  gate: string | null;
  status: string | null;
}

interface AviationStackFlight {
  flight: { iata: string };
  airline: { name: string };
  departure: {
    iata: string;
    airport: string;
    scheduled: string | null;
    terminal: string | null;
    gate: string | null;
  };
  arrival: {
    iata: string;
    airport: string;
    scheduled: string | null;
    terminal: string | null;
    gate: string | null;
  };
  flight_status: string;
}

function parseTimeFromISO(iso: string | null): string | null {
  if (!iso) return null;
  // ISO: "2026-09-25T09:00:00+01:00"  -> "09:00"
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

/** Parses airline IATA code (2-3 chars) from a flight number string */
function parseAirlineCode(flightNumber: string): string {
  const match = flightNumber.trim().toUpperCase().match(/^([A-Z]{2,3})/);
  return match ? match[1] : '';
}

/** Offline structural parse — airline code extraction only, no network. */
function parseOnly(flightNumber: string): FlightLeg {
  const normalised = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
  return {
    flightNumber: normalised,
    airline: parseAirlineCode(normalised) || null,
    from: null,
    fromName: null,
    to: null,
    toName: null,
    departureTime: null,
    arrivalTime: null,
    terminal: null,
    gate: null,
    status: null,
  };
}

/**
 * Look up a flight number. Returns best-effort data — never throws.
 * With a valid API key and an active flight number this returns live times;
 * without a key (or on network failure) it returns a structurally-parsed stub.
 */
export async function lookupFlight(
  flightNumber: string,
  signal?: AbortSignal
): Promise<FlightLeg> {
  const apiKey = process.env.EXPO_PUBLIC_AVIATIONSTACK_KEY;
  const normalised = flightNumber.trim().toUpperCase().replace(/\s+/g, '');

  if (!apiKey) {
    return parseOnly(normalised);
  }

  try {
    const res = await axios.get<{ data: AviationStackFlight[] }>(
      'http://api.aviationstack.com/v1/flights',
      {
        params: { access_key: apiKey, flight_iata: normalised, limit: 1 },
        timeout: 7000,
        signal,
      }
    );

    const flight = res.data?.data?.[0];
    if (!flight) return parseOnly(normalised);

    return {
      flightNumber: normalised,
      airline: flight.airline?.name ?? null,
      from: flight.departure?.iata ?? null,
      fromName: flight.departure?.airport ?? null,
      to: flight.arrival?.iata ?? null,
      toName: flight.arrival?.airport ?? null,
      departureTime: parseTimeFromISO(flight.departure?.scheduled ?? null),
      arrivalTime: parseTimeFromISO(flight.arrival?.scheduled ?? null),
      terminal: flight.departure?.terminal ?? null,
      gate: flight.departure?.gate ?? null,
      status: flight.flight_status ?? null,
    };
  } catch {
    return parseOnly(normalised);
  }
}
