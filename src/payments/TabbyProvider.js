const PaymentProvider = require('./PaymentProvider');
const config = require('../config');

/**
 * مزوّد Tabby (الدفع بالتقسيط دون فوائد)
 * ---------------------------------------------------------
 * الخادم ينشئ "جلسة دفع" لدى Tabby، ثم نحوّل العميل إلى الرابط الذي
 * تُعيده Tabby ليكمل العملية على صفحتهم؛ بعدها يُعاد توجيهه لعنوان
 * النجاح/الفشل الذي حددناه. المصدر الموثوق للحالة النهائية هو دومًا
 * استدعاء "Retrieve Payment" من خادمنا، وليس معاملات الرجوع نفسها.
 *
 * ⚠️ الوصول الفعلي لبيئة Tabby (Sandbox/Production) يتطلب حساب تاجر
 * معتمَد من Tabby — تحقّق من حقول الاستجابة الدقيقة في لوحة توثيقهم
 * (docs.tabby.ai) عند ربط بيانات الاعتماد الحقيقية.
 */
class TabbyProvider extends PaymentProvider {
  get name() {
    return 'TABBY';
  }

  async createPayment({ order, amountHalalas, currency, customer, callbackUrl }) {
    const body = {
      payment: {
        amount: (amountHalalas / 100).toFixed(2),
        currency,
        buyer: {
          phone: customer.phone,
          email: customer.email,
          name: customer.fullName,
        },
        order: {
          reference_id: order.orderNumber,
          items: order.items.map((it) => ({
            title: it.titleSnapshotAr,
            quantity: it.quantity,
            unit_price: (it.unitPriceHalalas / 100).toFixed(2),
          })),
        },
        merchant_urls: {
          success: `${callbackUrl}&status=success`,
          failure: `${callbackUrl}&status=failure`,
          cancel: `${callbackUrl}&status=cancel`,
        },
      },
      lang: 'ar',
      merchant_code: config.tabby.merchantCode,
    };

    const res = await fetch(`${config.tabby.apiBase}/v2/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.tabby.secretKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`تعذّر إنشاء جلسة Tabby: ${data?.error || res.status}`);

    // اسم حقل رابط التحويل قد يختلف حسب إصدار الـ API — تحقّق منه في بيئة الاختبار الفعلية
    const redirectUrl =
      data?.configuration?.available_products?.installments?.[0]?.web_url ||
      data?.checkout_url ||
      data?.web_url;

    return { mode: 'redirect', redirectUrl, providerRef: data.id, raw: data };
  }

  /** إعادة التحقق من الحالة عبر واجهة Tabby مباشرة — لا نثق بجسم الويبهوك دون تأكيد */
  async fetchPayment(tabbyPaymentId) {
    const res = await fetch(`${config.tabby.apiBase}/v1/payments/${tabbyPaymentId}`, {
      headers: { Authorization: `Bearer ${config.tabby.secretKey}` },
    });
    if (!res.ok) throw new Error(`تعذّر جلب حالة الدفعة من Tabby (${res.status})`);
    return res.json();
  }

  verifyWebhook() {
    // نعتمد على إعادة الاستعلام الآمنة عبر fetchPayment بدل الثقة بالحمولة مباشرة (انظر paymentService)
    return true;
  }

  parseWebhookEvent(req) {
    const payload = req.body;
    return { providerRef: payload?.id || payload?.payment?.id, status: this.mapStatus(payload?.status), raw: payload };
  }

  mapStatus(tabbyStatus) {
    switch (tabbyStatus) {
      case 'AUTHORIZED':
        return 'AUTHORIZED';
      case 'CLOSED':
        return 'PAID';
      case 'REJECTED':
      case 'EXPIRED':
        return 'FAILED';
      default:
        return 'INITIATED';
    }
  }
}

module.exports = TabbyProvider;
