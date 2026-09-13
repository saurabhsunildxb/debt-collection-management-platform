// server/src/routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
} = require('../controllers/activityController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), listActivities);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), getActivity);
router.post('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), createActivity);
router.patch('/:id', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), updateActivity);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteActivity);

module.exports = router;
