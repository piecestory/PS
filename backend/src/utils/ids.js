const crypto = require('node:crypto');

/** معرّف فريد عام لأي صف في قاعدة البيانات */
function newId() {
  return crypto.randomUUID();
}

/** رقم طلب مقروء للعميل، مثال: PS-260715-K3F9A */
function newOrderNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `PS-${ymd}-${rand}`;
}

/** رقم مرجعي لعملية الدفع، مثال: PAY-260715-9Q2ZC */
function newPaymentReference() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `PAY-${ymd}-${rand}`;
}

module.exports = { newId, newOrderNumber, newPaymentReference };
