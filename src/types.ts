export const CATEGORIES = ['bot', 'integration', 'report', 'other'] as const;
export const STATUSES = ['new', 'in_progress', 'completed'] as const;

export type Category = (typeof CATEGORIES)[number];
export type RequestStatus = (typeof STATUSES)[number];
export type StatusFilter = RequestStatus | 'all';

export interface RequestItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface RequestDraft {
  title: string;
  description: string;
  category: Category;
  status: RequestStatus;
}
