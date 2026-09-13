// server/src/controllers/dashboardController.js
const prisma = require('../config/prismaClient');
const {
  isCollectionAgent,
  customerAccessWhere,
  loanAccessWhere,
  repaymentAccessWhere,
  activityAccessWhere,
  LOAN_STATUSES,
  agentSelect,
} = require('../utils/access');
const { toNumber } = require('../utils/prismaErrors');

function money(value) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function collectionRate(collected, total) {
  const collectedAmount = money(collected);
  const totalAmount = money(total);
  if (totalAmount <= 0) return 0;
  return Math.round((collectedAmount / totalAmount) * 10000) / 100;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return startOfMonth(date instanceof Date ? date : new Date(date)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function emptyStatusCounts() {
  return LOAN_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
}

function buildMonthBuckets(rangeStart) {
  const buckets = [];
  for (let i = 0; i < 6; i += 1) {
    const monthDate = addMonths(rangeStart, i);
    buckets.push({
      month: monthKey(monthDate),
      label: monthLabel(monthDate),
      amount: 0,
    });
  }
  return buckets;
}

async function getMonthlyCollectionRows(agentId, rangeStart, rangeEnd) {
  if (agentId) {
    return prisma.$queryRaw`
      SELECT TO_CHAR(date_trunc('month', r."paymentDate"), 'YYYY-MM') AS month,
             COALESCE(SUM(r.amount), 0) AS total
      FROM "Repayment" r
      INNER JOIN "Loan" l ON r."loanId" = l.id
      INNER JOIN "Customer" c ON l."customerId" = c.id
      WHERE r."paymentDate" >= ${rangeStart}
        AND r."paymentDate" < ${rangeEnd}
        AND c."assignedAgentId" = ${agentId}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  return prisma.$queryRaw`
    SELECT TO_CHAR(date_trunc('month', r."paymentDate"), 'YYYY-MM') AS month,
           COALESCE(SUM(r.amount), 0) AS total
    FROM "Repayment" r
    WHERE r."paymentDate" >= ${rangeStart}
      AND r."paymentDate" < ${rangeEnd}
    GROUP BY 1
    ORDER BY 1
  `;
}

async function getAgentPerformanceRows() {
  return prisma.$queryRaw`
    SELECT
      u.id,
      u.name,
      COUNT(DISTINCT c.id)::int AS "assignedCustomers",
      COUNT(DISTINCT l.id)::int AS "loanCount",
      COALESCE(SUM(l."amountPaid"), 0) AS "totalCollected",
      COALESCE(SUM(l."outstandingBalance"), 0) AS "totalOutstanding",
      COALESCE(SUM(l."totalAmount"), 0) AS "totalAmount"
    FROM "User" u
    LEFT JOIN "Customer" c ON c."assignedAgentId" = u.id
    LEFT JOIN "Loan" l ON l."customerId" = c.id
    WHERE u.role = 'COLLECTION_AGENT'
    GROUP BY u.id, u.name
    ORDER BY u.name ASC
  `;
}

/**
 * GET /api/v1/dashboard/stats
 * Role-scoped collection dashboard metrics.
 */
async function getDashboardStats(req, res) {
  try {
    const agentScoped = isCollectionAgent(req.user);
    const scopedAgentId = agentScoped ? req.user.id : null;

    const customerWhere = customerAccessWhere(req.user);
    const loanWhere = loanAccessWhere(req.user);
    const repaymentWhere = repaymentAccessWhere(req.user);
    const activityWhere = activityAccessWhere(req.user);

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = addMonths(currentMonthStart, -1);
    const nextMonthStart = addMonths(currentMonthStart, 1);
    const sixMonthStart = addMonths(currentMonthStart, -5);
    const monthBuckets = buildMonthBuckets(sixMonthStart);

    const queries = [
      prisma.customer.count({ where: customerWhere }),
      prisma.customer.count({
        where: {
          ...customerWhere,
          loans: { some: { status: { not: 'CLOSED' } } },
        },
      }),
      prisma.customer.count({
        where: {
          ...customerWhere,
          loans: { some: { status: 'OVERDUE' } },
        },
      }),
      prisma.loan.count({ where: loanWhere }),
      prisma.loan.aggregate({
        where: loanWhere,
        _sum: {
          outstandingBalance: true,
          amountPaid: true,
          totalAmount: true,
        },
      }),
      prisma.loan.aggregate({
        where: { ...loanWhere, status: 'OVERDUE' },
        _sum: { outstandingBalance: true },
      }),
      prisma.loan.groupBy({
        by: ['status'],
        where: loanWhere,
        _count: { _all: true },
      }),
      prisma.repayment.count({ where: repaymentWhere }),
      prisma.repayment.aggregate({
        where: repaymentWhere,
        _sum: { amount: true },
      }),
      prisma.repayment.aggregate({
        where: {
          ...repaymentWhere,
          paymentDate: { gte: currentMonthStart, lt: nextMonthStart },
        },
        _sum: { amount: true },
      }),
      prisma.repayment.aggregate({
        where: {
          ...repaymentWhere,
          paymentDate: { gte: previousMonthStart, lt: currentMonthStart },
        },
        _sum: { amount: true },
      }),
      getMonthlyCollectionRows(scopedAgentId, sixMonthStart, nextMonthStart),
      prisma.collectionActivity.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, assignedAgentId: true },
          },
          agent: { select: agentSelect },
        },
      }),
    ];

    if (!agentScoped) {
      queries.push(getAgentPerformanceRows());
    }

    const results = await Promise.all(queries);

    const [
      totalCustomers,
      activeCustomers,
      overdueCustomers,
      loanCount,
      loanTotals,
      overdueTotals,
      loansByStatus,
      repaymentCount,
      repaymentTotals,
      currentMonthTotals,
      previousMonthTotals,
      monthlyRows,
      recentActivities,
    ] = results;

    const byStatus = emptyStatusCounts();
    for (const row of loansByStatus) {
      byStatus[row.status] = row._count._all;
    }

    const monthlyMap = new Map(monthBuckets.map((bucket) => [bucket.month, bucket]));
    for (const row of monthlyRows) {
      const key = typeof row.month === 'string' ? row.month.trim() : monthKey(row.month);
      const bucket = monthlyMap.get(key);
      if (bucket) {
        bucket.amount = money(row.total);
      }
    }

    const totalOutstanding = money(loanTotals._sum.outstandingBalance);
    const totalCollected = money(loanTotals._sum.amountPaid);
    const totalLoanAmount = money(loanTotals._sum.totalAmount);

    const payload = {
      summary: {
        totalCustomers,
        totalLoans: loanCount,
        totalOutstanding,
        totalCollected,
        totalOverdue: money(overdueTotals._sum.outstandingBalance),
        collectionRate: collectionRate(totalCollected, totalLoanAmount),
      },
      loans: {
        active: byStatus.ACTIVE,
        closed: byStatus.CLOSED,
        overdue: byStatus.OVERDUE,
        byStatus,
      },
      repayments: {
        totalRepayments: repaymentCount,
        totalAmountCollected: money(repaymentTotals._sum.amount),
        currentMonthCollected: money(currentMonthTotals._sum.amount),
        previousMonthCollected: money(previousMonthTotals._sum.amount),
        monthlyCollections: monthBuckets,
      },
      customers: {
        totalCustomers,
        activeCustomers,
        overdueCustomers,
      },
      recentActivities,
    };

    if (!agentScoped) {
      payload.agentPerformance = (results[13] || []).map((row) => ({
        agentId: row.id,
        name: row.name,
        assignedCustomers: Number(row.assignedCustomers) || 0,
        loanCount: Number(row.loanCount) || 0,
        totalCollected: money(row.totalCollected),
        totalOutstanding: money(row.totalOutstanding),
        collectionRate: collectionRate(row.totalCollected, row.totalAmount),
      }));
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = { getDashboardStats };
