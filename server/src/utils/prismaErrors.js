// server/src/utils/prismaErrors.js

function handlePrismaError(err, res) {
  if (err.code === 'P2002') {
    const field = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({ message: `A record with this ${field} already exists.` });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Invalid related record.' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.' });
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined) return value;
  return Number(value);
}

function serializeLoan(loan) {
  if (!loan) return loan;
  return {
    ...loan,
    principalAmount: toNumber(loan.principalAmount),
    interestRate: toNumber(loan.interestRate),
    totalAmount: toNumber(loan.totalAmount),
    amountPaid: toNumber(loan.amountPaid),
    outstandingBalance: toNumber(loan.outstandingBalance),
    repayments: loan.repayments ? loan.repayments.map(serializeRepayment) : loan.repayments,
  };
}

function serializeRepayment(repayment) {
  if (!repayment) return repayment;
  return {
    ...repayment,
    amount: toNumber(repayment.amount),
    loan: repayment.loan ? serializeLoan({ ...repayment.loan, repayments: undefined }) : repayment.loan,
  };
}

module.exports = { handlePrismaError, serializeLoan, serializeRepayment, toNumber };
