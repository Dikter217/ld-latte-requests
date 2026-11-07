import { describe, expect, it } from 'vitest';
import { filterRequests, getCounts, validateDraft } from '../src/lib/requests';
import type { RequestItem } from '../src/types';

const sample: RequestItem[] = [
  { id: 'a', user_id: 'u', title: 'Telegram Бот', description: 'a', category: 'bot', status: 'new', created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z' },
  { id: 'b', user_id: 'u', title: 'CRM интеграция', description: 'b', category: 'integration', status: 'in_progress', created_at: '2026-11-02T10:00:00Z', updated_at: '2026-11-02T10:00:00Z' },
  { id: 'c', user_id: 'u', title: 'Отчёт', description: 'c', category: 'report', status: 'completed', created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z' },
];

describe('фильтры и метрики', () => {
  it('считает все статусы', () => expect(getCounts(sample)).toEqual({ all: 3, new: 1, in_progress: 1, completed: 1 }));
  it('ищет по названию без учёта регистра', () => expect(filterRequests(sample, 'telegram', 'all').map((x) => x.id)).toEqual(['a']));
  it('сочетает поиск со статусом', () => expect(filterRequests(sample, 'crm', 'new')).toEqual([]));
  it('сортирует по дате', () => {
    expect(filterRequests(sample, '', 'all').map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(filterRequests(sample, '', 'all', 'oldest').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('валидация заявки', () => {
  const valid = { title: 'Новая заявка', description: 'Нужно создать бота', category: 'bot' as const, status: 'new' as const };
  it('принимает корректные данные', () => expect(validateDraft(valid)).toBeNull());
  it('не принимает пустое описание', () => expect(validateDraft({ ...valid, description: ' ' })).toBeTruthy());
  it('не принимает короткое название', () => expect(validateDraft({ ...valid, title: ' x ' })).toBeTruthy());
  it('не принимает слишком длинное название', () => expect(validateDraft({ ...valid, title: 'x'.repeat(121) })).toBeTruthy());
});
