const repo = require('./payments.repository');
const ordersRepo = require('../orders/orders.repository');
const catalogRepo = require('../catalog/catalog.repository');
const ordersService = require('../orders/orders.service');
const { getProvider } = require('../../payments');
const { newPaymentReference } = require('../../utils/ids');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../db/auditLog');
const { sendOrderConfirmationEmail } = require('../../utils/email');
const config = require('../../config');
const logger = require('../../utils/logger');

/** يبدأ عملية دفع لطلب موجود مسبقًا (الطلب يُنشأ أولًا بحالة PENDING قبل استدعاء هذه الدالة) */
async function initiatePayment({ orderId, providerName }, req) {
  const order = await ordersRepo.findOrderById(orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود');

  const referenceNumber = newPaymentReference();
  const payment = await repo.createPayment({
    orderId,
    referenceNumber,
    provider: providerName,
    amountHalalas: order.total_halalas,
    currency: order.currency,
  });

  const address = await ordersRepo.findAddressById(order.address_id);
  const items = await ordersRepo.listItemsForOrder(orderId);
  const callbackUrl = `${config.publicAppUrl}/order-confirmation.html?ref=${referenceNumber}`;

  const provider = getProvider(providerName);
  let result;
  try {
    result = await provider.createPayment({
      order: { orderNumber: order.order_number, items: items.map((i) => ({ titleSnapshotAr: i.title_snapshot_ar, quantity: i.quantity, unitPriceHalalas: i.unit_price_halalas, lineTotalHalalas: i.line_total_halalas, productId: i.product_id })) },
      amountHalalas: order.total_halalas,
      currency: order.currency,
      customer: { fullName: address.full_name, phone: address.phone, email: order.guest_email || req.user?.email || '' },
      callbackUrl,
    });
  } catch (e) {
    logger.error('فشل إنشاء عملية الدفع لدى المزوّد', { provider: providerName, message: e.message });
    throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'تعذّر الاتصال ببوابة الدفع، حاول مجددًا خلال لحظات');
  }

  if (result.providerRef) await repo.updatePayment(payment.id, { providerRef: result.providerRef });

  recordAudit({ userId: req.user?.id, action: 'PAYMENT_INITIATED', entityType: 'payment', entityId: payment.id, req, metadata: { provider: providerName } });

  return {
    referenceNumber,
    mode: result.mode,
    redirectUrl: result.redirectUrl || null,
    widgetConfig: result.widgetConfig || null,
  };
}

/** يُستدعى فور عودة العميل من صفحة الدفع — تأكيد فوري للواجهة، دون انتظار الويبهوك غير المتزامن */
async function confirmByReference(referenceNumber, { providerPaymentId } = {}) {
  const payment = await repo.findByReferenceNumber(referenceNumber);
  if (!payment) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'عملية الدفع غير موجودة');

  const provider = getProvider(payment.provider);
  let providerRef = payment.provider_ref || providerPaymentId;
  let status = payment.status;
  let raw = null;

  try {
    if (payment.provider === 'MOYASAR' && providerPaymentId) {
      raw = await provider.fetchPayment(providerPaymentId);
      providerRef = raw.id;
      status = provider.mapStatus(raw.status);
    } else if (payment.provider === 'TABBY' && providerRef) {
      raw = await provider.fetchPayment(providerRef);
      status = provider.mapStatus(raw.status);
    } else if (payment.provider === 'TAMARA' && providerRef) {
      raw = await provider.fetchOrder(providerRef);
      status = provider.mapStatus(raw.status);
    }
  } catch (e) {
    logger.warn('تعذّر التأكيد الفوري من المزوّد، سيُعتمد على الويبهوك لاحقًا', { message: e.message });
  }

  if (status && status !== payment.status) {
    await applyStatusTransition(payment, status, providerRef, raw ? JSON.stringify(raw) : null);
  }

  const order = await ordersRepo.findOrderById(payment.order_id);
  return { referenceNumber, status: status || payment.status, orderNumber: order?.order_number };
}

/** معالجة إشعار ويبهوك واصل من إحدى بوابات الدفع */
async function handleWebhook(providerName, req) {
  const provider = getProvider(providerName);

  const verified = provider.verifyWebhook(req);
  if (!verified) {
    logger.warn('توقيع ويبهوك غير صالح — تم الرفض', { provider: providerName });
    throw new ApiError(401, 'INVALID_WEBHOOK_SIGNATURE', 'توقيع غير صالح');
  }

  const event = provider.parseWebhookEvent(req);
  let payment = event.providerRef ? await repo.findByProviderRef(providerName, event.providerRef) : null;
  if (!payment && event.raw?.metadata?.reference) {
    payment = await repo.findByReferenceNumber(event.raw.metadata.reference);
  }
  if (!payment) {
    logger.warn('ويبهوك لعملية دفع غير معروفة لدينا — يحتاج مراجعة يدوية', { provider: providerName, providerRef: event.providerRef });
    return; // نستجيب 200 حتى لا يُعيد المزوّد المحاولة إلى ما لا نهاية على إشعار لا يخصّنا
  }

  // إن كانت Tamara ما زالت بحالة "approved" فقط، يجب تأكيد الاستلام لديها وإلا تبقى العملية عالقة
  if (providerName === 'TAMARA' && event.eventType?.includes('approved') && !event.eventType.includes('authorised')) {
    await provider.authoriseOrder(event.providerRef);
  }

  await applyStatusTransition(payment, event.status, event.providerRef, JSON.stringify(event.raw));
}

/**
 * يطبّق تحوّل حالة الدفع فعليًا: يمنع التكرار (Idempotency) — لو كانت
 * الحالة PAID مسبقًا لا يُعيد خصم المخزون أو إرسال بريد تأكيد ثانٍ حتى
 * لو وصل نفس الإشعار عدة مرات (شائع جدًا مع الويبهوك).
 */
async function applyStatusTransition(payment, newStatus, providerRef, rawJson) {
  if (payment.status === 'PAID' && newStatus === 'PAID') {
    await repo.updatePayment(payment.id, { providerRef, rawResponse: rawJson });
    return; // لا تكرار
  }

  await repo.updatePayment(payment.id, { providerRef, status: newStatus, rawResponse: rawJson });

  if (newStatus === 'PAID') {
    const items = await ordersRepo.listItemsForOrder(payment.order_id);
    const shortages = [];
    for (const it of items) {
      const success = await catalogRepo.decrementStockIfAvailable(it.product_id, it.quantity);
      if (!success) shortages.push(it.product_id);
    }
    await ordersRepo.updateOrderStatus(payment.order_id, 'PAID');

    recordAudit({
      action: 'PAYMENT_CONFIRMED',
      entityType: 'payment',
      entityId: payment.id,
      metadata: { orderId: payment.order_id, shortages: shortages.length ? shortages : undefined },
    });
    if (shortages.length) {
      logger.error('تنبيه: طلب مدفوع لكن المخزون غير كافٍ — يتطلّب تدخلًا يدويًا', { orderId: payment.order_id, shortages });
    }

    const order = await ordersService.getOrder(payment.order_id);
    sendOrderConfirmationEmail(order).catch((e) => logger.warn('تعذّر إرسال بريد تأكيد الطلب', { message: e.message }));
  } else if (newStatus === 'FAILED' || newStatus === 'VOIDED') {
    await ordersRepo.updateOrderStatus(payment.order_id, 'FAILED');
    recordAudit({ action: 'PAYMENT_FAILED', entityType: 'payment', entityId: payment.id, metadata: { orderId: payment.order_id } });
  }
}

module.exports = { initiatePayment, confirmByReference, handleWebhook };
