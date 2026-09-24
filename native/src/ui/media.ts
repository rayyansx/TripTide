import { API_BASE_URL } from '../config';

/** Trip covers arrive as absolute URLs, root paths, or storage keys. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/uploads/${path}`;
}
