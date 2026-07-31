const { getDb } = require('../../db/connection');
const { newId } = require('../../utils/ids');

async function listCategories() {
  return getDb().query('SELECT * FROM categories ORDER BY name_ar', []);
}

async function listProducts({ categorySlug, onlyActive = true } = {}) {
  const db = getDb();
  let sql = `SELECT p.*, c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
             FROM products p JOIN categories c ON c.id = p.category_id WHERE 1=1`;
  const params = [];
  if (onlyActive) sql += ' AND p.is_active = 1';
  if (categorySlug) {
    sql += ' AND c.slug = ?';
    params.push(categorySlug);
  }
  sql += ' ORDER BY p.created_at DESC';
  return db.query(sql, params);
}

async function findProductBySlugOrId(idOrSlug) {
  const sql = `SELECT p.*, c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
               FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ? OR p.slug = ?`;
  return getDb().queryOne(sql, [idOrSlug, idOrSlug]);
}

async function findProductById(id) {
  return getDb().queryOne('SELECT * FROM products WHERE id = ?', [id]);
}

async function createProduct(p) {
  const id = newId();
  await getDb().execute(
    `INSERT INTO products
     (id, slug, category_id, title_ar, title_en, era, origin, material, condition_text,
      description_ar, description_en, price_halalas, old_price_halalas, stock, badge, icon, image_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, p.slug, p.categoryId, p.titleAr, p.titleEn || null, p.era || null, p.origin || null,
      p.material || null, p.condition || null, p.descriptionAr || null, p.descriptionEn || null,
      p.priceHalalas, p.oldPriceHalalas || null, p.stock ?? 0, p.badge || null, p.icon || null, p.imageUrl || null,
    ]
  );
  return findProductById(id);
}

async function updateProductFields(id, fields) {
  const allowed = [
    'title_ar', 'title_en', 'era', 'origin', 'material', 'condition_text', 'description_ar',
    'description_en', 'price_halalas', 'old_price_halalas', 'stock', 'badge', 'icon', 'image_url', 'is_active',
  ];
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (!sets.length) return findProductById(id);
  params.push(id);
  await getDb().execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
  return findProductById(id);
}

/** ينقص المخزون بأمان، ويفشل إن لم يكن هناك كمية كافية (يمنع البيع الوهمي) */
async function decrementStockIfAvailable(productId, quantity) {
  const result = await getDb().execute(
    `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
    [quantity, productId, quantity]
  );
  return result.changes === 1;
}

module.exports = {
  listCategories,
  listProducts,
  findProductBySlugOrId,
  findProductById,
  createProduct,
  updateProductFields,
  decrementStockIfAvailable,
};
