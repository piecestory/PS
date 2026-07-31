const test = require('node:test');
const assert = require('node:assert/strict');

const { toHalalas, toSar } = require('../src/utils/money');
const { newOrderNumber, newPaymentReference, newId } = require('../src/utils/ids');
const { hashPassword, verifyPassword } = require('../src/utils/password');

test('money: SAR <-> halalas round-trip بلا فقدان دقة', () => {
  assert.equal(toHalalas(18500), 1850000);
  assert.equal(toSar(1850000), 18500);
  assert.equal(toHalalas(99.5), 9950);
  assert.equal(toSar(9950), 99.5);
});

test('ids: أرقام الطلبات والمدفوعات فريدة وبالصيغة المتوقَّعة', () => {
  const a = newOrderNumber();
  const b = newOrderNumber();
  assert.match(a, /^PS-\d{6}-[0-9A-F]{5}$/);
  assert.notEqual(a, b, 'يجب أن يكون كل رقم طلب فريدًا');

  const p = newPaymentReference();
  assert.match(p, /^PAY-\d{6}-[0-9A-F]{5}$/);

  assert.notEqual(newId(), newId());
});

test('password: التجزئة أحادية الاتجاه، والتحقق يعمل وبكشف كلمة خاطئة', async () => {
  const hash = await hashPassword('Passw0rd123');
  assert.notEqual(hash, 'Passw0rd123', 'يجب ألا يُخزَّن النص الصريح أبدًا');
  assert.equal(await verifyPassword('Passw0rd123', hash), true);
  assert.equal(await verifyPassword('WrongPassword', hash), false);
});
