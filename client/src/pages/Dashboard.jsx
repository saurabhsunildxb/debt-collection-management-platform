import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatMoney } from '../utils/format';

/* ── KPI icons ────────────────────────────────────────────── */
function IcoUsers() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
function IcoDoc() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function IcoWallet() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3m18 0V6" />
    </svg>
  );
}
function IcoArrowUp() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
function IcoAlert() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
function IcoPercent() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

/* ── KPI Card Component ─────────────────────────────────── */
function StatCard({ label, value, hint, icon, variant = 'default' }) {
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  return (
    <div className={`card flex flex-col justify-between p-5 transition-all duration-200 hover:shadow-md ${isDanger ? 'ring-1 ring-rose-200/80 bg-rose-50/30' : ''}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
            isDanger
              ? 'bg-rose-100/80 text-rose-600'
              : isSuccess
              ? 'bg-emerald-100/80 text-emerald-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <p className={`text-2xl font-bold tracking-tight ${isDanger ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
        {hint ? <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ── Loan status color map ─────────────────────────────── */
const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-500',
  CLOSED: 'bg-slate-400',
  OVERDUE: 'bg-amber-500',
  DEFAULTED: 'bg-rose-500',
};

/* ── Activity type border & icon accent ────────────────── */
const TYPE_CONFIG = {
  CALL: { border: 'border-l-sky-500', bg: 'bg-sky-50 text-sky-700' },
  VISIT: { border: 'border-l-purple-500', bg: 'bg-purple-50 text-purple-700' },
  EMAIL: { border: 'border-l-indigo-500', bg: 'bg-indigo-50 text-indigo-700' },
  SMS: { border: 'border-l-teal-500', bg: 'bg-teal-50 text-teal-700' },
  PAYMENT_REMINDER: { border: 'border-l-amber-500', bg: 'bg-amber-50 text-amber-700' },
};

export default function Dashboard() {
  const { isAgent, canManage } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/stats')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700 ring-1 ring-rose-200">
        <svg className="mt-0.5 size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <div>
          <p className="font-semibold">Failed to load dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100/50" />
          ))}
        </div>
      </div>
    );
  }

  const collections = stats.repayments?.monthlyCollections || [];
  const maxMonth = Math.max(...collections.map((m) => m.amount), 1);
  const totalByStatus = Object.values(stats.loans?.byStatus || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAgent ? 'Metrics scoped to your assigned customer portfolio.' : 'Organization-wide collection metrics.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs ring-1 ring-slate-200">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live Portfolio Overview
        </div>
      </div>

      {/* KPI grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Customers"
          value={stats.summary.totalCustomers}
          hint={`${stats.customers.activeCustomers} active · ${stats.customers.overdueCustomers} overdue`}
          icon={<IcoUsers />}
        />
        <StatCard
          label="Total Loans"
          value={stats.summary.totalLoans}
          hint={`${stats.loans.overdue} overdue · ${stats.loans.closed} closed`}
          icon={<IcoDoc />}
        />
        <StatCard
          label="Total Collected"
          value={formatMoney(stats.summary.totalCollected)}
          hint="All-time customer repayments"
          icon={<IcoArrowUp />}
          variant="success"
        />
        <StatCard
          label="Outstanding Balance"
          value={formatMoney(stats.summary.totalOutstanding)}
          hint="Across active loan accounts"
          icon={<IcoWallet />}
        />
        <StatCard
          label="Overdue Amount"
          value={formatMoney(stats.summary.totalOverdue)}
          hint="Total unpaid balance past due"
          icon={<IcoAlert />}
          variant="danger"
        />
        <StatCard
          label="Collection Rate"
          value={`${stats.summary.collectionRate}%`}
          hint="Total collected / principal + total value"
          icon={<IcoPercent />}
        />
      </section>

      {/* Charts section */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Monthly collections chart */}
        <div className="card flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Monthly Collections</h2>
              <p className="mt-0.5 text-xs text-slate-500">Repayment collection trend (Last 6 months)</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-slate-500">This month</p>
              <p className="text-sm font-bold text-emerald-700">{formatMoney(stats.repayments.currentMonthCollected)}</p>
            </div>
          </div>

          {/* Bar chart container with explicit height */}
          <div className="mt-6">
            <div className="flex h-44 items-end gap-3 border-b border-slate-100 pb-2">
              {collections.map((bucket) => {
                const heightPct = maxMonth > 0 ? Math.max(8, Math.round((bucket.amount / maxMonth) * 100)) : 8;
                const isMax = bucket.amount === maxMonth && maxMonth > 0;

                return (
                  <div key={bucket.month} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                      {bucket.label}: {formatMoney(bucket.amount)}
                    </div>

                    {/* Bar graphic */}
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-[36px] rounded-t-md transition-all duration-300 ${
                          bucket.amount > 0
                            ? isMax
                              ? 'bg-emerald-600 shadow-sm'
                              : 'bg-emerald-500/80 group-hover:bg-emerald-600'
                            : 'bg-slate-200/80'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month labels below axis */}
            <div className="mt-2 flex gap-3 text-center">
              {collections.map((bucket) => (
                <div key={bucket.month} className="flex-1">
                  <p className="text-[11px] font-medium text-slate-500">
                    {bucket.label.replace(/ 20\d\d$/, '')}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-700">
                    {bucket.amount > 0 ? `$${Math.round(bucket.amount)}` : '$0'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Status Breakdown */}
        <div className="card flex flex-col justify-between p-6">
          <div>
            <h2 className="font-semibold text-slate-900">Loan Status Breakdown</h2>
            <p className="mt-0.5 text-xs text-slate-500">Distribution across active portfolio statuses</p>

            <div className="mt-5 space-y-4">
              {Object.entries(stats.loans?.byStatus || {}).map(([status, count]) => {
                const pct = Math.round((count / totalByStatus) * 100);
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <StatusBadge value={status} />
                      <span className="text-xs font-semibold text-slate-700">
                        {count} <span className="font-normal text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_COLORS[status] || 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>Total loans logged</span>
            <span className="font-bold text-slate-900">{stats.summary.totalLoans}</span>
          </div>
        </div>
      </section>

      {/* Agent Performance table (Manager / Admin view) */}
      {canManage && stats.agentPerformance ? (
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Collection Agent Performance</h2>
            <p className="mt-0.5 text-xs text-slate-500">Performance and collection efficiency per agent</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Customers</th>
                  <th>Loans</th>
                  <th>Total Collected</th>
                  <th>Outstanding</th>
                  <th>Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.agentPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                      No agent activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.agentPerformance.map((agent) => (
                    <tr key={agent.agentId}>
                      <td className="font-semibold text-slate-900">{agent.name}</td>
                      <td>{agent.assignedCustomers}</td>
                      <td>{agent.loanCount}</td>
                      <td className="font-semibold text-emerald-700">{formatMoney(agent.totalCollected)}</td>
                      <td className="font-medium text-rose-700">{formatMoney(agent.totalOutstanding)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(Number(agent.collectionRate), 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{agent.collectionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Recent Activity timeline */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Recent Collection Activity</h2>
            <p className="mt-0.5 text-xs text-slate-500">Latest collection notes and customer touchpoints</p>
          </div>
          <Link
            to="/activities"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            View all activities →
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {stats.recentActivities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto size-9 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
              <p className="mt-2 text-sm font-semibold text-slate-600">No recent collection activities</p>
              <p className="mt-1 text-xs text-slate-400">Activities logged by agents will appear here in real-time.</p>
            </div>
          ) : (
            stats.recentActivities.map((activity) => {
              const cfg = TYPE_CONFIG[activity.activityType] || { border: 'border-l-slate-300', bg: 'bg-slate-100 text-slate-700' };
              return (
                <div
                  key={activity.id}
                  className={`border-l-4 ${cfg.border} px-6 py-4 transition-colors hover:bg-slate-50/70`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/customers/${activity.customer?.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-emerald-700 hover:underline"
                      >
                        {activity.customer?.fullName}
                      </Link>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg}`}>
                        {activity.activityType.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(activity.createdAt)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Agent: <strong className="font-medium text-slate-700">{activity.agent?.name}</strong></span>
                    <span>·</span>
                    <StatusBadge kind="outcome" value={activity.outcome} />
                  </div>
                  {activity.notes ? (
                    <p className="mt-2 text-xs text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100 line-clamp-2">
                      {activity.notes}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
