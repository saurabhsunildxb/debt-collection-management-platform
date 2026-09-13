// server/src/controllers/repaymentController.js
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prismaClient');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { repaymentAccessWhere, agentDenied } = require('../utils/access');
const { handlePrismaError, serializeRepayment, serializeLoan } = require('../utils/prismaErrors');

const repaymentInclude = {
  loan: {
    include: {
      customer: {
        select: { id: true, fullName: true, phone: true, assignedAgentId: true },
      },
    },
  },
};

/**
 * GET /api/v1/repayments
 * Query: page, limit
 */
async function listRepayments(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { ...repaymentAccessWhere(req.user) };

    const [repayments, total] = await Promise.all([
      prisma.repayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: repaymentInclude,
      }),
      prisma.repayment.count({ where }),
    ]);

    return res.status(200).json({
      repayments: repayments.map(serializeRepayment),
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error('List repayments error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/repayments/:id
 */
async function getRepayment(req, res) {
  try {
    const repayment = await prisma.repayment.findUnique({
      where: { id: req.params.id },
      include: repaymentInclude,
    });

    if (!repayment) {
      return res.status(404).json({ message: 'Repayment not found.' });
    }

    if (agentDenied(repayment.loan.customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ repayment: serializeRepayment(repayment) });
  } catch (err) {
    console.error('Get repayment error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /api/v1/repayments
 * Body: { loanId, amount, paymentDate?, notes? }
 * Updates the loan's amountPaid, outstandingBalance, and status when fully paid.
 */
async function createRepayment(req, res) {
  try {
    const { loanId, amount, paymentDate, notes } = req.body;

    if (!loanId || amount === undefined) {
      return res.status(400).json({ message: 'loanId and amount are required.' });
    }

    let amountDecimal;
    try {
      amountDecimal = new Prisma.Decimal(amount);
    } catch {
      return res.status(400).json({ message: 'amount must be a valid number.' });
    }

    if (!amountDecimal.isFinite() || amountDecimal.lte(0)) {
      return res.status(400).json({ message: 'amount must be greater than 0.' });
    }

    let parsedPaymentDate;
    if (paymentDate !== undefined) {
      parsedPaymentDate = new Date(paymentDate);
      if (Number.isNaN(parsedPaymentDate.getTime())) {
        return res.status(400).json({ message: 'paymentDate must be a valid date.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { customer: true },
      });

      if (!loan) {
        const error = new Error('Loan not found.');
        error.status = 404;
        throw error;
      }

      if (agentDenied(loan.customer.assignedAgentId, req.user)) {
        const error = new Error('Access denied.');
        error.status = 403;
        throw error;
      }

      if (amountDecimal.gt(loan.outstandingBalance)) {
        const error = new Error('Payment amount exceeds outstanding balance.');
        error.status = 400;
        throw error;
      }

      const repayment = await tx.repayment.create({
        data: {
          loanId,
          amount: amountDecimal,
          paymentDate: parsedPaymentDate,
          notes: notes ? String(notes) : null,
        },
      });

      const newPaid = loan.amountPaid.add(amountDecimal);
      const newOutstanding = loan.outstandingBalance.sub(amountDecimal);
      const newStatus = newOutstanding.lte(0) ? 'CLOSED' : loan.status;

      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          amountPaid: newPaid,
          outstandingBalance: newOutstanding,
          status: newStatus,
        },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, assignedAgentId: true },
          },
        },
      });

      return { repayment, loan: updatedLoan };
    });

    return res.status(201).json({
      repayment: serializeRepayment({ ...result.repayment, loan: result.loan }),
      loan: serializeLoan(result.loan),
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    if (handlePrismaError(err, res)) return;
    console.error('Create repayment error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  listRepayments,
  getRepayment,
  createRepayment,
};
