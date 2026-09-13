import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import { formatDateTime, roleLabel } from '../utils/format';
import StatusBadge from '../components/StatusBadge';

const emptyCreateForm = {
  name: '',
  email: '',
  role: 'COLLECTION_AGENT',
  password: '',
};

function UserAvatar({ name }) {
  const initials = (name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-800">
      {initials}
    </span>
  );
}

export default function UserManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [forceUnassign, setForceUnassign] = useState(false);
  const [unassignWarning, setUnassignWarning] = useState('');
  
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ userId: '', password: '' });

  const [customersModalOpen, setCustomersModalOpen] = useState(false);
  const [customersUser, setCustomersUser] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [customersLoading, setCustomersLoading] = useState(false);
  
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (roleFilter) query.set('role', roleFilter);
      if (statusFilter) query.set('status', statusFilter);

      const result = await api(`/users/admin?${query.toString()}`);
      setUsers(result.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  async function handleSearch(e) {
    e.preventDefault();
    loadUsers();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      await api('/users', {
        method: 'POST',
        body: createForm,
      });
      setCreateModalOpen(false);
      setCreateForm(emptyCreateForm);
      loadUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      await api(`/users/${editForm.id}`, {
        method: 'PATCH',
        body: {
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          isActive: editForm.isActive,
          forceUnassign,
        },
      });
      setEditModalOpen(false);
      setUnassignWarning('');
      setForceUnassign(false);
      loadUsers();
    } catch (err) {
      if (err.message === 'AGENT_HAS_CUSTOMERS') {
        // Our backend returned a specific error shape in JSON, but api() throws an Error with the message.
        // Wait, standard api client just uses err.message. If we need the count, we'll parse it or just show the message.
        // Let's assume the backend returned a descriptive message.
        // But our backend actually returns { message: 'AGENT_HAS_CUSTOMERS', error: 'Agent has N assigned customers...' }
        // The client throws an Error with data.message if present, or statusText.
        // Wait, the client `api/client.js` uses `err.message = data.message`.
        setActionError('This agent has assigned customers. Please check the "Force unassign" box below to confirm unassigning them, or reassign them manually first.');
        setUnassignWarning('AGENT_HAS_CUSTOMERS');
      } else {
        setActionError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      await api(`/users/${passwordForm.userId}/password`, {
        method: 'PATCH',
        body: { password: passwordForm.password },
      });
      setPasswordModalOpen(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function openCustomersModal(agent) {
    setCustomersUser(agent);
    setCustomersModalOpen(true);
    setCustomersLoading(true);
    try {
      const result = await api('/customers?limit=1000');
      setAllCustomers(result.customers || []);
      const currentlyAssigned = new Set(
        (result.customers || []).filter(c => c.assignedAgentId === agent.id).map(c => c.id)
      );
      setSelectedCustomerIds(currentlyAssigned);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCustomersLoading(false);
    }
  }

  function toggleCustomer(id) {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCustomerIds(next);
  }

  async function handleSaveCustomers() {
    setSaving(true);
    setActionError('');
    try {
      await api(`/users/${customersUser.id}/customers`, {
        method: 'PATCH',
        body: { customerIds: Array.from(selectedCustomerIds) },
      });
      setCustomersModalOpen(false);
      loadUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage employees, roles, and assignments.
          </p>
        </div>
        <button onClick={() => { setActionError(''); setCreateModalOpen(true); }} className="btn-primary">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              className="form-input pl-10"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="COLLECTION_AGENT">Collection Agent</option>
          </select>
          <select className="form-input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="submit" className="btn-primary py-2.5">
            Filter
          </button>
          {(search || roleFilter || statusFilter) && (
            <button
              type="button"
              className="btn-outline py-2.5"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                // Since state updates are async, we can just trigger load directly if we wanted, 
                // but useEffect will not catch it without dependency. We will call load manually here.
                // Note: using state variables immediately after set will yield old values, so we pass empty directly
                const q = new URLSearchParams();
                api(`/users/admin?${q.toString()}`).then(res => setUsers(res.users)).catch(err => setError(err.message));
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Customers</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4">
                      <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} />
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-slate-700">{roleLabel(u.role)}</span>
                    </td>
                    <td>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-700">
                        {u.role === 'COLLECTION_AGENT' ? u._count?.assignedCustomers || 0 : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{formatDateTime(u.createdAt).split(',')[0]}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role === 'COLLECTION_AGENT' && u.isActive && (
                          <button
                            onClick={() => { setActionError(''); openCustomersModal(u); }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Assign Customers
                          </button>
                        )}
                        <button
                          onClick={() => { setActionError(''); setPasswordForm({ userId: u.id, password: '' }); setPasswordModalOpen(true); }}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-800 hover:underline"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => { setActionError(''); setEditForm({ ...u }); setForceUnassign(false); setUnassignWarning(''); setEditModalOpen(true); }}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {createModalOpen && (
        <Modal title="Create Employee" onClose={() => setCreateModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {actionError && <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded">{actionError}</div>}
            
            <label className="block">
              <span className="form-label">Name</span>
              <input required className="form-input" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="form-label">Email</span>
              <input required type="email" className="form-input" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="form-label">Role</span>
              <select className="form-input" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="COLLECTION_AGENT">Collection Agent</option>
                <option value="MANAGER">Manager</option>
              </select>
            </label>
            <label className="block">
              <span className="form-label">Temporary Password</span>
              <input required type="text" minLength={6} className="form-input" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
            </label>
            
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className="btn-outline" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && (
        <Modal title="Edit Employee" onClose={() => setEditModalOpen(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {actionError && <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded">{actionError}</div>}
            
            <label className="block">
              <span className="form-label">Name</span>
              <input required className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="form-label">Email</span>
              <input required type="email" className="form-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            </label>
            
            <label className="block">
              <span className="form-label">Role</span>
              <select 
                className="form-input" 
                value={editForm.role} 
                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                disabled={editForm.id === user?.id} // Admin cannot change own role
              >
                <option value="COLLECTION_AGENT">Collection Agent</option>
                <option value="MANAGER">Manager</option>
                {editForm.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
              </select>
            </label>
            
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input 
                type="checkbox" 
                className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={editForm.isActive}
                onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                disabled={editForm.id === user?.id}
              />
              <span className="text-sm font-medium text-slate-700">Account is Active</span>
            </label>

            {unassignWarning && (
              <label className="flex items-start gap-2 mt-4 p-3 bg-rose-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mt-0.5 size-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  checked={forceUnassign}
                  onChange={e => setForceUnassign(e.target.checked)}
                />
                <span className="text-sm font-medium text-rose-800">
                  Force unassign all customers from this agent
                </span>
              </label>
            )}
            
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className="btn-outline" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordModalOpen && (
        <Modal title="Reset Password" onClose={() => setPasswordModalOpen(false)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {actionError && <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded">{actionError}</div>}
            
            <label className="block">
              <span className="form-label">New Temporary Password</span>
              <input required type="text" minLength={6} className="form-input" value={passwordForm.password} onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} />
            </label>
            
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className="btn-outline" onClick={() => setPasswordModalOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Update Password'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* MANAGE CUSTOMERS MODAL */}
      {customersModalOpen && (
        <Modal title={`Assign Customers: ${customersUser?.name}`} onClose={() => setCustomersModalOpen(false)}>
          <div className="space-y-4">
            {actionError && <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded">{actionError}</div>}
            
            <p className="text-sm text-slate-500">
              Select the customers that should be assigned to this collection agent.
            </p>
            
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
              {customersLoading ? (
                <div className="p-4 text-center text-sm text-slate-500">Loading customers...</div>
              ) : allCustomers.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No customers found.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {allCustomers.map(c => (
                    <li key={c.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={selectedCustomerIds.has(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        id={`cust-${c.id}`}
                      />
                      <label htmlFor={`cust-${c.id}`} className="flex-1 cursor-pointer select-none">
                        <p className="text-sm font-medium text-slate-900">{c.fullName}</p>
                        <p className="text-xs text-slate-500">{c.email || c.phone}</p>
                      </label>
                      {c.assignedAgentId && c.assignedAgentId !== customersUser.id && (
                        <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Already Assigned
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" className="btn-outline" onClick={() => setCustomersModalOpen(false)}>Cancel</button>
              <button disabled={saving || customersLoading} onClick={handleSaveCustomers} className="btn-primary">{saving ? 'Saving...' : 'Save Assignments'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
