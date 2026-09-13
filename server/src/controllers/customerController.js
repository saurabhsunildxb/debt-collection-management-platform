// server/src/controllers/customerController.js
const prisma = require('../config/prismaClient');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { customerAccessWhere, agentDenied, agentSelect } = require('../utils/access');
const { handlePrismaError, serializeLoan } = require('../utils/prismaErrors');

const assignedAgentInclude = { assignedAgent: { select: agentSelect } };

/**
 * GET /api/v1/customers
 * Query: page, limit, search
 */
async function listCustomers(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where = {
      ...customerAccessWhere(req.user),
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nationalId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: assignedAgentInclude,
      }),
      prisma.customer.count({ where }),
    ]);

    return res.status(200).json({
      customers,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error('List customers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/customers/:id
 */
async function getCustomer(req, res) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        ...assignedAgentInclude,
        loans: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    if (agentDenied(customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({
      customer: {
        ...customer,
        loans: customer.loans.map(serializeLoan),
      },
    });
  } catch (err) {
    console.error('Get customer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /api/v1/customers
 * Body: { fullName, phone, email?, address?, nationalId?, assignedAgentId? }
 */
async function createCustomer(req, res) {
  try {
    const { fullName, phone, email, address, nationalId, assignedAgentId } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'fullName and phone are required.' });
    }

    if (assignedAgentId) {
      const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
      if (!agent || agent.role !== 'COLLECTION_AGENT') {
        return res.status(400).json({ message: 'assignedAgentId must belong to a collection agent.' });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: String(fullName).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        nationalId: nationalId ? String(nationalId).trim() : null,
        assignedAgentId: assignedAgentId || null,
      },
      include: assignedAgentInclude,
    });

    return res.status(201).json({ customer });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Create customer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/customers/:id
 */
async function updateCustomer(req, res) {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const { fullName, phone, email, address, nationalId, assignedAgentId } = req.body;
    const data = {};

    if (fullName !== undefined) data.fullName = String(fullName).trim();
    if (phone !== undefined) data.phone = String(phone).trim();
    if (email !== undefined) data.email = email ? String(email).trim() : null;
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (nationalId !== undefined) data.nationalId = nationalId ? String(nationalId).trim() : null;

    if (assignedAgentId !== undefined) {
      if (assignedAgentId === null || assignedAgentId === '') {
        data.assignedAgentId = null;
      } else {
        const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } });
        if (!agent || agent.role !== 'COLLECTION_AGENT') {
          return res.status(400).json({ message: 'assignedAgentId must belong to a collection agent.' });
        }
        data.assignedAgentId = assignedAgentId;
      }
    }

    if (data.fullName === '') {
      return res.status(400).json({ message: 'fullName cannot be empty.' });
    }
    if (data.phone === '') {
      return res.status(400).json({ message: 'phone cannot be empty.' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
      include: assignedAgentInclude,
    });

    return res.status(200).json({ customer });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Update customer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * DELETE /api/v1/customers/:id
 */
async function deleteCustomer(req, res) {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    await prisma.customer.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Customer deleted.' });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Delete customer error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
