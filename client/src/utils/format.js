export function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function roleLabel(role) {
  if (role === 'COLLECTION_AGENT') return 'Collection Agent';
  if (role === 'MANAGER') return 'Manager';
  if (role === 'ADMIN') return 'Admin';
  return role || 'User';
}

export const LOAN_STATUSES = ['ACTIVE', 'CLOSED', 'DEFAULTED', 'OVERDUE'];
export const ACTIVITY_TYPES = ['CALL', 'VISIT', 'EMAIL', 'SMS', 'PAYMENT_REMINDER'];
export const ACTIVITY_OUTCOMES = [
  'CONTACTED',
  'NO_ANSWER',
  'PROMISE_TO_PAY',
  'REFUSED',
  'PAID',
  'LEFT_MESSAGE',
];
