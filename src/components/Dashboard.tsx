import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  ArrowDownUp, ArrowRight, Bell, Bot, ChartNoAxesCombined, CheckCircle2,
  ChevronDown, CircleCheck, Clock3, Inbox, Layers3, LayoutDashboard,
  ListTodo, LogOut, Menu, MoreHorizontal, Network, Pencil, Plus, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, Trash2, X,
} from 'lucide-react';
import type { Category, RequestDraft, RequestItem, RequestStatus, StatusFilter } from '../types';
import { CATEGORY_LABELS, filterRequests, formatDate, getCounts, STATUS_FILTER_LABELS, STATUS_LABELS } from '../lib/requests';
import { friendlyError } from '../lib/errors';
import { Brand } from './Brand';
import { RequestModal } from './RequestModal';
import { ConfirmDialog } from './ConfirmDialog';

type Page = 'overview' | 'requests';
type Toast = { message: string; kind: 'success' | 'error' };

function CategoryIcon({ category, size = 19 }: { category: Category; size?: number }) {
  if (category === 'bot') return <Bot size={size} />;
  if (category === 'integration') return <Network size={size} />;
  if (category === 'report') return <ChartNoAxesCombined size={size} />;
  return <Layers3 size={size} />;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status-badge status-badge--${status}`}><span className="status-dot" />{STATUS_LABELS[status]}</span>;
}

export function Dashboard({ client, user }: { client: SupabaseClient; user: User }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [editing, setEditing] = useState<RequestItem | null | 'create'>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RequestItem | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const saveGuard = useRef(false);
  const deleteGuard = useRef(false);
  const statusGuard = useRef(false);

  const load = useCallback(async (isActive: () => boolean) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await client.from('requests')
        .select('id,user_id,title,description,category,status,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      if (isActive()) setItems((data ?? []) as RequestItem[]);
    } catch (error) {
      if (isActive()) setLoadError(friendlyError(error));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [client, user.id]);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => getCounts(items), [items]);
  const visibleItems = useMemo(() => filterRequests(items, search, statusFilter, sortOrder), [items, search, statusFilter, sortOrder]);
  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all';

  function navigate(next: Page, filter: StatusFilter = 'all') {
    setPage(next);
    setStatusFilter(filter);
    setMobileMenu(false);
  }

  function openEditor(item: RequestItem | 'create') {
    setEditorError('');
    setEditing(item);
  }

  async function saveRequest(draft: RequestDraft) {
    if (saveGuard.current) return;
    saveGuard.current = true;
    setSaving(true);
    setEditorError('');
    try {
      const isEditing = editing !== 'create' && editing !== null;
      let result;
      if (isEditing) {
        result = await client.from('requests')
          .update({ title: draft.title, description: draft.description, category: draft.category, status: draft.status })
          .eq('id', editing.id).eq('user_id', user.id)
          .select('id,user_id,title,description,category,status,created_at,updated_at')
          .single();
      } else {
        // Database sets status = 'new' and user_id = auth.uid().
        result = await client.from('requests')
          .insert({ title: draft.title, description: draft.description, category: draft.category })
          .select('id,user_id,title,description,category,status,created_at,updated_at')
          .single();
      }
      if (result.error) throw result.error;
      const saved = result.data as RequestItem;
      setItems((previous) => isEditing
        ? previous.map((entry) => entry.id === saved.id ? saved : entry)
        : [saved, ...previous]);
      setEditing(null);
      setToast({ kind: 'success', message: isEditing ? 'Заявка обновлена' : 'Заявка создана' });
    } catch (error) {
      setEditorError(friendlyError(error));
    } finally {
      saveGuard.current = false;
      setSaving(false);
    }
  }

  async function changeStatus(item: RequestItem, status: RequestStatus) {
    if (statusGuard.current || status === item.status) return;
    statusGuard.current = true;
    setChangingStatusId(item.id);
    try {
      const { data, error } = await client.from('requests')
        .update({ status }).eq('id', item.id).eq('user_id', user.id)
        .select('id,user_id,title,description,category,status,created_at,updated_at').single();
      if (error) throw error;
      setItems((previous) => previous.map((entry) => entry.id === item.id ? data as RequestItem : entry));
      setToast({ kind: 'success', message: 'Статус изменён' });
    } catch (error) {
      setToast({ kind: 'error', message: friendlyError(error) });
    } finally {
      statusGuard.current = false;
      setChangingStatusId(null);
    }
  }

  async function deleteRequest() {
    if (!deleting || deleteGuard.current) return;
    deleteGuard.current = true;
    setDeletingBusy(true);
    try {
      const { data, error } = await client.from('requests')
        .delete().eq('id', deleting.id).eq('user_id', user.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Не удалось найти заявку для удаления. Возможно, она уже удалена.');
      setItems((previous) => previous.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setToast({ kind: 'success', message: 'Заявка удалена' });
    } catch (error) {
      setToast({ kind: 'error', message: friendlyError(error) });
    } finally {
      deleteGuard.current = false;
      setDeletingBusy(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await client.auth.signOut();
    if (error) {
      setSigningOut(false);
      setToast({ kind: 'error', message: friendlyError(error) });
    }
  }

  const statCards: Array<{ status: StatusFilter; label: string; count: number; icon: typeof Inbox; tone: string; hint: string }> = [
    { status: 'all', label: 'Всего заявок', count: counts.all, icon: Layers3, tone: 'espresso', hint: 'Все задачи' },
    { status: 'new', label: 'Новые', count: counts.new, icon: Inbox, tone: 'blue', hint: 'Ожидают начала' },
    { status: 'in_progress', label: 'В работе', count: counts.in_progress, icon: Clock3, tone: 'amber', hint: 'В процессе' },
    { status: 'completed', label: 'Завершены', count: counts.completed, icon: CircleCheck, tone: 'green', hint: 'Готовый результат' },
  ];

  const view = (
    <section className="requests-panel" aria-label="Список заявок">
      <div className="panel-heading"><div><div className="panel-subheading">ВАШИ ЗАДАЧИ</div><h2>{page === 'overview' ? 'Последние заявки' : 'Все заявки'} <span className="list-count">{visibleItems.length}</span></h2></div><span className="panel-heading-meta"><ShieldCheck size={16} /> Только ваши данные</span></div>
      <div className="filter-bar">
        <div className="search-input"><Search size={19} aria-hidden="true"/><input type="search" aria-label="Поиск по названию" placeholder="Поиск по названию..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="filter-select-wrap"><SlidersHorizontal size={17} aria-hidden="true"/><select aria-label="Фильтр по статусу" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>{(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((status) => <option key={status} value={status}>{STATUS_FILTER_LABELS[status]}</option>)}</select><ChevronDown size={15} aria-hidden="true"/></div>
        <div className="filter-select-wrap sort-select"><ArrowDownUp size={17} aria-hidden="true"/><select aria-label="Сортировка" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option></select><ChevronDown size={15} aria-hidden="true"/></div>
      </div>
      {loading ? <div className="list-placeholder"><span className="spinner"/> Загружаем заявки...</div>
      : loadError ? <div className="list-empty"><div className="empty-symbol"><Bell size={26}/></div><h3>Не удалось загрузить заявки</h3><p>{loadError}</p><button type="button" className="btn btn--secondary" onClick={() => { void load(() => true); }}>Попробовать снова</button></div>
      : visibleItems.length === 0 ? <div className="list-empty"><div className="empty-symbol">{hasFilters ? <Search size={28} /> : <Inbox size={30} />}</div><h3>{hasFilters ? 'Ничего не найдено' : 'Заявок пока нет'}</h3><p>{hasFilters ? 'Попробуйте другой запрос или сбросьте фильтры.' : 'Создайте первую заявку на автоматизацию — и она появится здесь.'}</p>{hasFilters ? <button type="button" className="btn btn--secondary" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Сбросить фильтры</button> : <button type="button" className="btn btn--primary" onClick={() => openEditor('create')}><Plus size={17}/> Создать заявку</button>}</div>
      : <>
        <div className="desktop-table-wrap"><table className="requests-table"><thead><tr><th>ЗАЯВКА</th><th>КАТЕГОРИЯ</th><th>СОЗДАНА</th><th>СТАТУС</th><th aria-label="Действия" /></tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id}><td><div className="task-cell"><div className={`task-icon task-icon--${item.category}`}><CategoryIcon category={item.category}/></div><div className="task-copy"><button type="button" className="task-title" onClick={() => openEditor(item)}>{item.title}</button><p title={item.description}>{item.description}</p></div></div></td><td><span className="category-label">{CATEGORY_LABELS[item.category]}</span></td><td><span className="table-date">{formatDate(item.created_at)}</span></td><td><div className="status-select-wrap"><StatusBadge status={item.status}/><select className="status-overlay" value={item.status} aria-label={`Изменить статус: ${item.title}`} title="Изменить статус" disabled={changingStatusId !== null} onChange={(event) => { void changeStatus(item, event.target.value as RequestStatus); }}>{(Object.keys(STATUS_LABELS) as RequestStatus[]).map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select></div></td><td><div className="action-cell"><button type="button" className="icon-btn" title="Редактировать" aria-label={`Редактировать ${item.title}`} onClick={() => openEditor(item)}><Pencil size={17}/></button><button type="button" className="icon-btn icon-btn--danger" title="Удалить" aria-label={`Удалить ${item.title}`} onClick={() => setDeleting(item)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div>
        <div className="mobile-request-list">{visibleItems.map((item) => <article key={item.id} className="mobile-request-card"><div className="mobile-request-top"><div className={`task-icon task-icon--${item.category}`}><CategoryIcon category={item.category}/></div><div className="mobile-request-info"><button className="task-title" type="button" onClick={() => openEditor(item)}>{item.title}</button><p>{CATEGORY_LABELS[item.category]} · {formatDate(item.created_at)}</p></div><button type="button" className="icon-btn" aria-label={`Редактировать ${item.title}`} onClick={() => openEditor(item)}><Pencil size={18}/></button></div><p className="mobile-request-description">{item.description}</p><div className="mobile-request-bottom"><select className={`mobile-status-select mobile-status-select--${item.status}`} value={item.status} aria-label={`Изменить статус: ${item.title}`} disabled={changingStatusId !== null} onChange={(event) => { void changeStatus(item, event.target.value as RequestStatus); }}>{(Object.keys(STATUS_LABELS) as RequestStatus[]).map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select><button type="button" className="icon-btn icon-btn--danger" aria-label={`Удалить ${item.title}`} onClick={() => setDeleting(item)}><Trash2 size={17}/></button></div></article>)}</div>
        <div className="table-footer">Показано {visibleItems.length} из {items.length} заявок <span>Обновляется при изменениях</span></div>
      </>}
    </section>
  );

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-overlay" aria-label="Закрыть меню" onClick={() => setMobileMenu(false)}/>}
      <aside className={`sidebar ${mobileMenu ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top"><Brand /><button type="button" className="icon-btn sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Закрыть меню"><X size={20}/></button></div>
        <div className="workspace-picker"><div className="workspace-avatar">L</div><div><strong>Моё пространство</strong><small>LD LATTE Workspace</small></div><MoreHorizontal size={18}/></div>
        <nav className="sidebar-navigation" aria-label="Навигация"><div className="sidebar-caption">МЕНЮ</div><button type="button" className={`nav-item ${page === 'overview' ? 'nav-item--active' : ''}`} onClick={() => navigate('overview')}><LayoutDashboard size={19}/> Обзор</button><button type="button" className={`nav-item ${page === 'requests' && statusFilter === 'all' ? 'nav-item--active' : ''}`} onClick={() => navigate('requests')}><ListTodo size={19}/> Все заявки <span className="nav-count">{counts.all}</span></button><div className="sidebar-caption sidebar-caption--statuses">ПО СТАТУСАМ</div><button type="button" className={`nav-item ${page === 'requests' && statusFilter === 'new' ? 'nav-item--active' : ''}`} onClick={() => navigate('requests', 'new')}><span className="nav-status-dot nav-status-dot--new"/> Новые <span className="nav-count">{counts.new}</span></button><button type="button" className={`nav-item ${page === 'requests' && statusFilter === 'in_progress' ? 'nav-item--active' : ''}`} onClick={() => navigate('requests', 'in_progress')}><span className="nav-status-dot nav-status-dot--in_progress"/> В работе <span className="nav-count">{counts.in_progress}</span></button><button type="button" className={`nav-item ${page === 'requests' && statusFilter === 'completed' ? 'nav-item--active' : ''}`} onClick={() => navigate('requests', 'completed')}><span className="nav-status-dot nav-status-dot--completed"/> Завершены <span className="nav-count">{counts.completed}</span></button></nav>
        <div className="sidebar-bottom"><div className="sidebar-tip"><div className="sidebar-tip-icon"><Sparkles size={19}/></div><strong>Идея для автоматизации?</strong><p>Не теряйте её — добавьте заявку прямо сейчас.</p><button type="button" onClick={() => { setMobileMenu(false); openEditor('create'); }}>Создать заявку <ArrowRight size={15}/></button></div><div className="sidebar-profile"><span className="profile-avatar">{(user.email ?? 'U').slice(0, 1).toUpperCase()}</span><div className="profile-info"><strong>Мой аккаунт</strong><small title={user.email}>{user.email}</small></div><button type="button" className="icon-btn" title="Выйти" aria-label="Выйти из аккаунта" disabled={signingOut} onClick={() => { void signOut(); }}><LogOut size={18}/></button></div></div>
      </aside>

      <div className="main-area">
        <header className="topbar"><div className="topbar-left"><button type="button" className="icon-btn hamburger" aria-label="Открыть меню" onClick={() => setMobileMenu(true)}><Menu size={22}/></button><span>Рабочее пространство</span><span className="breadcrumb-chevron">/</span><strong>{page === 'overview' ? 'Обзор' : 'Заявки'}</strong></div><div className="topbar-right"><span className="topbar-secure"><ShieldCheck size={16}/> Защищено</span><div className="topbar-profile" title={user.email}>{(user.email ?? 'U').slice(0, 1).toUpperCase()}</div></div></header>
        <main className="main-content">
          <div className="page-heading"><div><div className="eyebrow"><span className="live-pulse"/> ВАШ РАБОЧИЙ ЦЕНТР</div><h1>{page === 'overview' ? <>Всё под <em>контролем.</em></> : <>Ваши <em>заявки.</em></>}</h1><p>{page === 'overview' ? 'Управляйте идеями и задачами для автоматизации в одном месте.' : 'Создавайте заявки, отслеживайте статус и находите нужное за секунды.'}</p></div><button type="button" className="btn btn--primary create-main" onClick={() => openEditor('create')}><Plus size={20}/> Новая заявка</button></div>
          {page === 'overview' && <><div className="stats-grid">{statCards.map((stat) => { const Icon = stat.icon; return <button type="button" key={stat.status} className="stat-card" onClick={() => navigate('requests', stat.status)}><div className="stat-top"><span>{stat.label}</span><div className={`stat-icon stat-icon--${stat.tone}`}><Icon size={20}/></div></div><div className="stat-number">{loading ? '–' : stat.count}</div><div className="stat-foot">{stat.hint} <ArrowRight size={15}/></div></button>; })}</div><div className="welcome-strip"><div className="welcome-strip-icon"><Sparkles size={21}/></div><div><strong>От идеи до результата — один шаг.</strong><p>Опишите задачу, выберите категорию и управляйте её выполнением.</p></div><button type="button" onClick={() => openEditor('create')}>Добавить <ArrowRight size={16}/></button></div></>}
          {view}
          <footer className="main-footer"><span>© 2026 LD LATTE · Requests Workspace</span><span>Создано с помощью AI · React + Supabase</span></footer>
        </main>
      </div>
      {editing !== null && <RequestModal key={editing === 'create' ? 'new' : editing.id} initial={editing === 'create' ? null : editing} saving={saving} serverError={editorError} onClose={() => { if (!saving) setEditing(null); }} onSave={saveRequest} />}
      {deleting && <ConfirmDialog title={deleting.title} busy={deletingBusy} onCancel={() => { if (!deletingBusy) setDeleting(null); }} onConfirm={() => { void deleteRequest(); }} />}
      {toast && <div className={`toast toast--${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'success' ? <CheckCircle2 size={18}/> : <Bell size={18}/>}<span>{toast.message}</span><button type="button" aria-label="Закрыть уведомление" onClick={() => setToast(null)}><X size={16}/></button></div>}
    </div>
  );
}
