const router = require('express').Router();
const controller = require('./catalog.controller');
const validate = require('../../middleware/validate');
const { createProductSchema, updateProductSchema } = require('./catalog.validators');
const { attachUserIfPresent, requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

router.get('/categories', controller.listCategories);
router.get('/products', attachUserIfPresent, controller.listProducts);
router.get('/products/:idOrSlug', attachUserIfPresent, controller.getProduct);

router.post(
  '/products',
  requireAuth,
  requirePermission('products:write'),
  validate(createProductSchema),
  controller.createProduct
);
router.patch(
  '/products/:id',
  requireAuth,
  requirePermission('products:write'),
  validate(updateProductSchema),
  controller.updateProduct
);

module.exports = router;
