const repo = require('./orders.repository');
const catalogRepo = require('../catalog/catalog.repository');
const settingsService = require('../settings/settings.service');
const { toSar } = require('../../utils/money');
const { newOrderNumber } = require('../../utils/ids');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../db/auditLog');

/**
 * ينشئ طلبًا من عربة تسوّق يرسلها العميل (معرّفات منتجات + كميات فقط).
 * ⚠️ نقطة أمان جوهرية: لا نستقبل أي سعر من المتصفح إطلاقًا. لكل بند
 * نُعيد جلب السعر والمخزون الحاليين من قاعدة البيانات مباشرة، لأن أي
 * سعر يُرسَل من العميل يمكن التلاعب به بسهولة. العنوان وبنود الطلب
 * والطلب نفسه يُنشؤون معًا ضمن معاملة واحدة (repo.createOrderWithItems) —
 * إمّا يكتمل كل شيء أو لا شيء منه، فلا يبقى عنوان يتيم بلا طلب.
 */
async function checkout({ items, address, guestEmail, guestPhone, customerNote }, req) {
  if (!items?.length) throw new ApiError(400, 'EMPTY_CART', 'السلة فارغة');

  const userId = req.user?.id || null;
  const resolvedItems = [];
  let subtotalHalalas = 0;

  for (const { productId, quantity } of items) {
    const product = await catalogRepo.findProductById(productId);
    if (!product || !product.is_active) {
      throw new ApiError(400, 'PRODUCT_UNAVAILABLE', `إحدى القطع في سلتك لم تعد متوفرة`);
    }
    if (product.stock < quantity) {
      throw new ApiError(400, 'INSUFFICIENT_STOCK', `الكمية المطلوبة من "${product.title_ar}" غير متوفرة حاليًا`);
    }
    const lineTotal = product.price_halalas * quantity;
    subtotalHalalas += lineTotal;
    resolvedItems.push({
      productId: product.id,
      titleAr: product.title_ar,
      titleEn: product.title_en,
      unitPriceHalalas: product.price_halalas,
      quantity,
      lineTotalHalalas: lineTotal,
    });
  }

  const shippingHalalas = await settingsService.getShippingHalalas(subtotalHalalas);
  const totalHalalas = subtotalHalalas + shippingHalalas;

  let orderId;
  // إعادة محاولة نادرة جدًا فقط في حال تصادم رقم طلب عشوائي (احتمال شبه معدوم لكنه مُعالَج بأمان)
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = newOrderNumber();
    try {
      orderId = await repo.createOrderWithItems({
        orderNumber,
        userId,
        guestEmail: userId ? null : guestEmail,
        guestPhone: userId ? null : guestPhone,
        address,
        items: resolvedItems,
        subtotalHalalas,
        shippingHalalas,
        totalHalalas,
        customerNote,
      });
      break;
    } catch (e) {
      const isDup = /UNIQUE|Duplicate entry/i.test(e.message || '');
      if (!isDup || attempt === 2) throw e;
    }
  }

  recordAudit({ userId, action: 'ORDER_CREATED', entityType: 'order', entityId: orderId, req, metadata: { totalHalalas } });

  return getOrder(orderId);
}

async function toPublicOrder(order) {
  const itemRows = await repo.listItemsForOrder(order.id);
  const items = itemRows.map((i) => ({
    productId: i.product_id,
    title: i.title_snapshot_ar,
    titleEn: i.title_snapshot_en,
    unitPrice: toSar(i.unit_price_halalas),
    quantity: i.quantity,
    lineTotal: toSar(i.line_total_halalas),
  }));
  const address = await repo.findAddressById(order.address_id);
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    subtotal: toSar(order.subtotal_halalas),
    shipping: toSar(order.shipping_halalas),
    total: toSar(order.total_halalas),
    currency: order.currency,
    createdAt: order.created_at,
    items,
    address: address && {
      fullName: address.full_name,
      phone: address.phone,
      city: address.city,
      district: address.district,
      street: address.street,
      buildingNo: address.building_no,
      additionalInfo: address.additional_info,
    },
  };
}

async function getOrder(id) {
  const order = await repo.findOrderById(id);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود');
  return toPublicOrder(order);
}

async function getOrderByNumber(orderNumber) {
  const order = await repo.findOrderByNumber(orderNumber);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود');
  return toPublicOrder(order);
}

async function getMyOrders(userId) {
  const rows = await repo.listOrdersForUser(userId);
  return Promise.all(rows.map(toPublicOrder));
}

async function getAllOrders(filter) {
  const rows = await repo.listAllOrders(filter);
  return Promise.all(rows.map(toPublicOrder));
}

async function setOrderStatus(orderId, status, req) {
  const order = await repo.findOrderById(orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود');
  await repo.updateOrderStatus(orderId, status);
  recordAudit({ userId: req.user.id, action: 'ORDER_STATUS_CHANGED', entityType: 'order', entityId: orderId, req, metadata: { from: order.status, to: status } });
  return getOrder(orderId);
}

module.exports = { checkout, getOrder, getOrderByNumber, getMyOrders, getAllOrders, setOrderStatus, toPublicOrder };
