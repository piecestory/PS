const router = require('express').Router();
const { z } = require('zod');
const service = require('./settings.service');
const validate = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { ok } = require('../../utils/apiResponse');

router.get('/', async (req, res) => ok(res, await service.getPublicSettings()));

const updateSchema = z.object({
  body: z.object({ key: z.string().min(1), value: z.string().min(0).max(500) }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

router.patch('/', requireAuth, requirePermission('settings:write'), validate(updateSchema), async (req, res) => {
  ok(res, { key: req.body.key, value: await service.updateSetting(req.body.key, req.body.value, req) });
});

module.exports = router;
