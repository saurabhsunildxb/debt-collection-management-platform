// server/src/controllers/userController.js
const prisma = require('../config/prismaClient');
const { agentSelect } = require('../utils/access');

const ROLES = ['ADMIN', 'MANAGER', 'COLLECTION_AGENT'];

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

module.exports = { listUsers };
