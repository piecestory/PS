const crypto = require('node:crypto');
const PaymentProvider = require('./PaymentProvider');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * مزوّد Moyasar (مدى، فيزا، ماستركارد، Apple Pay، STC Pay ببوابة واحدة)
 * ---------------------------------------------------------
 * Moyasar مرخّصة ومراقبة من البنك المركزي السعودي (ساما). الأسلوب
 * المعتمد لبطاقات الدفع هو "Moyasar Form": عنصر واجهة مضمَّن (Embedded)
 * يُحمَّل من نطاق Moyasar مباشرة داخل صفحة الدفع لدينا؛ الإدخال والتوكنة
 * تجريان مباشرة بين متصفح العميل وخوادم Moyasar باستخدام "المفتاح
 * القابل للنشر" (publishable key) — بيانات البطاقة لا تمر إطلاقًا عبر
 * خادمنا، ما يقلّل نطاق امتثال PCI-DSS المطلوب منّا إلى أدنى مستوى
 * (SAQ A تقريبًا). لذلك createPayment هنا لا يتصل بـ Moyasar من
 * الخادم، بل يُعيد الإعدادات اللازمة لتحميل ذلك العنصر من المتصفح.
 * التأكيد النهائي للدفع يتم دومًا من خادمنا (fetchPayment / الويبهوك)
 * وليس بالاعتماد على استجابة المتصفح وحدها.
 *
 * ⚠️ تحقّق من توثيق Moyasar الرسمي (docs.moyasar.com) قبل الإطلاق
 * الفعلي — أسماء الحقول أو آلية توقيع الويبهوك قد تتحدّث بمرور الوقت.
 */
class MoyasarProvider extends PaymentProvider {
  get name() {
    return 'MOYASAR';
  }

  async createPayment({ order, amountHalalas, currency, callbackUrl }) {
    return {
      mode: 'embedded',
      providerRef: null, // يُملأ لاحقًا من رد Moyasar نفسه عبر callback/webhook
      widgetConfig: {
        publishableApiKey: config.moyasar.publishableKey,
        amount: amountHalalas,
        currency,
        description: `طلب ${order.orderNumber} — Piece & Story`,
        callbackUrl,
        methods: ['creditcard', 'applepay', 'stcpay'],
      },
      raw: null,
    };
  }

  /** تحقّق سيرفري نهائي من حالة دفعة عبر معرّفها — لا نثق أبدًا بمعاملات إعادة التوجيه وحدها */
  async fetchPayment(moyasarPaymentId) {
    const auth = Buffer.from(`${config.moyasar.secretKey}:`).toString('base64');
    const res = await fetch(`${config.moyasar.apiBase}/payments/${moyasarPaymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`تعذّر جلب حالة الدفعة من Moyasar (${res.status})`);
    return res.json();
  }

  verifyWebhook(req) {
    const secret = config.moyasar.webhookSecret;
    if (!secret) {
      logger.warn('MOYASAR_WEBHOOK_SECRET غير مضبوط — لا يمكن التحقق من صحة الويبهوك');
      return false;
    }
    // النمط الموثَّق: توقيع HMAC-SHA256 على الجسم الخام عبر الرأس x-moyasar-signature
    const signatureHeader = req.get('x-moyasar-signature');
    if (signatureHeader) {
      const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
      } catch {
        return false;
      }
    }
    // نمط بديل موثَّق أيضًا: توكن سرّي مباشر ضمن جسم الحدث نفسه
    const bodyToken = req.body?.secret_token;
    if (bodyToken) {
      try {
        return crypto.timingSafeEqual(Buffer.from(bodyToken), Buffer.from(secret));
      } catch {
        return false;
      }
    }
    return false;
  }

  parseWebhookEvent(req) {
    const payment = req.body?.data || req.body?.payment || req.body;
    return {
      providerRef: payment?.id,
      status: this.mapStatus(payment?.status),
      raw: req.body,
    };
  }

  mapStatus(moyasarStatus) {
    switch (moyasarStatus) {
      case 'paid':
        return 'PAID';
      case 'authorized':
        return 'AUTHORIZED';
      case 'failed':
        return 'FAILED';
      case 'voided':
        return 'VOIDED';
      case 'refunded':
        return 'REFUNDED';
      default:
        return 'INITIATED';
    }
  }
}

module.exports = MoyasarProvider;
