import type {
  Assignment,
  AssignmentCreateRequest,
  AssignmentMoveRequest,
  AssignmentNotesRequest,
  AssignmentTimeRequest,
  Day,
  DayCreateRequest,
  DayUpdateRequest,
  Place,
  PlaceCreateRequest,
  PlaceUpdateRequest,
} from '@trek/shared';
import { apiClient } from './client';

// ----------------- DAYS -----------------

export async function listDays(tripId: number): Promise<Day[]> {
  const { data } = await apiClient.get<{ days: Day[] }>(`/trips/${tripId}/days`);
  return data.days;
}

export async function createDay(tripId: number, body: DayCreateRequest = {}): Promise<Day> {
  const { data } = await apiClient.post<{ day: Day }>(`/trips/${tripId}/days`, body);
  return data.day;
}

export async function updateDay(tripId: number, dayId: number, body: DayUpdateRequest): Promise<Day> {
  const { data } = await apiClient.put<{ day: Day }>(`/trips/${tripId}/days/${dayId}`, body);
  return data.day;
}

export async function reorderDays(tripId: number, orderedIds: number[]): Promise<boolean> {
  const { data } = await apiClient.put<{ success: boolean }>(`/trips/${tripId}/days/reorder`, { orderedIds });
  return data.success;
}

export async function deleteDay(tripId: number, dayId: number): Promise<boolean> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/trips/${tripId}/days/${dayId}`);
  return data.success;
}

// ----------------- PLACES -----------------

export async function listPlaces(
  tripId: number,
  params?: { search?: string; category?: string; tag?: string }
): Promise<Place[]> {
  const { data } = await apiClient.get<{ places: Place[] }>(`/trips/${tripId}/places`, { params });
  return data.places;
}

export async function getPlace(tripId: number, placeId: number): Promise<Place> {
  const { data } = await apiClient.get<{ place: Place }>(`/trips/${tripId}/places/${placeId}`);
  return data.place;
}

export async function createPlace(tripId: number, body: PlaceCreateRequest): Promise<Place> {
  const { data } = await apiClient.post<{ place: Place }>(`/trips/${tripId}/places`, body);
  return data.place;
}

export async function updatePlace(tripId: number, placeId: number, body: PlaceUpdateRequest): Promise<Place> {
  const { data } = await apiClient.put<{ place: Place }>(`/trips/${tripId}/places/${placeId}`, body);
  return data.place;
}

export async function deletePlace(tripId: number, placeId: number): Promise<boolean> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/trips/${tripId}/places/${placeId}`);
  return data.success;
}

// ----------------- ASSIGNMENTS (STOPS ON DAYS) -----------------

export async function listAssignments(tripId: number, dayId: number): Promise<Assignment[]> {
  const { data } = await apiClient.get<{ assignments: Assignment[] }>(`/trips/${tripId}/days/${dayId}/assignments`);
  return data.assignments;
}

export async function createAssignment(
  tripId: number,
  dayId: number,
  body: AssignmentCreateRequest
): Promise<Assignment> {
  const { data } = await apiClient.post<{ assignment: Assignment }>(
    `/trips/${tripId}/days/${dayId}/assignments`,
    body
  );
  return data.assignment;
}

export async function reorderAssignments(
  tripId: number,
  dayId: number,
  orderedIds: number[]
): Promise<boolean> {
  const { data } = await apiClient.put<{ success: boolean }>(
    `/trips/${tripId}/days/${dayId}/assignments/reorder`,
    { orderedIds }
  );
  return data.success;
}

export async function deleteAssignment(
  tripId: number,
  dayId: number,
  assignmentId: number
): Promise<boolean> {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/trips/${tripId}/days/${dayId}/assignments/${assignmentId}`
  );
  return data.success;
}

export async function moveAssignment(
  tripId: number,
  assignmentId: number,
  body: AssignmentMoveRequest
): Promise<Assignment> {
  const { data } = await apiClient.put<{ assignment: Assignment }>(
    `/trips/${tripId}/assignments/${assignmentId}/move`,
    body
  );
  return data.assignment;
}

export async function updateAssignmentTime(
  tripId: number,
  assignmentId: number,
  body: AssignmentTimeRequest
): Promise<Assignment> {
  const { data } = await apiClient.put<{ assignment: Assignment }>(
    `/trips/${tripId}/assignments/${assignmentId}/time`,
    body
  );
  return data.assignment;
}

export async function updateAssignmentNotes(
  tripId: number,
  assignmentId: number,
  body: AssignmentNotesRequest
): Promise<void> {
  await apiClient.put(`/trips/${tripId}/assignments/${assignmentId}/notes`, body);
}
