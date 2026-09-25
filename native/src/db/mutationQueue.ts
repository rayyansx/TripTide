import NetInfo from '@react-native-community/netinfo';
import { getNativeDb } from './nativeDb';
import { apiClient } from '../api/client';

export type MutationStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface Mutation {
  id: string;
  tripId?: number;
  status: MutationStatus;
  data: {
    method: 'post' | 'put' | 'delete' | 'patch';
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
  };
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Inserts a mutation into the local queue.
 */
export async function queueMutation(tripId: number | undefined, data: Mutation['data']): Promise<string> {
  const db = await getNativeDb();
  const id = generateUuid();
  await db.runAsync(
    'INSERT INTO mutationQueue (id, trip_id, status, data) VALUES (?, ?, ?, ?)',
    id,
    tripId ?? null,
    'pending',
    JSON.stringify(data)
  );
  return id;
}

/**
 * Retrieves all mutations with a specific status.
 */
export async function getMutationsByStatus(status: MutationStatus): Promise<Mutation[]> {
  const db = await getNativeDb();
  const rows = await db.getAllAsync<{ id: string; trip_id: number | null; status: MutationStatus; data: string }>(
    'SELECT * FROM mutationQueue WHERE status = ?',
    status
  );
  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id ?? undefined,
    status: row.status,
    data: JSON.parse(row.data),
  }));
}

/**
 * Updates the status of a mutation in the queue.
 */
export async function updateMutationStatus(id: string, status: MutationStatus): Promise<void> {
  const db = await getNativeDb();
  await db.runAsync('UPDATE mutationQueue SET status = ? WHERE id = ?', status, id);
}

/**
 * Removes a mutation from the queue.
 */
export async function removeMutation(id: string): Promise<void> {
  const db = await getNativeDb();
  await db.runAsync('DELETE FROM mutationQueue WHERE id = ?', id);
}

/**
 * Clears all mutations for a specific trip.
 */
export async function clearMutationsForTrip(tripId: number): Promise<void> {
  const db = await getNativeDb();
  await db.runAsync('DELETE FROM mutationQueue WHERE trip_id = ?', tripId);
}

let isSyncing = false;

/**
 * Process the mutation queue when the app comes back online.
 */
export async function syncMutations(): Promise<void> {
  if (isSyncing) return;
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  isSyncing = true;

  try {
    const pendingMutations = await getMutationsByStatus('pending');
    for (const mutation of pendingMutations) {
      await updateMutationStatus(mutation.id, 'syncing');

      try {
        const { method, url, body, headers } = mutation.data;
        const reqHeaders = {
           ...headers,
           'X-Idempotency-Key': mutation.id,
        };

        if (method === 'delete') {
          await apiClient.delete(url, { headers: reqHeaders });
        } else if (method === 'post') {
          await apiClient.post(url, body, { headers: reqHeaders });
        } else if (method === 'put') {
          await apiClient.put(url, body, { headers: reqHeaders });
        } else if (method === 'patch') {
          await apiClient.patch(url, body, { headers: reqHeaders });
        }

        await removeMutation(mutation.id);
      } catch (e) {
        await updateMutationStatus(mutation.id, 'failed');
      }
    }
  } finally {
    isSyncing = false;
  }
}

// Setup a listener for network state changes
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncMutations().catch(console.error);
  }
});
