import { apiClient } from './api';
import type {
  Collection,
  Item,
  ItemListResponse,
  Reminder,
  UpcomingDeadlinesResponse,
  CreateReminderRequest,
  UpdateReminderRequest
} from '../types';

export interface CreateCollectionDto {
  name: string;
  description?: string;
  icon?: string;
  parentId?: string | null;
}

export interface CreateItemDto {
  title: string;
  kind: 'note' | 'link' | 'record' | 'file';
  description?: string;
  collectionId?: string | null;
  tags?: string[];
  customFields?: Record<string, any>;
  content?: string | null;
  url?: string | null;
  favorite?: boolean;
  eventDate?: string | null;
  expiresAt?: string | null;
}

export interface ItemFilterParams {
  collectionId?: string | null;
  kind?: string | null;
  favorite?: boolean | null;
  tag?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export const vaultApi = {
  // Collections
  getCollections: () => apiClient<Collection[]>('/collections'),
  getCollection: (id: string) => apiClient<Collection>(`/collections/${id}`),
  createCollection: (data: CreateCollectionDto) =>
    apiClient<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCollection: (id: string, data: Partial<CreateCollectionDto>) =>
    apiClient<Collection>(`/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCollection: (id: string) =>
    apiClient<{ message: string }>(`/collections/${id}`, {
      method: 'DELETE',
    }),

  // Items
  getItems: (params: ItemFilterParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.collectionId !== undefined && params.collectionId !== null) {
      searchParams.append('collectionId', params.collectionId);
    }
    if (params.kind) searchParams.append('kind', params.kind);
    if (params.favorite !== undefined && params.favorite !== null) {
      searchParams.append('favorite', String(params.favorite));
    }
    if (params.tag) searchParams.append('tag', params.tag);
    if (params.search) searchParams.append('search', params.search);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    return apiClient<ItemListResponse>(`/items${qs ? `?${qs}` : ''}`);
  },
  getItem: (id: string) => apiClient<Item>(`/items/${id}`),
  createItem: (data: CreateItemDto) =>
    apiClient<Item>('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateItem: (id: string, data: Partial<CreateItemDto>) =>
    apiClient<Item>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  toggleFavorite: (id: string) =>
    apiClient<Item>(`/items/${id}/favorite`, {
      method: 'POST',
    }),
  deleteItem: (id: string) =>
    apiClient<{ message: string }>(`/items/${id}`, {
      method: 'DELETE',
    }),
  restoreItem: (id: string) =>
    apiClient<Item>(`/items/${id}/restore`, {
      method: 'POST',
    }),

  // Files
  uploadDirectFile: async (formData: FormData) => {
    const token = localStorage.getItem('ownly_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to upload file');
    }
    return response.json();
  },

  uploadAttachment: async (itemId: string, formData: FormData) => {
    const token = localStorage.getItem('ownly_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`/api/items/${itemId}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to attach file');
    }
    return response.json();
  },

  downloadFile: async (fileId: string, filename: string, preview = false) => {
    const token = localStorage.getItem('ownly_token');
    const response = await fetch(
      `/api/files/${fileId}/download${preview ? '?preview=true' : ''}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    if (preview) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 15000);
  },

  deleteFile: (fileId: string) =>
    apiClient<{ message: string }>(`/files/${fileId}`, {
      method: 'DELETE',
    }),

  // Dashboard Aggregations
  getDashboardStats: () => apiClient<import('../types').DashboardStats>('/dashboard/stats'),

  // Universal Search
  search: (params: {
    q?: string;
    kind?: string;
    collectionId?: string;
    tag?: string;
    favorite?: boolean;
    expiringSoon?: boolean;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.kind) searchParams.append('kind', params.kind);
    if (params.collectionId) searchParams.append('collectionId', params.collectionId);
    if (params.tag) searchParams.append('tag', params.tag);
    if (params.favorite !== undefined) searchParams.append('favorite', String(params.favorite));
    if (params.expiringSoon) searchParams.append('expiringSoon', 'true');
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));

    const qs = searchParams.toString();
    return apiClient<import('../types').SearchResultResponse>(`/search${qs ? `?${qs}` : ''}`);
  },

  // Trash
  getTrash: () => apiClient<Item[]>('/trash'),
  permanentlyDeleteItem: (itemId: string) =>
    apiClient<{ message: string }>(`/items/${itemId}/permanent`, {
      method: 'DELETE',
    }),
  emptyTrash: () =>
    apiClient<{ message: string }>('/trash/empty', {
      method: 'DELETE',
    }),

  // Reminders & Life Dates
  getReminders: (params?: { status?: string; itemId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.itemId) sp.append('itemId', params.itemId);
    const qs = sp.toString();
    return apiClient<Reminder[]>(`/reminders${qs ? `?${qs}` : ''}`);
  },
  createReminder: (data: CreateReminderRequest) =>
    apiClient<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReminder: (id: string) => apiClient<Reminder>(`/reminders/${id}`),
  updateReminder: (id: string, data: UpdateReminderRequest) =>
    apiClient<Reminder>(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteReminder: (id: string) =>
    apiClient<{ message: string }>(`/reminders/${id}`, {
      method: 'DELETE',
    }),
  getUpcomingDeadlines: (days: number = 30) =>
    apiClient<UpcomingDeadlinesResponse>(`/reminders/upcoming?days=${days}`),
};

