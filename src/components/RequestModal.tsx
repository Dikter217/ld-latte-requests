import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import type { Category, RequestDraft, RequestItem, RequestStatus } from '../types';
import { CATEGORIES, STATUSES } from '../types';
import { CATEGORY_LABELS, STATUS_LABELS, validateDraft } from '../lib/requests';

interface RequestModalProps {
  initial: RequestItem | null;
  saving: boolean;
  serverError: string;
  onClose: () => void;
  onSave: (draft: RequestDraft) => Promise<void>;
}

export function RequestModal({ initial, saving, serverError, onClose, onSave }: RequestModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'bot');
  const [status, setStatus] = useState<RequestStatus>(initial?.status ?? 'new');
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const draft = { title: title.trim(), description: description.trim(), category, status };
    const validationError = validateDraft(draft);
    if (validationError) return setError(validationError);
    setError('');
    await onSave(draft);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section className="dialog request-dialog" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <div className="dialog-head"><div><div className="eyebrow">УПРАВЛЕНИЕ ЗАЯВКАМИ</div><h2 id="request-modal-title">{initial ? 'Редактировать заявку' : 'Новая заявка'}</h2><p>{initial ? 'Обновите детали задачи и её статус.' : 'Опишите задачу, которую хотите автоматизировать.'}</p></div><button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose} disabled={saving}><X size={20}/></button></div>
        <form onSubmit={(event) => { void submit(event); }}>
          <div className="dialog-body">
            <label htmlFor="request-title" className="field-label">Название <span>*</span></label>
            <input ref={titleRef} id="request-title" className="field-input" type="text" placeholder="Например, Telegram-бот для поддержки" maxLength={120} minLength={3} required value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="field-hint">Коротко сформулируйте задачу · {title.length}/120</div>
            <label htmlFor="request-category" className="field-label">Категория <span>*</span></label>
            <div className="select-container"><select id="request-category" className="field-input" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORIES.map((value) => <option value={value} key={value}>{CATEGORY_LABELS[value]}</option>)}</select></div>
            <label htmlFor="request-description" className="field-label">Описание <span>*</span></label>
            <textarea id="request-description" className="field-input field-textarea" placeholder="Что необходимо сделать? Какой результат ожидается?" maxLength={2000} required rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
            <div className="field-hint">Опишите цель и ожидаемый результат · {description.length}/2000</div>
            {initial && <><label htmlFor="request-status" className="field-label">Статус</label><select id="request-status" className="field-input" value={status} onChange={(event) => setStatus(event.target.value as RequestStatus)}>{STATUSES.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]}</option>)}</select></>}
            {!initial && <div className="auto-status-note"><Check size={16} /> При создании заявка автоматически получит статус «Новая».</div>}
            {(error || serverError) && <div role="alert" className="message message--error">{error || serverError}</div>}
          </div>
          <div className="dialog-footer"><button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>Отмена</button><button type="submit" className="btn btn--primary" disabled={saving}>{saving ? <><span className="spinner spinner--light"/> Сохранение...</> : <>{initial ? 'Сохранить изменения' : 'Создать заявку'}<ArrowRight size={17}/></>}</button></div>
        </form>
      </section>
    </div>
  );
}
