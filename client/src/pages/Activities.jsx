import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { ACTIVITY_OUTCOMES, ACTIVITY_TYPES, formatDate, formatDateTime } from '../utils/format';

const emptyForm = {
  customerId: '',
  activityType: 'CALL',
  outcome: 'CONTACTED',
  notes: '',
  followUpDate: '',
};

/* ── Activity type icon map ─────────────────────────────── */
function ActivityIcon({ type }) {
  const icons = {
    CALL: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    VISIT: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    EMAIL: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    SMS: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    PAYMENT_REMINDER: (
      <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  };
  return icons[type] || null;
}

const TYPE_ACCENT = {
  CALL:             'border-sky-400 bg-sky-50 text-sky-600',
  VISIT:            'border-purple-400 bg-purple-50 text-purple-600',
  EMAIL:            'border-indigo-400 bg-indigo-50 text-indigo-600',
  SMS:              'border-teal-400 bg-teal-50 text-teal-600',
  PAYMENT_REMINDER: 'border-amber-400 bg-amber-50 text-amber-600',
};
const TYPE_LEFT_BORDER = {
  CALL:             'border-l-sky-400',
  VISIT:            'border-l-purple-400',
  EMAIL:            'border-l-indigo-400',
  SMS:              'border-l-teal-400',
  PAYMENT_REMINDER: 'border-l-amber-400',
};

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <svg className="mx-auto size-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-slate-600">No activities recorded</p>
      <p className="mt-1 text-xs text-slate-400">Log your first collection activity using the button above.</p>
    </div>
  );
}

export default function Activities() {
  const { user, canManage } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ activities: [], pagination: { totalPages: 1, total: 0 } });
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await api(`/activities?page=${page}&limit=10`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [page]);

  useEffect(() => {
    setCustomersLoading(true);
    setCustomersError('');
    api('/customers?limit=100')
      .then((result) => setCustomers(result.customers || []))
      .catch((err) => setCustomersError(err.message || 'Failed to load customers.'))
      .finally(() => setCustomersLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(activity) {
    setEditing(activity);
    setForm({
      customerId: activity.customerId,
      activityType: activity.activityType,
      outcome: activity.outcome,
      notes: activity.notes || '',
      followUpDate: activity.followUpDate ? activity.followUpDate.slice(0, 10) : '',
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      ...form,
      notes: form.notes || null,
      followUpDate: form.followUpDate || null,
    };
    try {
      if (editing) {
        await api(`/activities/${editing.id}`, { method: 'PATCH', body });
      } else {
        await api('/activities', { method: 'POST', body });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await api(`/activities/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = data.pagination.totalPages || 1;
  const currentPage = data.pagination.page || page;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Collection Activities</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data.pagination.total || 0} {data.pagination.total === 1 ? 'activity' : 'activities'} recorded
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log activity
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Activity feed */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-50" />
          ))}
        </div>
      ) : data.activities.length === 0 ? (
        <div className="card"><EmptyState /></div>
      ) : (
        <div className="space-y-3">
          {data.activities.map((activity) => {
            const accentClass = TYPE_ACCENT[activity.activityType] || 'border-slate-300 bg-slate-50 text-slate-600';
            const leftBorder = TYPE_LEFT_BORDER[activity.activityType] || 'border-l-slate-300';
            const canEdit = canManage || activity.agentId === user?.id || activity.agent?.id === user?.id;

            return (
              <article
                key={activity.id}
                className={`card flex gap-4 border-l-4 p-5 hover:shadow-md transition-shadow ${leftBorder}`}
              >
                {/* Type icon chip */}
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${accentClass}`}>
                  <ActivityIcon type={activity.activityType} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{activity.customer?.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {activity.activityType.replaceAll('_', ' ')}
                        {' · '}
                        {activity.agent?.name}
                        {' · '}
                        {formatDateTime(activity.createdAt)}
                      </p>
                    </div>
                    <StatusBadge kind="outcome" value={activity.outcome} />
                  </div>

                  {activity.notes ? (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{activity.notes}</p>
                  ) : null}

                  {activity.followUpDate ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15.75h.008v.008H12V15.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 0h.008v.008H8.25V15.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0h.008v.008h-.008V15.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Follow-up {formatDate(activity.followUpDate)}
                    </p>
                  ) : null}

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    {canEdit ? (
                      <button onClick={() => openEdit(activity)} className="btn-outline py-1 px-3 text-xs">
                        Edit
                      </button>
                    ) : null}
                    {canManage ? (
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="btn-danger py-1 px-3 text-xs"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-500">Page {currentPage} of {totalPages}</p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline py-1.5 text-xs disabled:opacity-40">
            ← Previous
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-outline py-1.5 text-xs disabled:opacity-40">
            Next →
          </button>
        </div>
      </div>

      {/* Log / Edit modal */}
      {modalOpen ? (
        <Modal
          title={editing ? 'Update activity' : 'Log activity'}
          onClose={() => { setModalOpen(false); setError(''); }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
            ) : null}

            <div>
              <span className="form-label">Customer<span className="text-rose-500 ml-0.5">*</span></span>
              {customersError ? <p className="mb-1 text-xs text-rose-600">{customersError}</p> : null}
              <select
                required
                disabled={customersLoading}
                className="form-input disabled:bg-slate-50"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">
                  {customersLoading ? 'Loading customers…' : customers.length === 0 ? 'No customers available' : 'Select customer'}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Activity type</span>
                <select
                  className="form-input"
                  value={form.activityType}
                  onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="form-label">Outcome</span>
                <select
                  className="form-input"
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                >
                  {ACTIVITY_OUTCOMES.map((o) => (
                    <option key={o} value={o}>{o.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="form-label">Follow-up date</span>
              <input
                type="date"
                className="form-input"
                value={form.followUpDate}
                onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="form-label">Notes</span>
              <textarea
                className="form-input resize-none"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes about this activity…"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" onClick={() => { setModalOpen(false); setError(''); }}>Cancel</button>
              <button disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editing ? 'Update activity' : 'Log activity'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
