const { getDb } = require('../../db/connection');
const { newId } = require('../../utils/ids');

async function createAddress(tx, a) {
  const id = newId();
  const exec = tx ? tx.execute : getDb().execute;
  await exec(
    `INSERT INTO addresses (id, user_id, full_name, phone, city, district, street, building_no, additional_info, postal_code)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, a.userId || null, a.fullName, a.phone, a.city, a.district || null, a.street, a.buildingNo || null, a.additionalInfo || null, a.postalCode || null]
  );
  return id;
}

/** ينشئ الطلب وبنوده والعنوان ضمن معاملة واحدة — إمّا يُسجَّل كل شيء أو لا شيء منه */
async function createOrderWithItems({ orderNumber, userId, guestEmail, guestPhone, address, items, subtotalHalalas, shippingHalalas, totalHalalas, customerNote }) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const addressId = await createAddress(tx, { ...address, userId });
    const orderId = newId();

    await tx.execute(
      `INSERT INTO orders (id, order_number, user_id, guest_email, guest_phone, address_id, subtotal_halalas, shipping_halalas, total_halalas, customer_note)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [orderId, orderNumber, userId || null, guestEmail || null, guestPhone || null, addressId, subtotalHalalas, shippingHalalas, totalHalalas, customerNote || null]
    );

    for (const it of items) {
      await tx.execute(
        `INSERT INTO order_items (id, order_id, product_id, title_snapshot_ar, title_snapshot_en, unit_price_halalas, quantity, line_total_halalas)
         VALUES (?,?,?,?,?,?,?,?)`,
        [newId(), orderId, it.productId, it.titleAr, it.titleEn || null, it.unitPriceHalalas, it.quantity, it.lineTotalHalalas]
      );
    }
    return orderId;
  });
}

async function findOrderById(id) {
  return getDb().queryOne('SELECT * FROM orders WHERE id = ?', [id]);
}
async function findOrderByNumber(orderNumber) {
  return getDb().queryOne('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
}
async function listItemsForOrder(orderId) {
  return getDb().query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
}
async function findAddressById(id) {
  return getDb().queryOne('SELECT * FROM addresses WHERE id = ?', [id]);
}
async function listOrdersForUser(userId) {
  return getDb().query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}
async function listAllOrders({ status } = {}) {
  const db = getDb();
  if (status) return db.query('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC', [status]);
  return db.query('SELECT * FROM orders ORDER BY created_at DESC', []);
}
async function updateOrderStatus(orderId, status) {
  await getDb().execute(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId]);
}

module.exports = {
  createAddress,
  createOrderWithItems,
  findOrderById,
  findOrderByNumber,
  listItemsForOrder,
  findAddressById,
  listOrdersForUser,
  listAllOrders,
  updateOrderStatus,
};
