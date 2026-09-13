import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  nationalId: '',
  assignedAgentId: '',
};

function CustomerAvatar({ name }) {
  const initials = (name || 'C')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
      {initials}
    </span>
  );
}

function EmptyState({ search }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">
        {search ? `No customers matching "${search}"` : 'No customers recorded yet'}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {search ? 'Try clearing your search terms or checking for spelling errors.' : 'Add your first customer to begin managing collection portfolios.'}
      </p>
    </div>
  );
}

export default function Customers() {
  const { canManage } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ customers: [], pagination: { totalPages: 1, total: 0 } });
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(nextPage = page, currentSearch = search) {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: '10' });
      if (currentSearch.trim()) query.set('search', currentSearch.trim());
      const result = await api(`/customers?${query.toString()}`);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page, search).catch((err) => setError(err.message));
  }, [page]);

  useEffect(() => {
    if (!canManage) return;
    api('/users?role=COLLECTION_AGENT')
      .then((result) => setAgents(result.users || []))
      .catch(() => setAgents([]));
  }, [canManage]);

  async function handleSearch(event) {
    event.preventDefault();
    setError('');
    setPage(1);
    try {
      await load(1, search);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/customers', {
        method: 'POST',
        body: {
          ...form,
          email: form.email || null,
          address: form.address || null,
          nationalId: form.nationalId || null,
          assignedAgentId: form.assignedAgentId || null,
        },
      });
      setModalOpen(false);
      setForm(emptyForm);
      await load(1, '');
      setSearch('');
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data.pagination?.totalPages || 1;
  const currentPage = data.pagination?.page || page;
  const totalCount = data.pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Directory of borrower accounts and assigned collection agents ({totalCount} {totalCount === 1 ? 'customer' : 'customers'})
          </p>
        </div>
        {canManage ? (
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Customer
          </button>
        ) : null}
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              className="form-input pl-10"
              placeholder="Search by customer name, phone number, email, or National ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary py-2.5">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-outline py-2.5"
              onClick={() => {
                setSearch('');
                setPage(1);
                load(1, '');
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      ) : null}

      {/* Customers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>National ID</th>
                <th>Assigned Agent</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : data.customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState search={search} />
                  </td>
                </tr>
              ) : (
                data.customers.map((customer) => (
                  <tr key={customer.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={customer.fullName} />
                        <div>
                          <Link
                            to={`/customers/${customer.id}`}
                            className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                          >
                            {customer.fullName}
                          </Link>
                          {customer.address && (
                            <p className="text-xs text-slate-400 line-clamp-1">{customer.address}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-medium text-slate-700">{customer.phone}</td>
                    <td className="text-slate-600">{customer.email || <span className="text-slate-300">—</span>}</td>
                    <td className="text-xs font-mono text-slate-500">{customer.nationalId || <span className="text-slate-300">—</span>}</td>
                    <td>
                      {customer.assignedAgent?.name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {customer.assignedAgent.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-200/60">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        View profile →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <p>
            Showing page <strong className="font-semibold text-slate-800">{currentPage}</strong> of <strong className="font-semibold text-slate-800">{totalPages}</strong> ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-outline py-1.5 text-xs disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-outline py-1.5 text-xs disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {modalOpen ? (
        <Modal title="Add New Customer" onClose={() => { setModalOpen(false); setForm(emptyForm); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Full Name<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. Jane Doe"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="form-label">Phone Number<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  className="form-input"
                  placeholder="e.g. +1 555-0192"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="form-label">Email Address</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="form-label">National ID / SSN</span>
                <input
                  className="form-input"
                  placeholder="e.g. ID-982341"
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="form-label">Physical Address</span>
                <input
                  className="form-input"
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </label>
            </div>

            {canManage && (
              <label className="block">
                <span className="form-label">Assigned Collection Agent</span>
                <select
                  className="form-input"
                  value={form.assignedAgentId}
                  onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn-outline"
                onClick={() => { setModalOpen(false); setForm(emptyForm); }}
              >
                Cancel
              </button>
              <button disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Create Customer'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
