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

// -------------------------------------------------------------
// Finance & Bills
// -------------------------------------------------------------

export type TransactionType = 'income' | 'expense';
export type BillFrequency = 'monthly' | 'quarterly' | 'yearly' | 'weekly' | 'one_time';
export type BillStatus = 'active' | 'paused' | 'paid' | 'cancelled';

export interface Transaction {
  id: string;
  ownerId: string;
  type: TransactionType;
  amount: number;
  amountPaise: number;
  currency: string;
  category: string;
  description: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  ownerId: string;
  name: string;
  amount: number;
  amountPaise: number;
  currency: string;
  frequency: BillFrequency;
  nextDueAt: string;
  status: BillStatus;
  category: string;
  autopay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySpending {
  category: string;
  totalAmount: number;
  totalPaise: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  currency: string;
  categoryBreakdown: CategorySpending[];
  monthlyTrends: MonthlyTrend[];
  upcomingBillsTotal: number;
  activeBillsCount: number;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  currency?: string;
  category: string;
  description?: string;
  occurredAt?: string;
}

export interface CreateBillRequest {
  name: string;
  amount: number;
  currency?: string;
  frequency?: BillFrequency;
  nextDueAt: string;
  category?: string;
  autopay?: boolean;
}

// -------------------------------------------------------------
// Memories & Media Assets
// -------------------------------------------------------------

export interface MediaAsset {
  id: string;
  ownerId: string;
  albumId?: string | null;
  albumTitle?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string;
  takenAt?: string | null;
  tags: string[];
  createdAt: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface Album {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  eventDate?: string | null;
  tags: string[];
  coverMediaId?: string | null;
  mediaCount: number;
  media?: MediaAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineGroup {
  period: string;
  items: MediaAsset[];
}

export interface TimelineResponse {
  groups: TimelineGroup[];
  totalMedia: number;
}

export interface CreateAlbumRequest {
  title: string;
  description?: string;
  eventDate?: string | null;
  tags?: string[];
}

export type FamilyRole = 'admin' | 'member';
export type FamilyMemberStatus = 'pending' | 'accepted' | 'rejected';

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  email?: string | null;
  displayName?: string | null;
  role: FamilyRole;
  status: FamilyMemberStatus;
  invitedBy?: string | null;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  userRole: FamilyRole;
  memberCount: number;
  members: FamilyMember[];
}

export interface FamilyPendingInvite {
  id: string;
  familyId: string;
  familyName: string;
  invitedByEmail?: string | null;
  role: FamilyRole;
  createdAt: string;
}

export type ResourceType = 'item' | 'album';
export type SharePermission = 'view' | 'edit';

export interface ShareGrant {
  id: string;
  ownerId: string;
  ownerEmail?: string | null;
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle?: string | null;
  recipientUserId: string;
  recipientEmail?: string | null;
  permissions: SharePermission;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface SharedItem {
  id: string;
  ownerId: string;
  ownerEmail?: string | null;
  collectionId?: string | null;
  title: string;
  kind: string;
  description?: string | null;
  tags: string[];
  customFields: Record<string, any>;
  content?: string | null;
  url?: string | null;
  fileIds: string[];
  files: FileAsset[];
  permissions: SharePermission;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  outcome: 'success' | 'denied' | 'error';
  createdAt: string;
  metadata: Record<string, any>;
}

export interface AuditLogsListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}



