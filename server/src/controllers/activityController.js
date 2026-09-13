// server/src/controllers/activityController.js
const prisma = require('../config/prismaClient');
const { getPagination, paginationMeta } = require('../utils/pagination');
const {
  activityAccessWhere,
  agentDenied,
  isCollectionAgent,
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
  agentSelect,
} = require('../utils/access');
const { handlePrismaError } = require('../utils/prismaErrors');

const activityInclude = {
  customer: {
    select: { id: true, fullName: true, phone: true, assignedAgentId: true },
  },
  agent: { select: agentSelect },
};

function parseOptionalDate(value, fieldName) {
  if (value === null || value === '') return { date: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${fieldName} must be a valid date.` };
  }
  return { date };
}

/**
 * GET /api/v1/activities
 * Query: page, limit
 */
async function listActivities(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const where = { ...activityAccessWhere(req.user) };

    const [activities, total] = await Promise.all([
      prisma.collectionActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: activityInclude,
      }),
      prisma.collectionActivity.count({ where }),
    ]);

    return res.status(200).json({
      activities,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (err) {
    console.error('List activities error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * GET /api/v1/activities/:id
 */
async function getActivity(req, res) {
  try {
    const activity = await prisma.collectionActivity.findUnique({
      where: { id: req.params.id },
      include: activityInclude,
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found.' });
    }

    if (agentDenied(activity.customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ activity });
  } catch (err) {
    console.error('Get activity error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * POST /api/v1/activities
 * Body: { customerId, activityType, outcome, notes?, followUpDate?, agentId? }
 * Collection agents are always recorded as the acting agent and may only log for assigned customers.
 */
async function createActivity(req, res) {
  try {
    const { customerId, activityType, outcome, notes, followUpDate, agentId } = req.body;

    if (!customerId || !activityType || !outcome) {
      return res.status(400).json({ message: 'customerId, activityType, and outcome are required.' });
    }

    if (!ACTIVITY_TYPES.includes(activityType)) {
      return res.status(400).json({
        message: `Invalid activityType. Allowed values: ${ACTIVITY_TYPES.join(', ')}.`,
      });
    }

    if (!ACTIVITY_OUTCOMES.includes(outcome)) {
      return res.status(400).json({
        message: `Invalid outcome. Allowed values: ${ACTIVITY_OUTCOMES.join(', ')}.`,
      });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found.' });
    }

    if (agentDenied(customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    let resolvedAgentId = req.user.id;
    if (!isCollectionAgent(req.user) && agentId) {
      const agent = await prisma.user.findUnique({ where: { id: agentId } });
      if (!agent) {
        return res.status(400).json({ message: 'agentId is invalid.' });
      }
      resolvedAgentId = agentId;
    }

    let followUp = undefined;
    if (followUpDate !== undefined) {
      const parsed = parseOptionalDate(followUpDate, 'followUpDate');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      followUp = parsed.date;
    }

    const activity = await prisma.collectionActivity.create({
      data: {
        customerId,
        agentId: resolvedAgentId,
        activityType,
        outcome,
        notes: notes ? String(notes) : null,
        followUpDate: followUp,
      },
      include: activityInclude,
    });

    return res.status(201).json({ activity });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Create activity error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * PATCH /api/v1/activities/:id
 */
async function updateActivity(req, res) {
  try {
    const existing = await prisma.collectionActivity.findUnique({
      where: { id: req.params.id },
      include: { customer: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Activity not found.' });
    }

    // COLLECTION_AGENT: customer must be assigned to this agent
    if (agentDenied(existing.customer.assignedAgentId, req.user)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // COLLECTION_AGENT: can only update activities they personally logged
    if (isCollectionAgent(req.user) && existing.agentId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only edit activities you logged.' });
    }

    const { customerId, activityType, outcome, notes, followUpDate, agentId } = req.body;
    const data = {};

    if (customerId !== undefined) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(400).json({ message: 'Customer not found.' });
      }
      if (agentDenied(customer.assignedAgentId, req.user)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      data.customerId = customerId;
    }

    if (activityType !== undefined) {
      if (!ACTIVITY_TYPES.includes(activityType)) {
        return res.status(400).json({
          message: `Invalid activityType. Allowed values: ${ACTIVITY_TYPES.join(', ')}.`,
        });
      }
      data.activityType = activityType;
    }

    if (outcome !== undefined) {
      if (!ACTIVITY_OUTCOMES.includes(outcome)) {
        return res.status(400).json({
          message: `Invalid outcome. Allowed values: ${ACTIVITY_OUTCOMES.join(', ')}.`,
        });
      }
      data.outcome = outcome;
    }

    if (notes !== undefined) {
      data.notes = notes ? String(notes) : null;
    }

    if (followUpDate !== undefined) {
      const parsed = parseOptionalDate(followUpDate, 'followUpDate');
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      data.followUpDate = parsed.date;
    }

    if (agentId !== undefined) {
      if (isCollectionAgent(req.user)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      const agent = await prisma.user.findUnique({ where: { id: agentId } });
      if (!agent) {
        return res.status(400).json({ message: 'agentId is invalid.' });
      }
      data.agentId = agentId;
    }

    const activity = await prisma.collectionActivity.update({
      where: { id: req.params.id },
      data,
      include: activityInclude,
    });

    return res.status(200).json({ activity });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Update activity error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/**
 * DELETE /api/v1/activities/:id
 */
async function deleteActivity(req, res) {
  try {
    const existing = await prisma.collectionActivity.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Activity not found.' });
    }

    await prisma.collectionActivity.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Activity deleted.' });
  } catch (err) {
    if (handlePrismaError(err, res)) return;
    console.error('Delete activity error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
};
