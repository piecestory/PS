const router = require('express').Router();
const controller = require('./orders.controller');
const validate = require('../../middleware/validate');
const { checkoutSchema, updateStatusSchema } = require('./orders.validators');
const { requireAuth, attachUserIfPresent } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

// الترتيب مهم: المسارات الثابتة (mine, all) يجب أن تسبق المسار الديناميكي (:id)
router.get('/mine', requireAuth, controller.myOrders);
router.get('/all', requireAuth, requirePermission('orders:read:all'), controller.allOrders);
router.get('/by-number/:orderNumber', attachUserIfPresent, controller.getByNumber);

router.post('/', attachUserIfPresent, validate(checkoutSchema), controller.checkout);
router.get('/:id', attachUserIfPresent, controller.getOrder);
router.patch('/:id/status', requireAuth, requirePermission('orders:write:status'), validate(updateStatusSchema), controller.updateStatus);

module.exports = router;
