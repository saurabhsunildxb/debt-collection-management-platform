import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatMoney } from '../utils/format';

function CustomerAvatarLarge({ name }) {
  const initials = (name || 'C')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800 ring-4 ring-white shadow-sm">
      {initials}
    </span>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    api(`/customers/${id}`)
      .then((data) => {
        setCustomer(data.customer);
        setForm({
          fullName: data.customer.fullName,
          phone: data.customer.phone,
          email: data.customer.email || '',
          address: data.customer.address || '',
          nationalId: data.customer.nationalId || '',
          assignedAgentId: data.customer.assignedAgentId || '',
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!canManage) return;
    api('/users?role=COLLECTION_AGENT')
      .then((result) => setAgents(result.users || []))
      .catch(() => setAgents([]));
  }, [canManage]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      const data = await api(`/customers/${id}`, {
        method: 'PATCH',
        body: {
          ...form,
          email: form.email || null,
          address: form.address || null,
          nationalId: form.nationalId || null,
          assignedAgentId: form.assignedAgentId || null,
        },
      });
      setCustomer({ ...data.customer, loans: customer.loans });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this customer? All associated loans and activities will also be removed.')) return;
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !customer) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700 ring-1 ring-rose-200">
        <svg className="mt-0.5 size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="font-semibold">Customer Record Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer || !form) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="card h-48 animate-pulse bg-slate-100/50" />
      </div>
    );
  }

  const loans = customer.loans || [];
  const activeLoans = loans.filter((l) => l.status !== 'CLOSED');
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE' || l.status === 'DEFAULTED');
  const totalBorrowed = loans.reduce((acc, l) => acc + Number(l.totalAmount || 0), 0);
  const totalPaid = loans.reduce((acc, l) => acc + Number(l.amountPaid || 0), 0);
  const totalOutstanding = loans.reduce((acc, l) => acc + Number(l.outstandingBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div>
        <Link to="/customers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Customers
        </Link>
      </div>

      {/* Enterprise Header Profile Card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <CustomerAvatarLarge name={customer.fullName} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{customer.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Phone: <strong className="font-medium text-slate-800">{customer.phone}</strong></span>
                {customer.email && (
                  <>
                    <span>·</span>
                    <span>Email: <strong className="font-medium text-slate-800">{customer.email}</strong></span>
                  </>
                )}
                {customer.nationalId && (
                  <>
                    <span>·</span>
                    <span>ID: <strong className="font-mono font-medium text-slate-800">{customer.nationalId}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button onClick={handleDelete} className="btn-danger py-2 text-xs">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Customer
              </button>
            )}
          </div>
        </div>

        {/* Quick Portfolio Stats for this Customer */}
        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Loans</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{loans.length} <span className="text-xs font-normal text-slate-500">({activeLoans.length} active)</span></p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Borrowed</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(totalBorrowed)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Total Paid</p>
            <p className="mt-1 text-xl font-bold text-emerald-800">{formatMoney(totalPaid)}</p>
          </div>
          <div className={`rounded-xl p-3.5 border ${overdueLoans.length > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${overdueLoans.length > 0 ? 'text-rose-700' : 'text-slate-400'}`}>Outstanding</p>
            <p className={`mt-1 text-xl font-bold ${overdueLoans.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatMoney(totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {saveSuccess ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Customer record updated successfully.
        </div>
      ) : null}

      {/* Customer Information Section */}
      {canManage ? (
        <form onSubmit={handleSave} className="card p-6">
          <h2 className="font-semibold text-slate-900">Edit Customer Information</h2>
          <p className="mt-0.5 text-xs text-slate-500">Update personal and contact details</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="form-label">Full Name<span className="text-rose-500 ml-0.5">*</span></span>
              <input
                required
                className="form-input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="form-label">Phone Number<span className="text-rose-500 ml-0.5">*</span></span>
              <input
                required
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="form-label">Email Address</span>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="form-label">National ID</span>
              <input
                className="form-input"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="form-label">Address</span>
              <input
                className="form-input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="form-label">Assigned Agent</span>
              <select
                className="form-input"
                value={form.assignedAgentId}
                onChange={(e) => setForm({ ...form, assignedAgentId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900">Customer Details</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</dt>
              <dd className="mt-1 font-medium text-slate-800">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</dt>
              <dd className="mt-1 text-slate-800">{customer.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Address</dt>
              <dd className="mt-1 text-slate-800">{customer.address || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">National ID</dt>
              <dd className="mt-1 font-mono text-slate-800">{customer.nationalId || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Agent</dt>
              <dd className="mt-1 text-slate-800">{customer.assignedAgent?.name || 'Unassigned'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Loans Section */}
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Associated Loans</h2>
            <p className="mt-0.5 text-xs text-slate-500">History of loans issued to this borrower</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {loans.length} {loans.length === 1 ? 'Loan' : 'Loans'}
          </span>
        </div>

        {loans.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">No loans registered for this customer.</p>
            <p className="mt-1 text-xs text-slate-400">Loans created in the system will automatically link here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Due Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td><StatusBadge value={loan.status} /></td>
                    <td className="font-medium text-slate-800">{formatMoney(loan.principalAmount)}</td>
                    <td className="text-xs text-slate-500">{loan.interestRate}%</td>
                    <td className="font-bold text-slate-900">{formatMoney(loan.totalAmount)}</td>
                    <td className="font-medium text-emerald-700">{formatMoney(loan.amountPaid)}</td>
                    <td className={loan.status === 'OVERDUE' || loan.status === 'DEFAULTED' ? 'font-bold text-rose-700' : 'font-medium text-slate-700'}>
                      {formatMoney(loan.outstandingBalance)}
                    </td>
                    <td className="text-xs text-slate-600">{formatDate(loan.dueDate)}</td>
                    <td className="text-right">
                      <Link
                        to={`/loans/${loan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        View loan →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
