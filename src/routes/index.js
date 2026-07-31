const router = require('express').Router();

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/catalog', require('../modules/catalog/catalog.routes'));
router.use('/auctions', require('../modules/auctions/auctions.routes'));
router.use('/orders', require('../modules/orders/orders.routes'));
router.use('/payments', require('../modules/payments/payments.routes'));
router.use('/settings', require('../modules/settings/settings.routes'));
router.use('/admin', require('../modules/admin/admin.routes'));

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

module.exports = router;
