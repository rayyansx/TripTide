import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../config';
import { apiClient, postMultipart } from './client';
import { getToken } from './tokenStore';

export interface TripFileRow {
  id: number;
  trip_id: number;
  filename: string;
  original_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  description?: string | null;
  starred?: number;
  created_at?: string;
  url?: string;
}

const CACHE_DIR = `${FileSystem.documentDirectory}trek_files/`;

/**
 * Ensures the offline file storage directory exists.
 */
async function ensureCacheDir(tripId: number): Promise<string> {
  const dir = `${CACHE_DIR}${tripId}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export const filesPipeline = {
  /**
   * List all files for a trip.
   */
  async listFiles(tripId: number): Promise<TripFileRow[]> {
    const { data } = await apiClient.get<{ files: TripFileRow[] }>(`/trips/${tripId}/files`);
    return data.files ?? [];
  },

  /**
   * Pick and upload a document (PDF, DOCX, TXT, etc.) using expo-document-picker.
   */
  async pickAndUploadDocument(
    tripId: number,
    description?: string
  ): Promise<TripFileRow | null> {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return null;
    }

    const asset = res.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
    } as unknown as Blob);

    if (description) {
      formData.append('description', description);
    }

    const { file } = await postMultipart<{ file: TripFileRow }>(
      `/trips/${tripId}/files`,
      formData
    );
    return file;
  },

  /**
   * Pick and upload a photo/image from device camera roll using expo-image-picker.
   */
  async pickAndUploadImage(
    tripId: number,
    description?: string
  ): Promise<TripFileRow | null> {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return null;
    }

    const asset = res.assets[0];
    const filename = asset.fileName || `photo_${Date.now()}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    if (description) {
      formData.append('description', description);
    }

    const { file } = await postMultipart<{ file: TripFileRow }>(
      `/trips/${tripId}/files`,
      formData
    );
    return file;
  },

  /**
   * Check if a file is already downloaded and cached locally.
   */
  async getLocalCachedUri(tripId: number, filename: string): Promise<string | null> {
    try {
      const dir = `${CACHE_DIR}${tripId}/`;
      const localUri = `${dir}${filename}`;
      const info = await FileSystem.getInfoAsync(localUri);
      return info.exists ? localUri : null;
    } catch {
      return null;
    }
  },

  /**
   * Download a file from server and cache it locally for offline reading.
   */
  async downloadAndCacheFile(tripId: number, file: TripFileRow): Promise<string> {
    const dir = await ensureCacheDir(tripId);
    const localUri = `${dir}${file.filename}`;

    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      return localUri;
    }

    const token = await getToken();
    const downloadUrl = `${API_BASE_URL}/api/trips/${tripId}/files/${file.id}/download`;

    const downloadRes = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return downloadRes.uri;
  },

  /**
   * Toggle starred status of a file.
   */
  async toggleStarred(tripId: number, fileId: number): Promise<boolean> {
    const { data } = await apiClient.put<{ file: TripFileRow }>(
      `/trips/${tripId}/files/${fileId}/star`
    );
    return !!data.file.starred;
  },

  /**
   * Soft-delete a file.
   */
  async deleteFile(tripId: number, fileId: number): Promise<boolean> {
    await apiClient.delete(`/trips/${tripId}/files/${fileId}`);
    return true;
  },
};
