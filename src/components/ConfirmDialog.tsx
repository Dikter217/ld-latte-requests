import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, busy, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section className="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
        <div className="confirm-top"><div className="confirm-warning"><AlertTriangle size={24} /></div><button type="button" className="icon-btn" aria-label="Закрыть" disabled={busy} onClick={onCancel}><X size={19} /></button></div>
        <h2 id="confirm-title">Удалить заявку?</h2>
        <p id="confirm-desc">«{title}» будет удалена без возможности восстановления.</p>
        <div className="confirm-actions"><button type="button" className="btn btn--secondary" disabled={busy} onClick={onCancel}>Отмена</button><button type="button" className="btn btn--danger" disabled={busy} onClick={onConfirm}>{busy ? <span className="spinner spinner--light"/> : <Trash2 size={16}/>} Удалить</button></div>
      </section>
    </div>
  );
}
