import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatMoney, LOAN_STATUSES } from '../utils/format';

const emptyLoan = {
  customerId: '',
  principalAmount: '',
  interestRate: '',
  totalAmount: '',
  dueDate: '',
  status: 'ACTIVE',
};

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">No loans found</p>
      <p className="mt-1 text-xs text-slate-400">Add a new loan to start tracking debt collection status.</p>
    </div>
  );
}

export default function Loans() {
  const { canManage } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ loans: [], pagination: { totalPages: 1, total: 0 } });
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyLoan);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(nextPage = page, nextStatus = status) {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: '10' });
      if (nextStatus) query.set('status', nextStatus);
      setData(await api(`/loans?${query.toString()}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [page, status]);

  useEffect(() => {
    setCustomersLoading(true);
    setCustomersError('');
    api('/customers?limit=100')
      .then((result) => setCustomers(result.customers || []))
      .catch((err) => setCustomersError(err.message || 'Failed to load customers.'))
      .finally(() => setCustomersLoading(false));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/loans', {
        method: 'POST',
        body: {
          ...form,
          principalAmount: Number(form.principalAmount),
          interestRate: Number(form.interestRate),
          totalAmount: Number(form.totalAmount),
        },
      });
      setModalOpen(false);
      setForm(emptyLoan);
      await load(1, status);
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
          <h1 className="text-2xl font-bold text-slate-900">Loans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Loan accounts and collection statuses ({totalCount} {totalCount === 1 ? 'loan' : 'loans'})
          </p>
        </div>
        {canManage ? (
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Loan
          </button>
        ) : null}
      </div>

      {/* Filter Tabs */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Status:</span>
            <button
              onClick={() => { setPage(1); setStatus(''); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${!status ? 'bg-[#0d1e26] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Statuses
            </button>
            {LOAN_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setPage(1); setStatus(s); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${status === s ? 'bg-[#0d1e26] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      ) : null}

      {/* Loans Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Principal</th>
                <th>Interest Rate</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Due Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="py-4">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : data.loans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                data.loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <Link
                        to={`/loans/${loan.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {loan.customer?.fullName || 'Unknown Customer'}
                      </Link>
                    </td>
                    <td><StatusBadge value={loan.status} /></td>
                    <td className="text-slate-700 font-medium">{formatMoney(loan.principalAmount)}</td>
                    <td className="text-xs text-slate-500 font-medium">{loan.interestRate}%</td>
                    <td className="font-bold text-slate-900">{formatMoney(loan.totalAmount)}</td>
                    <td className="font-medium text-emerald-700">{formatMoney(loan.amountPaid)}</td>
                    <td className={loan.status === 'OVERDUE' || loan.status === 'DEFAULTED' ? 'font-bold text-rose-700' : 'font-semibold text-slate-800'}>
                      {formatMoney(loan.outstandingBalance)}
                    </td>
                    <td className="text-xs text-slate-600">{formatDate(loan.dueDate)}</td>
                    <td className="text-right">
                      <Link
                        to={`/loans/${loan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        View details →
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

      {/* Add Loan Modal */}
      {modalOpen ? (
        <Modal title="Create New Loan Account" onClose={() => { setModalOpen(false); setForm(emptyLoan); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <span className="form-label">Borrower / Customer<span className="text-rose-500 ml-0.5">*</span></span>
              {customersError ? <p className="mb-1 text-xs text-rose-600">{customersError}</p> : null}
              <select
                required
                disabled={customersLoading}
                className="form-input disabled:bg-slate-50"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">
                  {customersLoading ? 'Loading customers list…' : customers.length === 0 ? 'No customers available' : 'Select Customer'}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="form-label">Principal ($)<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5000.00"
                  className="form-input"
                  value={form.principalAmount}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    const r = Number(form.interestRate || 0);
                    const calcTotal = p > 0 ? (p + (p * r) / 100).toFixed(2) : form.totalAmount;
                    setForm({ ...form, principalAmount: e.target.value, totalAmount: calcTotal });
                  }}
                />
              </label>

              <label className="block">
                <span className="form-label">Interest Rate (%)<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10.0"
                  className="form-input"
                  value={form.interestRate}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    const p = Number(form.principalAmount || 0);
                    const calcTotal = p > 0 ? (p + (p * r) / 100).toFixed(2) : form.totalAmount;
                    setForm({ ...form, interestRate: e.target.value, totalAmount: calcTotal });
                  }}
                />
              </label>

              <label className="block">
                <span className="form-label">Total Amount ($)<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5500.00"
                  className="form-input font-medium"
                  value={form.totalAmount}
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Maturity / Due Date<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="date"
                  className="form-input"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="form-label">Initial Status</span>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {LOAN_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn-outline"
                onClick={() => { setModalOpen(false); setForm(emptyLoan); }}
              >
                Cancel
              </button>
              <button disabled={saving} className="btn-primary">
                {saving ? 'Creating…' : 'Create Loan'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
