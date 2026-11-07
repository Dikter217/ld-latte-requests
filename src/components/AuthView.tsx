import { useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Brand } from './Brand';
import { friendlyError } from '../lib/errors';

type Mode = 'login' | 'signup';

export function AuthView({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Регистрация принята. Если для проекта включено подтверждение email, перейдите по ссылке из письма, затем войдите.');
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-showcase">
        <Brand />
        <div className="showcase-body">
          <div className="showcase-kicker"><Sparkles size={15} /> Умные процессы начинаются здесь</div>
          <h1>Меньше рутины.<br /><em>Больше результата.</em></h1>
          <p>Удобное пространство для заявок на автоматизацию. Все задачи, статусы и идеи — в одном месте.</p>
          <div className="showcase-preview" aria-hidden="true">
            <div className="preview-window-top"><span /><span /><span /><i>latte / requests</i></div>
            <div className="preview-content">
              <div className="preview-mini-title">Ваши процессы <span>↗</span></div>
              <div className="preview-task"><div className="preview-icon"><Workflow size={16} /></div><div><b>Интеграция с CRM</b><small>Автоматизация · В работе</small></div><span className="preview-dot orange" /></div>
              <div className="preview-task"><div className="preview-icon"><Sparkles size={16} /></div><div><b>Telegram-бот</b><small>Чат-бот · Новая</small></div><span className="preview-dot cream" /></div>
              <div className="preview-bottom"><div /><div /><div /></div>
            </div>
          </div>
        </div>
        <div className="showcase-foot"><ShieldCheck size={16} /> Приватность данных на уровне Supabase RLS</div>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand"><Brand compact /></div>
        <div className="auth-form-wrap">
          <div className="auth-topnote">РАБОЧЕЕ ПРОСТРАНСТВО LD LATTE <span className="auth-version">v1.0</span></div>
          <h2>{mode === 'login' ? 'С возвращением!' : 'Создать аккаунт'}</h2>
          <p className="auth-intro">{mode === 'login' ? 'Войдите, чтобы продолжить работу с заявками.' : 'Зарегистрируйтесь, чтобы управлять своими заявками.'}</p>
          <div className="auth-switch" role="tablist" aria-label="Режим авторизации">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Вход</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Регистрация</button>
          </div>
          <form className="auth-form" onSubmit={(event) => { void submit(event); }}>
            <label htmlFor="email">Электронная почта</label>
            <div className="input-with-icon"><Mail size={18} aria-hidden="true" /><input id="email" autoComplete="email" type="email" placeholder="name@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></div>
            <div className="form-label-row"><label htmlFor="password">Пароль</label><small>{mode === 'signup' ? 'Минимум 6 символов' : ''}</small></div>
            <div className="input-with-icon"><LockKeyhole size={18} aria-hidden="true" /><input id="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder="Введите пароль" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /><button className="password-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            {error && <div className="message message--error" role="alert">{error}</div>}
            {notice && <div className="message message--success" role="status"><CheckCircle2 size={17} />{notice}</div>}
            <button className="btn btn--primary auth-submit" type="submit" disabled={busy}>{busy ? <><span className="spinner spinner--light" /> Подождите...</> : <>{mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}<ArrowRight size={18} /></>}</button>
          </form>
          <div className="auth-bottom-text">{mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже зарегистрированы?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Создать аккаунт' : 'Войти'}</button></div>
          <p className="auth-security"><ShieldCheck size={15} /> Доступ к заявкам есть только у владельца аккаунта.</p>
        </div>
        <div className="auth-right-footer">© 2026 LD LATTE · Тестовое приложение</div>
      </main>
    </div>
  );
}
