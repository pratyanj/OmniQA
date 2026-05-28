// ─── Bug Status ───────────────────────────────────────────────────────────
export type BugStatus =
  | 'new' | 'triaged' | 'assigned' | 'in_development'
  | 'ready_for_qa' | 'verified' | 'reopened' | 'closed'
  | 'rejected' | 'duplicate' | 'cannot_reproduce' | 'deferred';

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low' | 'cosmetic';
export type BugPriority  = 'p0' | 'p1' | 'p2' | 'p3';
export type BugType      =
  | 'functional' | 'ui' | 'performance' | 'crash'
  | 'security' | 'data_loss' | 'database' | 'api' | 'regression';
export type Platform     = 'windows' | 'android' | 'ios' | 'web' | 'macos' | 'linux';
export type Environment  = 'production' | 'staging' | 'qa' | 'development';
export type UserRole     = 'qa_tester' | 'developer' | 'qa_lead' | 'manager' | 'admin';

// ─── Entities ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  initials: string;
  color: string; // avatar bg color
  department: string;
}

export interface Comment {
  id: string;
  bugId: string;
  userId: string;
  text: string;
  timestamp: string;
  edited?: boolean;
}

export interface BugHistoryEntry {
  id: string;
  bugId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  timestamp: string;
  action: 'created' | 'updated' | 'status_changed' | 'commented' | 'assigned' | 'verified' | 'reopened' | 'attachment_added';
  description: string;
}

export interface Attachment {
  id: string;
  bugId: string;
  type: 'image' | 'video' | 'log' | 'pdf' | 'csv' | 'other';
  name: string;
  size: number;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
  mimeType: string;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  appVersion?: string;
  url?: string;
  deviceLogs?: string; // stack trace/console logs
  operatorName?: string; // user agent or tester details
}

export interface DeveloperInfo {
  assignedTo?: string;
  estimatedFixTime?: string;
  branchName?: string;
  commitId?: string;
  pullRequestLink?: string;
}

export interface QAVerification {
  fixVersion?: string;
  buildNumber?: string;
  testNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reopenReason?: string;
  reopenedBy?: string;
  reopenedAt?: string;
}

export interface Bug {
  id: string;
  title: string;
  bugId: string;         // BUG-2026-00124
  projectId: string;
  status: BugStatus;
  severity: BugSeverity;
  priority: BugPriority;
  type: BugType;
  environment: Environment;
  platform: Platform;
  affectedVersion: string;
  description?: string;

  // Reproduction
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;

  // People
  reportedBy: string;
  assignedTo?: string;

  // Sub-objects
  deviceInfo: DeviceInfo;
  developerInfo: DeveloperInfo;
  qaVerification: QAVerification;

  // Relations
  relatedBugIds: string[];
  attachments: Attachment[];
  comments: Comment[];
  history: BugHistoryEntry[];

  tags: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  dueDate?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client: string;
  repoLink?: string;
  environment: Environment;
  currentVersion: string;
  qaLead: string;
  teamMembers: string[];
  status: 'active' | 'inactive' | 'archived';
  color: string;
  icon: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'bug_assigned' | 'bug_reopened' | 'verification_failed' | 'comment_added' | 'critical_bug' | 'status_changed';
  title: string;
  message: string;
  bugId?: string;
  read: boolean;
  timestamp: string;
}

export interface BugFilters {
  search: string;
  status: BugStatus[];
  severity: BugSeverity[];
  priority: BugPriority[];
  type: BugType[];
  projectId: string;
  assignedTo: string;
  platform: Platform[];
  dateRange: { from?: string; to?: string };
}

// ─── Label / Color Maps ────────────────────────────────────────────────────
export const STATUS_LABELS: Record<BugStatus, string> = {
  new:              'New',
  triaged:          'Triaged',
  assigned:         'Assigned',
  in_development:   'In Development',
  ready_for_qa:     'Ready for QA',
  verified:         'Verified',
  reopened:         'Reopened',
  closed:           'Closed',
  rejected:         'Rejected',
  duplicate:        'Duplicate',
  cannot_reproduce: 'Cannot Reproduce',
  deferred:         'Deferred',
};

export const STATUS_COLORS: Record<BugStatus, string> = {
  new:              '#2563eb',
  triaged:          '#8b5cf6',
  assigned:         '#3b82f6',
  in_development:   '#f97316',
  ready_for_qa:     '#eab308',
  verified:         '#22c55e',
  reopened:         '#ef4444',
  closed:           '#475569',
  rejected:         '#475569',
  duplicate:        '#475569',
  cannot_reproduce: '#6b7280',
  deferred:         '#6b7280',
};

export const SEVERITY_COLORS: Record<BugSeverity, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#3b82f6',
  cosmetic: '#8b5cf6',
};

export const SEVERITY_LABELS: Record<BugSeverity, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  cosmetic: 'Cosmetic',
};

export const PRIORITY_LABELS: Record<BugPriority, string> = {
  p0: 'P0 – Immediate',
  p1: 'P1 – High',
  p2: 'P2 – Medium',
  p3: 'P3 – Low',
};

export const PRIORITY_COLORS: Record<BugPriority, string> = {
  p0: '#ef4444',
  p1: '#f97316',
  p2: '#eab308',
  p3: '#6b7280',
};

export const BUG_TYPE_LABELS: Record<BugType, string> = {
  functional:   'Functional',
  ui:           'UI',
  performance:  'Performance',
  crash:        'Crash',
  security:     'Security',
  data_loss:    'Data Loss',
  database:     'Database',
  api:          'API',
  regression:   'Regression',
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  windows:  'Windows',
  android:  'Android',
  ios:      'iOS',
  web:      'Web',
  macos:    'macOS',
  linux:    'Linux',
};

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  production:  'Production',
  staging:     'Staging',
  qa:          'QA',
  development: 'Development',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  qa_tester:  'QA Tester',
  developer:  'Developer',
  qa_lead:    'QA Lead',
  manager:    'Manager',
  admin:      'Admin',
};

// ─── Status flow: which statuses can you transition to from current? ────────
export const BUG_STATUS_FLOW: Record<BugStatus, BugStatus[]> = {
  new:              ['triaged', 'rejected', 'duplicate'],
  triaged:          ['assigned', 'rejected', 'deferred'],
  assigned:         ['in_development', 'cannot_reproduce', 'deferred'],
  in_development:   ['ready_for_qa', 'cannot_reproduce'],
  ready_for_qa:     ['verified', 'reopened'],
  verified:         ['closed', 'reopened'],
  reopened:         ['in_development', 'assigned'],
  closed:           [],
  rejected:         [],
  duplicate:        [],
  cannot_reproduce: ['assigned', 'closed'],
  deferred:         ['assigned', 'closed'],
};

// Ordered lifecycle steps (for the stepper)
export const STATUS_LIFECYCLE: BugStatus[] = [
  'new', 'triaged', 'assigned', 'in_development', 'ready_for_qa', 'verified', 'closed',
];
