// server/src/utils/access.js

function isCollectionAgent(user) {
  return user.role === 'COLLECTION_AGENT';
}

function customerAccessWhere(user) {
  if (isCollectionAgent(user)) {
    return { assignedAgentId: user.id };
  }
  return {};
}

function loanAccessWhere(user) {
  if (isCollectionAgent(user)) {
    return { customer: { assignedAgentId: user.id } };
  }
  return {};
}

function repaymentAccessWhere(user) {
  if (isCollectionAgent(user)) {
    return { loan: { customer: { assignedAgentId: user.id } } };
  }
  return {};
}

function activityAccessWhere(user) {
  if (isCollectionAgent(user)) {
    return { customer: { assignedAgentId: user.id } };
  }
  return {};
}

function agentDenied(resourceAssignedAgentId, user) {
  return isCollectionAgent(user) && resourceAssignedAgentId !== user.id;
}

const LOAN_STATUSES = ['ACTIVE', 'CLOSED', 'DEFAULTED', 'OVERDUE'];
const ACTIVITY_TYPES = ['CALL', 'VISIT', 'EMAIL', 'SMS', 'PAYMENT_REMINDER'];
const ACTIVITY_OUTCOMES = ['CONTACTED', 'NO_ANSWER', 'PROMISE_TO_PAY', 'REFUSED', 'PAID', 'LEFT_MESSAGE'];

const agentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

module.exports = {
  isCollectionAgent,
  customerAccessWhere,
  loanAccessWhere,
  repaymentAccessWhere,
  activityAccessWhere,
  agentDenied,
  LOAN_STATUSES,
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
  agentSelect,
};
