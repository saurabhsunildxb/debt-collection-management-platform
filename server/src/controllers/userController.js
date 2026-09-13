// server/src/controllers/userController.js
const bcrypt = require('bcryptjs');
const prisma = require('../config/prismaClient');
const { agentSelect } = require('../utils/access');
const { handlePrismaError } = require('../utils/prismaErrors');

const ROLES = ['ADMIN', 'MANAGER', 'COLLECTION_AGENT'];
const CREATABLE_ROLES = ['MANAGER', 'COLLECTION_AGENT'];

/**
 * GET /api/v1/users
 * Query: role?
 * ADMIN / MANAGER only — used for agent assignment dropdowns.
 */
async function listUsers(req, res) {
  try {
    const where = {};

    if (req.query.role) {
      const role = String(req.query.role).toUpperCase();
      if (!ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Allowed values: ${ROLES.join(', ')}.`,
        });
      }
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: { ...agentSelect, isActive: true },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/users/admin
 * ADMIN only — full list for User Management.
 */
async function adminListUsers(req, res) {
  try {
    const where = {};
    if (req.query.search) {
      const s = String(req.query.search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (req.query.role) where.role = String(req.query.role).toUpperCase();
    if (req.query.status) where.isActive = req.query.status === 'active';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { assignedCustomers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('Admin list users error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /api/v1/users
 * ADMIN only — create an employee.
 */
async function createUser(req, res) {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    if (!CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Cannot create users with that role.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        role,
        password: hashedPassword,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Create user error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/users/:id
 * ADMIN only — update an employee.
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, forceUnassign } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { assignedCustomers: true } } },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (id === req.user.id) {
      if (isActive === false) return res.status(400).json({ message: 'Cannot deactivate yourself.' });
      if (role && role !== targetUser.role) return res.status(400).json({ message: 'Cannot change your own role.' });
    }

    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    // Handle role transition away from COLLECTION_AGENT safely
    if (role && role !== 'COLLECTION_AGENT' && targetUser.role === 'COLLECTION_AGENT') {
      if (targetUser._count.assignedCustomers > 0) {
        if (!forceUnassign) {
          return res.status(400).json({
            message: 'AGENT_HAS_CUSTOMERS',
            count: targetUser._count.assignedCustomers,
            error: `Agent has ${targetUser._count.assignedCustomers} assigned customers. Reassign them first, or confirm to unassign them.`,
          });
        } else {
          // Explicitly unassign customers
          await prisma.customer.updateMany({
            where: { assignedAgentId: id },
            data: { assignedAgentId: null },
          });
        }
      }
    }

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (email !== undefined) data.email = String(email).trim().toLowerCase();
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    if (data.email && data.email !== targetUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use.' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return res.status(200).json({ user });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Update user error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/users/:id/password
 * ADMIN only — reset password.
 */
async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/users/:id/customers
 * ADMIN only — get assigned customers for a specific agent.
 */
async function getAgentCustomers(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const customers = await prisma.customer.findMany({
      where: { assignedAgentId: id },
      select: { id: true, fullName: true, email: true, phone: true },
      orderBy: { fullName: 'asc' },
    });

    return res.status(200).json({ customers });
  } catch (err) {
    console.error('Get agent customers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/users/:id/customers
 * ADMIN only — assign customers to an agent.
 */
async function updateAgentCustomers(req, res) {
  try {
    const { id } = req.params;
    const { customerIds } = req.body;

    if (!Array.isArray(customerIds)) {
      return res.status(400).json({ message: 'customerIds must be an array.' });
    }

    const agent = await prisma.user.findUnique({ where: { id } });
    if (!agent) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (agent.role !== 'COLLECTION_AGENT') {
      return res.status(400).json({ message: 'Customers can only be assigned to COLLECTION_AGENTs.' });
    }

    // Run in a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Unassign customers that currently belong to this agent but are NOT in the new list
      await tx.customer.updateMany({
        where: { assignedAgentId: id, id: { notIn: customerIds } },
        data: { assignedAgentId: null },
      });

      // 2. Assign the new list of customers to this agent
      if (customerIds.length > 0) {
        await tx.customer.updateMany({
          where: { id: { in: customerIds } },
          data: { assignedAgentId: id },
        });
      }
    });

    return res.status(200).json({ message: 'Assigned customers updated successfully.' });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Update agent customers error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  listUsers,
  adminListUsers,
  createUser,
  updateUser,
  resetPassword,
  getAgentCustomers,
  updateAgentCustomers,
};
