export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <div className="brand-mark" aria-hidden="true"><span>L</span><i /></div>
      <div className="brand-wordmark">
        <strong>LD LATTE</strong>
        {!compact && <small>workspace</small>}
      </div>
    </div>
  );
}
