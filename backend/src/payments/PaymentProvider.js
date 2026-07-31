/**
 * الواجهة المشتركة لأي مزوّد دفع
 * ---------------------------------------------------------
 * كل مزوّد (Moyasar / Tabby / Tamara) ينفّذ نفس الشكل، فتبقى بقية
 * النظام (orders, controllers) غير مبالية بمن يُنفّذ الدفع فعليًا.
 * لإضافة بوابة سعودية أخرى مستقبلًا (HyperPay, PayTabs, Geidea...)
 * يكفي إنشاء ملف جديد بنفس الشكل وتسجيله في payments/index.js —
 * دون أي تعديل على باقي الكود. هذا هو المقصود بـ"قابل للتوسّع مستقبلًا".
 */
class PaymentProvider {
  /** اسم المزوّد كما يُخزَّن في قاعدة البيانات */
  get name() {
    throw new Error('يجب تحديد name');
  }

  /**
   * ينشئ عملية دفع/جلسة دفع لدى المزوّد ويعيد رابط تحويل العميل إليه
   * (أو بيانات نموذج مضمّن، حسب المزوّد).
   * @returns {Promise<{redirectUrl?: string, providerRef: string, raw: object}>}
   */
  // eslint-disable-next-line no-unused-vars
  async createPayment({ order, amountHalalas, currency, customer, callbackUrl }) {
    throw new Error('غير منفَّذ');
  }

  /** يتحقق من توقيع/صحة إشعار الويبهوك الوارد قبل تصديق أي بيانات فيه */
  // eslint-disable-next-line no-unused-vars
  verifyWebhook(req) {
    throw new Error('غير منفَّذ');
  }

  /** يحوّل جسم الويبهوك إلى شكل موحّد: { providerRef, status, raw } */
  // eslint-disable-next-line no-unused-vars
  parseWebhookEvent(req) {
    throw new Error('غير منفَّذ');
  }
}

module.exports = PaymentProvider;
