import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, CircleHelp, Coffee, ExternalLink, ShieldCheck } from 'lucide-react';
import { AuthView } from './components/AuthView';
import { Brand } from './components/Brand';
import { Dashboard } from './components/Dashboard';
import { isConfigured, supabase } from './lib/supabase';

function SetupView() {
  return (
    <div className="setup-page"><div className="setup-card"><Brand /><div className="setup-icon"><Coffee size={27}/></div><div className="eyebrow">ПЕРВЫЙ ЗАПУСК</div><h1>Почти готово!</h1><p>Приложение собрано. Чтобы включить регистрацию и сохранение заявок, подключите свой проект Supabase.</p><ol><li>Создайте проект на <a href="https://supabase.com/dashboard" rel="noreferrer" target="_blank">supabase.com <ExternalLink size={14}/></a>.</li><li>Выполните SQL из файла <code>supabase/migrations/202611050001_create_requests.sql</code>.</li><li>Скопируйте <code>.env.example</code> в <code>.env</code> и вставьте Project URL и publishable key.</li><li>Перезапустите команду <code>npm run dev</code>.</li></ol><div className="setup-note"><ShieldCheck size={18}/> Никогда не добавляйте секретный <code>service_role</code> ключ в VITE_* переменные.</div><a className="btn btn--primary" href="https://supabase.com/docs/guides/auth/quickstarts/react" target="_blank" rel="noreferrer">Документация Supabase <ArrowRight size={16}/></a></div></div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setAuthError(String(error));
      setAuthLoading(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (!isConfigured || !supabase) return <SetupView />;
  if (authLoading) return <div className="fullscreen-loading"><Brand /><div className="spinner" /><p>Подключаем рабочее пространство...</p></div>;
  if (authError && !session) return <div className="fullscreen-loading"><CircleHelp size={32}/><h2>Не удалось проверить сессию</h2><p>{authError}</p><button className="btn btn--secondary" onClick={() => window.location.reload()}>Повторить</button></div>;
  if (!session) return <AuthView client={supabase} />;
  return <Dashboard key={session.user.id} client={supabase} user={session.user} />;
}
