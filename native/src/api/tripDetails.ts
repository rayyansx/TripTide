import { apiClient } from './client';

export interface ReservationRow {
  id: number;
  title: string;
  type: string;
  status?: string;
  location?: string | null;
}

export interface BudgetRow {
  id: number;
  name: string;
  category: string;
  total_price: number;
  currency?: string | null;
}

export interface PackingRow {
  id: number;
  name: string;
  checked: number;
}

export interface FileRow {
  id: number;
  original_name?: string | null;
  filename?: string | null;
}

export interface NoteRow {
  id: number;
  title?: string | null;
  content?: string | null;
}

export interface MessageRow {
  id: number;
  text?: string | null;
  username?: string | null;
}

export async function listReservations(tripId: number): Promise<ReservationRow[]> {
  const { data } = await apiClient.get<{ reservations: ReservationRow[] }>(`/trips/${tripId}/reservations`);
  return data.reservations ?? [];
}

export async function listBudget(tripId: number): Promise<BudgetRow[]> {
  const { data } = await apiClient.get<{ items: BudgetRow[] }>(`/trips/${tripId}/budget`);
  return data.items ?? [];
}

export async function listPacking(tripId: number): Promise<PackingRow[]> {
  const { data } = await apiClient.get<{ items: PackingRow[] }>(`/trips/${tripId}/packing`);
  return data.items ?? [];
}

export async function listFiles(tripId: number): Promise<FileRow[]> {
  const { data } = await apiClient.get<{ files: FileRow[] }>(`/trips/${tripId}/files`);
  return data.files ?? [];
}

export async function listNotes(tripId: number): Promise<NoteRow[]> {
  const { data } = await apiClient.get<{ notes: NoteRow[] }>(`/trips/${tripId}/collab/notes`);
  return data.notes ?? [];
}

export async function listMessages(tripId: number): Promise<MessageRow[]> {
  const { data } = await apiClient.get<{ messages: MessageRow[] }>(`/trips/${tripId}/collab/messages`);
  return data.messages ?? [];
}
