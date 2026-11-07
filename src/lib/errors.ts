export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Неизвестная ошибка');
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Неверный email или пароль.';
  if (message.includes('email not confirmed')) return 'Подтвердите email по ссылке из письма.';
  if (message.includes('user already registered')) return 'Пользователь с таким email уже зарегистрирован.';
  if (message.includes('password should be at least')) return 'Пароль слишком короткий (не менее 6 символов).';
  if (message.includes('email rate limit') || message.includes('rate limit')) return 'Слишком много попыток. Попробуйте позже.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Нет соединения с сервером. Проверьте интернет и адрес Supabase.';
  if (message.includes('permission denied') || message.includes('row-level security') || message.includes('42501')) {
    return 'Доступ к данным запрещён. Проверьте SQL-миграцию и RLS-политики.';
  }
  if (message.includes('relation') && message.includes('does not exist')) return 'Таблица заявок отсутствует. Выполните SQL-миграцию.';
  return raw;
}
