const service = require('./catalog.service');
const { ok, created } = require('../../utils/apiResponse');
const { toHalalas } = require('../../utils/money');
const repo = require('./catalog.repository');
const { recordAudit } = require('../../db/auditLog');

async function listCategories(req, res) {
  ok(res, await service.getCategories());
}

async function listProducts(req, res) {
  ok(res, await service.getProducts({ category: req.query.category }));
}

async function getProduct(req, res) {
  ok(res, await service.getProduct(req.params.idOrSlug));
}

/** إنشاء منتج — محمي بصلاحية products:write (موظف/مدير فقط) */
async function createProduct(req, res) {
  const b = req.body;
  const product = await repo.createProduct({
    slug: b.slug,
    categoryId: b.categoryId,
    titleAr: b.titleAr,
    titleEn: b.titleEn,
    era: b.era,
    origin: b.origin,
    material: b.material,
    condition: b.condition,
    descriptionAr: b.descriptionAr,
    descriptionEn: b.descriptionEn,
    priceHalalas: toHalalas(b.price),
    oldPriceHalalas: b.oldPrice ? toHalalas(b.oldPrice) : null,
    stock: b.stock,
    badge: b.badge,
    icon: b.icon,
    imageUrl: b.imageUrl,
  });
  recordAudit({ userId: req.user.id, action: 'PRODUCT_CREATED', entityType: 'product', entityId: product.id, req });
  created(res, await service.getProduct(product.id));
}

async function updateProduct(req, res) {
  const fields = {};
  const map = {
    titleAr: 'title_ar', titleEn: 'title_en', era: 'era', origin: 'origin', material: 'material',
    condition: 'condition_text', descriptionAr: 'description_ar', descriptionEn: 'description_en',
    stock: 'stock', badge: 'badge', icon: 'icon', imageUrl: 'image_url', isActive: 'is_active',
  };
  for (const [k, col] of Object.entries(map)) if (req.body[k] !== undefined) fields[col] = req.body[k];
  if (req.body.price !== undefined) fields.price_halalas = toHalalas(req.body.price);
  if (req.body.oldPrice !== undefined) fields.old_price_halalas = req.body.oldPrice ? toHalalas(req.body.oldPrice) : null;

  const updated = await repo.updateProductFields(req.params.id, fields);
  recordAudit({ userId: req.user.id, action: 'PRODUCT_UPDATED', entityType: 'product', entityId: req.params.id, req, metadata: fields });
  ok(res, updated);
}

module.exports = { listCategories, listProducts, getProduct, createProduct, updateProduct };
