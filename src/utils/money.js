/**
 * نخزّن كل المبالغ في قاعدة البيانات كأعداد صحيحة بوحدة "الهللة"
 * (1 ر.س = 100 هللة) بدل الأعداد العشرية — هذه ممارسة قياسية في أنظمة
 * الدفع (تتبعها Stripe وغيرها) لتفادي أخطاء تقريب الفاصلة العائمة التي
 * قد تسبب فروقات مالية حقيقية.
 */
function toHalalas(sarAmount) {
  return Math.round(Number(sarAmount) * 100);
}
function toSar(halalas) {
  return Math.round(Number(halalas)) / 100;
}

module.exports = { toHalalas, toSar };
