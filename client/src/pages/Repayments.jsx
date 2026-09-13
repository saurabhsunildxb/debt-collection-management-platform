import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { formatDate, formatMoney } from '../utils/format';

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">No repayments recorded</p>
      <p className="mt-1 text-xs text-slate-400">Record a new payment using the button above.</p>
    </div>
  );
}

export default function Repayments() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ repayments: [], pagination: { totalPages: 1, total: 0 } });
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [loansError, setLoansError] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ loanId: '', amount: '', notes: '', paymentDate: today });
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      setData(await api(`/repayments?page=${nextPage}&limit=10`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [page]);

  async function loadLoans() {
    setLoansLoading(true);
    setLoansError('');
    try {
      const result = await api('/loans?limit=100');
      setLoans((result.loans || []).filter((loan) => Number(loan.outstandingBalance) > 0));
    } catch (err) {
      setLoansError(err.message || 'Failed to load active loans.');
    } finally {
      setLoansLoading(false);
    }
  }

  useEffect(() => {
    loadLoans();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { loanId: form.loanId, amount: Number(form.amount), notes: form.notes || null };
      if (form.paymentDate) body.paymentDate = form.paymentDate;
      await api('/repayments', { method: 'POST', body });
      setModalOpen(false);
      setForm({ loanId: '', amount: '', notes: '', paymentDate: new Date().toISOString().slice(0, 10) });
      setPage(1);
      await Promise.all([load(1), loadLoans()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalPages = data.pagination?.totalPages || 1;
  const currentPage = data.pagination?.page || page;
  const totalCount = data.pagination?.total || 0;
  const selectedLoan = loans.find((l) => l.id === form.loanId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repayments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Payment transactions and collection entries ({totalCount} {totalCount === 1 ? 'repayment' : 'repayments'})
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Record Payment
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      ) : null}

      {/* Repayments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer / Borrower</th>
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Notes / Reference</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-4">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : data.repayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                data.repayments.map((repayment) => (
                  <tr key={repayment.id}>
                    <td>
                      <Link
                        to={`/loans/${repayment.loanId}`}
                        className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {repayment.loan?.customer?.fullName || 'Unknown Customer'}
                      </Link>
                    </td>
                    <td className="font-bold text-emerald-700">{formatMoney(repayment.amount)}</td>
                    <td className="text-xs text-slate-600 font-medium">{formatDate(repayment.paymentDate)}</td>
                    <td className="text-xs text-slate-500 max-w-xs truncate">
                      {repayment.notes || <span className="text-slate-300 italic">No notes</span>}
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/loans/${repayment.loanId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        View loan →
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

      {/* Record Payment Modal */}
      {modalOpen ? (
        <Modal title="Record New Repayment" onClose={() => { setModalOpen(false); setForm({ loanId: '', amount: '', notes: '', paymentDate: today }); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <span className="form-label">Active Loan Account<span className="text-rose-500 ml-0.5">*</span></span>
              {loansError ? <p className="mb-1 text-xs text-rose-600">{loansError}</p> : null}
              <select
                required
                disabled={loansLoading}
                className="form-input disabled:bg-slate-50"
                value={form.loanId}
                onChange={(e) => setForm({ ...form, loanId: e.target.value, amount: '' })}
              >
                <option value="">
                  {loansLoading ? 'Loading active loans…' : loans.length === 0 ? 'No active loans with outstanding balance' : 'Select Loan'}
                </option>
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.customer?.fullName} — Outstanding: {formatMoney(loan.outstandingBalance)}
                  </option>
                ))}
              </select>
              {selectedLoan && (
                <p className="mt-1 text-xs text-slate-500">
                  Maximum payable amount: <strong className="font-semibold text-emerald-700">{formatMoney(selectedLoan.outstandingBalance)}</strong>
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="form-label">Amount ($)<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedLoan ? selectedLoan.outstandingBalance : undefined}
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <label className="block">
                <span className="form-label">Payment Date</span>
                <input
                  type="date"
                  className="form-input"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </label>
            </div>

            <label className="block">
              <span className="form-label">Notes / Payment Reference</span>
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes or transaction reference"
              />
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn-outline"
                onClick={() => { setModalOpen(false); setForm({ loanId: '', amount: '', notes: '', paymentDate: today }); }}
              >
                Cancel
              </button>
              <button disabled={saving} className="btn-primary">
                {saving ? 'Processing…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
