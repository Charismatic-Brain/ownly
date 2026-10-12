import { apiClient } from './api';
import type {
  Collection,
  Item,
  ItemListResponse,
  Reminder,
  UpcomingDeadlinesResponse,
  CreateReminderRequest,
  UpdateReminderRequest,
  Transaction,
  Bill,
  FinanceSummary,
  CreateTransactionRequest,
  CreateBillRequest,
  Album,
  MediaAsset,
  TimelineResponse,
  CreateAlbumRequest,
  Family,
  FamilyMember,
  FamilyPendingInvite,
  ShareGrant,
  SharedItem,
  AuditLogsListResponse,
  SharePermission,
  ResourceType,
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

  // -----------------------------------------------------------
  // Finance & Bills
  // -----------------------------------------------------------
  getTransactions: (params?: { type?: string; category?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.append('type', params.type);
    if (params?.category) sp.append('category', params.category);
    if (params?.limit) sp.append('limit', String(params.limit));
    const qs = sp.toString();
    return apiClient<Transaction[]>(`/transactions${qs ? `?${qs}` : ''}`);
  },
  createTransaction: (data: CreateTransactionRequest) =>
    apiClient<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    apiClient<{ message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
  getBills: (params?: { status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    const qs = sp.toString();
    return apiClient<Bill[]>(`/bills${qs ? `?${qs}` : ''}`);
  },
  createBill: (data: CreateBillRequest) =>
    apiClient<Bill>('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  payBill: (id: string, createExpense: boolean = true) =>
    apiClient<Bill>(`/bills/${id}/pay?createExpense=${createExpense}`, {
      method: 'POST',
    }),
  deleteBill: (id: string) =>
    apiClient<{ message: string }>(`/bills/${id}`, {
      method: 'DELETE',
    }),
  getFinanceSummary: () => apiClient<FinanceSummary>('/finance/summary'),

  // -----------------------------------------------------------
  // Memories & Media Albums
  // -----------------------------------------------------------
  getAlbums: () => apiClient<Album[]>('/albums'),
  createAlbum: (data: CreateAlbumRequest) =>
    apiClient<Album>('/albums', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAlbum: (id: string) => apiClient<Album>(`/albums/${id}`),
  deleteAlbum: (id: string) =>
    apiClient<{ message: string }>(`/albums/${id}`, {
      method: 'DELETE',
    }),
  uploadMedia: async (
    albumId: string | null,
    file: File,
    caption?: string,
    takenAt?: string,
    tags?: string
  ): Promise<MediaAsset> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    if (takenAt) formData.append('takenAt', takenAt);
    if (tags) formData.append('tags', tags);

    const endpoint = albumId ? `/api/albums/${albumId}/media` : '/api/media/upload';
    const token = localStorage.getItem('ownly_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Failed to upload media');
    }
    return res.json();
  },
  getMediaTimeline: () => apiClient<TimelineResponse>('/media'),
  deleteMedia: (id: string) =>
    apiClient<{ message: string }>(`/media/${id}`, {
      method: 'DELETE',
    }),

  // -----------------------------------------------------------
  // Family Groups
  // -----------------------------------------------------------
  getFamilies: () => apiClient<Family[]>('/families'),
  createFamily: (name: string) =>
    apiClient<Family>('/families', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getFamily: (id: string) => apiClient<Family>(`/families/${id}`),
  getPendingFamilyInvites: () =>
    apiClient<FamilyPendingInvite[]>('/families/invites/pending'),
  inviteFamilyMember: (familyId: string, email: string, role: string = 'member') =>
    apiClient<FamilyMember>(`/families/${familyId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  respondFamilyInvite: (inviteId: string, status: 'accepted' | 'rejected') =>
    apiClient<FamilyMember>(`/families/invites/${inviteId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  removeFamilyMember: (familyId: string, targetUserId: string) =>
    apiClient<{ status: string; message: string }>(`/families/${familyId}/members/${targetUserId}`, {
      method: 'DELETE',
    }),

  // -----------------------------------------------------------
  // Granular Item / Resource Sharing
  // -----------------------------------------------------------
  createShare: (data: {
    resourceType: ResourceType;
    resourceId: string;
    recipientEmail: string;
    permissions?: SharePermission;
    expiresAt?: string | null;
  }) =>
    apiClient<ShareGrant>('/shares', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOutboundShares: () => apiClient<ShareGrant[]>('/shares/outbound'),
  getInboundShares: () => apiClient<ShareGrant[]>('/shares/inbound'),
  revokeShare: (shareId: string) =>
    apiClient<{ status: string; message: string }>(`/shares/${shareId}`, {
      method: 'DELETE',
    }),
  getSharedItem: (itemId: string) => apiClient<SharedItem>(`/shares/items/${itemId}`),

  // -----------------------------------------------------------
  // Security Audit Logs
  // -----------------------------------------------------------
  getAuditLogs: (params?: { action?: string; outcome?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.action) sp.append('action', params.action);
    if (params?.outcome) sp.append('outcome', params.outcome);
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    const qs = sp.toString();
    return apiClient<AuditLogsListResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },
};

