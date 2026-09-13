const LOAN_STYLES = {
  ACTIVE:    { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', dot: 'bg-emerald-500' },
  CLOSED:    { cls: 'bg-slate-100 text-slate-600 ring-slate-200/60',      dot: 'bg-slate-400' },
  OVERDUE:   { cls: 'bg-amber-50 text-amber-700 ring-amber-200/60',       dot: 'bg-amber-500' },
  DEFAULTED: { cls: 'bg-rose-50 text-rose-700 ring-rose-200/60',          dot: 'bg-rose-500' },
};

const OUTCOME_STYLES = {
  CONTACTED:      { cls: 'bg-sky-50 text-sky-700 ring-sky-200/60',         dot: 'bg-sky-500' },
  NO_ANSWER:      { cls: 'bg-slate-100 text-slate-600 ring-slate-200/60',  dot: 'bg-slate-400' },
  PROMISE_TO_PAY: { cls: 'bg-amber-50 text-amber-700 ring-amber-200/60',   dot: 'bg-amber-500' },
  REFUSED:        { cls: 'bg-rose-50 text-rose-700 ring-rose-200/60',      dot: 'bg-rose-500' },
  PAID:           { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', dot: 'bg-emerald-500' },
  LEFT_MESSAGE:   { cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60', dot: 'bg-indigo-500' },
};

export default function StatusBadge({ value, kind = 'loan' }) {
  const map = kind === 'outcome' ? OUTCOME_STYLES : LOAN_STYLES;
  const style = map[value] ?? { cls: 'bg-slate-100 text-slate-600 ring-slate-200/60', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.cls}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {String(value || '').replaceAll('_', ' ')}
    </span>
  );
}
