const router = require('express').Router();
const controller = require('./auctions.controller');
const validate = require('../../middleware/validate');
const { placeBidSchema, createAuctionSchema } = require('./auctions.validators');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { bidLimiter } = require('../../middleware/rateLimit');

router.get('/', controller.listAuctions);
router.get('/:id', controller.getAuction);
router.post('/:id/bids', requireAuth, bidLimiter, validate(placeBidSchema), controller.placeBid);
router.post('/', requireAuth, requirePermission('auctions:write'), validate(createAuctionSchema), controller.createAuction);

module.exports = router;
