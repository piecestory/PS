/**
 * نستخدم bcryptjs (تنفيذ جافاسكربت خالص، بلا حاجة لتجميع ثنائي أصلي)
 * لضمان تثبيت متسق على أي بيئة استضافة. إن سمحت بيئتك ببناء الوحدات
 * الأصلية ورغبت بأداء/مقاومة أعلى قليلًا يمكنك لاحقًا التبديل لحزمة
 * argon2 دون تغيير أي كود خارج هذا الملف.
 */
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // توازن جيد بين الأمان وزمن الاستجابة

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
