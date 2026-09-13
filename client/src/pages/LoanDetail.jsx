import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatMoney, LOAN_STATUSES } from '../utils/format';

function MetricCard({ label, value, sub, variant = 'default' }) {
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  return (
    <div className={`card flex flex-col justify-between p-4 ${isDanger ? 'ring-1 ring-rose-200/80 bg-rose-50/40' : ''}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tracking-tight ${isDanger ? 'text-rose-700' : isSuccess ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');

  async function load() {
    const data = await api(`/loans/${id}`);
    setLoan(data.loan);
    setStatus(data.loan.status);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function handlePayment(event) {
    event.preventDefault();
    setSaving(true);
    setPayError('');
    try {
      const body = { loanId: id, amount: Number(amount), notes: notes || null };
      if (paymentDate) body.paymentDate = paymentDate;
      await api('/repayments', { method: 'POST', body });
      setAmount('');
      setNotes('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      await load();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/loans/${id}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this loan account and all associated repayments? This action cannot be undone.')) return;
    try {
      await api(`/loans/${id}`, { method: 'DELETE' });
      navigate('/loans');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !loan) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700 ring-1 ring-rose-200">
        <svg className="mt-0.5 size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="font-semibold">Loan Record Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-slate-100/50" />)}
        </div>
      </div>
    );
  }

  const isFullyPaid = Number(loan.outstandingBalance) <= 0;
  const isOverdue = loan.status === 'OVERDUE' || loan.status === 'DEFAULTED';
  const pctPaid = Math.min(100, Math.round((Number(loan.amountPaid) / (Number(loan.totalAmount) || 1)) * 100));

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div>
        <Link to="/loans" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Loans
        </Link>
      </div>

      {/* Header Banner */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{loan.customer?.fullName || 'Loan Account'}</h1>
              <StatusBadge value={loan.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Maturity / Due Date: <strong className="font-semibold text-slate-800">{formatDate(loan.dueDate)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button onClick={handleDelete} className="btn-danger py-2 text-xs">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Loan
              </button>
            )}
          </div>
        </div>

        {/* Financial Metric Cards Grid */}
        <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Principal" value={formatMoney(loan.principalAmount)} />
          <MetricCard label="Interest Rate" value={`${loan.interestRate}%`} />
          <MetricCard label="Total Amount" value={formatMoney(loan.totalAmount)} />
          <MetricCard label="Amount Paid" value={formatMoney(loan.amountPaid)} sub="Total repayments" variant="success" />
          <MetricCard
            label="Outstanding"
            value={formatMoney(loan.outstandingBalance)}
            variant={isOverdue ? 'danger' : 'default'}
          />
          <div className="card p-4 bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account Status</p>
            <div className="mt-1.5"><StatusBadge value={loan.status} /></div>
          </div>
        </div>

        {/* Repayment Progress Bar */}
        <div className="mt-5 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-700">Repayment Progress</span>
            <span className="font-bold text-emerald-700">{pctPaid}% Paid</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-600' : 'bg-emerald-500'}`}
              style={{ width: `${pctPaid}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Collected: <strong className="text-emerald-700 font-semibold">{formatMoney(loan.amountPaid)}</strong></span>
            <span>Remaining: <strong className={isOverdue ? 'text-rose-700 font-semibold' : 'text-slate-800 font-semibold'}>{formatMoney(loan.outstandingBalance)}</strong></span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
      ) : null}

      {/* Status Update Form (Managers/Admins) */}
      {canManage ? (
        <form onSubmit={handleStatus} className="card p-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Loan Account Status</h3>
            <p className="text-xs text-slate-500">Update loan status (ACTIVE, OVERDUE, CLOSED, DEFAULTED)</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="form-input w-44"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {LOAN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button disabled={saving || status === loan.status} className="btn-primary py-2 text-xs disabled:opacity-40">
              Save Status
            </button>
          </div>
        </form>
      ) : null}

      {/* Record Repayment Form */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900">Record Repayment</h2>
        <p className="mt-0.5 text-xs text-slate-500">Log a new collection payment against this loan balance</p>

        {isFullyPaid ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-200">
            <svg className="size-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold">Loan Fully Paid</p>
              <p className="text-xs text-emerald-700">This loan account has reached zero outstanding balance.</p>
            </div>
          </div>
        ) : (
          <>
            {payError ? (
              <div className="mt-3 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700 ring-1 ring-rose-200">{payError}</div>
            ) : null}
            <form onSubmit={handlePayment} className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="form-label">Payment Amount ($)<span className="text-rose-500 ml-0.5">*</span></span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={loan.outstandingBalance}
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max ${formatMoney(loan.outstandingBalance)}`}
                />
              </label>

              <label className="block">
                <span className="form-label">Payment Date</span>
                <input
                  type="date"
                  className="form-input"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>

              <label className="block sm:col-span-3 lg:col-span-1">
                <span className="form-label">Reference / Notes</span>
                <input
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reference number or notes"
                />
              </label>

              <div className="sm:col-span-3">
                <button disabled={saving} className="btn-primary">
                  {saving ? 'Processing Payment…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Repayment History Timeline */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Repayment History</h2>
            <p className="mt-0.5 text-xs text-slate-500">Chronological history of recorded repayments</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {(loan.repayments || []).length} Payment(s)
          </span>
        </div>

        {(loan.repayments || []).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">No repayments recorded yet.</p>
            <p className="mt-1 text-xs text-slate-400">Payments submitted above will appear here immediately.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(loan.repayments || []).map((repayment, idx) => (
              <div key={repayment.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    #{(loan.repayments || []).length - idx}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(repayment.paymentDate)}</p>
                    {repayment.notes ? (
                      <p className="text-xs text-slate-500">{repayment.notes}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No notes attached</p>
                    )}
                  </div>
                </div>
                <span className="text-base font-bold text-emerald-700">{formatMoney(repayment.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
