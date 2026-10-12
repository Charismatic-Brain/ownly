export interface UserSettings {
  timezone: string;
  theme: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ApiError {
  detail: string;
}

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: string;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  icon: string;
  parentId?: string | null;
  fieldDefinitions: CustomFieldDefinition[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ItemKind = 'note' | 'link' | 'record' | 'file';

export interface FileAsset {
  id: string;
  ownerId: string;
  itemId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storage: string;
  uploadedAt: string;
  deletedAt?: string | null;
}

export interface Item {
  id: string;
  ownerId: string;
  collectionId?: string | null;
  title: string;
  kind: ItemKind;
  description: string;
  tags: string[];
  customFields: Record<string, any>;
  content?: string | null;
  url?: string | null;
  fileIds: string[];
  files?: FileAsset[];
  favorite: boolean;
  eventDate?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ItemListResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KindBreakdown {
  kind: string;
  count: number;
}

export interface TopCollectionStat {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  totalFiles: number;
  totalFavorites: number;
  expiringSoonCount: number;
  breakdownByKind: KindBreakdown[];
  topCollections: TopCollectionStat[];
  upcomingExpiries: Item[];
  recentItems: Item[];
}

export interface SearchResultResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query?: string | null;
}

export type ReminderStatus = 'pending' | 'completed' | 'snoozed' | 'dismissed';
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Reminder {
  id: string;
  ownerId: string;
  itemId?: string | null;
  itemTitle?: string | null;
  itemKind?: string | null;
  title: string;
  description: string;
  remindAt: string;
  status: ReminderStatus;
  priority: ReminderPriority;
  channel: string;
  snoozedUntil?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineItem {
  kind: 'reminder' | 'document_expiry';
  id: string;
  title: string;
  description: string;
  deadlineDate: string;
  daysUntil: number;
  category: 'overdue' | 'today' | 'this_week' | 'upcoming';
  priority?: ReminderPriority;
  status?: ReminderStatus;
  itemId?: string | null;
  itemKind?: string | null;
}

export interface UpcomingDeadlinesResponse {
  overdue: DeadlineItem[];
  today: DeadlineItem[];
  thisWeek: DeadlineItem[];
  upcoming: DeadlineItem[];
  totalActive: number;
}

export interface CreateReminderRequest {
  title: string;
  itemId?: string | null;
  description?: string;
  remindAt: string;
  priority?: ReminderPriority;
  channel?: 'in_app' | 'email';
}

export interface UpdateReminderRequest {
  title?: string;
  itemId?: string | null;
  description?: string;
  remindAt?: string;
  status?: ReminderStatus;
  priority?: ReminderPriority;
  snoozedUntil?: string | null;
}

