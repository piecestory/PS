const { getDb } = require('../../db/connection');
const { newId } = require('../../utils/ids');

async function createPayment({ orderId, referenceNumber, provider, amountHalalas, currency }) {
  const id = newId();
  await getDb().execute(
    `INSERT INTO payments (id, order_id, reference_number, provider, amount_halalas, currency)
     VALUES (?,?,?,?,?,?)`,
    [id, orderId, referenceNumber, provider, amountHalalas, currency]
  );
  return findById(id);
}

async function findById(id) {
  return getDb().queryOne('SELECT * FROM payments WHERE id = ?', [id]);
}
async function findByOrderId(orderId) {
  return getDb().queryOne('SELECT * FROM payments WHERE order_id = ?', [orderId]);
}
async function findByReferenceNumber(ref) {
  return getDb().queryOne('SELECT * FROM payments WHERE reference_number = ?', [ref]);
}
async function findByProviderRef(provider, providerRef) {
  return getDb().queryOne('SELECT * FROM payments WHERE provider = ? AND provider_ref = ?', [provider, providerRef]);
}

async function updatePayment(id, { providerRef, status, rawResponse }) {
  const current = await findById(id);
  if (!current) return null;
  await getDb().execute(
    `UPDATE payments SET provider_ref = ?, status = ?, raw_response = ? WHERE id = ?`,
    [providerRef || current.provider_ref, status || current.status, rawResponse || current.raw_response, id]
  );
  return findById(id);
}

module.exports = { createPayment, findById, findByOrderId, findByReferenceNumber, findByProviderRef, updatePayment };
