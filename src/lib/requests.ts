import type { Category, RequestDraft, RequestItem, RequestStatus, StatusFilter } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  bot: 'Бот',
  integration: 'Интеграция',
  report: 'Отчёт',
  other: 'Другое',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Завершена',
};

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Все статусы',
  ...STATUS_LABELS,
};

export interface RequestCounts {
  all: number;
  new: number;
  in_progress: number;
  completed: number;
}

export function getCounts(items: RequestItem[]): RequestCounts {
  return items.reduce<RequestCounts>((counts, item) => {
    counts.all += 1;
    counts[item.status] += 1;
    return counts;
  }, { all: 0, new: 0, in_progress: 0, completed: 0 });
}

export function filterRequests(
  items: RequestItem[],
  query: string,
  status: StatusFilter,
  sortOrder: 'newest' | 'oldest' = 'newest',
): RequestItem[] {
  const normalized = query.trim().toLocaleLowerCase('ru');
  return items
    .filter((item) =>
      (status === 'all' || item.status === status) &&
      (!normalized || item.title.toLocaleLowerCase('ru').includes(normalized)),
    )
    .sort((a, b) => sortOrder === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function validateDraft(draft: RequestDraft): string | null {
  if (draft.title.trim().length < 3) return 'Название должно содержать не менее 3 символов.';
  if (draft.title.trim().length > 120) return 'Название не должно превышать 120 символов.';
  if (!draft.description.trim()) return 'Добавьте описание заявки.';
  if (draft.description.trim().length > 2000) return 'Описание не должно превышать 2000 символов.';
  return null;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function categoryInitial(category: Category): string {
  const initials: Record<Category, string> = {
    bot: 'Б', integration: 'И', report: 'О', other: 'Д',
  };
  return initials[category];
}
