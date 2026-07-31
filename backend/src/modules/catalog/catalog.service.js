const repo = require('./catalog.repository');
const { toSar } = require('../../utils/money');
const { ApiError } = require('../../utils/apiResponse');

function toPublicCategory(c) {
  return { id: c.id, slug: c.slug, nameAr: c.name_ar, nameEn: c.name_en, icon: c.icon };
}

/** يحوّل صف المنتج (snake_case + هللة) إلى الشكل الذي تتوقعه الواجهة الأمامية الحالية (price بالريال) */
function toPublicProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title_ar,
    titleEn: p.title_en || null,
    category: p.category_name_ar,
    categoryEn: p.category_name_en || null,
    categorySlug: p.category_slug,
    era: p.era,
    origin: p.origin,
    material: p.material,
    condition: p.condition_text,
    description: p.description_ar,
    descriptionEn: p.description_en || null,
    price: toSar(p.price_halalas),
    oldPrice: p.old_price_halalas ? toSar(p.old_price_halalas) : null,
    image: p.image_url,
    icon: p.icon,
    badge: p.badge,
    stock: p.stock,
  };
}

async function getCategories() {
  return (await repo.listCategories()).map(toPublicCategory);
}

async function getProducts({ category } = {}) {
  return (await repo.listProducts({ categorySlug: category })).map(toPublicProduct);
}

async function getProduct(idOrSlug) {
  const p = await repo.findProductBySlugOrId(idOrSlug);
  if (!p || !p.is_active) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'القطعة غير موجودة أو لم تعد متوفرة');
  return toPublicProduct(p);
}

module.exports = { getCategories, getProducts, getProduct, toPublicProduct, toPublicCategory };
