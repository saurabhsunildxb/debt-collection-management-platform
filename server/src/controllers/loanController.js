// server/src/controllers/loanController.js
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prismaClient');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { loanAccessWhere, agentDenied, LOAN_STATUSES, agentSelect } = require('../utils/access');
const { handlePrismaError, serializeLoan } = require('../utils/prismaErrors');

const loanInclude = {
  customer: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      assignedAgentId: true,
      assignedAgent: { select: agentSelect },
    },
  },
};

function parseDecimal(value, fieldName) {
  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.isNaN()) {
      return { error: `${fieldName} must be a valid number.` };
    }
    return { decimal };
  } catch {
    return { error: `${fieldName} must be a valid number.` };
  }
}

/**
 * GET /api/v1/loans
 * Query: page, limit, status
 */
async function listLoans(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { ...loanAccessWhere(req.user) };

    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      if (!LOAN_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Allowed values: ${LOAN_STATUSES.join(', ')}.`,
        });
      }
      where.status = status;
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: loanInclude,
      }),
      prisma.loan.count({ where }),
    ]);

    return res.status(200).json({
      loans: loans.map(serializeLoan),
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error('List loans error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/loans/:id
 */
async function getLoan(req, res) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
      include: {
        ...loanInclude,
        repayments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    if (agentDenied(loan.customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ loan: serializeLoan(loan) });
  } catch (err) {
    console.error('Get loan error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /api/v1/loans
 * Body: { customerId, principalAmount, interestRate, totalAmount, dueDate, amountPaid?, outstandingBalance?, status? }
 */
async function createLoan(req, res) {
  try {
    const { customerId, principalAmount, interestRate, totalAmount, dueDate, amountPaid, outstandingBalance, status } = req.body;

    if (!customerId || principalAmount === undefined || interestRate === undefined || totalAmount === undefined || !dueDate) {
      return res.status(400).json({
        message: 'customerId, principalAmount, interestRate, totalAmount, and dueDate are required.',
      });
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: 'dueDate must be a valid date.' });
    }

    const principal = parseDecimal(principalAmount, 'principalAmount');
    const rate = parseDecimal(interestRate, 'interestRate');
    const total = parseDecimal(totalAmount, 'totalAmount');
    if (principal.error) return res.status(400).json({ message: principal.error });
    if (rate.error) return res.status(400).json({ message: rate.error });
    if (total.error) return res.status(400).json({ message: total.error });

    if (principal.decimal.lt(0) || rate.decimal.lt(0) || total.decimal.lt(0)) {
      return res.status(400).json({ message: 'Amount fields cannot be negative.' });
    }

    let paid = new Prisma.Decimal(0);
    if (amountPaid !== undefined) {
      const parsedPaid = parseDecimal(amountPaid, 'amountPaid');
      if (parsedPaid.error) return res.status(400).json({ message: parsedPaid.error });
      if (parsedPaid.decimal.lt(0)) {
        return res.status(400).json({ message: 'amountPaid cannot be negative.' });
      }
      if (parsedPaid.decimal.gt(total.decimal)) {
        return res.status(400).json({ message: 'amountPaid cannot exceed totalAmount.' });
      }
      paid = parsedPaid.decimal;
    }

    let outstanding = total.decimal.sub(paid);
    if (outstandingBalance !== undefined) {
      const parsedOutstanding = parseDecimal(outstandingBalance, 'outstandingBalance');
      if (parsedOutstanding.error) return res.status(400).json({ message: parsedOutstanding.error });
      if (parsedOutstanding.decimal.lt(0)) {
        return res.status(400).json({ message: 'outstandingBalance cannot be negative.' });
      }
      outstanding = parsedOutstanding.decimal;
    }

    if (status && !LOAN_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${LOAN_STATUSES.join(', ')}.`,
      });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found.' });
    }

    const loan = await prisma.loan.create({
      data: {
        customerId,
        principalAmount: principal.decimal,
        interestRate: rate.decimal,
        totalAmount: total.decimal,
        amountPaid: paid,
        outstandingBalance: outstanding,
        dueDate: parsedDueDate,
        status: status || 'ACTIVE',
      },
      include: loanInclude,
    });

    return res.status(201).json({ loan: serializeLoan(loan) });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Create loan error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/loans/:id
 */
async function updateLoan(req, res) {
  try {
    const existing = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    const { customerId, principalAmount, interestRate, totalAmount, dueDate, amountPaid, outstandingBalance, status } = req.body;
    const data = {};

    if (customerId !== undefined) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(400).json({ message: 'Customer not found.' });
      }
      data.customerId = customerId;
    }

    if (principalAmount !== undefined) {
      const parsed = parseDecimal(principalAmount, 'principalAmount');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      if (parsed.decimal.lt(0)) return res.status(400).json({ message: 'principalAmount cannot be negative.' });
      data.principalAmount = parsed.decimal;
    }

    if (interestRate !== undefined) {
      const parsed = parseDecimal(interestRate, 'interestRate');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      if (parsed.decimal.lt(0)) return res.status(400).json({ message: 'interestRate cannot be negative.' });
      data.interestRate = parsed.decimal;
    }

    if (totalAmount !== undefined) {
      const parsed = parseDecimal(totalAmount, 'totalAmount');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      if (parsed.decimal.lt(0)) return res.status(400).json({ message: 'totalAmount cannot be negative.' });
      data.totalAmount = parsed.decimal;
    }

    if (amountPaid !== undefined) {
      const parsed = parseDecimal(amountPaid, 'amountPaid');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      if (parsed.decimal.lt(0)) return res.status(400).json({ message: 'amountPaid cannot be negative.' });
      data.amountPaid = parsed.decimal;
    }

    if (outstandingBalance !== undefined) {
      const parsed = parseDecimal(outstandingBalance, 'outstandingBalance');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      if (parsed.decimal.lt(0)) return res.status(400).json({ message: 'outstandingBalance cannot be negative.' });
      data.outstandingBalance = parsed.decimal;
    } else if (data.totalAmount !== undefined || data.amountPaid !== undefined) {
      const nextTotal = new Prisma.Decimal(data.totalAmount ?? existing.totalAmount);
      const nextPaid = new Prisma.Decimal(data.amountPaid ?? existing.amountPaid);
      // Validate cross-field constraint
      if (nextPaid.gt(nextTotal)) {
        return res.status(400).json({ message: 'amountPaid cannot exceed totalAmount.' });
      }
      const computed = nextTotal.sub(nextPaid);
      data.outstandingBalance = computed.lt(0) ? new Prisma.Decimal(0) : computed;
    }


    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: 'dueDate must be a valid date.' });
      }
      data.dueDate = parsedDueDate;
    }

    if (status !== undefined) {
      if (!LOAN_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Allowed values: ${LOAN_STATUSES.join(', ')}.`,
        });
      }
      data.status = status;
    }

    const loan = await prisma.loan.update({
      where: { id: req.params.id },
      data,
      include: loanInclude,
    });

    return res.status(200).json({ loan: serializeLoan(loan) });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Update loan error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * DELETE /api/v1/loans/:id
 */
async function deleteLoan(req, res) {
  try {
    const existing = await prisma.loan.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Loan not found.' });
    }

    await prisma.loan.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Loan deleted.' });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Delete loan error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  listLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
};
