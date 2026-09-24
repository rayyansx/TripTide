import type { Day, Place } from '@trek/shared';

export interface MapPoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

function point(id: number, name: string, lat: number | null | undefined, lng: number | null | undefined): MapPoint | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { id, name, lat, lng };
}

/** Places on the open day, in itinerary order. The whole trip when that day has no coordinates. */
export function pointsForMap(day: Day | null, places: Place[]): MapPoint[] {
  const assigned = [...(day?.assignments ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap((assignment) => {
      const next = point(assignment.place.id, assignment.place.name, assignment.place.lat, assignment.place.lng);
      return next ? [next] : [];
    });
  if (assigned.length > 0) return assigned;
  return places.flatMap((place) => {
    const next = point(place.id, place.name, place.lat, place.lng);
    return next ? [next] : [];
  });
}
