const jwt = require('jsonwebtoken');
const PaymentProvider = require('./PaymentProvider');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * مزوّد Tamara (الدفع بالتقسيط دون فوائد)
 * ---------------------------------------------------------
 * نفس مبدأ Tabby: جلسة دفع من الخادم ← تحويل العميل لصفحة Tamara ←
 * رجوع لعنوان النجاح/الفشل ← تأكيد نهائي من الخادم. الفارق المهم مع
 * Tamara: بعد استلام إشعار "approved" يجب على خادمنا استدعاء واجهة
 * "Authorise Order" لتأكيد الاستلام، وإلا تبقى العملية عالقة في حالة
 * "approved" ولا تكتمل — نفّذنا ذلك في handleApproved أدناه.
 *
 * ⚠️ الوصول الفعلي يتطلب حساب تاجر معتمَد من Tamara — راجع
 * docs.tamara.co قبل الإطلاق للتأكد من ثبات أسماء الحقول.
 */
class TamaraProvider extends PaymentProvider {
  get name() {
    return 'TAMARA';
  }

  async createPayment({ order, amountHalalas, currency, customer, callbackUrl }) {
    const totalAmount = (amountHalalas / 100).toFixed(2);
    const body = {
      order_reference_id: order.orderNumber,
      order_number: order.orderNumber,
      total_amount: { amount: totalAmount, currency },
      description: `طلب ${order.orderNumber} — Piece & Story`,
      country_code: 'SA',
      payment_type: 'PAY_BY_INSTALMENTS',
      consumer: {
        first_name: customer.fullName,
        phone_number: customer.phone,
        email: customer.email,
      },
      items: order.items.map((it) => ({
        name: it.titleSnapshotAr,
        type: 'Physical',
        reference_id: it.productId,
        sku: it.productId,
        quantity: it.quantity,
        unit_price: { amount: (it.unitPriceHalalas / 100).toFixed(2), currency },
        total_amount: { amount: (it.lineTotalHalalas / 100).toFixed(2), currency },
      })),
      merchant_url: {
        success: `${callbackUrl}&status=success`,
        failure: `${callbackUrl}&status=failure`,
        cancel: `${callbackUrl}&status=cancel`,
        notification: `${config.publicAppUrl}/api/payments/webhooks/tamara`,
      },
    };

    const res = await fetch(`${config.tamara.apiBase}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.tamara.apiToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`تعذّر إنشاء جلسة Tamara: ${data?.message || res.status}`);

    return { mode: 'redirect', redirectUrl: data.checkout_url, providerRef: data.order_id, raw: data };
  }

  async fetchOrder(tamaraOrderId) {
    const res = await fetch(`${config.tamara.apiBase}/orders/${tamaraOrderId}`, {
      headers: { Authorization: `Bearer ${config.tamara.apiToken}` },
    });
    if (!res.ok) throw new Error(`تعذّر جلب حالة الطلب من Tamara (${res.status})`);
    return res.json();
  }

  /** خطوة إلزامية لدى Tamara: تأكيد استلام حالة "approved" وإلا تبقى العملية عالقة */
  async authoriseOrder(tamaraOrderId) {
    const res = await fetch(`${config.tamara.apiBase}/orders/${tamaraOrderId}/authorise`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.tamara.apiToken}` },
    });
    if (!res.ok) logger.warn('فشل استدعاء Authorise Order لدى Tamara', { tamaraOrderId, status: res.status });
    return res.ok;
  }

  /** التوكن المرفَق بالويبهوك (tamaraToken) موقَّع HS256 بمفتاح الإشعارات — jwt.verify يتحقق منه ويرفض أي تلاعب */
  verifyWebhook(req) {
    const token = req.query?.tamaraToken || req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || !config.tamara.notificationToken) return false;
    try {
      jwt.verify(token, config.tamara.notificationToken, { algorithms: ['HS256'] });
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(req) {
    const payload = req.body;
    return {
      providerRef: payload?.order_id,
      status: this.mapStatus(payload?.event_type || payload?.order_status),
      raw: payload,
      eventType: payload?.event_type,
    };
  }

  mapStatus(event) {
    if (!event) return 'INITIATED';
    if (event.includes('authorised') || event.includes('captured') || event.includes('fully_captured')) return 'PAID';
    if (event.includes('approved')) return 'AUTHORIZED';
    if (event.includes('canceled') || event.includes('declined') || event.includes('expired')) return 'FAILED';
    if (event.includes('refunded')) return 'REFUNDED';
    return 'INITIATED';
  }
}

module.exports = TamaraProvider;
